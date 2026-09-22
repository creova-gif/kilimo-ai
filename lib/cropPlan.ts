/**
 * Crop planning (KIL-003): general seasonal crop guidance for Tanzania and a pure builder for the
 * tasks a farmer adds to their schedule from it.
 *
 * What is here is GENERAL agronomic reference — the usual rain seasons, typical days to maturity
 * and water need, common practice tips. It carries no yields, prices or risk scores: those depend
 * on the farmer's own land and market and were previously invented numbers.
 */
import type { TranslationKey } from './i18n';
import { parseIsoDate } from './farms';

export type Season = 'masika' | 'vuli' | 'kiangazi';
export const SEASONS: Season[] = ['masika', 'vuli', 'kiangazi'];

export type WaterNeed = 'low' | 'medium' | 'high';

export interface CropGuide {
  id: string;
  /** Translation key of the crop name. */
  nameKey: TranslationKey;
  /** Typical days from planting to harvest (varies with variety and altitude). */
  typicalDays: number;
  water: WaterNeed;
  /** Translation keys of general practice tips. */
  tipKeys: TranslationKey[];
}

export const CROP_GUIDES: Record<Season, CropGuide[]> = {
  masika: [
    {
      id: 'maize',
      nameKey: 'planning.crop.maize',
      typicalDays: 120,
      water: 'medium',
      tipKeys: ['planning.tip.maize.1', 'planning.tip.maize.2', 'planning.tip.maize.3'],
    },
    {
      id: 'beans',
      nameKey: 'planning.crop.beans',
      typicalDays: 80,
      water: 'medium',
      tipKeys: ['planning.tip.beans.1', 'planning.tip.beans.2', 'planning.tip.beans.3'],
    },
    {
      id: 'rice',
      nameKey: 'planning.crop.rice',
      typicalDays: 150,
      water: 'high',
      tipKeys: ['planning.tip.rice.1', 'planning.tip.rice.2', 'planning.tip.rice.3'],
    },
    {
      id: 'tomato',
      nameKey: 'planning.crop.tomato',
      typicalDays: 90,
      water: 'medium',
      tipKeys: ['planning.tip.tomato.1', 'planning.tip.tomato.2', 'planning.tip.tomato.3'],
    },
  ],
  vuli: [
    {
      id: 'maizeShort',
      nameKey: 'planning.crop.maizeShort',
      typicalDays: 90,
      water: 'medium',
      tipKeys: ['planning.tip.maizeShort.1', 'planning.tip.maizeShort.2', 'planning.tip.maizeShort.3'],
    },
    {
      id: 'onion',
      nameKey: 'planning.crop.onion',
      typicalDays: 120,
      water: 'medium',
      tipKeys: ['planning.tip.onion.1', 'planning.tip.onion.2', 'planning.tip.onion.3'],
    },
    {
      id: 'cabbage',
      nameKey: 'planning.crop.cabbage',
      typicalDays: 90,
      water: 'medium',
      tipKeys: ['planning.tip.cabbage.1', 'planning.tip.cabbage.2', 'planning.tip.cabbage.3'],
    },
    {
      id: 'beansShort',
      nameKey: 'planning.crop.beans',
      typicalDays: 80,
      water: 'low',
      tipKeys: ['planning.tip.beansShort.1', 'planning.tip.beansShort.2', 'planning.tip.beansShort.3'],
    },
  ],
  kiangazi: [
    {
      id: 'sunflower',
      nameKey: 'planning.crop.sunflower',
      typicalDays: 95,
      water: 'low',
      tipKeys: ['planning.tip.sunflower.1', 'planning.tip.sunflower.2', 'planning.tip.sunflower.3'],
    },
    {
      id: 'tomatoIrrigated',
      nameKey: 'planning.crop.tomatoIrrigated',
      typicalDays: 90,
      water: 'high',
      tipKeys: [
        'planning.tip.tomatoIrrigated.1',
        'planning.tip.tomatoIrrigated.2',
        'planning.tip.tomatoIrrigated.3',
      ],
    },
    {
      id: 'chili',
      nameKey: 'planning.crop.chili',
      typicalDays: 120,
      water: 'medium',
      tipKeys: ['planning.tip.chili.1', 'planning.tip.chili.2', 'planning.tip.chili.3'],
    },
    {
      id: 'sorghum',
      nameKey: 'planning.crop.sorghum',
      typicalDays: 90,
      water: 'low',
      tipKeys: ['planning.tip.sorghum.1', 'planning.tip.sorghum.2', 'planning.tip.sorghum.3'],
    },
  ],
};

export const SEASON_KEYS: Record<Season, { name: TranslationKey; months: TranslationKey }> = {
  masika: { name: 'planning.season.masika', months: 'planning.season.masika.months' },
  vuli: { name: 'planning.season.vuli', months: 'planning.season.vuli.months' },
  kiangazi: { name: 'planning.season.kiangazi', months: 'planning.season.kiangazi.months' },
};

export const WATER_KEY: Record<WaterNeed, TranslationKey> = {
  low: 'planning.water.low',
  medium: 'planning.water.medium',
  high: 'planning.water.high',
};

/** The season a calendar month (1–12) falls in, by Tanzania's usual rain pattern. */
export function seasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'masika';
  if (month >= 10 && month <= 12) return 'vuli';
  return 'kiangazi';
}

export interface PlannedTask {
  kind: 'plant' | 'scout' | 'harvest';
  category: 'planting' | 'scouting' | 'harvest';
  priority: 'high' | 'medium';
  /** ISO timestamp (noon UTC of the due day, so the calendar day never shifts). */
  dueDate: string;
}

const DAY_MS = 86_400_000;
const noonIso = (t: number) => new Date(t + 12 * 3_600_000).toISOString();

/**
 * The three schedule tasks for planting `guide` on `plantingDate` (YYYY-MM-DD): plant on the day,
 * scout two weeks later, harvest after the TYPICAL number of days. Null for an invalid date.
 */
export function buildPlanTasks(guide: CropGuide, plantingDate: string): PlannedTask[] | null {
  const t = parseIsoDate(plantingDate);
  if (t === null) return null;
  return [
    { kind: 'plant', category: 'planting', priority: 'high', dueDate: noonIso(t) },
    { kind: 'scout', category: 'scouting', priority: 'medium', dueDate: noonIso(t + 14 * DAY_MS) },
    {
      kind: 'harvest',
      category: 'harvest',
      priority: 'high',
      dueDate: noonIso(t + guide.typicalDays * DAY_MS),
    },
  ];
}
