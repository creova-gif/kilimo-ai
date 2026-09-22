/**
 * IoT devices + manual readings — the real data layer behind app/iot-systems.tsx.
 *
 * Backed by `public.iot_devices` / `public.iot_readings` (migration 20260921140000, owner-only RLS).
 * What this module is NOT: it does not talk to hardware. Automatic ingestion is not connected, so the
 * only readings that exist are the ones the farmer logs by hand (`source: 'manual'`); `last_seen_at`
 * is set only by a future server-side ingestion service, never by this client. Nothing here invents a
 * value: an empty table is an empty list. The Supabase client is injected so everything is testable.
 */
import type { TranslationKey } from './i18n/en';

/* ── vocabulary ──────────────────────────────────────────────────────────────────────────── */
export const DEVICE_KINDS = [
  'soil_moisture',
  'weather_station',
  'water_level',
  'temperature',
  'irrigation_controller',
  'other',
] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];
export type DeviceStatus = 'registered' | 'online' | 'offline';
export type ReadingSource = 'manual' | 'device';

export const METRIC_IDS = [
  'soil_moisture',
  'temperature',
  'humidity',
  'rainfall',
  'water_level',
  'flow_rate',
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

/** Unit and the physically plausible range for a hand-typed value (catches a slipped decimal point). */
export const METRICS: Record<MetricId, { unit: string; min: number; max: number }> = {
  soil_moisture: { unit: '%', min: 0, max: 100 },
  temperature: { unit: '°C', min: -20, max: 70 },
  humidity: { unit: '%', min: 0, max: 100 },
  rainfall: { unit: 'mm', min: 0, max: 1000 },
  water_level: { unit: 'cm', min: 0, max: 10000 },
  flow_rate: { unit: 'L/min', min: 0, max: 100000 },
};

/** Which metrics make sense to log for each kind of device. */
export const KIND_METRICS: Record<DeviceKind, readonly MetricId[]> = {
  soil_moisture: ['soil_moisture', 'temperature'],
  weather_station: ['temperature', 'humidity', 'rainfall'],
  water_level: ['water_level'],
  temperature: ['temperature'],
  irrigation_controller: ['flow_rate', 'soil_moisture'],
  other: METRIC_IDS,
};

export const kindKey = (k: DeviceKind) => `iot.kind.${k}` as TranslationKey;
export const metricKey = (m: string) =>
  (m in METRICS ? `iot.metric.${m}` : 'iot.metric.other') as TranslationKey;

export const isDeviceKind = (v: unknown): v is DeviceKind =>
  typeof v === 'string' && (DEVICE_KINDS as readonly string[]).includes(v);
export const isMetricId = (v: unknown): v is MetricId =>
  typeof v === 'string' && (METRIC_IDS as readonly string[]).includes(v);

/* ── entities ────────────────────────────────────────────────────────────────────────────── */
export interface IotDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  plotId: string | null;
  location: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface IotReading {
  id: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string | null;
  recordedAt: string;
  source: ReadingSource;
}

export function mapDeviceRow(row: any): IotDevice {
  return {
    id: row.id,
    name: row.name,
    kind: isDeviceKind(row.kind) ? row.kind : 'other',
    plotId: row.plot_id ?? null,
    location: row.location ?? null,
    status: row.status ?? 'registered',
    lastSeenAt: row.last_seen_at ?? null,
    createdAt: row.created_at,
  };
}

export function mapReadingRow(row: any): IotReading {
  return {
    id: row.id,
    deviceId: row.device_id,
    metric: row.metric,
    value: Number(row.value),
    unit: row.unit ?? null,
    recordedAt: row.recorded_at,
    source: row.source === 'device' ? 'device' : 'manual',
  };
}

/* ── parsing / validation ────────────────────────────────────────────────────────────────── */
/** Parse a hand-typed decimal. Accepts a decimal comma ("12,5") because that is how many farmers type. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface DeviceInput {
  name: string;
  kind: DeviceKind | '';
  location?: string;
}
export interface DeviceErrors {
  name?: boolean;
  kind?: boolean;
}

export function validateDeviceInput(i: DeviceInput): DeviceErrors {
  const e: DeviceErrors = {};
  const name = i.name.trim();
  if (!name || name.length > 80) e.name = true;
  if (!isDeviceKind(i.kind)) e.kind = true;
  return e;
}

export interface ReadingInput {
  deviceId: string;
  metric: string;
  /** As typed. */
  value: string;
}
export interface ReadingErrors {
  metric?: boolean;
  /** Missing, not a number, or outside the physically plausible range for the metric. */
  value?: boolean;
}

export function validateReadingInput(i: ReadingInput): ReadingErrors {
  const e: ReadingErrors = {};
  if (!isMetricId(i.metric)) e.metric = true;
  const v = parseDecimal(i.value);
  if (v === null) e.value = true;
  else if (isMetricId(i.metric)) {
    const { min, max } = METRICS[i.metric];
    if (v < min || v > max) e.value = true;
  }
  return e;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

/* ── queries / writes ────────────────────────────────────────────────────────────────────── */
type Fail = { ok: false; reason: 'not_configured' | 'invalid' | 'error'; message?: string };
export type { Fail as WriteFailure };
/** Type guard for a failed result. (`strict` is off in this repo, so `!r.ok` does not narrow the union.) */
export const failed = (r: { ok: boolean }): r is Fail => !r.ok;
const fail = (reason: Fail['reason'], e?: any): Fail => ({
  ok: false,
  reason,
  message: e ? (e?.message ?? String(e)) : undefined,
});

export async function fetchDevices(
  client: any | null | undefined
): Promise<{ ok: true; devices: IotDevice[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('iot_devices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return fail('error', error);
    return { ok: true, devices: (data ?? []).map(mapDeviceRow) };
  } catch (e) {
    return fail('error', e);
  }
}

export interface ReadingFilters {
  deviceId?: string;
  /** ISO timestamp; only readings recorded at or after it. */
  sinceIso?: string;
  limit?: number;
}

export async function fetchReadings(
  client: any | null | undefined,
  f: ReadingFilters = {}
): Promise<{ ok: true; readings: IotReading[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    let q = client.from('iot_readings').select('*');
    if (f.deviceId) q = q.eq('device_id', f.deviceId);
    if (f.sinceIso) q = q.gte('recorded_at', f.sinceIso);
    const { data, error } = await q
      .order('recorded_at', { ascending: false })
      .limit(f.limit ?? 1000);
    if (error) return fail('error', error);
    return { ok: true, readings: (data ?? []).map(mapReadingRow) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function createDevice(
  client: any | null | undefined,
  i: DeviceInput
): Promise<{ ok: true; device: IotDevice } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateDeviceInput(i))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('iot_devices')
      .insert({
        name: i.name.trim(),
        kind: i.kind,
        location: i.location?.trim() || null,
      })
      .select('*')
      .single();
    if (error) return fail('error', error);
    return { ok: true, device: mapDeviceRow(data) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function deleteDevice(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('iot_devices').delete().eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

export async function createReading(
  client: any | null | undefined,
  i: ReadingInput & { recordedAt?: string }
): Promise<{ ok: true; reading: IotReading } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateReadingInput(i)) || !i.deviceId) return fail('invalid');
  try {
    const metric = i.metric as MetricId;
    const { data, error } = await client
      .from('iot_readings')
      .insert({
        device_id: i.deviceId,
        metric,
        value: parseDecimal(i.value),
        unit: METRICS[metric].unit,
        source: 'manual',
        ...(i.recordedAt ? { recorded_at: i.recordedAt } : {}),
      })
      .select('*')
      .single();
    if (error) return fail('error', error);
    return { ok: true, reading: mapReadingRow(data) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function deleteReading(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('iot_readings').delete().eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

/* ── pure helpers ────────────────────────────────────────────────────────────────────────── */
const ts = (r: IotReading) => Date.parse(r.recordedAt);

/** Newest-first comparator (unparseable timestamps sort last). */
const newestFirst = (a: IotReading, b: IotReading) => (ts(b) || 0) - (ts(a) || 0);

/** The most recent reading for each device (any metric). Devices with no readings are absent. */
export function latestReadingByDevice(readings: IotReading[]): Record<string, IotReading> {
  const out: Record<string, IotReading> = {};
  for (const r of readings) {
    const cur = out[r.deviceId];
    if (!cur || ts(r) > ts(cur)) out[r.deviceId] = r;
  }
  return out;
}

/** The most recent reading per metric for one device, in the app's canonical metric order. */
export function latestReadingsForDevice(readings: IotReading[], deviceId: string): IotReading[] {
  const byMetric = new Map<string, IotReading>();
  for (const r of readings) {
    if (r.deviceId !== deviceId) continue;
    const cur = byMetric.get(r.metric);
    if (!cur || ts(r) > ts(cur)) byMetric.set(r.metric, r);
  }
  const order = (m: string) => {
    const i = (METRIC_IDS as readonly string[]).indexOf(m);
    return i === -1 ? METRIC_IDS.length : i;
  };
  return [...byMetric.values()].sort((a, b) => order(a.metric) - order(b.metric));
}

/** Readings of one metric for one device, oldest → newest (chart order). */
export function readingsForMetric(
  readings: IotReading[],
  deviceId: string,
  metric: string
): IotReading[] {
  return readings
    .filter((r) => r.deviceId === deviceId && r.metric === metric)
    .sort((a, b) => -newestFirst(a, b));
}

export type Trend = 'rising' | 'falling' | 'steady' | 'insufficient';

export interface WindowStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  first: number | null;
  last: number | null;
  delta: number | null;
  trend: Trend;
}

/**
 * Min / max / average and direction over a time window. `readings` must already be for ONE metric of
 * ONE device. Direction needs at least two points, and a change below 15% of the window's own spread
 * (or below 1% of the average) is called "steady" so ordinary hand-typing noise is not reported as a trend.
 */
export function summarizeWindow(
  readings: IotReading[],
  opts: { windowMs: number; now?: number }
): WindowStats {
  const now = opts.now ?? Date.now();
  const inWindow = readings
    .filter((r) => {
      const t = ts(r);
      return Number.isFinite(t) && t >= now - opts.windowMs && t <= now;
    })
    .sort((a, b) => ts(a) - ts(b));
  if (inWindow.length === 0) {
    return { count: 0, min: null, max: null, avg: null, first: null, last: null, delta: null, trend: 'insufficient' };
  }
  const values = inWindow.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  let trend: Trend = 'insufficient';
  if (values.length >= 2) {
    const range = max - min;
    if (range === 0 || Math.abs(delta) < 0.01 * Math.abs(avg) || Math.abs(delta) / range < 0.15) {
      trend = 'steady';
    } else {
      trend = delta > 0 ? 'rising' : 'falling';
    }
  }
  return { count: values.length, min, max, avg, first, last, delta, trend };
}

/* ── device health (from last_seen_at only) ──────────────────────────────────────────────── */
export type DeviceHealth = 'never_reported' | 'fresh' | 'stale' | 'offline';

export const FRESH_MS = 3 * 60 * 60 * 1000; // heard from within 3 h
export const OFFLINE_MS = 24 * 60 * 60 * 1000; // silent for over 24 h

/**
 * Whether the DEVICE itself has been reporting. Derived purely from `last_seen_at`, which only the
 * server-side ingestion service can set — so until ingestion is connected every device is honestly
 * `never_reported`, no matter how many readings the farmer typed in.
 */
export function deviceHealth(
  device: Pick<IotDevice, 'lastSeenAt'>,
  now: number = Date.now(),
  thresholds: { freshMs?: number; offlineMs?: number } = {}
): DeviceHealth {
  const seen = device.lastSeenAt ? Date.parse(device.lastSeenAt) : NaN;
  if (!Number.isFinite(seen)) return 'never_reported';
  const age = Math.max(0, now - seen);
  if (age <= (thresholds.freshMs ?? FRESH_MS)) return 'fresh';
  if (age <= (thresholds.offlineMs ?? OFFLINE_MS)) return 'stale';
  return 'offline';
}

/* ── chart geometry ──────────────────────────────────────────────────────────────────────── */
/**
 * Map readings (already oldest → newest) into an SVG box for a sparkline. X follows real time, so
 * irregular hand-logging is drawn honestly rather than evenly spaced. A single point sits in the
 * middle; a flat series is drawn as a level line.
 */
export function sparkPoints(
  readings: Pick<IotReading, 'recordedAt' | 'value'>[],
  width: number,
  height: number,
  pad = 4
): { x: number; y: number }[] {
  const pts = readings
    .map((r) => ({ t: Date.parse(r.recordedAt), v: r.value }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
  if (pts.length === 0) return [];
  const w = Math.max(0, width - pad * 2);
  const h = Math.max(0, height - pad * 2);
  const t0 = Math.min(...pts.map((p) => p.t));
  const t1 = Math.max(...pts.map((p) => p.t));
  const v0 = Math.min(...pts.map((p) => p.v));
  const v1 = Math.max(...pts.map((p) => p.v));
  return pts.map((p) => ({
    x: t1 === t0 ? width / 2 : pad + ((p.t - t0) / (t1 - t0)) * w,
    y: v1 === v0 ? height / 2 : pad + (1 - (p.v - v0) / (v1 - v0)) * h,
  }));
}

/** Compact number for display: at most 2 decimals, no trailing zeros. */
export function formatValue(v: number): string {
  return String(Number(v.toFixed(2)));
}
