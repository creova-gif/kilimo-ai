-- KILIMO AI — `farms` and `plots` (KIL-003): the farmer's real land records.
--
-- The Shamba tab and the field-detail screen used to render a hard-coded ZONES array
-- ("Zone 42 - Cornfield") because no farm/plot tables existed. These two tables back the
-- real feature: a farmer creates farms, adds plots to a farm, and tracks each plot's crop and
-- lifecycle. Nothing is seeded — an empty table is a farmer who has not added a farm yet.
--
-- Ownership: the client never sends user_id; it defaults to auth.uid() and RLS pins every
-- operation to the owner (same convention as public.tasks). There is deliberately no co-op /
-- shared-access policy: no membership table exists to authorise it against.
--
-- Plots reference farms, so the plot policies also require that the parent farm belongs to the
-- caller. Without that, a user could attach a plot to someone else's farm_id (the FK alone does
-- not check ownership).
--
-- Additive + idempotent: every statement is safe to re-run; nothing is dropped except policies
-- and triggers that this migration itself (re)creates.

/* ── farms ───────────────────────────────────────────────────────────────────────────────── */
create table if not exists public.farms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 120),
  region      text check (region is null or length(region) <= 120),
  area_ha     numeric(12, 4) check (area_ha is null or area_ha >= 0),
  notes       text check (notes is null or length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists farms_user_created_idx on public.farms (user_id, created_at);
-- One farm name per farmer (case-insensitive) so the list is unambiguous.
create unique index if not exists farms_user_name_uidx on public.farms (user_id, lower(btrim(name)));

/* ── plots ───────────────────────────────────────────────────────────────────────────────── */
create table if not exists public.plots (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references public.farms (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 120),
  crop             text check (crop is null or length(crop) <= 120),
  area_ha          numeric(12, 4) check (area_ha is null or area_ha >= 0),
  planting_date    date,
  expected_harvest date,
  status           text not null default 'planned'
                     check (status in ('planned', 'growing', 'harvested', 'fallow')),
  -- Optional polygon: a JSON array of {"lat": number, "lng": number} with at least 3 vertices.
  boundary         jsonb check (
                     boundary is null
                     or (jsonb_typeof(boundary) = 'array' and jsonb_array_length(boundary) >= 3)
                   ),
  notes            text check (notes is null or length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (
    planting_date is null or expected_harvest is null or expected_harvest >= planting_date
  )
);

create index if not exists plots_farm_idx on public.plots (farm_id);
create index if not exists plots_user_created_idx on public.plots (user_id, created_at);
-- Tasks link to a plot by tasks.farm_block = plots.name (no FK exists on tasks), so a plot name
-- must identify exactly one of the farmer's plots.
create unique index if not exists plots_user_name_uidx on public.plots (user_id, lower(btrim(name)));

/* ── RLS: owner-only for every operation ─────────────────────────────────────────────────── */
alter table public.farms enable row level security;
alter table public.plots enable row level security;

drop policy if exists "own farms: select" on public.farms;
create policy "own farms: select" on public.farms
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own farms: insert" on public.farms;
create policy "own farms: insert" on public.farms
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own farms: update" on public.farms;
create policy "own farms: update" on public.farms
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own farms: delete" on public.farms;
create policy "own farms: delete" on public.farms
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "own plots: select" on public.plots;
create policy "own plots: select" on public.plots
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own plots: insert" on public.plots;
create policy "own plots: insert" on public.plots
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.farms f where f.id = plots.farm_id and f.user_id = auth.uid())
  );
drop policy if exists "own plots: update" on public.plots;
create policy "own plots: update" on public.plots
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.farms f where f.id = plots.farm_id and f.user_id = auth.uid())
  );
drop policy if exists "own plots: delete" on public.plots;
create policy "own plots: delete" on public.plots
  for delete to authenticated using (auth.uid() = user_id);

/* ── grants (see 20260920000000_explicit_api_grants.sql for why they are explicit) ───────── */
revoke all on public.farms from anon, authenticated;
revoke all on public.plots from anon, authenticated;
grant select, insert, update, delete on public.farms to authenticated;
grant select, insert, update, delete on public.plots to authenticated;
grant all on public.farms to service_role;
grant all on public.plots to service_role;

/* ── updated_at maintenance ──────────────────────────────────────────────────────────────── */
create or replace function public.farms_plots_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists farms_touch_updated_at on public.farms;
create trigger farms_touch_updated_at
  before update on public.farms
  for each row execute function public.farms_plots_touch_updated_at();

drop trigger if exists plots_touch_updated_at on public.plots;
create trigger plots_touch_updated_at
  before update on public.plots
  for each row execute function public.farms_plots_touch_updated_at();
