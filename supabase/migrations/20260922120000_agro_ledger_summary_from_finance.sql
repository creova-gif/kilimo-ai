-- KILIMO AI — the public Agro ID verification reads the farmer's REAL ledger.
--
-- verify-agro-id returns an aggregate (entry count, first/last date, net band) from
-- `agro_ledger_summary`. That view aggregated `agro_ledger`, which the app filled from a
-- device-local store seeded with sample transactions. The farmer's ledger now lives in
-- `finance_entries` (20260921110000_finance_ledger.sql), so the view is redefined over it.
--
-- Same column names, types and order as before, so `create or replace` keeps the view's
-- grants (service_role select only) and verify-agro-id needs no change. `agro_ledger` and its
-- rows are left untouched. Entries are self-reported, so `verified_*` are 0 until a real
-- verification source exists — they never claim verification that did not happen.
create or replace view public.agro_ledger_summary
with (security_invoker = true) as
select
  f.user_id,
  count(*)                                                            as entry_count,
  0::bigint                                                           as verified_entry_count,
  coalesce(sum(f.amount_tzs) filter (where f.kind = 'income'), 0)::numeric  as total_income_tzs,
  coalesce(-sum(f.amount_tzs) filter (where f.kind = 'expense'), 0)::numeric as total_expense_tzs,
  coalesce(sum(case when f.kind = 'income' then f.amount_tzs else -f.amount_tzs end), 0)::numeric
                                                                      as net_tzs,
  0::numeric                                                          as verified_net_tzs,
  min(f.entry_date)::timestamptz                                      as first_entry_at,
  max(f.entry_date)::timestamptz                                      as last_entry_at
from public.finance_entries f
group by f.user_id;

comment on view public.agro_ledger_summary is
  'Per-user aggregate of finance_entries for verify-agro-id. Self-reported; verified_* are 0.';

revoke all on public.agro_ledger_summary from public, anon, authenticated;
grant select on public.agro_ledger_summary to service_role;
