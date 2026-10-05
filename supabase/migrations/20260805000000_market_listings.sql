-- KILIMO AI — market listings (produce marketplace).
--
-- Backs hooks/useMarketIntelligence, which already queries this table (with a
-- realtime subscription) and falls back to seed data if it is empty/unreachable.
-- Columns match mapDbToListing() exactly.

create table if not exists public.market_listings (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid references auth.users (id) on delete set null,
  crop_name      text not null,
  crop_name_sw   text,
  quantity_kg    numeric not null check (quantity_kg >= 0),
  price_per_kg   numeric not null check (price_per_kg >= 0),
  currency       text not null default 'TZS',
  location       text,
  quality_grade  text default 'A',
  status         text not null default 'active'
                   check (status in ('active', 'sold', 'expired', 'draft')),
  smart_contract boolean not null default false,
  escrow_funded  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists market_listings_active_idx
  on public.market_listings (status, created_at desc);

alter table public.market_listings enable row level security;

-- Marketplace is browsable by any authenticated user; a seller may write only
-- their own listings.
create policy "listings: read (authenticated)" on public.market_listings
  for select to authenticated using (true);
create policy "listings: insert own" on public.market_listings
  for insert to authenticated with check (auth.uid() = seller_id);
create policy "listings: update own" on public.market_listings
  for update to authenticated using (auth.uid() = seller_id);

-- Seed a handful of active listings so the marketplace isn't empty at launch.
insert into public.market_listings
  (crop_name, crop_name_sw, quantity_kg, price_per_kg, currency, location, quality_grade, status, smart_contract, escrow_funded)
values
  ('Maize',     'Mahindi',  5000, 480,  'TZS', 'Mbeya',   'A', 'active', true,  false),
  ('Coffee',    'Kahawa',   1200, 6500, 'TZS', 'Arusha',  'A', 'active', true,  true),
  ('Rice',      'Mpunga',   3000, 1800, 'TZS', 'Morogoro','B', 'active', false, false),
  ('Beans',     'Maharage', 2000, 2600, 'TZS', 'Njombe',  'A', 'active', false, false),
  ('Sunflower', 'Alizeti',  1500, 1400, 'TZS', 'Singida', 'B', 'active', true,  false)
on conflict do nothing;
