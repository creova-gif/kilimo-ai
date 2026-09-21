-- KILIMO AI — reconcile the two notification stores the client reads.
--
-- 1. hooks/useNotifications.ts reads `public.notifications`
--    (id, user_id, title, content, type, created_at) and subscribes to INSERTs
--    on it. Only `public.user_notifications` (column `body`, not `content`)
--    exists — and it is what app/notifications.tsx and the process-notifications
--    edge function actually use. Rather than a second, divergent table, expose a
--    READ-ONLY, owner-scoped view named `notifications` that maps
--    body -> content. security_invoker makes the underlying table's RLS apply.
--    NOTE: Realtime postgres_changes cannot subscribe to a view; the client
--    should subscribe to `user_notifications` (added to the realtime publication
--    in 20260920000500) — see BACKEND_CAPABILITY_MATRIX.md.
create or replace view public.notifications
  with (security_invoker = true) as
select id, user_id, title, body as content, type, status, delivery_method, created_at
from public.user_notifications;

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant select on public.notifications to service_role;

-- 2. user_notification_preferences had SELECT + UPDATE policies but no INSERT,
--    so a farmer could never create their own row (the push-token upsert the
--    client documents in hooks/useNotifications.ts would always be rejected) and
--    process-notifications could therefore never reach them. Own-row only.
create policy "Users can insert their own preferences"
  on public.user_notification_preferences
  for insert to authenticated with check (auth.uid() = user_id);
grant insert on public.user_notification_preferences to authenticated;
