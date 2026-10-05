-- KILIMO AI — user_notifications was missing UPDATE/DELETE RLS policies.
--
-- 20260527000000_ai_rag_notifications.sql enabled RLS on user_notifications
-- with only a SELECT policy. With RLS enabled and no write policy, every
-- UPDATE/DELETE is rejected by default for every non-service-role caller —
-- including the notification's own owner. app/notifications.tsx's
-- markNotificationRead(), removeNotification(), and markAllRead() have
-- always called real .update()/.delete() against this table, but every one
-- of those calls has been silently no-op'd by RLS: Postgres returns success
-- with zero rows affected rather than an error, so the client never knew.
-- The UI only ever "worked" because of the optimistic local React state
-- update sitting on top — mark a notification read, refresh the page, and
-- it reverts to unread; delete one and it comes back.
--
-- Fix: allow a user to update/delete only their own rows, matching the
-- "own rows" ownership pattern used elsewhere in this schema (agro_ledger,
-- verification_requests, market_listings). Creating notifications stays
-- service-role-only (no INSERT policy) — a client should never be able to
-- fabricate notifications for itself.
create policy "own notifications: update" on public.user_notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own notifications: delete" on public.user_notifications
  for delete to authenticated
  using (auth.uid() = user_id);
