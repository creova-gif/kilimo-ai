-- KILIMO AI — `offline_sync_logs` table backing hooks/useSyncEngine.ts.
--
-- The client's drainQueue() inserts { sync_id, event_type, payload, created_at }
-- for every offline-queued action once connectivity returns, then removes the
-- item from its local queue only if the insert succeeds. Table was never
-- provisioned, so every sync silently failed and the queue never drained.
--
-- Append-only audit log of what a device synced. Deliberately NO unique
-- constraint on (user_id, sync_id): the client uses plain INSERT, and a unique
-- violation on a retry-after-timeout would make that item fail forever and
-- block the queue. Duplicates are harmless in a log and can be de-duped by
-- sync_id when read. No update/delete policy — the log is tamper-evident.
create table if not exists public.offline_sync_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sync_id     text not null,
  event_type  text not null
                check (event_type in ('scan_result','task_complete','market_order','irrigation_log','voice_note')),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create index if not exists offline_sync_logs_user_idx
  on public.offline_sync_logs (user_id, created_at desc);

alter table public.offline_sync_logs enable row level security;

create policy "own sync logs: select" on public.offline_sync_logs
  for select to authenticated using (auth.uid() = user_id);
create policy "own sync logs: insert" on public.offline_sync_logs
  for insert to authenticated with check (auth.uid() = user_id);

revoke all on public.offline_sync_logs from anon, authenticated;
grant select, insert on public.offline_sync_logs to authenticated;
grant all on public.offline_sync_logs to service_role;
