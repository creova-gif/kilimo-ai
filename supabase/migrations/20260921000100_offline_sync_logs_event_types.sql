-- KILIMO AI — offline_sync_logs becomes a pure AUDIT trail with an open event_type.
--
-- Before: the client's sync engine inserted every queued item into this table and then deleted the
-- item from its local queue, so the log doubled as (a broken) consumer of the queue and offline-
-- created tasks were logged but never written to `tasks`. Now lib/offline.ts is the only drainer
-- (it writes to the real tables, idempotently) and inserts ONE row here per item that reached a
-- final outcome. `payload` = { table, op, outcome: 'synced' | 'failed', attempts, error }.
--
-- The original CHECK only allowed five event types that no client code ever produced
-- (scan_result, task_complete, market_order, irrigation_log, voice_note). The queue now uses
-- task_create / task_complete / task_cancel / market_listing_create and future features register
-- their own types, so a closed list would make every audit insert fail. Loosen it to a length check.
-- Additive and idempotent: only replaces the constraint if it is still the old closed list.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'offline_sync_logs_event_type_check'
      and conrelid = 'public.offline_sync_logs'::regclass
      and pg_get_constraintdef(oid) like '%scan_result%'
  ) then
    alter table public.offline_sync_logs drop constraint offline_sync_logs_event_type_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'offline_sync_logs_event_type_check'
      and conrelid = 'public.offline_sync_logs'::regclass
  ) then
    alter table public.offline_sync_logs
      add constraint offline_sync_logs_event_type_check
      check (length(event_type) between 1 and 64);
  end if;
end $$;

comment on table public.offline_sync_logs is
  'Audit trail of offline outbox items that reached a final outcome on a device. Never consumed by the client; the queue lives on the device.';
