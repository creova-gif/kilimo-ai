/**
 * Insurance policy + claim RECORDS — the real data layer behind app/insurance.tsx.
 *
 * Backed by `public.insurance_policies` / `public.insurance_claims` (migration 20260921140000,
 * owner-only RLS). This is a farmer's own record-keeping. Nothing here contacts an insurer, so:
 *   • a policy is one the farmer TYPED IN — we do not verify it with the provider;
 *   • a claim is a note the farmer keeps; `submitted_record` only means "I marked that I sent it to my
 *     insurer myself" — the app never files anything;
 *   • money amounts are estimates the farmer entered, never payouts.
 * The Supabase client is injected so every function is testable.
 */
import type { TranslationKey } from './i18n/en';
import { formatMoney } from './listings';

/* ── vocabulary ──────────────────────────────────────────────────────────────────────────── */
export const INCIDENT_TYPES = ['drought', 'flood', 'pest', 'disease', 'fire', 'theft', 'other'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export const CLAIM_STATUSES = ['draft', 'submitted_record', 'closed'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type PolicyStatus = 'active' | 'expired' | 'cancelled';

export const incidentKey = (t: IncidentType) => `insurance.incident.${t}` as TranslationKey;
export const claimStatusKey = (s: ClaimStatus) => `insurance.claim.status.${s}` as TranslationKey;

export const isIncidentType = (v: unknown): v is IncidentType =>
  typeof v === 'string' && (INCIDENT_TYPES as readonly string[]).includes(v);

/** A policy expiring within this many days is flagged "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

/* ── entities ────────────────────────────────────────────────────────────────────────────── */
export interface InsurancePolicy {
  id: string;
  provider: string;
  policyNumber: string | null;
  cropOrAsset: string;
  coverAmountTzs: number | null;
  premiumTzs: number | null;
  /** 'YYYY-MM-DD' */
  startDate: string;
  /** 'YYYY-MM-DD' */
  endDate: string;
  status: PolicyStatus;
  notes: string | null;
  createdAt: string;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  /** 'YYYY-MM-DD' */
  incidentDate: string;
  incidentType: IncidentType;
  description: string;
  estimatedLossTzs: number | null;
  status: ClaimStatus;
  createdAt: string;
}

const numOrNull = (v: any): number | null => (v === null || v === undefined ? null : Number(v));

export function mapPolicyRow(row: any): InsurancePolicy {
  return {
    id: row.id,
    provider: row.provider,
    policyNumber: row.policy_number ?? null,
    cropOrAsset: row.crop_or_asset,
    coverAmountTzs: numOrNull(row.cover_amount_tzs),
    premiumTzs: numOrNull(row.premium_tzs),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status ?? 'active',
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

export function mapClaimRow(row: any): InsuranceClaim {
  return {
    id: row.id,
    policyId: row.policy_id,
    incidentDate: row.incident_date,
    incidentType: isIncidentType(row.incident_type) ? row.incident_type : 'other',
    description: row.description,
    estimatedLossTzs: numOrNull(row.estimated_loss_tzs),
    status: row.status ?? 'draft',
    createdAt: row.created_at,
  };
}

/* ── dates (calendar days, no time zones) ────────────────────────────────────────────────── */
/** UTC-midnight milliseconds for a 'YYYY-MM-DD' string, or null if it is not a real calendar date. */
export function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  // Round-trip catches 2026-02-31 and friends.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

export const isValidDay = (s: string) => parseDay(s) !== null;

/** Today's calendar date in the phone's own time zone, as 'YYYY-MM-DD'. */
export function todayString(now: number = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' shifted by whole calendar months (day clamped to month length). Null if `s` is invalid. */
export function addMonths(s: string, months: number): string | null {
  const ms = parseDay(s);
  if (ms === null) return null;
  const d = new Date(ms);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const y = Math.floor(total / 12);
  const mo = total % 12;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDay);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(mo + 1)}-${p(day)}`;
}

const DAY_MS = 86_400_000;

/* ── parsing / validation ────────────────────────────────────────────────────────────────── */
/** Parse a TZS amount typed by hand; thousands separators (commas, spaces) are ignored. Empty → null. */
export function parseTzs(input: string): number | null {
  const s = input.replace(/[,\s]/g, '');
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export interface PolicyInput {
  provider: string;
  policyNumber?: string;
  cropOrAsset: string;
  coverAmount?: string;
  premium?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}
export interface PolicyErrors {
  provider?: boolean;
  cropOrAsset?: boolean;
  coverAmount?: boolean;
  premium?: boolean;
  startDate?: boolean;
  /** Missing, invalid, or before the start date. */
  endDate?: boolean;
}

export function validatePolicyInput(i: PolicyInput): PolicyErrors {
  const e: PolicyErrors = {};
  if (!i.provider.trim() || i.provider.trim().length > 120) e.provider = true;
  if (!i.cropOrAsset.trim() || i.cropOrAsset.trim().length > 120) e.cropOrAsset = true;
  if (Number.isNaN(parseTzs(i.coverAmount ?? ''))) e.coverAmount = true;
  if (Number.isNaN(parseTzs(i.premium ?? ''))) e.premium = true;
  const start = parseDay(i.startDate);
  const end = parseDay(i.endDate);
  if (start === null) e.startDate = true;
  if (end === null || (start !== null && end < start)) e.endDate = true;
  return e;
}

export interface ClaimInput {
  policyId: string;
  incidentDate: string;
  incidentType: IncidentType | '';
  description: string;
  estimatedLoss?: string;
}
export interface ClaimErrors {
  policyId?: boolean;
  /** Missing, not a real date, or in the future. */
  incidentDate?: boolean;
  incidentType?: boolean;
  description?: boolean;
  estimatedLoss?: boolean;
}

export function validateClaimInput(i: ClaimInput, now: number = Date.now()): ClaimErrors {
  const e: ClaimErrors = {};
  if (!i.policyId) e.policyId = true;
  const day = parseDay(i.incidentDate);
  const today = parseDay(todayString(now));
  if (day === null || (today !== null && day > today)) e.incidentDate = true;
  if (!isIncidentType(i.incidentType)) e.incidentType = true;
  if (!i.description.trim() || i.description.trim().length > 2000) e.description = true;
  if (Number.isNaN(parseTzs(i.estimatedLoss ?? ''))) e.estimatedLoss = true;
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

export async function fetchPolicies(
  client: any | null | undefined
): Promise<{ ok: true; policies: InsurancePolicy[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('insurance_policies')
      .select('*')
      .order('end_date', { ascending: false });
    if (error) return fail('error', error);
    return { ok: true, policies: (data ?? []).map(mapPolicyRow) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function fetchClaims(
  client: any | null | undefined
): Promise<{ ok: true; claims: InsuranceClaim[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('insurance_claims')
      .select('*')
      .order('incident_date', { ascending: false });
    if (error) return fail('error', error);
    return { ok: true, claims: (data ?? []).map(mapClaimRow) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function createPolicy(
  client: any | null | undefined,
  i: PolicyInput
): Promise<{ ok: true; policy: InsurancePolicy } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validatePolicyInput(i))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('insurance_policies')
      .insert({
        provider: i.provider.trim(),
        policy_number: i.policyNumber?.trim() || null,
        crop_or_asset: i.cropOrAsset.trim(),
        cover_amount_tzs: parseTzs(i.coverAmount ?? ''),
        premium_tzs: parseTzs(i.premium ?? ''),
        start_date: i.startDate.trim(),
        end_date: i.endDate.trim(),
        notes: i.notes?.trim() || null,
      })
      .select('*')
      .single();
    if (error) return fail('error', error);
    return { ok: true, policy: mapPolicyRow(data) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function updatePolicyStatus(
  client: any | null | undefined,
  id: string,
  status: PolicyStatus
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('insurance_policies').update({ status }).eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

export async function deletePolicy(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('insurance_policies').delete().eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

export async function createClaim(
  client: any | null | undefined,
  i: ClaimInput,
  now: number = Date.now()
): Promise<{ ok: true; claim: InsuranceClaim } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateClaimInput(i, now))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('insurance_claims')
      .insert({
        policy_id: i.policyId,
        incident_date: i.incidentDate.trim(),
        incident_type: i.incidentType,
        description: i.description.trim(),
        estimated_loss_tzs: parseTzs(i.estimatedLoss ?? ''),
        status: 'draft',
      })
      .select('*')
      .single();
    if (error) return fail('error', error);
    return { ok: true, claim: mapClaimRow(data) };
  } catch (e) {
    return fail('error', e);
  }
}

export async function updateClaimStatus(
  client: any | null | undefined,
  id: string,
  status: ClaimStatus
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('insurance_claims').update({ status }).eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

export async function deleteClaim(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('insurance_claims').delete().eq('id', id);
    return error ? fail('error', error) : { ok: true };
  } catch (e) {
    return fail('error', e);
  }
}

/* ── pure helpers ────────────────────────────────────────────────────────────────────────── */
export type PolicyState = 'active' | 'expiring_soon' | 'upcoming' | 'expired' | 'cancelled';

export interface PolicyStanding {
  state: PolicyState;
  /** Whole days until the end date (0 = ends today). Null unless the policy is in force. */
  daysLeft: number | null;
}

/**
 * Whether a recorded policy is in force today, judged from its dates AND the status the farmer set.
 * A row still marked `active` whose end date has passed is `expired`; a manual cancel/expire always wins.
 * (We can only judge the farmer's own record — this is not a confirmation from the insurer.)
 */
export function policyStanding(
  p: Pick<InsurancePolicy, 'status' | 'startDate' | 'endDate'>,
  now: number = Date.now()
): PolicyStanding {
  if (p.status === 'cancelled') return { state: 'cancelled', daysLeft: null };
  if (p.status === 'expired') return { state: 'expired', daysLeft: null };
  const today = parseDay(todayString(now));
  const start = parseDay(p.startDate);
  const end = parseDay(p.endDate);
  if (today === null || start === null || end === null) return { state: 'expired', daysLeft: null };
  if (today < start) return { state: 'upcoming', daysLeft: null };
  if (today > end) return { state: 'expired', daysLeft: null };
  const daysLeft = Math.round((end - today) / DAY_MS);
  return { state: daysLeft <= EXPIRING_SOON_DAYS ? 'expiring_soon' : 'active', daysLeft };
}

export const isInForce = (p: Parameters<typeof policyStanding>[0], now?: number) => {
  const s = policyStanding(p, now).state;
  return s === 'active' || s === 'expiring_soon';
};

/** Whether an incident date falls inside the policy's recorded cover period (inclusive). */
export function incidentWithinPolicy(
  p: Pick<InsurancePolicy, 'startDate' | 'endDate'>,
  incidentDate: string
): boolean {
  const d = parseDay(incidentDate);
  const s = parseDay(p.startDate);
  const e = parseDay(p.endDate);
  return d !== null && s !== null && e !== null && d >= s && d <= e;
}

export interface ClaimTotals {
  count: number;
  /** Sum of the farmer's own estimates — NOT an amount claimed from, or paid by, an insurer. */
  totalEstimatedLossTzs: number;
  /** Claims recorded without an estimate. */
  withoutEstimate: number;
  byStatus: Record<ClaimStatus, number>;
}

export function claimTotals(claims: InsuranceClaim[], policyId?: string): ClaimTotals {
  const byStatus: Record<ClaimStatus, number> = { draft: 0, submitted_record: 0, closed: 0 };
  let total = 0;
  let without = 0;
  let count = 0;
  for (const c of claims) {
    if (policyId && c.policyId !== policyId) continue;
    count++;
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    if (c.estimatedLossTzs === null) without++;
    else total += c.estimatedLossTzs;
  }
  return { count, totalEstimatedLossTzs: total, withoutEstimate: without, byStatus };
}

export interface PolicyOverview {
  totals: ClaimTotals;
  cover: number | null;
  /** True when estimated losses recorded against this policy exceed its recorded cover. */
  exceedsCover: boolean;
}

export function policyOverview(policy: InsurancePolicy, claims: InsuranceClaim[]): PolicyOverview {
  const totals = claimTotals(claims, policy.id);
  const cover = policy.coverAmountTzs;
  return {
    totals,
    cover,
    exceedsCover: cover !== null && totals.totalEstimatedLossTzs > cover,
  };
}

/**
 * Plain-text summary of a claim record for the farmer to send to their insurer THEMSELVES (through
 * the OS share sheet — WhatsApp, SMS, email). Building this text sends nothing.
 */
export function buildClaimSummary(
  policy: InsurancePolicy,
  claim: InsuranceClaim,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const lines = [
    t('insurance.share.heading'),
    t('insurance.share.provider', { value: policy.provider }),
    policy.policyNumber ? t('insurance.share.policyNumber', { value: policy.policyNumber }) : null,
    t('insurance.share.insured', { value: policy.cropOrAsset }),
    t('insurance.share.incidentDate', { value: claim.incidentDate }),
    t('insurance.share.incidentType', { value: t(incidentKey(claim.incidentType)) }),
    claim.estimatedLossTzs !== null
      ? t('insurance.share.estimatedLoss', { value: formatMoney(claim.estimatedLossTzs) })
      : null,
    t('insurance.share.description', { value: claim.description }),
    '',
    t('insurance.share.footer'),
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}
