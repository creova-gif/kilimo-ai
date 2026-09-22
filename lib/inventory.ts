/**
 * Inventory data layer (KIL-004): stocked items + an append-only movement ledger.
 *
 * Backed by `public.inventory_items` and `public.inventory_movements` (migration 20260921120000).
 * Stock consistency is enforced by a Postgres trigger: inserting a movement adds its `delta` to the
 * item's quantity in the same transaction, and a movement that would make stock negative is
 * rejected atomically. `stockAfter()` / `movementDelta()` mirror that arithmetic client-side (for
 * previews and validation); the server stays the source of truth and the app re-reads after a write.
 */
import {
  classifyDbError,
  daysFromToday,
  errorMessage,
  fail,
  isIsoDate,
  parseDecimal,
  round6,
  todayIso,
  trimOrNull,
  type Fail,
} from './recordsCommon';

export const CATEGORIES = ['seed', 'fertiliser', 'pesticide', 'feed', 'tool', 'produce', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const REASONS = ['purchase', 'use', 'sale', 'loss', 'adjustment'] as const;
export type Reason = (typeof REASONS)[number];

/** Quick-pick units. The column is free text, so an item may carry any other unit. */
export const UNITS = ['kg', 'L', 'bag', 'piece', 'pack'] as const;

/** Items expiring within this many days are flagged. */
export const EXPIRY_WARN_DAYS = 30;

/** Marker the database writes on the movement it creates for an item's opening stock. */
export const OPENING_STOCK_NOTE = 'opening_stock';

export interface Item {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  unitCost: number | null;
  location: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  itemId: string;
  delta: number;
  reason: Reason;
  movementDate: string;
  note: string | null;
  createdAt: string;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function mapItemRow(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'other',
    quantity: Number(row.quantity ?? 0),
    unit: row.unit ?? 'kg',
    lowStockThreshold: num(row.low_stock_threshold),
    unitCost: num(row.unit_cost),
    location: row.location ?? null,
    expiryDate: row.expiry_date ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMovementRow(row: any): Movement {
  return {
    id: row.id,
    itemId: row.item_id,
    delta: Number(row.delta),
    reason: row.reason,
    movementDate: row.movement_date,
    note: row.note ?? null,
    createdAt: row.created_at,
  };
}

/* ── stock math (pure) ───────────────────────────────────────────────────────────────────────── */
/** Stock after applying `delta`, or null if that would make it negative (the DB rejects it too). */
export function stockAfter(current: number, delta: number): number | null {
  const next = round6(current + delta);
  return next < 0 ? null : next;
}

export type Direction = 'in' | 'out';

/**
 * Signed delta for a movement. Purchases always add; use / sale / loss always remove; an
 * adjustment goes whichever way `direction` says. `amount` is the positive number the farmer typed.
 * Mirrors the `inventory_movements_direction_ck` constraint.
 */
export function movementDelta(reason: Reason, amount: number, direction: Direction = 'in'): number {
  const a = Math.abs(amount);
  switch (reason) {
    case 'purchase':
      return a;
    case 'use':
    case 'sale':
    case 'loss':
      return -a;
    case 'adjustment':
      return direction === 'out' ? -a : a;
  }
}

/** Running balance after each movement, oldest to newest, from a starting quantity. */
export function replayStock(opening: number, deltas: number[]): number {
  return round6(deltas.reduce((sum, d) => sum + d, opening));
}

/**
 * Stock level after each movement, for a newest-first movement list and the item's current
 * quantity: entry i is the balance right after movement i. (The list must be the item's complete
 * history for the balances to be exact.)
 */
export function runningBalances(currentQuantity: number, movementsNewestFirst: Movement[]): number[] {
  const out: number[] = [];
  let balance = currentQuantity;
  for (const m of movementsNewestFirst) {
    out.push(round6(balance));
    balance = round6(balance - m.delta);
  }
  return out;
}

export const isOutOfStock = (item: Pick<Item, 'quantity'>) => item.quantity <= 0;

/** Low when a threshold is set and stock has fallen to it (or below). No threshold = no alert. */
export function isLowStock(item: Pick<Item, 'quantity' | 'lowStockThreshold'>): boolean {
  return item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;
}

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired';

export function expiryStatus(
  item: Pick<Item, 'expiryDate'>,
  now: Date = new Date(),
  warnDays: number = EXPIRY_WARN_DAYS
): { state: ExpiryState; daysLeft: number | null } {
  if (!isIsoDate(item.expiryDate)) return { state: 'none', daysLeft: null };
  const daysLeft = daysFromToday(item.expiryDate, now);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  if (daysLeft <= warnDays) return { state: 'soon', daysLeft };
  return { state: 'ok', daysLeft };
}

export interface InventorySummary {
  itemCount: number;
  lowStock: Item[];
  expiring: { item: Item; daysLeft: number }[];
  expired: { item: Item; daysLeft: number }[];
  /** Sum of quantity x unit cost, over items that have a cost recorded (TZS). */
  totalValue: number;
  /** How many items have no unit cost, i.e. are not part of totalValue. */
  unvalued: number;
}

export function inventorySummary(items: Item[], now: Date = new Date()): InventorySummary {
  const lowStock = items.filter(isLowStock);
  const expiring: InventorySummary['expiring'] = [];
  const expired: InventorySummary['expired'] = [];
  let totalValue = 0;
  let unvalued = 0;
  for (const item of items) {
    const ex = expiryStatus(item, now);
    if (ex.state === 'soon') expiring.push({ item, daysLeft: ex.daysLeft as number });
    if (ex.state === 'expired') expired.push({ item, daysLeft: ex.daysLeft as number });
    if (item.unitCost === null) unvalued += 1;
    else totalValue += item.quantity * item.unitCost;
  }
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  expired.sort((a, b) => b.daysLeft - a.daysLeft);
  return { itemCount: items.length, lowStock, expiring, expired, totalValue, unvalued };
}

/** Newest first; ties broken by when the movement was recorded. */
export function sortMovements(movements: Movement[]): Movement[] {
  return [...movements].sort((a, b) =>
    a.movementDate === b.movementDate
      ? b.createdAt.localeCompare(a.createdAt)
      : b.movementDate.localeCompare(a.movementDate)
  );
}

export function filterItems(items: Item[], category: Category | 'all'): Item[] {
  return category === 'all' ? items : items.filter((i) => i.category === category);
}

export function categoryCounts(items: Item[]): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const i of items) out[i.category] += 1;
  return out;
}

/** 0..1 fill for the stock bar: quantity relative to twice the alert level (or itself if none). */
export function stockFill(item: Pick<Item, 'quantity' | 'lowStockThreshold'>): number {
  const max = Math.max(item.quantity, (item.lowStockThreshold ?? 0) * 2, 1);
  return Math.min(1, Math.max(0, item.quantity / max));
}

/* ── validation ──────────────────────────────────────────────────────────────────────────────── */
export interface ItemInput {
  name: string;
  category: Category;
  /** Opening stock. Only used when creating; afterwards stock changes through movements. */
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  unitCost: string;
  location: string;
  expiryDate: string;
  notes: string;
}

export const emptyItemInput = (): ItemInput => ({
  name: '',
  category: 'seed',
  quantity: '',
  unit: 'kg',
  lowStockThreshold: '',
  unitCost: '',
  location: '',
  expiryDate: '',
  notes: '',
});

export function itemToInput(i: Item): ItemInput {
  return {
    name: i.name,
    category: i.category,
    quantity: String(i.quantity),
    unit: i.unit,
    lowStockThreshold: i.lowStockThreshold === null ? '' : String(i.lowStockThreshold),
    unitCost: i.unitCost === null ? '' : String(i.unitCost),
    location: i.location ?? '',
    expiryDate: i.expiryDate ?? '',
    notes: i.notes ?? '',
  };
}

export interface ItemErrors {
  name?: 'required';
  unit?: 'required';
  quantity?: 'invalid';
  lowStockThreshold?: 'invalid';
  unitCost?: 'invalid';
  expiryDate?: 'invalid';
}

/** `creating` also validates the opening-stock quantity (blank means 0). */
export function validateItemInput(i: ItemInput, creating: boolean): ItemErrors {
  const errors: ItemErrors = {};
  if (!i.name.trim()) errors.name = 'required';
  if (!i.unit.trim()) errors.unit = 'required';
  if (creating && i.quantity.trim()) {
    const q = parseDecimal(i.quantity);
    if (q === null || q < 0) errors.quantity = 'invalid';
  }
  if (i.lowStockThreshold.trim()) {
    const t = parseDecimal(i.lowStockThreshold);
    if (t === null || t < 0) errors.lowStockThreshold = 'invalid';
  }
  if (i.unitCost.trim()) {
    const c = parseDecimal(i.unitCost);
    if (c === null || c < 0) errors.unitCost = 'invalid';
  }
  if (i.expiryDate.trim() && !isIsoDate(i.expiryDate.trim())) errors.expiryDate = 'invalid';
  return errors;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

function itemRow(i: ItemInput, creating: boolean) {
  const row: Record<string, unknown> = {
    name: i.name.trim(),
    category: i.category,
    unit: i.unit.trim(),
    low_stock_threshold: i.lowStockThreshold.trim() ? parseDecimal(i.lowStockThreshold) : null,
    unit_cost: i.unitCost.trim() ? parseDecimal(i.unitCost) : null,
    location: trimOrNull(i.location),
    expiry_date: trimOrNull(i.expiryDate),
    notes: trimOrNull(i.notes),
  };
  // quantity is deliberately omitted on update: the database rejects direct quantity changes.
  if (creating) row.quantity = i.quantity.trim() ? parseDecimal(i.quantity) : 0;
  return row;
}

export interface MovementInput {
  reason: Reason;
  amount: string;
  /** Only meaningful for an adjustment. */
  direction: Direction;
  movementDate: string;
  note: string;
}

export const emptyMovementInput = (now: Date = new Date()): MovementInput => ({
  reason: 'purchase',
  amount: '',
  direction: 'in',
  movementDate: todayIso(now),
  note: '',
});

export interface MovementErrors {
  amount?: 'invalid' | 'insufficient';
  movementDate?: 'invalid' | 'future';
}

export function validateMovementInput(
  i: MovementInput,
  currentQuantity: number,
  now: Date = new Date()
): MovementErrors {
  const errors: MovementErrors = {};
  const amount = parseDecimal(i.amount);
  if (amount === null || amount <= 0) errors.amount = 'invalid';
  else if (stockAfter(currentQuantity, movementDelta(i.reason, amount, i.direction)) === null) {
    errors.amount = 'insufficient';
  }
  const date = i.movementDate.trim();
  if (!isIsoDate(date)) errors.movementDate = 'invalid';
  else if (date > todayIso(now)) errors.movementDate = 'future';
  return errors;
}

/* ── queries / mutations ─────────────────────────────────────────────────────────────────────── */
type Client = any | null | undefined;

export async function fetchItems(client: Client): Promise<{ ok: true; items: Item[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, items: (data ?? []).map(mapItemRow) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function fetchMovements(
  client: Client,
  itemId: string
): Promise<{ ok: true; movements: Movement[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('inventory_movements')
      .select('*')
      .eq('item_id', itemId)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, movements: (data ?? []).map(mapMovementRow) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function createItem(
  client: Client,
  input: ItemInput
): Promise<{ ok: true; item: Item } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateItemInput(input, true))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('inventory_items')
      .insert(itemRow(input, true))
      .select('*')
      .single();
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, item: mapItemRow(data) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function updateItem(
  client: Client,
  id: string,
  input: ItemInput
): Promise<{ ok: true; item: Item } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateItemInput(input, false))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('inventory_items')
      .update(itemRow(input, false))
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, item: mapItemRow(data) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function deleteItem(client: Client, id: string): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('inventory_items').delete().eq('id', id);
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

/**
 * Record a stock movement. The database trigger applies it to the item's quantity atomically;
 * `quantity` in the result is the client-side prediction (re-read the item for the stored value).
 */
export async function recordMovement(
  client: Client,
  item: Pick<Item, 'id' | 'quantity'>,
  input: MovementInput,
  now: Date = new Date()
): Promise<{ ok: true; movement: Movement; quantity: number } | Fail> {
  if (!client) return fail('not_configured');
  const errors = validateMovementInput(input, item.quantity, now);
  if (errors.amount === 'insufficient') return fail('insufficient_stock');
  if (hasErrors(errors)) return fail('invalid');

  const amount = parseDecimal(input.amount) as number;
  const delta = movementDelta(input.reason, amount, input.direction);
  try {
    const { data, error } = await client
      .from('inventory_movements')
      .insert({
        item_id: item.id,
        delta,
        reason: input.reason,
        movement_date: input.movementDate.trim(),
        note: trimOrNull(input.note),
      })
      .select('*')
      .single();
    if (error) {
      // 23514 = check_violation: another device spent the stock first (inventory_items_quantity_nonneg).
      if (error.code === '23514') return fail('insufficient_stock', error.message);
      return fail(classifyDbError(error), error.message);
    }
    return {
      ok: true,
      movement: mapMovementRow(data),
      quantity: stockAfter(item.quantity, delta) ?? 0,
    };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}
