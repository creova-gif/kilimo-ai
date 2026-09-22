/**
 * Shared helpers for the livestock and inventory data layers (KIL-004): result types, error
 * classification, and strict number/date parsing. Pure — no React, no Supabase import — so it is
 * trivially testable. Dates are plain `YYYY-MM-DD` strings (matching Postgres `date`) and are
 * compared as calendar days, never as timestamps, so time zones cannot shift a due date.
 */

export type FailReason =
  | 'not_configured'
  | 'offline'
  | 'invalid'
  | 'insufficient_stock'
  | 'auth'
  | 'error';

export interface Fail {
  ok: false;
  reason: FailReason;
  message?: string;
}

export const fail = (reason: FailReason, message?: string): Fail => ({
  ok: false,
  reason,
  message,
});

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as any).message);
  return String(e);
}

/** Map a PostgREST/Postgres error to a coarse reason the UI can localise. */
export function classifyDbError(
  error: { code?: string; message?: string } | null | undefined
): FailReason {
  if (!error) return 'error';
  if (error.code === '42501' || error.code === 'PGRST301' || /jwt/i.test(error.message ?? '')) {
    return 'auth';
  }
  return 'error';
}

/** Parse a user-typed decimal. Accepts "12,5" and "12.5"; rejects blanks, letters, NaN, Infinity. */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = input.trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Round away binary float noise so 0.1 + 0.2 reads 0.3 (stock quantities are decimal). */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const trimOrNull = (s: string | null | undefined): string | null => {
  const t = s?.trim();
  return t ? t : null;
};

/* ── dates ─────────────────────────────────────────────────────────────────────────────────── */

/** Strict `YYYY-MM-DD` that is also a real calendar date (rejects 2026-02-31). */
export function isIsoDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the device's local calendar, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Whole calendar days from `fromIso` to `toIso` (negative if `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

/** Whole days from today until `iso` (negative = in the past). */
export function daysFromToday(iso: string, now: Date = new Date()): number {
  return daysBetween(todayIso(now), iso);
}

/**
 * Live-format a date field as the user types digits: "20260921" -> "2026-09-21".
 * Non-digits are dropped; the result never exceeds 10 characters.
 */
export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** 12 -> "12", 12.5 -> "12.5", 1234567.891 -> "1,234,567.891" (max 3 decimals). */
export function formatQuantity(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  const [whole, frac] = String(rounded).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** "TZS 95,000" — whole shillings. */
export function formatTzs(amount: number): string {
  return `TZS ${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/* ── screen load state ─────────────────────────────────────────────────────────────────────── */
export type LoadState = 'loading' | 'offline' | 'unavailable' | 'auth' | 'error' | 'ready';

/**
 * Which full-screen state a records screen shows. Once data has loaded successfully the screen stays
 * `ready` — a later failed refresh keeps the last data on screen (with a "may be out of date" note)
 * rather than blanking it.
 */
export function loadState(s: {
  loaded: boolean;
  isOffline: boolean;
  error: FailReason | null;
}): LoadState {
  if (s.loaded) return 'ready';
  if (s.isOffline) return 'offline';
  if (s.error === 'not_configured') return 'unavailable';
  if (s.error === 'auth') return 'auth';
  if (s.error) return 'error';
  return 'loading';
}

/**
 * Failure reason of a result whose `ok` is false. The project compiles with `strict: false`, so
 * `if (r.ok) … else r.reason` does not narrow; use this instead of a cast at each call site.
 */
export const reasonOf = (r: { ok: boolean }): FailReason => (r as Fail).reason ?? 'error';
