/**
 * Digital Farm Twin helpers (KIL-003): start a what-if scenario from one of the farmer's REAL
 * plots, drop the two demo scenarios older builds shipped, and localise the model's advice.
 *
 * The twin's output is an estimate computed only from the numbers the farmer enters; nothing here
 * reads sensors or satellite data.
 */
import { CROPS, SOIL_TYPES, type Crop, type SoilType, type TwinInputs, type TwinOutput } from './farmtwin/model';
import type { Plot } from './farms';
import type { TranslationKey } from './i18n';

/** Words that identify each model crop inside a free-text plot crop ("Mahindi (Maize)", "maize"). */
const CROP_ALIASES: Record<Crop, string[]> = {
  Mahindi: ['mahindi', 'maize', 'corn'],
  Mpunga: ['mpunga', 'mchele', 'rice', 'paddy'],
  Maharagwe: ['maharagwe', 'maharage', 'bean'],
  Kahawa: ['kahawa', 'coffee'],
  Nyanya: ['nyanya', 'tomato'],
  Mihogo: ['mihogo', 'muhogo', 'cassava'],
  Alizeti: ['alizeti', 'sunflower'],
};

/** The model crop a plot's crop text refers to, or null when the model does not cover it. */
export function matchTwinCrop(text: string | null | undefined): Crop | null {
  const s = (text ?? '').trim().toLowerCase();
  if (!s) return null;
  for (const c of CROPS) {
    if (CROP_ALIASES[c].some((a) => s.includes(a))) return c;
  }
  return null;
}

/** The model's supported area range (hectares). */
export const TWIN_AREA_MIN = 0.5;
export const TWIN_AREA_MAX = 50;

export interface PlotPrefill {
  inputs: Partial<TwinInputs>;
  /** Model crop matched from the plot's crop, or null (the farmer picks one). */
  crop: Crop | null;
  /** Area used, in ha, or null when the plot has no recorded area. */
  areaHa: number | null;
  /** True when the plot's area was outside the model range or had to be rounded. */
  areaAdjusted: boolean;
}

/** Prefill a scenario from a plot. Only the crop and area come from the plot; the rest are the farmer's to set. */
export function prefillFromPlot(plot: Pick<Plot, 'crop' | 'areaHa'>): PlotPrefill {
  const crop = matchTwinCrop(plot.crop);
  const inputs: Partial<TwinInputs> = {};
  if (crop) inputs.crop = crop;
  let areaHa: number | null = null;
  let areaAdjusted = false;
  if (plot.areaHa !== null && plot.areaHa !== undefined && Number.isFinite(plot.areaHa)) {
    const clamped = Math.min(TWIN_AREA_MAX, Math.max(TWIN_AREA_MIN, plot.areaHa));
    areaHa = Math.round(clamped * 10) / 10;
    areaAdjusted = Math.abs(areaHa - plot.areaHa) > 0.0001;
    inputs.areaHa = areaHa;
  }
  return { inputs, crop, areaHa, areaAdjusted };
}

/** `TSh 1,234,567` (whole shillings; sign kept). */
export const fmtTZS = (n: number) =>
  `${n < 0 ? '-' : ''}TSh ${new Intl.NumberFormat('en-US').format(Math.round(Math.abs(n)))}`;

/** Ids of the two demo scenarios ("Hali ya Sasa", "Hali Bora") that older builds seeded. */
export const SEED_SCENARIO_IDS: readonly string[] = ['s1', 's2'];

/** Remove the old demo scenarios from a persisted list. Tolerates garbage (returns []). */
export function dropSeedScenarios<T extends { id: string }>(list: unknown): T[] {
  if (!Array.isArray(list)) return [];
  return (list as T[]).filter(
    (s) => s && typeof s.id === 'string' && !SEED_SCENARIO_IDS.includes(s.id)
  );
}

/* ── localisation ─────────────────────────────────────────────────────────────────────────── */
export const CROP_LABEL_KEY: Record<Crop, TranslationKey> = {
  Mahindi: 'planning.twin.crop.maize',
  Mpunga: 'planning.twin.crop.rice',
  Maharagwe: 'planning.twin.crop.beans',
  Kahawa: 'planning.twin.crop.coffee',
  Nyanya: 'planning.twin.crop.tomato',
  Mihogo: 'planning.twin.crop.cassava',
  Alizeti: 'planning.twin.crop.sunflower',
};

export const SOIL_LABEL_KEY: Record<SoilType, TranslationKey> = {
  'Tifutifu (Loam)': 'planning.twin.soil.loam',
  'Mchanga (Sandy)': 'planning.twin.soil.sandy',
  'Udongo (Clay)': 'planning.twin.soil.clay',
  'Mboji (Organic)': 'planning.twin.soil.organic',
};

export { CROPS as TWIN_CROPS, SOIL_TYPES as TWIN_SOIL_TYPES };

/** Recommended combined N+P2O5+K2O (kg/ha) per crop — mirrors lib/farmtwin/model.ts. */
export const REC_FERT_KG_HA: Record<Crop, number> = {
  Mahindi: 120,
  Mpunga: 150,
  Maharagwe: 60,
  Kahawa: 200,
  Nyanya: 250,
  Mihogo: 80,
  Alizeti: 100,
};

export interface AdviceItem {
  key: TranslationKey;
  params?: Record<string, string | number>;
}

/**
 * The model's advice as translation keys (the model itself only produces Swahili strings).
 * Same rules, same order as buildAdvice() in lib/farmtwin/model.ts.
 */
export function twinAdvice(inputs: TwinInputs, output: TwinOutput): AdviceItem[] {
  const rec = REC_FERT_KG_HA[inputs.crop];
  const tips: AdviceItem[] = [];
  const r = output.riskBreakdown;
  if (r.drought > 60 && !inputs.irrigated) tips.push({ key: 'planning.twin.advice.drought' });
  if (inputs.fertilizerKgHa < rec * 0.5)
    tips.push({ key: 'planning.twin.advice.fertLow', params: { rec } });
  if (inputs.fertilizerKgHa > rec * 1.4) tips.push({ key: 'planning.twin.advice.fertHigh' });
  if (inputs.soilHealth < 50) tips.push({ key: 'planning.twin.advice.soilLow' });
  if (inputs.plantingDensityPct > 130) tips.push({ key: 'planning.twin.advice.densityHigh' });
  if (inputs.plantingDensityPct < 70) tips.push({ key: 'planning.twin.advice.densityLow' });
  if (r.pest > 70) tips.push({ key: 'planning.twin.advice.pest' });
  if (output.roi < 20) tips.push({ key: 'planning.twin.advice.roiLow' });
  if (output.roi > 100) tips.push({ key: 'planning.twin.advice.roiHigh' });
  if (tips.length === 0) tips.push({ key: 'planning.twin.advice.ok' });
  return tips;
}
