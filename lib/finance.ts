/**
 * Finance ledger data layer — a farmer's own income/expense bookkeeping.
 *
 * Backed by `public.finance_entries` (owner-only RLS; migration 20260921110000). Everything here is
 * either a pure helper (money maths, month bucketing, export) or a thin CRUD wrapper around an
 * injected Supabase client, so it is unit-testable without a network. Nothing is seeded: an empty
 * table is an empty ledger. Entries are typed in by the user — nothing here syncs from, or claims to
 * be confirmed by, a mobile-money provider.
 *
 * Money is held as TZS numbers with at most 2 decimals (numeric(14,2) in the DB). All sums go through
 * integer cents so 0.1 + 0.2 style float drift can never show up in a total.
 */
/* ── types ───────────────────────────────────────────────────────────────────────────────── */
export type EntryKind = 'income' | 'expense';

/** Stable storage keys (the UI localises them). Unknown stored values render as `other`. */
export const FINANCE_CATEGORIES = [
  'crops',
  'inputs',
  'transport',
  'irrigation',
  'labour',
  'tools',
  'other',
] as const;
export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];

export interface FinanceEntry {
  id: string;
  kind: EntryKind;
  category: FinanceCategory;
  amountTzs: number;
  description: string;
  /** Calendar date, `YYYY-MM-DD` (the farmer's local day — not a timestamp). */
  entryDate: string;
  plotId: string | null;
  createdAt: string;
}

export function normalizeCategory(value: unknown): FinanceCategory {
  return (FINANCE_CATEGORIES as readonly string[]).includes(value as string)
    ? (value as FinanceCategory)
    : 'other';
}

export function mapEntryRow(row: any): FinanceEntry {
  return {
    id: row.id,
    kind: row.kind === 'expense' ? 'expense' : 'income',
    category: normalizeCategory(row.category),
    amountTzs: Number(row.amount_tzs),
    description: row.description ?? '',
    entryDate: String(row.entry_date ?? '').slice(0, 10),
    plotId: row.plot_id ?? null,
    createdAt: row.created_at,
  };
}

/* ── money ───────────────────────────────────────────────────────────────────────────────── */
/** numeric(14,2) tops out at 99,999,999,999.99. */
export const MAX_AMOUNT_TZS = 99_999_999_999.99;

export const toCents = (n: number) => Math.round(n * 100);
export const fromCents = (c: number) => c / 100;

/** Exact (cent-based) sum. */
export function sumAmounts(values: number[]): number {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0));
}

/**
 * Parse a user-typed amount ("84,000", "84 000", "1250.50"). Returns null for anything that is not a
 * positive, finite number with at most 2 decimals within the DB range.
 */
export function parseAmount(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[\s,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT_TZS) return null;
  return n;
}

/** "TZS 84,000" — decimals only when the amount really has cents. */
export function formatTzs(amount: number): string {
  const cents = toCents(Math.abs(amount));
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = frac ? `${grouped}.${frac.toString().padStart(2, '0')}` : grouped;
  return `${amount < 0 ? '-' : ''}TZS ${body}`;
}

/* ── dates & months ──────────────────────────────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD`. */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayString = (now: Date = new Date()) => toDateString(now);

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + delta));
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30, 2026-13-01, "yesterday"). */
export function isValidDateString(s: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (y < 1900 || y > 2200) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** `YYYY-MM` for a `YYYY-MM-DD` date. */
export const monthKey = (dateStr: string) => dateStr.slice(0, 7);

export const currentMonthKey = (now: Date = new Date()) => monthKey(toDateString(now));

/** Move a `YYYY-MM` key by `delta` months (negative = earlier). */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

/** 1..12 from a `YYYY-MM` key (for looking up a localised month name). */
export const monthNumber = (key: string) => Number(key.slice(5, 7));
export const monthYear = (key: string) => Number(key.slice(0, 4));

/* ── validation ──────────────────────────────────────────────────────────────────────────── */
export interface EntryInput {
  kind: EntryKind;
  category: FinanceCategory;
  /** Raw text from the amount field. */
  amount: string;
  description?: string;
  /** `YYYY-MM-DD`. */
  entryDate: string;
}

/** Field-level flags, so the UI supplies localised messages. `dateFuture` = a real date, but later than today. */
export interface EntryErrors {
  amount?: boolean;
  description?: boolean;
  date?: boolean;
  dateFuture?: boolean;
}

export function validateEntryInput(i: EntryInput, now: Date = new Date()): EntryErrors {
  const errors: EntryErrors = {};
  if (parseAmount(i.amount) === null) errors.amount = true;
  if ((i.description ?? '').trim().length > 200) errors.description = true;
  if (!isValidDateString(i.entryDate)) errors.date = true;
  else if (i.entryDate > todayString(now)) errors.dateFuture = true;
  return errors;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

/* ── aggregates ──────────────────────────────────────────────────────────────────────────── */
export interface Totals {
  income: number;
  expense: number;
  net: number;
}

export function totals(entries: FinanceEntry[]): Totals {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.kind === 'income') income += toCents(e.amountTzs);
    else expense += toCents(e.amountTzs);
  }
  return { income: fromCents(income), expense: fromCents(expense), net: fromCents(income - expense) };
}

/** Newest first: by entry date, then by when it was logged. Returns a new array. */
export function sortEntries(entries: FinanceEntry[]): FinanceEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.entryDate.localeCompare(a.entryDate) || String(b.createdAt).localeCompare(String(a.createdAt))
  );
}

export function entriesInMonth(entries: FinanceEntry[], key: string): FinanceEntry[] {
  return entries.filter((e) => monthKey(e.entryDate) === key);
}

export interface MonthTotals extends Totals {
  month: string;
}

/** Totals per month for every month that has at least one entry, oldest first. */
export function totalsByMonth(entries: FinanceEntry[]): MonthTotals[] {
  const buckets = new Map<string, FinanceEntry[]>();
  for (const e of entries) {
    const k = monthKey(e.entryDate);
    const list = buckets.get(k);
    if (list) list.push(e);
    else buckets.set(k, [e]);
  }
  return [...buckets.keys()].sort().map((month) => ({ month, ...totals(buckets.get(month)!) }));
}

/**
 * The last `count` calendar months ending at `endKey` (inclusive), oldest first. A month with no
 * entries is a real zero, not a gap — that is what the ledger holds.
 */
export function lastMonths(entries: FinanceEntry[], endKey: string, count: number): MonthTotals[] {
  const result: MonthTotals[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonth(endKey, -i);
    result.push({ month, ...totals(entriesInMonth(entries, month)) });
  }
  return result;
}

export interface CategoryTotal {
  category: FinanceCategory;
  total: number;
  count: number;
}

/** Totals per category for one kind, largest first (ties broken alphabetically for stability). */
export function totalsByCategory(entries: FinanceEntry[], kind: EntryKind): CategoryTotal[] {
  const map = new Map<FinanceCategory, { cents: number; count: number }>();
  for (const e of entries) {
    if (e.kind !== kind) continue;
    const cur = map.get(e.category) ?? { cents: 0, count: 0 };
    cur.cents += toCents(e.amountTzs);
    cur.count += 1;
    map.set(e.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, total: fromCents(v.cents), count: v.count }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/* ── export ──────────────────────────────────────────────────────────────────────────────── */
/**
 * Neutralise spreadsheet formula injection: a cell that starts with = + - @ (or tab/CR) is prefixed
 * with an apostrophe so Excel/Sheets treat it as text.
 */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Plain CSV of the given entries (machine-readable, language-neutral headers). */
export function entriesToCsv(entries: FinanceEntry[]): string {
  const header = 'date,type,category,amount_tzs,description';
  const rows = entries.map((e) =>
    [e.entryDate, e.kind, e.category, e.amountTzs, e.description].map(csvCell).join(',')
  );
  return [header, ...rows].join('\n');
}

/* ── CRUD (injected Supabase client) ─────────────────────────────────────────────────────── */
export type FinanceFailure = 'not_configured' | 'offline' | 'signed_out' | 'invalid' | 'error';

type Fail = { ok: false; reason: FinanceFailure; message?: string };

const fail = (e: any, reason: FinanceFailure = 'error'): Fail => ({
  ok: false,
  reason,
  message: e?.message ?? String(e),
});

/** The signed-in user's id, or null (also null when the session lookup throws). */
export async function getSessionUserId(client: any | null | undefined): Promise<string | null> {
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Upper bound on rows pulled in one go; a farmer's ledger is far smaller than this. */
export const ENTRY_FETCH_LIMIT = 2000;

export async function fetchEntries(
  client: any | null | undefined
): Promise<{ ok: true; entries: FinanceEntry[] } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('finance_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(ENTRY_FETCH_LIMIT);
    if (error) return fail(error);
    return { ok: true, entries: (data ?? []).map(mapEntryRow) };
  } catch (e) {
    return fail(e);
  }
}

function entryPayload(i: EntryInput) {
  return {
    kind: i.kind,
    category: i.category,
    amount_tzs: parseAmount(i.amount),
    description: i.description?.trim() ? i.description.trim() : null,
    entry_date: i.entryDate,
  };
}

export async function createEntry(
  client: any | null | undefined,
  i: EntryInput,
  now: Date = new Date()
): Promise<{ ok: true; entry: FinanceEntry } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validateEntryInput(i, now))) return { ok: false, reason: 'invalid' };
  try {
    // user_id is filled by the column default (auth.uid()); RLS rejects anonymous callers.
    const { data, error } = await client.from('finance_entries').insert(entryPayload(i)).select('*').single();
    if (error) return fail(error);
    return { ok: true, entry: mapEntryRow(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function updateEntry(
  client: any | null | undefined,
  id: string,
  i: EntryInput,
  now: Date = new Date()
): Promise<{ ok: true; entry: FinanceEntry } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validateEntryInput(i, now))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('finance_entries')
      .update(entryPayload(i))
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(error);
    return { ok: true, entry: mapEntryRow(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteEntry(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { error } = await client.from('finance_entries').delete().eq('id', id);
    return error ? fail(error) : { ok: true };
  } catch (e) {
    return fail(e);
  }
}
