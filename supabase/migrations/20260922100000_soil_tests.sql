-- KILIMO AI — `soil_tests` (KIL-003 remainder): soil test results the farmer enters themselves.
--
-- The soil-analysis screen used to show a hard-coded pH trend (6.8 → 5.2), fixed N/P/K bars and a
-- "CRITICAL pH ANOMALY DETECTED" banner that no measurement ever produced. This table backs the
-- real feature: a farmer records the results of a lab report or soil test kit against one of their
-- plots, and the screen shows only those values. Nothing is seeded.
--
-- Every measurement column is optional (a kit may give only pH), but a row must carry at least one
-- measurement. Units are fixed by the column name so values stay comparable over time.
--
-- Ownership follows public.plots: user_id defaults to auth.uid(), RLS pins every operation to the
-- owner, and inserts/updates also require that the referenced plot belongs to the caller (the FK
-- alone does not check ownership).
--
-- Additive + idempotent: safe to re-run; only policies this migration itself creates are dropped.

create table if not exists public.soil_tests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plot_id             uuid not null references public.plots (id) on delete cascade,
  tested_on           date not null,
  ph                  numeric(4, 2) check (ph is null or (ph >= 0 and ph <= 14)),
  nitrogen_pct        numeric(6, 3) check (nitrogen_pct is null or (nitrogen_pct >= 0 and nitrogen_pct <= 100)),
  phosphorus_ppm      numeric(10, 2) check (phosphorus_ppm is null or (phosphorus_ppm >= 0 and phosphorus_ppm <= 10000)),
  potassium_ppm       numeric(10, 2) check (potassium_ppm is null or (potassium_ppm >= 0 and potassium_ppm <= 100000)),
  organic_matter_pct  numeric(6, 3) check (organic_matter_pct is null or (organic_matter_pct >= 0 and organic_matter_pct <= 100)),
  source              text not null default 'other' check (source in ('lab', 'kit', 'other')),
  notes               text check (notes is null or length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  check (
    ph is not null or nitrogen_pct is not null or phosphorus_ppm is not null
    or potassium_ppm is not null or organic_matter_pct is not null
  )
);

create index if not exists soil_tests_user_tested_idx on public.soil_tests (user_id, tested_on);
create index if not exists soil_tests_plot_idx on public.soil_tests (plot_id);

/* ── RLS: owner-only for every operation ─────────────────────────────────────────────────── */
alter table public.soil_tests enable row level security;

drop policy if exists "own soil_tests: select" on public.soil_tests;
create policy "own soil_tests: select" on public.soil_tests
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own soil_tests: insert" on public.soil_tests;
create policy "own soil_tests: insert" on public.soil_tests
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.plots p where p.id = soil_tests.plot_id and p.user_id = auth.uid())
  );
drop policy if exists "own soil_tests: update" on public.soil_tests;
create policy "own soil_tests: update" on public.soil_tests
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.plots p where p.id = soil_tests.plot_id and p.user_id = auth.uid())
  );
drop policy if exists "own soil_tests: delete" on public.soil_tests;
create policy "own soil_tests: delete" on public.soil_tests
  for delete to authenticated using (auth.uid() = user_id);

/* ── grants (see 20260920000000_explicit_api_grants.sql for why they are explicit) ───────── */
revoke all on public.soil_tests from anon, authenticated;
grant select, insert, update, delete on public.soil_tests to authenticated;
grant all on public.soil_tests to service_role;
