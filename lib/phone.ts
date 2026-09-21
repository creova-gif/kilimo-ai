/**
 * Normalise a user-typed phone number to E.164 for Supabase Auth.
 *
 * KilimoAI is Tanzania-first (the UI shows a +255 prefix), but farmers type
 * numbers three ways — `712 345 678`, `0712 345 678`, `255712345678` — and a
 * number that is not valid E.164 makes the OTP request fail. Numbers that are
 * already international (`+254…`, `00254…`) are preserved.
 *
 * Returns `null` when the input cannot be a valid number, so callers can show
 * an inline error instead of sending a request that is certain to fail.
 */
export function normalizePhone(input: string): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Only digits and a single leading "+" are meaningful; drop spaces, dashes,
  // dots and parentheses.
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  // A "+" anywhere other than the first character is malformed ("++255…").
  if (raw.replace(/^\+/, '').includes('+')) return null;

  let e164: string;
  if (hasPlus) {
    e164 = digits; // already international
  } else if (digits.startsWith('00')) {
    e164 = digits.slice(2);
  } else if (digits.startsWith('255') && digits.length === 12) {
    e164 = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    e164 = '255' + digits.slice(1);
  } else if (digits.length === 9 && /^[67]/.test(digits)) {
    e164 = '255' + digits;
  } else {
    return null;
  }

  // E.164: up to 15 digits, and a plausible minimum.
  if (e164.length < 10 || e164.length > 15) return null;
  return '+' + e164;
}
