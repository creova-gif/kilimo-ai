-- KILIMO AI — Realtime publication for tables the client subscribes to.
--
-- hooks/useMarketIntelligence.ts subscribes to postgres_changes on
-- market_listings; the notifications inbox should subscribe to
-- user_notifications. Neither was in the `supabase_realtime` publication, so
-- even with a Realtime server running no change events were ever emitted.
-- Guarded so it is a no-op where the publication does not exist.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'market_listings') then
      alter publication supabase_realtime add table public.market_listings;
    end if;
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime'
                      and schemaname = 'public' and tablename = 'user_notifications') then
      alter publication supabase_realtime add table public.user_notifications;
    end if;
  end if;
end $$;
