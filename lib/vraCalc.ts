/**
 * Application planner for one plot (KIL-003). A true variable-rate (VRA) prescription needs
 * per-zone soil or yield measurements, which the app does not have, so this computes an honest
 * UNIFORM rate: the rate the farmer chose × the plot's recorded area. No zones are invented.
 */
import { parseDecimal } from './recordsCommon';

export type InputKind = 'fertilizer' | 'water' | 'pesticide';
export const INPUT_KINDS: InputKind[] = ['fertilizer', 'water', 'pesticide'];

/** Unit of the per-hectare rate for each input. */
export const RATE_UNIT: Record<InputKind, 'kg' | 'L'> = {
  fertilizer: 'kg',
  water: 'L',
  pesticide: 'L',
};

/** Upper bound for a typed rate per hectare (catches typos like an extra zero or two). */
export const MAX_RATE: Record<InputKind, number> = {
  fertilizer: 2000,
  water: 1_000_000,
  pesticide: 100,
};

export interface ApplicationPlan {
  ratePerHa: number;
  /** Total for the plot, or null when the plot has no recorded area. */
  total: number | null;
  unit: 'kg' | 'L';
}

/** Parse the typed rate: null when blank, NaN when invalid/out of range. */
export function parseRate(text: string | undefined, kind: InputKind): number | null {
  if (!text || !text.trim()) return null;
  const n = parseDecimal(text);
  if (n === null || n <= 0 || n > MAX_RATE[kind]) return NaN;
  return n;
}

export function applicationPlan(
  rateText: string | undefined,
  kind: InputKind,
  areaHa: number | null
): ApplicationPlan | null {
  const rate = parseRate(rateText, kind);
  if (rate === null || Number.isNaN(rate)) return null;
  const total =
    areaHa === null || areaHa === undefined || !Number.isFinite(areaHa) || areaHa <= 0
      ? null
      : Math.round(rate * areaHa * 100) / 100;
  return { ratePerHa: rate, total, unit: RATE_UNIT[kind] };
}
