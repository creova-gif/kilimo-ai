import type { TranslationKey } from './i18n/en';

/**
 * Map a raw auth error (Supabase / GoTrue / SMS provider / network / our own
 * not-configured error) to a localized message key.
 *
 * Users must never see raw backend text — it is English, technical and gives a
 * farmer nothing to act on (gap G-019). Unknown errors fall back to a generic
 * "try again" key rather than leaking the raw message.
 */
export function authErrorKey(err: unknown): TranslationKey {
  const raw =
    typeof err === 'string'
      ? err
      : ((err as { message?: string } | null | undefined)?.message ?? '');
  const m = raw.toLowerCase();

  if (/not configured|not available|haipatikani|haijaunganishwa/.test(m)) return 'auth.notConfigured';
  // Rate limits before "invalid": GoTrue's wording mentions "security purposes".
  if (/rate limit|too many|only request this after|security purposes|\b429\b/.test(m)) return 'auth.rateLimited';
  if (/expired|invalid.*(token|code|otp)|otp_expired|verification code|token has/.test(m)) return 'auth.invalidCode';
  if (/network|failed to fetch|timed out|timeout|offline|connection/.test(m)) return 'auth.network';
  if (/provider|sms|confirmation otp|sending/.test(m)) return 'auth.sendFailed';
  return 'auth.generic';
}
