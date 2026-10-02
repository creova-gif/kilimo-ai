// SMS dispatch policy for the sms-send edge function.
// Ownership is the auth user's phone (set by phone OTP), not a client claim.
// The rate window is enforced atomically by claim_sms_send.

export const SMS_EVENTS = [
  'critical_diagnosis',
  'price_alert',
  'severe_weather',
  'payment_received',
] as const;

export const SMS_MAX_PER_WINDOW = 5;
export const SMS_WINDOW_SECONDS = 60 * 60;
export const SMS_MAX_CHARS = 320;

export function smsEventAllowed(event: unknown): boolean {
  return typeof event === 'string' && (SMS_EVENTS as readonly string[]).includes(event);
}

export function normalizePhone(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/** True when `to` is the authenticated user's own phone number. */
export function recipientOwnedBy(to: string, ownerPhone: string | null | undefined): boolean {
  const dest = normalizePhone(to);
  const owner = normalizePhone(ownerPhone);
  if (dest.length < 7 || owner.length < 7) return false;
  return dest === owner;
}

/** True when another send may be claimed. Mirrors claim_sms_send's `n >= p_max` deny. */
export function smsSendAllowed(sentInWindow: number, max = SMS_MAX_PER_WINDOW): boolean {
  if (!Number.isFinite(sentInWindow) || !Number.isFinite(max)) return false;
  if (max < 1 || sentInWindow < 0) return false;
  return sentInWindow < max;
}
