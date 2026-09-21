-- KILIMO AI — explicit Data-API grants for every existing table/view/function.
--
-- WHY: current Supabase Postgres images (verified on supabase/postgres
-- 17.6.1.084, the image `supabase start` runs) no longer auto-grant
-- SELECT/INSERT/UPDATE/DELETE on new `public` tables to anon / authenticated /
-- service_role — default ACLs for role `postgres` in schema public are now
-- only `Dxtm` (truncate/references/trigger/maintain). Every earlier migration
-- in this repo relied on the old implicit grants, so on a fresh project the
-- API answered `42501 permission denied for table ...` to *everyone*, including
-- service_role (which is why every service-role edge function — mint-agro-id,
-- verify-agro-id, submit-verification, delete-account, rag-chat — failed).
--
-- This migration is idempotent and also safe on older projects that still have
-- the implicit grants: it first REVOKEs everything from anon/authenticated on
-- the app's tables (RLS alone is a weaker posture than RLS + least-privilege
-- grants), then GRANTs exactly what each table's RLS policies actually allow.
-- `anon` gets nothing: no client path in the app reads or writes these tables
-- unauthenticated (verify-agro-id reads via the service role).

-- ── revoke the broad legacy grants ─────────────────────────────────────────
revoke all on public.agro_ledger                 from anon, authenticated;
revoke all on public.agro_profiles               from anon, authenticated;
revoke all on public.verification_requests       from anon, authenticated;
revoke all on public.market_listings             from anon, authenticated;
revoke all on public.knowledge_base              from anon, authenticated;
revoke all on public.user_notification_preferences from anon, authenticated;
revoke all on public.user_notifications          from anon, authenticated;
revoke all on public.farmer_profiles             from anon, authenticated;
revoke all on public.agro_ledger_summary         from anon, authenticated;

-- ── service_role: trusted server processes (edge functions) ────────────────
grant all on public.agro_ledger                 to service_role;
grant all on public.agro_profiles               to service_role;
grant all on public.verification_requests       to service_role;
grant all on public.market_listings             to service_role;
grant all on public.knowledge_base              to service_role;
grant all on public.user_notification_preferences to service_role;
grant all on public.user_notifications          to service_role;
grant all on public.farmer_profiles             to service_role;
grant select on public.agro_ledger_summary      to service_role;

-- ── authenticated: only what the RLS policies permit ───────────────────────
-- agro_ledger: append-only (select + insert; no update/delete policy exists).
grant select, insert         on public.agro_ledger        to authenticated;
-- server-minted identity / KYC state: read-only for the owner.
grant select                 on public.agro_profiles      to authenticated;
grant select                 on public.verification_requests to authenticated;
-- marketplace: browse all, write own (policies enforce seller_id = auth.uid()).
grant select, insert, update on public.market_listings    to authenticated;
-- notifications the user can mark read / dismiss; creation is service-role only.
grant select, update, delete on public.user_notifications to authenticated;
grant select, update         on public.user_notification_preferences to authenticated;
-- farm profile: ordinary user-editable data.
grant select, insert, update on public.farmer_profiles    to authenticated;
-- knowledge_base + agro_ledger_summary: intentionally NO client grant.

-- ── RPC: match_knowledge is only called by rag-chat (service role) ─────────
revoke all on function public.match_knowledge(vector, float, int) from public, anon, authenticated;
grant execute on function public.match_knowledge(vector, float, int) to service_role;
