import type { TranslationKey } from '../../lib/i18n';
import { ageInMonths } from '../../lib/livestock';
import { UNITS } from '../../lib/inventory';
import { isIsoDate, type FailReason } from '../../lib/recordsCommon';

/** The `t` returned by useT(). */
export type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** "1 day" / "3 days" (Swahili: "siku 1" / "siku 3"). */
export function daysLabel(t: TFn, n: number): string {
  return t(n === 1 ? 'records.days.one' : 'records.days.other', { n });
}

/** 2026-09-21 -> "21 Sept 2026" in the UI language; falls back to the ISO string if Intl is missing. */
export function formatDate(iso: string, lang: 'en' | 'sw'): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Age from a birth date, e.g. "2 yr 3 mo" / "miaka 2, miezi 3"; null when unknown. */
export function ageLabel(t: TFn, birthDate: string | null, now: Date = new Date()): string | null {
  const months = ageInMonths(birthDate, now);
  if (months === null) return null;
  if (months < 12) return t('records.livestock.age.m', { m: months });
  return t('records.livestock.age.ym', { y: Math.floor(months / 12), m: months % 12 });
}

/** Localised message for a failed write. */
export function failMessage(t: TFn, reason: FailReason, kind: 'save' | 'delete' = 'save'): string {
  switch (reason) {
    case 'offline':
      return t('records.offline.needsConnection');
    case 'auth':
      return t('records.auth.body');
    case 'not_configured':
      return t('state.unavailable.body');
    default:
      return t(kind === 'delete' ? 'records.error.delete' : 'records.error.save');
  }
}

/** Translated inventory unit; custom units stored in the database are shown as typed. */
export function unitLabel(t: TFn, unit: string): string {
  return (UNITS as readonly string[]).includes(unit)
    ? t(`records.inventory.unit.${unit}` as TranslationKey)
    : unit;
}
