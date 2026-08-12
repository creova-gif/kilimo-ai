-- KILIMO AI — add the missing `notes` column to market_listings.
--
-- app/(tabs)/market.tsx's SellListingModal already has a "MAELEZO ZAIDI
-- (HIARI)" / "More details (optional)" free-text field, but market_listings
-- had no column to persist it — the value was collected in the UI and then
-- silently dropped. Adding it here so the listing-creation flow (wired up in
-- this same change) can actually save what the farmer typed.
alter table public.market_listings add column if not exists notes text;
