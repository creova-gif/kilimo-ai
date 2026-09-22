/**
 * Farms and plots — the farmer's real land records (KIL-003).
 *
 * Backed by `public.farms` / `public.plots` (migration 20260921100000): owner-only RLS, no seed
 * data. An empty table is a farmer who has not added a farm yet, and every screen says so.
 * The Supabase client is injected so the CRUD layer is unit-testable, and the lifecycle / area
 * helpers are pure.
 *
 * Honesty rules baked in here:
 *  - lifecycle stage and progress are ESTIMATES computed only from the dates the farmer entered
 *    (never from sensors or satellite data), and are `null` when the dates needed are missing;
 *  - update/delete verify a row was really affected (RLS can silently match zero rows), so a
 *    caller is never told "saved" or "deleted" when nothing happened.
 */
import { CROPS, cropNames } from '../constants/onboardingOptions';

/* ── types ───────────────────────────────────────────────────────────────────────────────── */
export type PlotStatus = 'planned' | 'growing' | 'harvested' | 'fallow';
export const PLOT_STATUSES: PlotStatus[] = ['planned', 'growing', 'harvested', 'fallow'];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Farm {
  id: string;
  name: string;
  region: string | null;
  areaHa: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  farmId: string;
  name: string;
  crop: string | null;
  areaHa: number | null;
  /** ISO date `YYYY-MM-DD`. */
  plantingDate: string | null;
  /** ISO date `YYYY-MM-DD`. */
  expectedHarvest: string | null;
  status: PlotStatus;
  boundary: LatLng[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── row mapping ─────────────────────────────────────────────────────────────────────────── */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Accept only a well-formed polygon (>= 3 vertices with finite lat/lng in range); else null. */
export function parseBoundary(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const pts: LatLng[] = [];
  for (const p of raw) {
    const lat = Number((p as any)?.lat);
    const lng = Number((p as any)?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    pts.push({ lat, lng });
  }
  return pts;
}

export function mapFarmRow(row: any): Farm {
  return {
    id: row.id,
    name: row.name,
    region: row.region ?? null,
    areaHa: numOrNull(row.area_ha),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function mapPlotRow(row: any): Plot {
  return {
    id: row.id,
    farmId: row.farm_id,
    name: row.name,
    crop: row.crop ?? null,
    areaHa: numOrNull(row.area_ha),
    plantingDate: row.planting_date ?? null,
    expectedHarvest: row.expected_harvest ?? null,
    status: PLOT_STATUSES.includes(row.status) ? row.status : 'planned',
    boundary: parseBoundary(row.boundary),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

/* ── area helpers ────────────────────────────────────────────────────────────────────────── */
export const ACRES_PER_HA = 2.47105381;
export type AreaUnit = 'ha' | 'acres';

export const haToAcres = (ha: number) => ha * ACRES_PER_HA;
export const acresToHa = (ac: number) => ac / ACRES_PER_HA;

/** Round to 4 decimals (the column is numeric(12,4)). */
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Parse a typed area (comma or dot decimal) in the given unit into hectares.
 * Empty text means "not provided" (null). Anything unparseable or negative is `NaN`,
 * so callers can tell "left blank" from "typed something invalid".
 */
export function parseAreaHa(text: string | undefined | null, unit: AreaUnit): number | null {
  const s = (text ?? '').trim().replace(',', '.');
  if (!s) return null;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return round4(unit === 'acres' ? acresToHa(n) : n);
}

/** `1.25 ha` — trims trailing zeros; `null` when unknown. */
export function formatHa(ha: number | null | undefined): string | null {
  if (ha === null || ha === undefined || !Number.isFinite(ha)) return null;
  const s = ha >= 100 ? ha.toFixed(0) : ha >= 10 ? ha.toFixed(1) : ha.toFixed(2);
  // Trim trailing zeros only after a decimal point ("100" must stay "100").
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function formatAcres(ha: number | null | undefined): string | null {
  if (ha === null || ha === undefined || !Number.isFinite(ha)) return null;
  return formatHa(haToAcres(ha));
}

/** Sum of the plots' known areas. Plots with no area recorded are counted separately, not as 0. */
export function totalPlotAreaHa(plots: Pick<Plot, 'areaHa'>[]): {
  totalHa: number;
  unknownCount: number;
} {
  let totalHa = 0;
  let unknownCount = 0;
  for (const p of plots) {
    if (p.areaHa === null || p.areaHa === undefined) unknownCount += 1;
    else totalHa += p.areaHa;
  }
  return { totalHa: round4(totalHa), unknownCount };
}

export interface FarmAreaSummary {
  plotCount: number;
  /** Area of the plots whose size is recorded. */
  allocatedHa: number;
  /** Plots that have no area recorded. */
  unknownCount: number;
  /** null when the farm has no recorded size. */
  unallocatedHa: number | null;
  /** True when recorded plot areas add up to more than the farm's recorded size. */
  overAllocated: boolean;
}

export function farmAreaSummary(
  farm: Pick<Farm, 'areaHa'>,
  plots: Pick<Plot, 'areaHa'>[]
): FarmAreaSummary {
  const { totalHa, unknownCount } = totalPlotAreaHa(plots);
  const hasFarmArea = farm.areaHa !== null && farm.areaHa !== undefined;
  const remaining = hasFarmArea ? round4((farm.areaHa as number) - totalHa) : null;
  return {
    plotCount: plots.length,
    allocatedHa: totalHa,
    unknownCount,
    unallocatedHa: remaining === null ? null : Math.max(0, remaining),
    overAllocated: remaining !== null && remaining < 0,
  };
}

/* ── dates ───────────────────────────────────────────────────────────────────────────────── */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Parse `YYYY-MM-DD` to a UTC-midnight timestamp; null if malformed or not a real calendar date. */
export function parseIsoDate(s: string | null | undefined): number | null {
  const m = ISO_DATE.exec((s ?? '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    return null;
  }
  return t;
}

/** Local calendar day of `now` as `YYYY-MM-DD` (what the farmer means by "today"). */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Localized calendar date for an ISO `YYYY-MM-DD` (rendered in UTC so the day never shifts). */
export function formatIsoDate(iso: string | null | undefined, lang: 'sw' | 'en'): string | null {
  const t = parseIsoDate(iso);
  if (t === null) return null;
  try {
    return new Date(t).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso ?? null;
  }
}

/** Whole days from the farmer's local "today" to the given ISO date (negative = in the past). */
export function daysFromToday(iso: string, now: Date = new Date()): number | null {
  const target = parseIsoDate(iso);
  const today = parseIsoDate(todayIso(now));
  if (target === null || today === null) return null;
  return Math.round((target - today) / DAY_MS);
}

/* ── lifecycle ───────────────────────────────────────────────────────────────────────────── */
/**
 * planned      — status planned (nothing planted yet)
 * early / mid / late / harvestSoon — growing, estimated by elapsed share of planting → expected harvest
 * overdue      — growing and past the expected harvest date
 * growing      — growing but no expected harvest date, so no progress can be estimated
 * harvested / fallow — as recorded by the farmer
 */
export type PlotStage =
  | 'planned'
  | 'early'
  | 'mid'
  | 'late'
  | 'harvestSoon'
  | 'overdue'
  | 'growing'
  | 'harvested'
  | 'fallow';

export interface PlotLifecycle {
  stage: PlotStage;
  /** 0–100, or null when it cannot be estimated from the entered dates. */
  progressPct: number | null;
  /** Days since planting (>= 0) when growing and a planting date is known. */
  daysSincePlanting: number | null;
  /** Days until expected harvest (negative = overdue) when a harvest date is known and the plot is growing. */
  daysToHarvest: number | null;
}

/**
 * Crop lifecycle stage and % progress, computed ONLY from status + planting_date + expected_harvest.
 * This is a date-based estimate, not a measurement — screens must label it as such.
 */
export function plotLifecycle(
  plot: Pick<Plot, 'status' | 'plantingDate' | 'expectedHarvest'>,
  now: Date = new Date()
): PlotLifecycle {
  const none = { progressPct: null, daysSincePlanting: null, daysToHarvest: null };
  switch (plot.status) {
    case 'fallow':
      return { stage: 'fallow', ...none };
    case 'harvested':
      return { stage: 'harvested', ...none, progressPct: 100 };
    case 'planned':
      return { stage: 'planned', ...none, progressPct: 0 };
    default:
      break;
  }

  // status === 'growing'
  const start = plot.plantingDate ? parseIsoDate(plot.plantingDate) : null;
  const end = plot.expectedHarvest ? parseIsoDate(plot.expectedHarvest) : null;
  const today = parseIsoDate(todayIso(now)) as number;

  const daysSincePlanting =
    start === null ? null : Math.max(0, Math.round((today - start) / DAY_MS));
  const daysToHarvest = end === null ? null : Math.round((end - today) / DAY_MS);

  if (start === null || end === null || end <= start) {
    // Not enough (or inconsistent) date information to estimate progress.
    if (end !== null && today > end) {
      return { stage: 'overdue', progressPct: 100, daysSincePlanting, daysToHarvest };
    }
    return { stage: 'growing', progressPct: null, daysSincePlanting, daysToHarvest };
  }

  const f = (today - start) / (end - start);
  if (today > end) return { stage: 'overdue', progressPct: 100, daysSincePlanting, daysToHarvest };
  const pct = Math.round(Math.min(1, Math.max(0, f)) * 100);
  const stage: PlotStage = f < 0.34 ? 'early' : f < 0.67 ? 'mid' : f < 0.9 ? 'late' : 'harvestSoon';
  return { stage, progressPct: pct, daysSincePlanting, daysToHarvest };
}

/* ── crops ───────────────────────────────────────────────────────────────────────────────── */
/** Localized crop name: known onboarding labels ("Mahindi (Maize)") by language, free text as typed. */
export function cropDisplay(crop: string | null | undefined, lang: 'sw' | 'en'): string | null {
  const c = (crop ?? '').trim();
  if (!c) return null;
  const known = CROPS.find((k) => k.toLowerCase() === c.toLowerCase());
  if (!known) return c;
  const n = cropNames(known);
  return lang === 'sw' ? n.sw : n.en;
}

/* ── prefill from the onboarding profile ─────────────────────────────────────────────────── */
export interface ProfileLike {
  region?: string;
  farmSizeAcres?: number;
  primaryCrops?: string[];
}

export interface FarmPrefill {
  region: string;
  /** The profile's own figure (acres, as the farmer entered it) — shown as typed, never re-rounded. */
  areaAcres: number | null;
  areaHa: number | null;
  crops: string[];
}

/**
 * Suggestions taken from what the farmer told us at onboarding. Only ever used to PRE-FILL a form
 * the farmer reviews and submits — a record is never created from a profile automatically.
 */
export function prefillFromProfile(profile: ProfileLike | null | undefined): FarmPrefill | null {
  if (!profile) return null;
  const region = (profile.region ?? '').trim();
  const acres = Number(profile.farmSizeAcres);
  const valid = Number.isFinite(acres) && acres > 0;
  const areaAcres = valid ? acres : null;
  const areaHa = valid ? round4(acresToHa(acres)) : null;
  const crops = (profile.primaryCrops ?? []).map((c) => c.trim()).filter(Boolean);
  if (!region && areaHa === null && crops.length === 0) return null;
  return { region, areaAcres, areaHa, crops };
}

/* ── validation ──────────────────────────────────────────────────────────────────────────── */
export interface FarmInput {
  name: string;
  region?: string;
  /** Area in `unit`, as typed. */
  area?: string;
  unit?: AreaUnit;
  notes?: string;
}

export interface PlotInput {
  name: string;
  crop?: string;
  area?: string;
  unit?: AreaUnit;
  plantingDate?: string;
  expectedHarvest?: string;
  status?: PlotStatus;
  boundary?: LatLng[] | null;
  notes?: string;
}

export interface FarmErrors {
  name?: boolean;
  area?: boolean;
}

export interface PlotErrors extends FarmErrors {
  plantingDate?: boolean;
  expectedHarvest?: boolean;
  /** expected harvest is earlier than planting */
  dateOrder?: boolean;
  boundary?: boolean;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

export function validateFarmInput(i: FarmInput): FarmErrors {
  const e: FarmErrors = {};
  if (!i.name?.trim() || i.name.trim().length > 120) e.name = true;
  if (Number.isNaN(parseAreaHa(i.area, i.unit ?? 'ha'))) e.area = true;
  return e;
}

export function validatePlotInput(i: PlotInput): PlotErrors {
  const e: PlotErrors = {};
  if (!i.name?.trim() || i.name.trim().length > 120) e.name = true;
  if (Number.isNaN(parseAreaHa(i.area, i.unit ?? 'ha'))) e.area = true;
  const ps = i.plantingDate?.trim();
  const hs = i.expectedHarvest?.trim();
  const pt = ps ? parseIsoDate(ps) : null;
  const ht = hs ? parseIsoDate(hs) : null;
  if (ps && pt === null) e.plantingDate = true;
  if (hs && ht === null) e.expectedHarvest = true;
  if (pt !== null && ht !== null && ht < pt) e.dateOrder = true;
  if (i.boundary && !parseBoundary(i.boundary)) e.boundary = true;
  return e;
}

const blankToNull = (s: string | undefined | null) => {
  const v = (s ?? '').trim();
  return v ? v : null;
};

export function toFarmRow(i: FarmInput) {
  return {
    name: i.name.trim(),
    region: blankToNull(i.region),
    area_ha: parseAreaHa(i.area, i.unit ?? 'ha'),
    notes: blankToNull(i.notes),
  };
}

export function toPlotRow(i: PlotInput) {
  return {
    name: i.name.trim(),
    crop: blankToNull(i.crop),
    area_ha: parseAreaHa(i.area, i.unit ?? 'ha'),
    planting_date: blankToNull(i.plantingDate),
    expected_harvest: blankToNull(i.expectedHarvest),
    status: i.status ?? 'planned',
    boundary: i.boundary ?? null,
    notes: blankToNull(i.notes),
  };
}

/* ── CRUD (Supabase client injected) ─────────────────────────────────────────────────────── */
/** Flat (not a discriminated union): this repo compiles without union narrowing on `ok`. */
export type FarmsFailure =
  | 'not_configured'
  | 'offline' // produced by the hook: writes are online-only for now
  | 'invalid'
  | 'duplicate'
  | 'not_found'
  | 'error';

export interface FarmsListResult {
  ok: boolean;
  farms: Farm[];
  plots: Plot[];
  reason?: FarmsFailure;
  message?: string;
}

export interface MutationResult<T> {
  ok: boolean;
  data?: T;
  reason?: FarmsFailure;
  message?: string;
}

/** Postgres unique_violation → the farmer reused a name. */
const isDuplicate = (err: any) =>
  err?.code === '23505' || /duplicate key/i.test(err?.message ?? '');

function failure<T>(err: any): MutationResult<T> {
  return {
    ok: false,
    reason: isDuplicate(err) ? 'duplicate' : 'error',
    message: err?.message,
  };
}

/** All of the signed-in farmer's farms and plots (RLS scopes both to the owner). */
export async function fetchFarmsAndPlots(client: any | null | undefined): Promise<FarmsListResult> {
  if (!client) return { ok: false, farms: [], plots: [], reason: 'not_configured' };
  try {
    const [f, p] = await Promise.all([
      client.from('farms').select('*').order('created_at', { ascending: true }),
      client.from('plots').select('*').order('created_at', { ascending: true }),
    ]);
    if (f.error)
      return { ok: false, farms: [], plots: [], reason: 'error', message: f.error.message };
    if (p.error)
      return { ok: false, farms: [], plots: [], reason: 'error', message: p.error.message };
    return {
      ok: true,
      farms: (f.data ?? []).map(mapFarmRow),
      plots: (p.data ?? []).map(mapPlotRow),
    };
  } catch (e: any) {
    return { ok: false, farms: [], plots: [], reason: 'error', message: e?.message ?? String(e) };
  }
}

export async function createFarm(
  client: any | null | undefined,
  input: FarmInput
): Promise<MutationResult<Farm>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validateFarmInput(input))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('farms')
      .insert(toFarmRow(input))
      .select('*')
      .single();
    if (error) return failure(error);
    return { ok: true, data: mapFarmRow(data) };
  } catch (e: any) {
    return failure(e);
  }
}

export async function updateFarm(
  client: any | null | undefined,
  id: string,
  input: FarmInput
): Promise<MutationResult<Farm>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validateFarmInput(input))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('farms')
      .update(toFarmRow(input))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return failure(error);
    if (!data) return { ok: false, reason: 'not_found' };
    return { ok: true, data: mapFarmRow(data) };
  } catch (e: any) {
    return failure(e);
  }
}

/** Deleting a farm cascades to its plots in the database. Reports not_found if no row was removed. */
export async function deleteFarm(
  client: any | null | undefined,
  id: string
): Promise<MutationResult<void>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client.from('farms').delete().eq('id', id).select('id');
    if (error) return failure(error);
    if (!data || data.length === 0) return { ok: false, reason: 'not_found' };
    return { ok: true };
  } catch (e: any) {
    return failure(e);
  }
}

export async function createPlot(
  client: any | null | undefined,
  farmId: string,
  input: PlotInput
): Promise<MutationResult<Plot>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validatePlotInput(input))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('plots')
      .insert({ farm_id: farmId, ...toPlotRow(input) })
      .select('*')
      .single();
    if (error) return failure(error);
    return { ok: true, data: mapPlotRow(data) };
  } catch (e: any) {
    return failure(e);
  }
}

export async function updatePlot(
  client: any | null | undefined,
  id: string,
  input: PlotInput
): Promise<MutationResult<Plot>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validatePlotInput(input))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('plots')
      .update(toPlotRow(input))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return failure(error);
    if (!data) return { ok: false, reason: 'not_found' };
    return { ok: true, data: mapPlotRow(data) };
  } catch (e: any) {
    return failure(e);
  }
}

/** Change only the plot's status (e.g. "mark harvested"). */
export async function setPlotStatus(
  client: any | null | undefined,
  id: string,
  status: PlotStatus
): Promise<MutationResult<Plot>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (!PLOT_STATUSES.includes(status)) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('plots')
      .update({ status })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return failure(error);
    if (!data) return { ok: false, reason: 'not_found' };
    return { ok: true, data: mapPlotRow(data) };
  } catch (e: any) {
    return failure(e);
  }
}

export async function deletePlot(
  client: any | null | undefined,
  id: string
): Promise<MutationResult<void>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client.from('plots').delete().eq('id', id).select('id');
    if (error) return failure(error);
    if (!data || data.length === 0) return { ok: false, reason: 'not_found' };
    return { ok: true };
  } catch (e: any) {
    return failure(e);
  }
}

/* ── linking tasks to a plot ─────────────────────────────────────────────────────────────── */
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Tasks are linked to a plot by `tasks.farm_block` equalling the plot's name (case-insensitive) —
 * the column is free text with no FK. The database keeps plot names unique per farmer so this match
 * is unambiguous. Renaming a plot therefore does not carry earlier tasks along.
 */
export function tasksForPlot<T extends { farmBlock?: string | null }>(
  tasks: T[],
  plot: Pick<Plot, 'name'>
): T[] {
  const key = norm(plot.name);
  if (!key) return [];
  return tasks.filter((t) => norm(t.farmBlock) === key);
}
