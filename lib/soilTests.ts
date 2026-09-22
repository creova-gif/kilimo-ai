/**
 * Soil test results the farmer records (KIL-003). Backed by `public.soil_tests`
 * (migration 20260922100000): owner-only RLS, one row per test, every value typed in by the farmer
 * from a lab report or test kit. Nothing is measured or inferred here.
 *
 *  - Creating a test goes through the offline outbox (lib/offline.ts): it is saved on the device
 *    at once and synced when online, and the screen marks it "waiting to sync" until then.
 *  - Deleting is online-only and verified (RLS can silently match zero rows).
 *  - pH interpretation is generic agronomic guidance for common crops, not a diagnosis.
 */
import { parseIsoDate, todayIso } from './farms';
import { enqueueAction, generateId, registerSyncType, type SyncQueueItem } from './offline';
import { parseDecimal } from './recordsCommon';

export type SoilTestSource = 'lab' | 'kit' | 'other';
export const SOIL_TEST_SOURCES: SoilTestSource[] = ['lab', 'kit', 'other'];

export interface SoilTest {
  id: string;
  plotId: string;
  /** ISO `YYYY-MM-DD`. */
  testedOn: string;
  ph: number | null;
  nitrogenPct: number | null;
  phosphorusPpm: number | null;
  potassiumPpm: number | null;
  organicMatterPct: number | null;
  source: SoilTestSource;
  notes: string | null;
  createdAt: string;
  /** True while the row only exists in the device outbox. */
  pending?: boolean;
}

/** As typed in the form (strings; comma or dot decimals). Blank = not measured. */
export interface SoilTestInput {
  plotId: string;
  testedOn: string;
  ph?: string;
  nitrogenPct?: string;
  phosphorusPpm?: string;
  potassiumPpm?: string;
  organicMatterPct?: string;
  source?: SoilTestSource;
  notes?: string;
}

export interface SoilTestErrors {
  plot?: boolean;
  testedOn?: boolean;
  /** Date is after today. */
  future?: boolean;
  ph?: boolean;
  nitrogenPct?: boolean;
  phosphorusPpm?: boolean;
  potassiumPpm?: boolean;
  organicMatterPct?: boolean;
  /** No measurement entered at all. */
  empty?: boolean;
}

type Field = 'ph' | 'nitrogenPct' | 'phosphorusPpm' | 'potassiumPpm' | 'organicMatterPct';
const RANGES: Record<Field, [number, number]> = {
  ph: [0, 14],
  nitrogenPct: [0, 100],
  phosphorusPpm: [0, 10000],
  potassiumPpm: [0, 100000],
  organicMatterPct: [0, 100],
};
const FIELDS = Object.keys(RANGES) as Field[];

/** undefined = blank, null = invalid, number = valid. */
function readField(f: Field, text: string | undefined): number | null | undefined {
  if (!text || !text.trim()) return undefined;
  const n = parseDecimal(text);
  if (n === null) return null;
  const [lo, hi] = RANGES[f];
  return n < lo || n > hi ? null : n;
}

export function validateSoilTestInput(i: SoilTestInput, now: Date = new Date()): SoilTestErrors {
  const e: SoilTestErrors = {};
  if (!i.plotId) e.plot = true;
  const t = parseIsoDate(i.testedOn);
  if (t === null) e.testedOn = true;
  else if (t > (parseIsoDate(todayIso(now)) as number)) e.future = true;
  let any = false;
  for (const f of FIELDS) {
    const v = readField(f, i[f]);
    if (v === null) e[f] = true;
    if (v !== undefined) any = true;
  }
  if (!any) e.empty = true;
  return e;
}

export const hasSoilErrors = (e: SoilTestErrors) => Object.values(e).some(Boolean);

const trimOrNull = (s?: string) => {
  const v = (s ?? '').trim();
  return v ? v : null;
};

/** Server-shaped row. `id` is generated on the device and doubles as the idempotency key. */
export function toSoilTestRow(i: SoilTestInput, id: string) {
  const num = (f: Field) => {
    const v = readField(f, i[f]);
    return typeof v === 'number' ? v : null;
  };
  return {
    id,
    plot_id: i.plotId,
    tested_on: i.testedOn.trim(),
    ph: num('ph'),
    nitrogen_pct: num('nitrogenPct'),
    phosphorus_ppm: num('phosphorusPpm'),
    potassium_ppm: num('potassiumPpm'),
    organic_matter_pct: num('organicMatterPct'),
    source: SOIL_TEST_SOURCES.includes(i.source as SoilTestSource) ? i.source : 'other',
    notes: trimOrNull(i.notes),
  };
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function mapSoilTestRow(row: any, pending = false): SoilTest {
  return {
    id: row.id,
    plotId: row.plot_id,
    testedOn: row.tested_on,
    ph: numOrNull(row.ph),
    nitrogenPct: numOrNull(row.nitrogen_pct),
    phosphorusPpm: numOrNull(row.phosphorus_ppm),
    potassiumPpm: numOrNull(row.potassium_ppm),
    organicMatterPct: numOrNull(row.organic_matter_pct),
    source: SOIL_TEST_SOURCES.includes(row.source) ? row.source : 'other',
    notes: row.notes ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    pending,
  };
}

/* ── data access ──────────────────────────────────────────────────────────────────────────── */
export const SOIL_TEST_SYNC_TYPE = 'soil_test_create';
registerSyncType(SOIL_TEST_SYNC_TYPE, {
  table: 'soil_tests',
  ops: ['insert'],
  ownerColumn: 'user_id',
});

export interface SoilListResult {
  ok: boolean;
  tests: SoilTest[];
  reason?: 'not_configured' | 'error';
  message?: string;
}

export async function fetchSoilTests(client: any | null | undefined): Promise<SoilListResult> {
  if (!client) return { ok: false, tests: [], reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('soil_tests')
      .select('*')
      .order('tested_on', { ascending: false });
    if (error) return { ok: false, tests: [], reason: 'error', message: error.message };
    return { ok: true, tests: (data ?? []).map((r: any) => mapSoilTestRow(r)) };
  } catch (e: any) {
    return { ok: false, tests: [], reason: 'error', message: e?.message ?? String(e) };
  }
}

/** Queue a new test in the outbox (works offline). Returns the row id, or `invalid`. */
export function queueSoilTest(
  input: SoilTestInput,
  now: Date = new Date()
): { ok: boolean; id?: string; reason?: 'invalid' } {
  if (hasSoilErrors(validateSoilTestInput(input, now))) return { ok: false, reason: 'invalid' };
  const id = generateId();
  enqueueAction({
    type: SOIL_TEST_SYNC_TYPE,
    table: 'soil_tests',
    op: 'insert',
    payload: toSoilTestRow(input, id),
  });
  return { ok: true, id };
}

/** Tests still waiting in the outbox (so they stay visible before they sync). */
export function pendingSoilTests(queue: readonly SyncQueueItem[]): SoilTest[] {
  return queue
    .filter((q) => q.type === SOIL_TEST_SYNC_TYPE && q.payload && (q.payload as any).plot_id)
    .map((q) => mapSoilTestRow({ ...q.payload, created_at: q.createdAt }, true));
}

/** Server rows plus queued rows (server wins on the same id), newest test date first. */
export function mergeSoilTests(server: SoilTest[], pending: SoilTest[]): SoilTest[] {
  const ids = new Set(server.map((s) => s.id));
  return [...server, ...pending.filter((p) => !ids.has(p.id))].sort((a, b) =>
    a.testedOn === b.testedOn
      ? b.createdAt.localeCompare(a.createdAt)
      : b.testedOn.localeCompare(a.testedOn)
  );
}

export async function deleteSoilTest(
  client: any | null | undefined,
  id: string
): Promise<{ ok: boolean; reason?: 'not_configured' | 'not_found' | 'error' }> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client.from('soil_tests').delete().eq('id', id).select('id');
    if (error) return { ok: false, reason: 'error' };
    if (!data || data.length === 0) return { ok: false, reason: 'not_found' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/* ── interpretation (generic guidance) ───────────────────────────────────────────────────── */
export type PhBand = 'strongAcid' | 'acid' | 'optimal' | 'alkaline' | 'strongAlkaline';

/**
 * Broad pH bands used in general extension advice for most staple crops
 * (optimum roughly 6.0–7.0). Not crop-specific and not a diagnosis.
 */
export function phBand(ph: number | null | undefined): PhBand | null {
  if (ph === null || ph === undefined || !Number.isFinite(ph)) return null;
  if (ph < 5.5) return 'strongAcid';
  if (ph < 6.0) return 'acid';
  if (ph <= 7.0) return 'optimal';
  if (ph <= 7.8) return 'alkaline';
  return 'strongAlkaline';
}

/** pH readings for one plot, oldest first (for a trend). Only tests that recorded pH. */
export function phSeries(tests: SoilTest[], plotId: string): { testedOn: string; ph: number }[] {
  return tests
    .filter((t) => t.plotId === plotId && t.ph !== null)
    .map((t) => ({ testedOn: t.testedOn, ph: t.ph as number }))
    .sort((a, b) => a.testedOn.localeCompare(b.testedOn));
}
