-- KILIMO AI — community features (KIL-004): peer groups + expert consultation requests.
--
-- Replaces the on-device demo data that app/peer-groups.tsx and app/consultations.tsx used to render
-- (7 invented groups with invented member counts, seeded chat posts attributed to invented farmers, a
-- roster of 10 "certified" experts with invented ratings/reviews/phone numbers, and a fake scheduled
-- video call). Nothing here seeds any rows: an empty table is an empty community.
--
-- Additive + idempotent: create ... if not exists, drop policy/trigger if exists before create,
-- create or replace function. No destructive statements.
--
-- Privacy model
--   peer_groups                any signed-in user may read (that is what "discover" means)
--   peer_group_members         readable only by fellow members (and always your own rows)
--   peer_posts                 readable/writable only by members of that group
--   consultation_requests      owner-only; the client can never set status/answer
-- Member counts for groups you have not joined are exposed through ONE aggregate-only RPC
-- (peer_group_directory) so the members table itself stays private.
--
-- RLS that must look at membership uses SECURITY DEFINER helpers with an empty search_path so the
-- policies never recurse into themselves (a policy on peer_group_members that selects from
-- peer_group_members would).

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Tables
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
create table if not exists public.peer_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 3 and 80),
  description text check (description is null or length(description) <= 500),
  crop        text check (crop is null or length(crop) <= 60),
  region      text check (region is null or length(region) <= 60),
  -- Kept (set null) if the creator's account is deleted, so other members' group survives.
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists peer_groups_created_idx on public.peer_groups (created_at desc);

create table if not exists public.peer_group_members (
  group_id  uuid not null references public.peer_groups (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists peer_group_members_user_idx on public.peer_group_members (user_id);

create table if not exists public.peer_posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.peer_groups (id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Display name copied server-side from the author's own farm profile at post time (see trigger
  -- below). The client cannot set it, so a member cannot post under someone else's name.
  author_name text,
  body        text not null check (length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists peer_posts_group_created_idx on public.peer_posts (group_id, created_at desc);

create table if not exists public.consultation_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic              text not null check (length(btrim(topic)) between 1 and 120),
  crop               text check (crop is null or length(crop) <= 60),
  description        text not null check (length(btrim(description)) between 1 and 2000),
  preferred_language text not null default 'sw' check (preferred_language in ('en', 'sw')),
  status             text not null default 'submitted'
                       check (status in ('submitted', 'in_review', 'answered', 'closed')),
  created_at         timestamptz not null default now(),
  -- Set only by staff / a trusted server process (service role) — never by the client.
  answered_at        timestamptz,
  answer             text check (answer is null or length(answer) <= 4000)
);

create index if not exists consultation_requests_user_idx
  on public.consultation_requests (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Helper functions (SECURITY DEFINER, empty search_path, fully-qualified names)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.is_peer_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.peer_group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

-- The creator of a group becomes its admin. Done in a trigger (running as the table owner, which
-- bypasses RLS) so the client never needs — and is never granted — the ability to insert an
-- 'admin' membership row for itself.
create or replace function public.peer_groups_add_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.peer_group_members (group_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Stamp the author's display name from their own farm profile. Overwrites anything the client sent.
create or replace function public.peer_posts_stamp_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.author_name := (
    select nullif(btrim(p.name), '')
    from public.farmer_profiles p
    where p.user_id = new.author_id
  );
  return new;
end;
$$;

drop trigger if exists peer_groups_add_creator on public.peer_groups;
create trigger peer_groups_add_creator
  after insert on public.peer_groups
  for each row execute function public.peer_groups_add_creator();

drop trigger if exists peer_posts_stamp_author on public.peer_posts;
create trigger peer_posts_stamp_author
  before insert on public.peer_posts
  for each row execute function public.peer_posts_stamp_author();

-- Discover: every group with its member count and whether *you* are in it, optionally filtered by
-- a search term (name / description / crop / region). Aggregate-only, so it does not expose who the
-- members are. Order: biggest first, then newest. (ORDER BY uses output-column ordinals to avoid
-- any clash with the RETURNS TABLE parameter names.)
create or replace function public.peer_group_directory(p_search text default null)
returns table (
  id           uuid,
  name         text,
  description  text,
  crop         text,
  region       text,
  created_by   uuid,
  created_at   timestamptz,
  member_count bigint,
  is_member    boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id,
         g.name,
         g.description,
         g.crop,
         g.region,
         g.created_by,
         g.created_at,
         (select count(*) from public.peer_group_members m where m.group_id = g.id) as member_count,
         exists (
           select 1 from public.peer_group_members m
           where m.group_id = g.id and m.user_id = auth.uid()
         ) as is_member
  from public.peer_groups g
  where auth.uid() is not null
    and (
      p_search is null
      or btrim(p_search) = ''
      or g.name        ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or g.description ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or g.crop        ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or g.region      ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by 8 desc, 7 desc
  limit 100;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Row level security
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
alter table public.peer_groups            enable row level security;
alter table public.peer_group_members     enable row level security;
alter table public.peer_posts             enable row level security;
alter table public.consultation_requests  enable row level security;

-- peer_groups: any signed-in user can read; you can only create a group as yourself.
-- No client update/delete policy: renaming or removing a group is a staff action for now.
drop policy if exists "peer groups: read" on public.peer_groups;
create policy "peer groups: read" on public.peer_groups
  for select to authenticated using (true);

drop policy if exists "peer groups: create as self" on public.peer_groups;
create policy "peer groups: create as self" on public.peer_groups
  for insert to authenticated with check (created_by = auth.uid());

-- peer_group_members: readable by members of the same group; you may join / leave only as yourself,
-- and only as a plain 'member' (the creator's 'admin' row comes from the trigger above).
drop policy if exists "peer members: read fellow members" on public.peer_group_members;
create policy "peer members: read fellow members" on public.peer_group_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_peer_group_member(group_id));

drop policy if exists "peer members: join as self" on public.peer_group_members;
create policy "peer members: join as self" on public.peer_group_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');

drop policy if exists "peer members: leave as self" on public.peer_group_members;
create policy "peer members: leave as self" on public.peer_group_members
  for delete to authenticated using (user_id = auth.uid());

-- peer_posts: members read; members post as themselves; authors delete their own.
drop policy if exists "peer posts: members read" on public.peer_posts;
create policy "peer posts: members read" on public.peer_posts
  for select to authenticated using (public.is_peer_group_member(group_id));

drop policy if exists "peer posts: members post as self" on public.peer_posts;
create policy "peer posts: members post as self" on public.peer_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_peer_group_member(group_id));

drop policy if exists "peer posts: author deletes own" on public.peer_posts;
create policy "peer posts: author deletes own" on public.peer_posts
  for delete to authenticated using (author_id = auth.uid());

-- consultation_requests: owner-only read + insert, and an insert can only ever be a fresh,
-- unanswered request. There is intentionally NO update or delete policy (and no grant): status,
-- answer and answered_at change only through the service role.
drop policy if exists "consultations: read own" on public.consultation_requests;
create policy "consultations: read own" on public.consultation_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "consultations: submit own" on public.consultation_requests;
create policy "consultations: submit own" on public.consultation_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'submitted'
    and answer is null
    and answered_at is null
  );

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Grants (convention of 20260920000000_explicit_api_grants.sql: revoke broad, grant exactly what
-- the policies allow; anon gets nothing)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
revoke all on public.peer_groups           from anon, authenticated;
revoke all on public.peer_group_members    from anon, authenticated;
revoke all on public.peer_posts            from anon, authenticated;
revoke all on public.consultation_requests from anon, authenticated;

grant select, insert         on public.peer_groups           to authenticated;
grant select, insert, delete on public.peer_group_members    to authenticated;
grant select, insert, delete on public.peer_posts            to authenticated;
grant select, insert         on public.consultation_requests to authenticated;

grant all on public.peer_groups           to service_role;
grant all on public.peer_group_members    to service_role;
grant all on public.peer_posts            to service_role;
grant all on public.consultation_requests to service_role;

revoke all on function public.is_peer_group_member(uuid)      from public, anon, authenticated;
grant execute on function public.is_peer_group_member(uuid)   to authenticated, service_role;

revoke all on function public.peer_group_directory(text)      from public, anon, authenticated;
grant execute on function public.peer_group_directory(text)   to authenticated, service_role;

-- Trigger functions are never called through the API.
revoke all on function public.peer_groups_add_creator()       from public, anon, authenticated;
revoke all on function public.peer_posts_stamp_author()       from public, anon, authenticated;
