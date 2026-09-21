-- KILIMO AI — `tasks` table backing hooks/useTasks.ts and lib/offline.ts.
--
-- The client has always queried/inserted/updated `public.tasks`
-- (select *, order by due_date; insert {title,title_sw,category,priority,
-- status,due_date,xp_reward,farm_block,coop_id,synced_offline,assigned_role};
-- update {status,completed_at} by id) but no migration ever created it
-- (docs/supabase-schema.sql held a stale definition). Column names below match
-- the client's snake_case payloads and mapDbToTask() exactly.
--
-- Ownership: the client never sends user_id, so it defaults to auth.uid() and
-- RLS pins every operation to the owner. There is deliberately NO co-op sharing
-- policy: `coop_id` is stored as opaque text because no co-op/membership table
-- exists anywhere in the schema to authorise shared access against. Do not add
-- a `using (true)` policy here.
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null check (length(title) between 1 and 200),
  title_sw       text,
  description    text,
  category       text not null default 'general'
                   check (category in ('irrigation','planting','harvest','scouting','finance','general')),
  priority       text not null default 'medium'
                   check (priority in ('low','medium','high','critical')),
  status         text not null default 'pending'
                   check (status in ('pending','in_progress','done','cancelled')),
  due_date       timestamptz,
  completed_at   timestamptz,
  xp_reward      integer not null default 10 check (xp_reward between 0 and 1000),
  farm_block     text,
  coop_id        text,
  synced_offline boolean not null default false,
  assigned_role  text check (assigned_role in ('vet','mechanic','employee')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);

alter table public.tasks enable row level security;

create policy "own tasks: select" on public.tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "own tasks: insert" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own tasks: update" on public.tasks
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks: delete" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

create or replace function public.tasks_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.tasks_touch_updated_at();
