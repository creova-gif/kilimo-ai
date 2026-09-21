import type { TranslationKey } from './i18n/en';

/** Relative time as a translation key + params ("2 h ago"). Pure, so it is testable and localizable. */
export function timeAgoKey(
  iso: string,
  now: number = Date.now()
): { key: TranslationKey; params?: { n: number } } {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return { key: 'time.justNow' };
  const mins = Math.floor(Math.max(0, now - t) / 60000);
  if (mins < 1) return { key: 'time.justNow' };
  if (mins < 60) return { key: 'time.minutes', params: { n: mins } };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { key: 'time.hours', params: { n: hours } };
  return { key: 'time.days', params: { n: Math.floor(hours / 24) } };
}
