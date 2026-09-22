-- KILIMO AI — livestock + inventory records (KIL-004).
--
-- app/livestock.tsx and app/inventory.tsx used to run on a seeded, AsyncStorage-only
-- store with no backend. These four tables make them real, per-farmer features:
--
--   livestock            one row per animal (or flock/batch), owner-only
--   livestock_events     health/breeding/weight history per animal
--   inventory_items      one row per stocked input/produce item, owner-only
--   inventory_movements  append-only stock ledger; a trigger keeps
--                        inventory_items.quantity consistent with it (atomically)
--
-- Ownership follows 20260920000100_tasks.sql: user_id defaults to auth.uid(), RLS pins every
-- operation to the owner, anon gets nothing. Grants follow 20260920000000_explicit_api_grants.sql
-- (REVOKE broad grants, then GRANT exactly what the RLS policies allow).
--
-- This file is additive and idempotent: create table/index if not exists, drop policy/trigger
-- if exists before create, create or replace function. It contains no destructive statements.

-- ── shared updated_at trigger function ─────────────────────────────────────
create or replace function public.records_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- livestock
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.livestock (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species     text not null
                check (species in ('cattle','goat','sheep','pig','poultry','other')),
  tag_or_name text not null check (length(btrim(tag_or_name)) between 1 and 100),
  sex         text check (sex in ('female','male')),               -- null = unknown
  birth_date  date,
  breed       text check (breed is null or length(breed) <= 100),
  status      text not null default 'active'
                check (status in ('active','sold','deceased','slaughtered')),
  weight_kg   numeric check (weight_kg is null or weight_kg >= 0),
  notes       text check (notes is null or length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists livestock_user_status_idx on public.livestock (user_id, status);

alter table public.livestock enable row level security;

drop policy if exists "own livestock: select" on public.livestock;
create policy "own livestock: select" on public.livestock
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own livestock: insert" on public.livestock;
create policy "own livestock: insert" on public.livestock
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own livestock: update" on public.livestock;
create policy "own livestock: update" on public.livestock
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own livestock: delete" on public.livestock;
create policy "own livestock: delete" on public.livestock
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.livestock from anon, authenticated;
grant select, insert, update, delete on public.livestock to authenticated;
grant all on public.livestock to service_role;

drop trigger if exists livestock_touch_updated_at on public.livestock;
create trigger livestock_touch_updated_at
  before update on public.livestock
  for each row execute function public.records_touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- livestock_events
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.livestock_events (
  id            uuid primary key default gen_random_uuid(),
  animal_id     uuid not null references public.livestock (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null
                  check (kind in ('vaccination','treatment','breeding','weighing','note')),
  event_date    date not null default current_date,
  detail        text check (detail is null or length(detail) <= 2000),
  -- Only vaccinations carry a follow-up date; only weighings carry a weight.
  next_due_date date,
  weight_kg     numeric check (weight_kg is null or weight_kg >= 0),
  created_at    timestamptz not null default now(),
  constraint livestock_events_next_due_ck
    check (next_due_date is null or (kind = 'vaccination' and next_due_date >= event_date)),
  constraint livestock_events_weight_ck
    check (weight_kg is null or kind = 'weighing')
);

create index if not exists livestock_events_animal_date_idx
  on public.livestock_events (animal_id, event_date desc);
create index if not exists livestock_events_user_kind_idx
  on public.livestock_events (user_id, kind);

alter table public.livestock_events enable row level security;

drop policy if exists "own livestock_events: select" on public.livestock_events;
create policy "own livestock_events: select" on public.livestock_events
  for select to authenticated using (auth.uid() = user_id);
-- The animal must also belong to the caller, so events can never be attached to someone else's animal.
drop policy if exists "own livestock_events: insert" on public.livestock_events;
create policy "own livestock_events: insert" on public.livestock_events
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.livestock a
      where a.id = animal_id and a.user_id = auth.uid()
    )
  );
drop policy if exists "own livestock_events: delete" on public.livestock_events;
create policy "own livestock_events: delete" on public.livestock_events
  for delete to authenticated using (auth.uid() = user_id);

-- Events are a history: readable, addable, deletable (to fix a mistake) — not editable.
revoke all on public.livestock_events from anon, authenticated;
grant select, insert, delete on public.livestock_events to authenticated;
grant all on public.livestock_events to service_role;

-- A weighing keeps livestock.weight_kg = the weight of the most recent weighing.
create or replace function public.livestock_events_apply_weight()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.kind = 'weighing' and new.weight_kg is not null then
    update public.livestock l
       set weight_kg = new.weight_kg
     where l.id = new.animal_id
       and not exists (
         select 1 from public.livestock_events e
          where e.animal_id = new.animal_id
            and e.kind = 'weighing'
            and e.weight_kg is not null
            and e.id <> new.id
            and e.event_date > new.event_date
       );
  end if;
  return new;
end;
$$;

drop trigger if exists livestock_events_apply_weight on public.livestock_events;
create trigger livestock_events_apply_weight
  after insert on public.livestock_events
  for each row execute function public.livestock_events_apply_weight();

-- ════════════════════════════════════════════════════════════════════════════
-- inventory_items
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.inventory_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (length(btrim(name)) between 1 and 200),
  category            text not null default 'other'
                        check (category in ('seed','fertiliser','pesticide','feed','tool','produce','other')),
  quantity            numeric not null default 0,
  unit                text not null default 'kg' check (length(btrim(unit)) between 1 and 20),
  low_stock_threshold numeric check (low_stock_threshold is null or low_stock_threshold >= 0),
  unit_cost           numeric check (unit_cost is null or unit_cost >= 0),   -- TZS per unit
  location            text check (location is null or length(location) <= 200),
  expiry_date         date,
  notes               text check (notes is null or length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Stock can never go negative; a movement that would push it below zero fails atomically.
  constraint inventory_items_quantity_nonneg check (quantity >= 0)
);

create index if not exists inventory_items_user_idx on public.inventory_items (user_id, category);

alter table public.inventory_items enable row level security;

drop policy if exists "own inventory_items: select" on public.inventory_items;
create policy "own inventory_items: select" on public.inventory_items
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own inventory_items: insert" on public.inventory_items;
create policy "own inventory_items: insert" on public.inventory_items
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own inventory_items: update" on public.inventory_items;
create policy "own inventory_items: update" on public.inventory_items
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own inventory_items: delete" on public.inventory_items;
create policy "own inventory_items: delete" on public.inventory_items
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.inventory_items from anon, authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant all on public.inventory_items to service_role;

drop trigger if exists inventory_items_touch_updated_at on public.inventory_items;
create trigger inventory_items_touch_updated_at
  before update on public.inventory_items
  for each row execute function public.records_touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- inventory_movements  (append-only stock ledger)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.inventory_items (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  delta         numeric not null check (delta <> 0),
  reason        text not null
                  check (reason in ('purchase','use','sale','loss','adjustment')),
  movement_date date not null default current_date,
  -- The literal 'opening_stock' marks the row written when an item is created with stock;
  -- the app localises it. Any other value is the farmer's own note.
  note          text check (note is null or length(note) <= 500),
  created_at    timestamptz not null default now(),
  -- Direction must match the reason; an adjustment may go either way.
  constraint inventory_movements_direction_ck check (
    (reason = 'purchase' and delta > 0)
    or (reason in ('use','sale','loss') and delta < 0)
    or reason = 'adjustment'
  )
);

create index if not exists inventory_movements_item_date_idx
  on public.inventory_movements (item_id, movement_date desc, created_at desc);

alter table public.inventory_movements enable row level security;

drop policy if exists "own inventory_movements: select" on public.inventory_movements;
create policy "own inventory_movements: select" on public.inventory_movements
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own inventory_movements: insert" on public.inventory_movements;
create policy "own inventory_movements: insert" on public.inventory_movements
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.inventory_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Append-only: no update/delete for clients, so history always adds up to the current stock.
-- (Deleting an item still removes its movements through the ON DELETE CASCADE foreign key.)
revoke all on public.inventory_movements from anon, authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;

-- ── keeping quantity consistent with the ledger ────────────────────────────
-- 1) A direct client INSERT into inventory_movements adds `delta` to the item's quantity in the
--    same transaction. If that would make stock negative, inventory_items_quantity_nonneg raises
--    23514 and the movement row is rolled back with it.
-- 2) A direct UPDATE of inventory_items.quantity is rejected: quantity only changes through
--    movements. pg_trigger_depth() distinguishes the two: 1 = client statement, 2 = fired from
--    inside another trigger of ours.
-- 3) Creating an item with stock > 0 records an 'opening_stock' adjustment so the history adds up.
--    That movement is inserted from inside a trigger (depth 2), so step 1 skips it — the
--    quantity is already on the new item row.
create or replace function public.inventory_movements_apply()
returns trigger language plpgsql set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  update public.inventory_items
     set quantity = quantity + new.delta
   where id = new.item_id;

  if not found then
    raise exception 'inventory item % not found', new.item_id using errcode = 'P0002';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_movements_apply on public.inventory_movements;
create trigger inventory_movements_apply
  after insert on public.inventory_movements
  for each row execute function public.inventory_movements_apply();

create or replace function public.inventory_items_guard_quantity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.quantity is distinct from old.quantity and pg_trigger_depth() < 2 then
    raise exception 'inventory quantity can only change through inventory_movements'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_guard_quantity on public.inventory_items;
create trigger inventory_items_guard_quantity
  before update on public.inventory_items
  for each row execute function public.inventory_items_guard_quantity();

create or replace function public.inventory_items_opening_stock()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.quantity > 0 then
    insert into public.inventory_movements (item_id, user_id, delta, reason, movement_date, note)
    values (new.id, new.user_id, new.quantity, 'adjustment', current_date, 'opening_stock');
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_opening_stock on public.inventory_items;
create trigger inventory_items_opening_stock
  after insert on public.inventory_items
  for each row execute function public.inventory_items_opening_stock();
