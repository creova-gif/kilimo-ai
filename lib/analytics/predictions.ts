/**
 * Kilimo AI — Predictive Analytics Engine
 *
 * Client-side heuristic estimates (no external ML library). Results depend on
 * the vitals supplied by the app and must not be represented as live sensor or
 * market data.
 *
 * Two models:
 *  1. YieldForecast  — weighted farm-vitals adjustment + seasonal factor
 *  2. PestRiskScore  — weighted threshold model (moisture × temp × crop sensitivity)
 */

import { FarmVitals, FarmProfile } from '../../store/useKilimoStore';

// ─── 1. Yield Forecast ────────────────────────────────────────────────────────

export interface YieldForecast {
  currentTonnesHa: number;
  forecastTonnesHa: number;
  changePct: number;
  confidence: 'high' | 'medium' | 'low';
  seasonalFactor: number; // 1.0 = neutral
  trend: 'up' | 'flat' | 'down';
  horizon: 'Mwisho wa msimu' | 'Msimu ujao';
}

/**
 * Heuristic estimate based on current farm vitals and a seasonal adjustment.
 */
export function forecastYield(vitals: FarmVitals, profile: FarmProfile | null): YieldForecast {
  const base = vitals.yieldEstimate;

  // Soil health adjustment: <50 penalises, >75 rewards
  const soilAdj = vitals.soilHealth >= 75 ? 1.12 : vitals.soilHealth >= 50 ? 1.0 : 0.82;

  // Moisture adjustment: optimal band 40–70%
  const moist = vitals.moisture;
  const moistAdj = moist >= 40 && moist <= 70 ? 1.05 : moist < 20 || moist > 85 ? 0.78 : 0.92;

  // Temperature adjustment: optimal band 18–30°C for most East African crops
  const temp = vitals.temperature;
  const tempAdj = temp >= 18 && temp <= 30 ? 1.0 : temp < 15 || temp > 35 ? 0.85 : 0.93;

  // Seasonal factor: simplified EAfrica bimodal calendar
  const month = new Date().getMonth(); // 0-indexed
  // Long rains (Masika): Mar–May. Short rains (Vuli): Oct–Dec
  const inSeason = (month >= 2 && month <= 4) || (month >= 9 && month <= 11);
  const seasonalFactor = inSeason ? 1.1 : 0.9;

  // Blend the adjusted estimate with the stored yield estimate.
  const α = 0.3;
  const adjusted = base * soilAdj * moistAdj * tempAdj;
  const forecast = α * adjusted + (1 - α) * base;

  const changePct = base > 0 ? ((forecast - base) / base) * 100 : 0;
  const trend: YieldForecast['trend'] = changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'flat';

  // Confidence: based on data freshness (lastUpdated) + how extreme vitals are
  const staleness = Date.now() - new Date(vitals.lastUpdated).getTime();
  const hoursStale = staleness / 3_600_000;
  const confidence: YieldForecast['confidence'] =
    hoursStale < 24 && vitals.soilHealth > 30 ? 'high' : hoursStale < 72 ? 'medium' : 'low';

  return {
    currentTonnesHa: Math.round(base * 100) / 100,
    forecastTonnesHa: Math.round(forecast * 100) / 100,
    changePct: Math.round(changePct * 10) / 10,
    confidence,
    seasonalFactor,
    trend,
    horizon: inSeason ? 'Mwisho wa msimu' : 'Msimu ujao',
  };
}

// ─── 2. Pest Risk Score ───────────────────────────────────────────────────────

export interface PestRisk {
  score: number; // 0–100
  level: 'Chini' | 'Ya kati' | 'Juu' | 'Hatari';
  color: string;
  primaryDrivers: string[];
  recommendations: string[];
}

const CROP_SENSITIVITY: Record<string, number> = {
  Mahindi: 0.6,
  Mpunga: 0.7,
  Nyanya: 0.9,
  Kahawa: 0.8,
  Maharagwe: 0.5,
  Mihogo: 0.3,
  Alizeti: 0.4,
};

export function scorePestRisk(vitals: FarmVitals, profile: FarmProfile | null): PestRisk {
  const drivers: string[] = [];
  let score = 20; // baseline

  // Moisture: >70% triggers fungal/bacterial risk
  if (vitals.moisture > 80) {
    score += 35;
    drivers.push('Unyevu mwingi sana (hatari ya ukungu)');
  } else if (vitals.moisture > 65) {
    score += 20;
    drivers.push('Unyevu wa juu');
  } else if (vitals.moisture < 20) {
    score += 15;
    drivers.push('Ukame — wadudu wa ardhi');
  }

  // Temperature: >32°C boosts aphid/thrip reproduction
  if (vitals.temperature > 35) {
    score += 25;
    drivers.push('Joto kali — wadudu wanaongezeka haraka');
  } else if (vitals.temperature > 30) {
    score += 12;
  } else if (vitals.temperature < 15) {
    score += 8;
    drivers.push('Baridi — hatari ya ugonjwa wa mizizi');
  }

  // Soil health: degraded soil = weaker plant immunity
  if (vitals.soilHealth < 40) {
    score += 20;
    drivers.push('Afya ya udongo ni mbaya — mimea dhaifu');
  } else if (vitals.soilHealth < 60) {
    score += 10;
  }

  // Crop-specific sensitivity
  const primaryCrop = profile?.primaryCrops?.[0] ?? '';
  const sensitivity = CROP_SENSITIVITY[primaryCrop] ?? 0.5;
  score = Math.round(score * (0.7 + 0.6 * sensitivity));
  score = Math.min(100, Math.max(0, score));

  const level: PestRisk['level'] =
    score >= 75 ? 'Hatari' : score >= 50 ? 'Juu' : score >= 25 ? 'Ya kati' : 'Chini';
  const color =
    score >= 75 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 25 ? '#f59e0b' : '#22c55e';

  const recs: string[] = [];
  if (vitals.moisture > 70)
    recs.push('Punguza umwagiliaji. Hakikisha mifereji ya maji inafanya kazi.');
  if (vitals.temperature > 32)
    recs.push('Panda mazao yanayostahimili joto au panda asubuhi mapema.');
  if (vitals.soilHealth < 50)
    recs.push('Ongeza mboji ili kuzidisha vijidudu vya udongo vinavyolinda mimea.');
  if (score >= 50)
    recs.push('Angalia shamba kila siku 2–3. Tumia dawa za asili kwanza kabla ya kemikali.');
  if (recs.length === 0)
    recs.push('Hali iko sawa. Endelea na ufuatiliaji wa kawaida wa wiki moja.');

  return { score, level, color, primaryDrivers: drivers.slice(0, 3), recommendations: recs };
}

/** Run the available estimates and return a consolidated analytics snapshot. */
export function runAnalytics(vitals: FarmVitals, profile: FarmProfile | null) {
  return {
    yieldForecast: forecastYield(vitals, profile),
    pestRisk: scorePestRisk(vitals, profile),
  };
}
