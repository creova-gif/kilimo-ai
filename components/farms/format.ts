import type { BadgeVariant } from '../ui';
import type { TranslationKey } from '../../lib/i18n';
import {
  formatAcres,
  formatHa,
  type FarmsFailure,
  type PlotLifecycle,
  type PlotStage,
} from '../../lib/farms';

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const STAGE_BADGE: Record<PlotStage, BadgeVariant> = {
  planned: 'neutral',
  early: 'success',
  mid: 'success',
  late: 'success',
  growing: 'success',
  harvestSoon: 'warning',
  overdue: 'error',
  harvested: 'info',
  fallow: 'neutral',
};

export const stageLabel = (t: T, stage: PlotStage) => t(`farms.stage.${stage}`);

/** "Harvest in 12 days" / "3 days past the expected harvest date" — null when no harvest date is known. */
export function harvestLine(t: T, lc: PlotLifecycle): string | null {
  const d = lc.daysToHarvest;
  if (d === null || lc.stage === 'harvested' || lc.stage === 'fallow' || lc.stage === 'planned') {
    return null;
  }
  if (d < 0) {
    const n = -d;
    return n === 1 ? t('farms.harvest.overdue.one') : t('farms.harvest.overdue', { n });
  }
  if (d === 0) return t('farms.harvest.today');
  return d === 1 ? t('farms.harvest.inDays.one') : t('farms.harvest.inDays', { n: d });
}

/** "1.5 ha · ≈ 3.7 acres", or the "not set" copy. */
export function areaLine(t: T, ha: number | null, opts: { withAcres?: boolean } = {}): string {
  const h = formatHa(ha);
  if (h === null) return t('farms.area.unknown');
  const parts = [t('farms.area.ha', { value: h })];
  if (opts.withAcres) {
    const a = formatAcres(ha);
    if (a !== null) parts.push(t('farms.area.acres', { value: a }));
  }
  return parts.join('  ·  ');
}

/** Localized message for a failed write. `kind` picks the duplicate-name wording. */
export function failureMessage(
  t: T,
  reason: FarmsFailure | undefined,
  kind: 'farm' | 'plot'
): string {
  switch (reason) {
    case 'offline':
      return t('farms.offline.write');
    case 'duplicate':
      return t(kind === 'farm' ? 'farms.err.duplicate.farm' : 'farms.err.duplicate.plot');
    case 'not_found':
      return t('farms.err.notFound');
    default:
      return t('farms.err.generic');
  }
}
