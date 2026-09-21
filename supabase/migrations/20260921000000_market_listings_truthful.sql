-- KILIMO AI — make the marketplace truthful.
--
-- 1. 20260805000000 seeded five "active" listings with NO seller (Maize 5000 kg Mbeya,
--    Coffee 6500/kg with escrow_funded = true, …). They are invented: they appeared to every user
--    as real offers, and one claimed funded escrow. Real listings always have a seller
--    (delete-account purges a departing user's listings), so seller_id IS NULL identifies exactly
--    the seeds.
delete from public.market_listings where seller_id is null;

-- 2. Escrow / smart-contract flags are claims about money that no backend can back yet. Clients
--    could set them to true on their own listings. Only the service role may set them; a seller
--    can neither insert nor update a listing into a "funded escrow" state.
drop policy if exists "listings: insert own" on public.market_listings;
drop policy if exists "listings: update own" on public.market_listings;

create policy "listings: insert own" on public.market_listings
  for insert to authenticated
  with check (auth.uid() = seller_id and escrow_funded = false and smart_contract = false);

create policy "listings: update own" on public.market_listings
  for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id and escrow_funded = false and smart_contract = false);

-- 3. Opt-in seller contact. The seller's account phone is private (auth.users is not readable by
--    other users), so "contact seller" needs a number the seller chose to publish on the listing.
alter table public.market_listings
  add column if not exists contact_phone text
  check (contact_phone is null or contact_phone ~ '^\+[0-9]{8,15}$');
