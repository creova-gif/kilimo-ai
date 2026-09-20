import { useKilimoStore, type AppLanguage } from '../../store/useKilimoStore';
import { en, type TranslationKey } from './en';
import { sw } from './sw';

export type { TranslationKey, AppLanguage };

const DICTIONARIES: Record<AppLanguage, Record<TranslationKey, string>> = { en, sw };

/** Replace {param} placeholders. Unknown params are left intact (visible in QA). */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

/**
 * Pure translate function (usable outside React and in tests).
 * Falls back to English if a key is somehow missing in the active language,
 * then to the key itself so a gap is visible rather than blank.
 */
export function translate(
  lang: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const value = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  return interpolate(value, params);
}

/** React hook bound to the user's language preference (store-backed, persisted). */
export function useT() {
  const lang = useKilimoStore((s) => s.language) as AppLanguage;
  return {
    lang,
    t: (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(lang, key, params),
  };
}
