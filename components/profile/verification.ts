/**
 * Kilimo AI — KYC verification client (app/verification/*).
 *
 * Talks to the real backend only:
 *   - submit: the `submit-verification` edge function (JWT required; it stores a
 *     verification_requests row and flips agro_profiles.verification_status to 'pending').
 *     It accepts exactly: verificationType ('personal' | 'business'), nationalId, businessName,
 *     tin, regNumber, notes. Nothing else is sent.
 *   - status: the caller's own verification_requests rows (RLS "own requests: select").
 *
 * The draft typed on the personal step is held in memory only (never in the URL, never persisted)
 * and cleared after a successful submit.
 */
import type { TranslationKey } from '../../lib/i18n';

export type VerificationType = 'personal' | 'business';
export type RequestStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationDraft {
  nationalId: string;
  businessName: string;
  tin: string;
  regNumber: string;
}

const EMPTY: VerificationDraft = { nationalId: '', businessName: '', tin: '', regNumber: '' };
let draft: VerificationDraft = { ...EMPTY };

export const getDraft = (): VerificationDraft => ({ ...draft });
export const updateDraft = (patch: Partial<VerificationDraft>) => {
  draft = { ...draft, ...patch };
};
export const clearDraft = () => {
  draft = { ...EMPTY };
};

/** NIDA numbers are 20 digits (often written with dashes); passports are 6–12 letters/digits. */
export function normalizeNationalId(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
export function isValidNationalId(raw: string): boolean {
  const v = normalizeNationalId(raw);
  return /^\d{20}$/.test(v) || /^[A-Z0-9]{6,12}$/.test(v);
}
/** Tanzanian TIN: 9 digits (commonly written 123-456-789). Optional. */
export function isValidTin(raw: string): boolean {
  const v = raw.replace(/[\s-]/g, '');
  return v === '' || /^\d{9}$/.test(v);
}

export function buildSubmitBody(d: VerificationDraft): Record<string, string> {
  const hasBusiness = !!(d.businessName.trim() || d.tin.trim() || d.regNumber.trim());
  const body: Record<string, string> = {
    verificationType: hasBusiness ? 'business' : 'personal',
    nationalId: normalizeNationalId(d.nationalId),
  };
  if (d.businessName.trim()) body.businessName = d.businessName.trim();
  if (d.tin.trim()) body.tin = d.tin.replace(/[\s-]/g, '');
  if (d.regNumber.trim()) body.regNumber = d.regNumber.trim();
  return body;
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'offline' | 'not_signed_in' | 'server'; detail?: string };

export async function submitVerification(
  client: any,
  d: VerificationDraft,
  isOnline: boolean
): Promise<SubmitResult> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (!isOnline) return { ok: false, reason: 'offline' };
  try {
    const { data } = await client.auth.getSession();
    if (!data?.session?.user?.id) return { ok: false, reason: 'not_signed_in' };
    const { data: res, error } = await client.functions.invoke('submit-verification', {
      body: buildSubmitBody(d),
    });
    if (error) return { ok: false, reason: 'server', detail: String(error.message ?? error) };
    if (!res?.ok) return { ok: false, reason: 'server', detail: String(res?.error ?? '') };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: 'server', detail: String(err?.message ?? err) };
  }
}

export const SUBMIT_ERROR_KEYS: Record<string, TranslationKey> = {
  not_configured: 'profile.verify.error.notConfigured',
  offline: 'profile.verify.error.offline',
  not_signed_in: 'profile.verify.error.signedOut',
  server: 'profile.verify.error.server',
};

export interface VerificationRequestRow {
  id: string;
  verification_type: VerificationType;
  status: RequestStatus;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusResult =
  | { ok: true; latest: VerificationRequestRow | null }
  | { ok: false; reason: 'not_configured' | 'not_signed_in' | 'server' };

export async function fetchLatestRequest(client: any): Promise<StatusResult> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data: s } = await client.auth.getSession();
    const userId = s?.session?.user?.id;
    if (!userId) return { ok: false, reason: 'not_signed_in' };
    const { data, error } = await client
      .from('verification_requests')
      .select('id, verification_type, status, reviewer_note, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return { ok: false, reason: 'server' };
    return { ok: true, latest: ((data ?? [])[0] as VerificationRequestRow) ?? null };
  } catch {
    return { ok: false, reason: 'server' };
  }
}
