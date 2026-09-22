/**
 * Pure helpers shared by the scheduling screens (tasks, calendar, forecast).
 * No copy lives here: every visible string goes through `t()` with `schedule.*` keys.
 */
import type { SyncQueueItem } from './syncQueue';
import type { Task, TaskPriority } from '../hooks/useTasks';
import type { AppLanguage, TranslationKey } from './i18n';
import type { ForecastDay, WeatherCondition } from './weather';

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const monthName = (t: T, month: number) => t(`schedule.month.${month}` as TranslationKey);
export const weekdayName = (t: T, day: number) => t(`schedule.weekday.${day}` as TranslationKey);
export const weekdayShort = (t: T, day: number) =>
  t(`schedule.weekdayShort.${day}` as TranslationKey);

/** "21 September" / "21 Septemba". */
export const formatDayMonth = (t: T, d: Date) =>
  t('schedule.dayMonth', { day: d.getDate(), month: monthName(t, d.getMonth()) });

/** Pick the user-entered title in the reader's language (bilingual *data*, not app copy). */
export function taskTitle(task: Pick<Task, 'title' | 'titleSw'>, lang: AppLanguage): string {
  if (lang === 'sw' && task.titleSw) return task.titleSw;
  return task.title;
}

/** Pick one side of a bilingual {en, sw} data label (e.g. crop names stored as "Mahindi (Maize)"). */
export function pickLocalized(lang: AppLanguage, names: { en: string; sw: string }): string {
  return lang === 'sw' ? names.sw : names.en;
}

/** Local calendar-day key, e.g. "2026-8-21" (month is 0-based; for maps only). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Parse a plot's `YYYY-MM-DD` as a LOCAL date (new Date('YYYY-MM-DD') would be UTC midnight). */
export function parseLocalIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `now` to `iso` (negative = in the past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const due = new Date(iso);
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

/** Relative due label for an open task. */
export function dueLabel(t: T, iso: string | undefined, now: Date = new Date()): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return t('schedule.due.none');
  const days = daysUntil(iso, now);
  if (days < 0) return t('schedule.due.overdue');
  if (days === 0) return t('schedule.due.today');
  if (days === 1) return t('schedule.due.tomorrow');
  return t('schedule.due.inDays', { count: days });
}

/** XP a task is worth, by priority (unchanged from the legacy screens). */
export const xpForPriority = (p: TaskPriority) =>
  p === 'critical' ? 40 : p === 'high' ? 25 : p === 'medium' ? 15 : 10;

/** Noon local time on `d`, as ISO — keeps a chosen calendar day stable across time zones. */
export const noonIso = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();

export type TaskSyncState = 'pending' | 'failed';

/**
 * Which tasks still have a write sitting in the offline outbox. Items leave the queue once the
 * server accepts them, so anything still here really has not reached the server yet.
 */
export function taskSyncStates(queue: readonly SyncQueueItem[]): Record<string, TaskSyncState> {
  const out: Record<string, TaskSyncState> = {};
  for (const item of queue) {
    if (!item.type.startsWith('task_')) continue;
    const p = item.payload as any;
    const id: unknown = item.type === 'task_create' ? p?.id : p?.match?.id;
    if (typeof id !== 'string') continue;
    if (item.status === 'failed') out[id] = 'failed';
    else if (out[id] !== 'failed') out[id] = 'pending';
  }
  return out;
}

// ── Forecast ──────────────────────────────────────────────────────────────────────────────
// lib/weather.ts formats `day` / `date` in Swahili; these are only used to PARSE them back.
const LIB_DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
const LIB_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];

export function forecastDayLabels(t: T, day: ForecastDay): { day: string; date: string } {
  const wd = LIB_DAYS.indexOf(day.day);
  const [dnum, mon] = day.date.split(' ');
  const mi = LIB_MONTHS.indexOf(mon);
  return {
    day: wd >= 0 ? weekdayName(t, wd) : day.day,
    date: mi >= 0 ? t('schedule.dayMonth', { day: dnum, month: monthName(t, mi) }) : day.date,
  };
}

/** Same thresholds as lib/weather.ts swTip, but translated. */
export function fieldTipKey(c: WeatherCondition, high: number, popPct: number): TranslationKey {
  if (c === 'storm') return 'schedule.forecast.tip.storm';
  if (c === 'rain' && popPct >= 60) return 'schedule.forecast.tip.rainHeavy';
  if (c === 'rain') return 'schedule.forecast.tip.rain';
  if (c === 'cloud') return 'schedule.forecast.tip.cloud';
  if (high >= 28) return 'schedule.forecast.tip.hot';
  return 'schedule.forecast.tip.fair';
}

