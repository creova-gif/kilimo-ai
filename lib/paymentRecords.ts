/**
 * Payment RECORDS — a note-keeping list, not a payment system.
 *
 * No payment provider (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, a bank) is integrated anywhere in
 * KILIMO AI, so nothing in this module can move money, and no status here means "money moved through
 * the app". A row is one of:
 *   - `recorded`          the user logged a payment they made/received OUTSIDE the app
 *   - `pending_provider`  a request the user intends to make once a provider exists (nothing was sent)
 *   - `cancelled`         withdrawn by the user
 * The DB enforces the same pairing (direction <-> status); see migration 20260921110000.
 */
import { normalizePhone } from './phone';
import { parseAmount, type FinanceFailure } from './finance';

export type PaymentDirection = 'sent' | 'received' | 'request';
export type PaymentStatus = 'recorded' | 'pending_provider' | 'cancelled';

export const PAYMENT_NETWORKS = [
  'mpesa',
  'tigopesa',
  'airtelmoney',
  'halopesa',
  'cash',
  'other',
] as const;
export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

/** Brand names are not translated; `cash` / `other` are localised by the UI. */
export const NETWORK_BRAND_NAME: Partial<Record<PaymentNetwork, string>> = {
  mpesa: 'M-Pesa',
  tigopesa: 'Tigo Pesa',
  airtelmoney: 'Airtel Money',
  halopesa: 'HaloPesa',
};

export interface PaymentRecord {
  id: string;
  direction: PaymentDirection;
  counterparty: string;
  phone: string | null;
  amountTzs: number;
  network: PaymentNetwork;
  reference: string;
  status: PaymentStatus;
  note: string;
  createdAt: string;
}

export function normalizeNetwork(value: unknown): PaymentNetwork {
  return (PAYMENT_NETWORKS as readonly string[]).includes(value as string)
    ? (value as PaymentNetwork)
    : 'other';
}

export function mapPaymentRow(row: any): PaymentRecord {
  const direction: PaymentDirection =
    row.direction === 'sent' || row.direction === 'received' ? row.direction : 'request';
  const status: PaymentStatus =
    row.status === 'pending_provider' || row.status === 'cancelled' ? row.status : 'recorded';
  return {
    id: row.id,
    direction,
    counterparty: row.counterparty ?? '',
    phone: row.phone ?? null,
    amountTzs: Number(row.amount_tzs),
    network: normalizeNetwork(row.network),
    reference: row.reference ?? '',
    status,
    note: row.note ?? '',
    createdAt: row.created_at,
  };
}

/** The only status a new record may start in: a request waits for a provider; the rest are user records. */
export const statusForDirection = (d: PaymentDirection): Exclude<PaymentStatus, 'cancelled'> =>
  d === 'request' ? 'pending_provider' : 'recorded';

/* ── validation ──────────────────────────────────────────────────────────────────────────── */
export interface PaymentInput {
  direction: PaymentDirection;
  counterparty: string;
  /** Optional; when present it must normalise to a valid international number. */
  phone?: string;
  /** Raw text from the amount field. */
  amount: string;
  network: PaymentNetwork;
  reference?: string;
  note?: string;
}

export interface PaymentErrors {
  counterparty?: boolean;
  phone?: boolean;
  amount?: boolean;
  reference?: boolean;
  note?: boolean;
}

export function validatePaymentInput(i: PaymentInput): PaymentErrors {
  const errors: PaymentErrors = {};
  const who = i.counterparty.trim();
  if (!who || who.length > 80) errors.counterparty = true;
  if (i.phone?.trim() && !normalizePhone(i.phone)) errors.phone = true;
  if (parseAmount(i.amount) === null) errors.amount = true;
  if ((i.reference ?? '').trim().length > 60) errors.reference = true;
  if ((i.note ?? '').trim().length > 300) errors.note = true;
  return errors;
}

const hasErrors = (e: object) => Object.values(e).some(Boolean);

/* ── CRUD (injected Supabase client) ─────────────────────────────────────────────────────── */
type Fail = { ok: false; reason: FinanceFailure; message?: string };
const fail = (e: any, reason: FinanceFailure = 'error'): Fail => ({
  ok: false,
  reason,
  message: e?.message ?? String(e),
});

export const PAYMENT_FETCH_LIMIT = 500;

export async function fetchPayments(
  client: any | null | undefined
): Promise<{ ok: true; records: PaymentRecord[] } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('payment_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAYMENT_FETCH_LIMIT);
    if (error) return fail(error);
    return { ok: true, records: (data ?? []).map(mapPaymentRow) };
  } catch (e) {
    return fail(e);
  }
}

export async function createPayment(
  client: any | null | undefined,
  i: PaymentInput
): Promise<{ ok: true; record: PaymentRecord } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (hasErrors(validatePaymentInput(i))) return { ok: false, reason: 'invalid' };
  try {
    const { data, error } = await client
      .from('payment_records')
      .insert({
        direction: i.direction,
        counterparty: i.counterparty.trim(),
        phone: i.phone?.trim() ? normalizePhone(i.phone) : null,
        amount_tzs: parseAmount(i.amount),
        network: i.network,
        reference: i.reference?.trim() || null,
        // Derived from direction here, never taken from the caller: nothing can save a "completed" payment.
        status: statusForDirection(i.direction),
        note: i.note?.trim() || null,
      })
      .select('*')
      .single();
    if (error) return fail(error);
    return { ok: true, record: mapPaymentRow(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelPayment(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true; record: PaymentRecord } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('payment_records')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(error);
    return { ok: true, record: mapPaymentRow(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePayment(
  client: any | null | undefined,
  id: string
): Promise<{ ok: true } | Fail> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { error } = await client.from('payment_records').delete().eq('id', id);
    return error ? fail(error) : { ok: true };
  } catch (e) {
    return fail(e);
  }
}
