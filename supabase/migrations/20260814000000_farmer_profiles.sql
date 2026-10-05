-- KILIMO AI — real backend storage for the farm profile edited in
-- app/edit-profile.tsx.
--
-- Before this migration, "Save Changes" on that screen only ever wrote to
-- local Zustand state (persisted to AsyncStorage/localStorage on-device via
-- the store's persist middleware) — never to Supabase. The screen's own
-- subtitle claims "Changes refine your AI recommendations immediately," but
-- there was no server-side row for a recommendation engine to read: a
-- reinstall or new device loses the entire profile, and
-- supabase/functions/rag-chat/index.ts was already (separately, before this
-- migration) querying a `user_profiles` table for location/farm_size/
-- active_crops context that has never existed in any migration — that
-- lookup has always silently returned nothing.
--
-- This table is the real source of truth for both sides of that gap.
-- Unlike agro_profiles (server-authoritative identity, no client write
-- policy — see 20260625000100_agro_profiles.sql) or agro_ledger
-- (tamper-evident, append-only), a farm profile is ordinary user-editable
-- data: full read/write on your own row is the correct, safe default here.
create table if not exists public.farmer_profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  name              text,
  role              text,
  region            text,
  primary_crops     text[] not null default '{}',
  farm_size_acres   numeric,
  main_activity     text check (main_activity in ('mazao', 'mifugo', 'mchanganyiko')),
  has_livestock     boolean not null default false,
  has_irrigation    boolean not null default false,
  language          text,
  updated_at        timestamptz not null default now()
);

alter table public.farmer_profiles enable row level security;

create policy "own profile: select" on public.farmer_profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "own profile: insert" on public.farmer_profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile: update" on public.farmer_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
