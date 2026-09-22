-- KILIMO AI — personal finance ledger + payment records.
--
-- Backs app/finance.tsx (income/expense ledger) and app/mobile-money.tsx
-- (payment records). Both screens previously showed seeded, fabricated data and
-- fake success messages; these tables make them real, per-user features.
--
-- IMPORTANT — what these tables are NOT:
--   * `finance_entries` is a farmer's own bookkeeping ledger. It is typed in by
--     the user; nothing verifies it and nothing syncs it from a mobile-money
--     account.
--   * `payment_records` is a NOTE-KEEPING table. No payment provider (M-Pesa,
--     Tigo Pesa, Airtel Money, HaloPesa, bank) is integrated, so a row here never
--     means money moved through KILIMO AI. `status` therefore has no
--     "completed/succeeded" value:
--         recorded         the user logged a payment that happened outside the app
--         pending_provider a request the user intends to make once a provider exists
--         cancelled        withdrawn by the user
--
-- Ownership: the client never sends user_id; it defaults to auth.uid() and RLS pins
-- every operation to the owner (same shape as public.tasks). There is deliberately
-- no sharing / co-op / admin policy: do not add a `using (true)` policy here.
--
-- Idempotent: safe to re-run (create ... if not exists, drop ... if exists first).

-- ── finance_entries ─────────────────────────────────────────────────────────
create table if not exists public.finance_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('income', 'expense')),
  category    text not null default 'other' check (length(category) between 1 and 40),
  amount_tzs  numeric(14, 2) not null check (amount_tzs > 0),
  description text check (description is null or length(description) <= 200),
  entry_date  date not null default current_date,
  -- Optional pointer to a farm plot. Deliberately NO foreign key: plots live in
  -- other (client-managed) tables and this ledger must not be coupled to them.
  plot_id     uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists finance_entries_user_date_idx
  on public.finance_entries (user_id, entry_date desc, created_at desc);

alter table public.finance_entries enable row level security;

drop policy if exists "own finance_entries: select" on public.finance_entries;
create policy "own finance_entries: select" on public.finance_entries
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own finance_entries: insert" on public.finance_entries;
create policy "own finance_entries: insert" on public.finance_entries
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own finance_entries: update" on public.finance_entries;
create policy "own finance_entries: update" on public.finance_entries
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own finance_entries: delete" on public.finance_entries;
create policy "own finance_entries: delete" on public.finance_entries
  for delete to authenticated using (auth.uid() = user_id);

-- Explicit grants (see 20260920000000_explicit_api_grants.sql): anon gets nothing.
revoke all on public.finance_entries from anon, authenticated;
grant select, insert, update, delete on public.finance_entries to authenticated;
grant all on public.finance_entries to service_role;

-- ── payment_records ─────────────────────────────────────────────────────────
create table if not exists public.payment_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction    text not null check (direction in ('sent', 'received', 'request')),
  counterparty text not null check (length(counterparty) between 1 and 80),
  phone        text check (phone is null or length(phone) between 8 and 16),
  amount_tzs   numeric(14, 2) not null check (amount_tzs > 0),
  network      text not null default 'other'
                 check (network in ('mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'cash', 'other')),
  reference    text check (reference is null or length(reference) <= 60),
  status       text not null default 'recorded'
                 check (status in ('recorded', 'pending_provider', 'cancelled')),
  note         text check (note is null or length(note) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Truthfulness guard: a payment that "was sent/received" is only ever a user
  -- record; a request is only ever waiting for a provider (or cancelled). Neither
  -- can be stored in the other's state.
  constraint payment_records_status_matches_direction check (
    status = 'cancelled'
    or (direction = 'request' and status = 'pending_provider')
    or (direction in ('sent', 'received') and status = 'recorded')
  )
);

create index if not exists payment_records_user_created_idx
  on public.payment_records (user_id, created_at desc);

alter table public.payment_records enable row level security;

drop policy if exists "own payment_records: select" on public.payment_records;
create policy "own payment_records: select" on public.payment_records
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own payment_records: insert" on public.payment_records;
create policy "own payment_records: insert" on public.payment_records
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own payment_records: update" on public.payment_records;
create policy "own payment_records: update" on public.payment_records
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own payment_records: delete" on public.payment_records;
create policy "own payment_records: delete" on public.payment_records
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.payment_records from anon, authenticated;
grant select, insert, update, delete on public.payment_records to authenticated;
grant all on public.payment_records to service_role;

-- ── updated_at maintenance ──────────────────────────────────────────────────
create or replace function public.finance_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists finance_entries_touch_updated_at on public.finance_entries;
create trigger finance_entries_touch_updated_at
  before update on public.finance_entries
  for each row execute function public.finance_touch_updated_at();

drop trigger if exists payment_records_touch_updated_at on public.payment_records;
create trigger payment_records_touch_updated_at
  before update on public.payment_records
  for each row execute function public.finance_touch_updated_at();
