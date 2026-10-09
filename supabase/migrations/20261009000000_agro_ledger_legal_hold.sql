-- KILIMO AI — CRE-179 / CRE-83 legal hold: server-side hard-off for real
-- ledger rows.
--
-- Legal ruling (Rex, via Dr Mafie, 2026-10-09): real farmer ledger data must
-- not be synced to the server until Linear CRE-83 clears. The app already
-- refuses to push non-synthetic entries (lib/credit/ledgerSync.ts), but the
-- original insert policy (20260625000000_agro_ledger.sql) still accepted any
-- authenticated 'self_reported' row, so older builds or a direct supabase-js
-- call could still insert real data. This migration makes the server fail
-- closed too:
--
--   1. Clients may insert ONLY synthetic, unverified rows. Real
--      ('self_reported' / 'verified') inserts are rejected by RLS.
--   2. agro_ledger_summary aggregates only non-synthetic rows, so synthetic
--      test data can never mix into a farmer's real totals.
--
-- Existing rows are untouched (no deletes). The service role bypasses RLS,
-- as before; no server process writes agro_ledger today.
--
-- Lifting the hold is a reviewed migration that links Rex's written
-- clearance in CRE-179 / CRE-83. Deploying this file is a separate, manual
-- step (Justin); merging the PR does not apply it.

-- Provenance columns. They exist since 20260625000000; `if not exists` keeps
-- this safe on any environment created from an older schema.
alter table public.agro_ledger
  add column if not exists source text not null default 'self_reported';
alter table public.agro_ledger
  add column if not exists verified boolean not null default false;

-- 1. Insert policy: synthetic rows only.
drop policy if exists "own rows: insert" on public.agro_ledger;
drop policy if exists "own rows: insert synthetic only" on public.agro_ledger;
create policy "own rows: insert synthetic only" on public.agro_ledger
  for insert with check (
    auth.uid() = user_id
    and source = 'synthetic'
    and verified = false
  );

-- 2. Summary view: real rows only, never mixed with synthetic ones.
--    (Same columns, same order, so `create or replace` keeps its grants.)
create or replace view public.agro_ledger_summary
  with (security_invoker = true)
as
select
  user_id,
  count(*)                                          as entry_count,
  count(*) filter (where verified)                  as verified_entry_count,
  coalesce(sum(amount_tzs) filter (where amount_tzs > 0), 0) as total_income_tzs,
  coalesce(sum(amount_tzs) filter (where amount_tzs < 0), 0) as total_expense_tzs,
  coalesce(sum(amount_tzs), 0)                      as net_tzs,
  coalesce(sum(amount_tzs) filter (where verified), 0) as verified_net_tzs,
  min(entry_date)                                   as first_entry_at,
  max(entry_date)                                   as last_entry_at
from public.agro_ledger
where source <> 'synthetic'
group by user_id;

comment on view public.agro_ledger_summary is
  'Per-user totals of NON-synthetic ledger rows only (CRE-179). Service role only; see 20260812000000_knowledge_base_rls.sql.';

-- Keep the 20260812000000 lockdown in force.
revoke all on public.agro_ledger_summary from anon, authenticated;
