-- KILIMO AI — IoT device registry + manual readings, and insurance policy / claim RECORDS (KIL-004).
--
-- These tables back app/iot-systems.tsx and app/insurance.tsx, which used to be simulations
-- (fake hardware, fake camera, fake claim submission). They are now user-owned records:
--
--   iot_devices / iot_readings
--     A farmer registers a sensor and logs readings by hand (source = 'manual'). Automatic hardware
--     ingestion does NOT exist yet. `source = 'device'` and `last_seen_at` are reserved for a future
--     ingestion service running as service_role; authenticated clients are deliberately NOT allowed
--     to insert `source = 'device'` rows, so a device-sourced reading can only ever come from the
--     server (RLS with-check below).
--
--   insurance_policies / insurance_claims
--     A farmer records the policies they hold and the claims they intend to make. Nothing here talks
--     to an insurer. `insurance_claims.status = 'submitted_record'` means "the farmer marked that they
--     sent it to their insurer themselves" — it is a bookkeeping flag, not a filing.
--
-- Ownership: `user_id` defaults to auth.uid() (the client never sends it) and RLS pins every
-- operation to the owner, like public.tasks. Additive and idempotent: safe to re-run.

-- ── iot_devices ─────────────────────────────────────────────────────────────
create table if not exists public.iot_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 80),
  kind         text not null
                 check (kind in ('soil_moisture','weather_station','water_level','temperature','irrigation_controller','other')),
  -- Optional pointer to a plot. Deliberately NO foreign key: the plots table is owned by another
  -- workstream and a device must survive a plot being removed.
  plot_id      uuid,
  location     text check (location is null or length(location) <= 120),
  status       text not null default 'registered'
                 check (status in ('registered','online','offline')),
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists iot_devices_user_created_idx
  on public.iot_devices (user_id, created_at desc);

alter table public.iot_devices enable row level security;

drop policy if exists "own iot_devices: select" on public.iot_devices;
create policy "own iot_devices: select" on public.iot_devices
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own iot_devices: insert" on public.iot_devices;
create policy "own iot_devices: insert" on public.iot_devices
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own iot_devices: update" on public.iot_devices;
create policy "own iot_devices: update" on public.iot_devices
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own iot_devices: delete" on public.iot_devices;
create policy "own iot_devices: delete" on public.iot_devices
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.iot_devices from anon, authenticated;
grant select, insert, update, delete on public.iot_devices to authenticated;
grant all on public.iot_devices to service_role;

-- ── iot_readings ────────────────────────────────────────────────────────────
create table if not exists public.iot_readings (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.iot_devices (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric      text not null check (length(btrim(metric)) between 1 and 60),
  value       numeric not null check (value <> 'NaN'::numeric),
  unit        text check (unit is null or length(unit) <= 20),
  recorded_at timestamptz not null default now(),
  source      text not null default 'manual' check (source in ('manual','device'))
);

create index if not exists iot_readings_device_recorded_idx
  on public.iot_readings (device_id, recorded_at desc);
create index if not exists iot_readings_user_recorded_idx
  on public.iot_readings (user_id, recorded_at desc);

alter table public.iot_readings enable row level security;

drop policy if exists "own iot_readings: select" on public.iot_readings;
create policy "own iot_readings: select" on public.iot_readings
  for select to authenticated using (auth.uid() = user_id);

-- A client may only log MANUAL readings, and only against a device it owns (the sub-select is itself
-- subject to iot_devices' select policy, so another user's device id resolves to no row).
drop policy if exists "own iot_readings: insert" on public.iot_readings;
create policy "own iot_readings: insert" on public.iot_readings
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and source = 'manual'
    and exists (
      select 1 from public.iot_devices d
      where d.id = device_id and d.user_id = auth.uid()
    )
  );

-- Readings are an append-only log from the client's point of view (no update); a wrong entry can be deleted.
drop policy if exists "own iot_readings: delete" on public.iot_readings;
create policy "own iot_readings: delete" on public.iot_readings
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.iot_readings from anon, authenticated;
grant select, insert, delete on public.iot_readings to authenticated;
grant all on public.iot_readings to service_role;

-- When the (future, server-side) ingestion service writes a device-sourced reading it marks the
-- device as seen. Manual readings never touch last_seen_at: the farmer typing a number is not the
-- device reporting in, and the app must not claim otherwise.
create or replace function public.iot_readings_mark_device_seen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.iot_devices
     set last_seen_at = greatest(coalesce(last_seen_at, new.recorded_at), new.recorded_at),
         status = 'online'
   where id = new.device_id;
  return new;
end;
$$;

drop trigger if exists iot_readings_mark_device_seen on public.iot_readings;
create trigger iot_readings_mark_device_seen
  after insert on public.iot_readings
  for each row when (new.source = 'device')
  execute function public.iot_readings_mark_device_seen();

-- ── insurance_policies ──────────────────────────────────────────────────────
create table if not exists public.insurance_policies (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider         text not null check (length(btrim(provider)) between 1 and 120),
  policy_number    text check (policy_number is null or length(policy_number) <= 60),
  crop_or_asset    text not null check (length(btrim(crop_or_asset)) between 1 and 120),
  cover_amount_tzs numeric check (cover_amount_tzs is null or cover_amount_tzs >= 0),
  premium_tzs      numeric check (premium_tzs is null or premium_tzs >= 0),
  start_date       date not null,
  end_date         date not null,
  status           text not null default 'active' check (status in ('active','expired','cancelled')),
  notes            text check (notes is null or length(notes) <= 1000),
  created_at       timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists insurance_policies_user_end_idx
  on public.insurance_policies (user_id, end_date desc);

alter table public.insurance_policies enable row level security;

drop policy if exists "own insurance_policies: select" on public.insurance_policies;
create policy "own insurance_policies: select" on public.insurance_policies
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own insurance_policies: insert" on public.insurance_policies;
create policy "own insurance_policies: insert" on public.insurance_policies
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own insurance_policies: update" on public.insurance_policies;
create policy "own insurance_policies: update" on public.insurance_policies
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own insurance_policies: delete" on public.insurance_policies;
create policy "own insurance_policies: delete" on public.insurance_policies
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.insurance_policies from anon, authenticated;
grant select, insert, update, delete on public.insurance_policies to authenticated;
grant all on public.insurance_policies to service_role;

-- ── insurance_claims ────────────────────────────────────────────────────────
create table if not exists public.insurance_claims (
  id                  uuid primary key default gen_random_uuid(),
  policy_id           uuid not null references public.insurance_policies (id) on delete cascade,
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  incident_date       date not null,
  incident_type       text not null
                        check (incident_type in ('drought','flood','pest','disease','fire','theft','other')),
  description         text not null check (length(btrim(description)) between 1 and 2000),
  estimated_loss_tzs  numeric check (estimated_loss_tzs is null or estimated_loss_tzs >= 0),
  -- draft            = the farmer is still preparing the record.
  -- submitted_record = the farmer marked that THEY sent it to their insurer. The app never sends it.
  -- closed           = the farmer marked it finished.
  status              text not null default 'draft' check (status in ('draft','submitted_record','closed')),
  created_at          timestamptz not null default now()
);

create index if not exists insurance_claims_policy_idx
  on public.insurance_claims (policy_id, incident_date desc);
create index if not exists insurance_claims_user_created_idx
  on public.insurance_claims (user_id, created_at desc);

alter table public.insurance_claims enable row level security;

drop policy if exists "own insurance_claims: select" on public.insurance_claims;
create policy "own insurance_claims: select" on public.insurance_claims
  for select to authenticated using (auth.uid() = user_id);

-- A claim can only hang off a policy the same user owns.
drop policy if exists "own insurance_claims: insert" on public.insurance_claims;
create policy "own insurance_claims: insert" on public.insurance_claims
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "own insurance_claims: update" on public.insurance_claims;
create policy "own insurance_claims: update" on public.insurance_claims
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "own insurance_claims: delete" on public.insurance_claims;
create policy "own insurance_claims: delete" on public.insurance_claims
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.insurance_claims from anon, authenticated;
grant select, insert, update, delete on public.insurance_claims to authenticated;
grant all on public.insurance_claims to service_role;
