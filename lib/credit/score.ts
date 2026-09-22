/**
 * KILIMO AI — Agro-ID Credit Score (transparent, rule-based)
 *
 * NOT a black-box ML model. Every point is explainable and derived from the
 * farmer's own verifiable activity, so a lender (or the farmer) can see exactly
 * why the score is what it is. Range 300–850 to match conventions lenders know.
 *
 * Factors (max contribution):
 *   1. Record-keeping   (120) — how consistently the farmer logs activity
 *   2. Profitability     (140) — net margin across the ledger
 *   3. Income stability  (110) — diversity + regularity of income
 *   4. Account tenure     (90) — how long the verified history spans
 *   5. Formal ties        (90) — cooperative payouts, contracts, active insurance
 *
 * Base 300 + up to 550 = 850 max.
 */

import type { LedgerEntry } from './ledger';

export type CreditBand = 'building' | 'fair' | 'good' | 'strong';

export interface CreditFactor {
  key: 'records' | 'profitability' | 'stability' | 'tenure' | 'formal';
  label: string; // English
  labelSw: string; // Swahili
  score: number; // points earned
  max: number; // max points for this factor
  detail: string; // short English explanation
  detailSw: string; // short Swahili explanation
}

export interface CreditScore {
  score: number; // 300–850
  band: CreditBand;
  bandLabel: string;
  bandLabelSw: string;
  factors: CreditFactor[];
  generatedAt: string;
}

export interface CreditInputs {
  ledger: LedgerEntry[];
  /** ISO date the verified history starts (defaults to earliest ledger entry). */
  tenureStartISO?: string;
  hasActiveInsurance?: boolean;
  contractsCompleted?: number;
  /** Pass a stable ISO timestamp; the engine must not call Date.now() for purity. */
  nowISO: string;
}

const BASE = 300;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const monthsBetween = (aISO: string, bISO: string) =>
  Math.max(0, (new Date(bISO).getTime() - new Date(aISO).getTime()) / (30 * 86400_000));

export function bandFor(score: number): CreditBand {
  if (score >= 720) return 'strong';
  if (score >= 620) return 'good';
  if (score >= 500) return 'fair';
  return 'building';
}

const BAND_LABELS: Record<CreditBand, { en: string; sw: string }> = {
  building: { en: 'Building', sw: 'Inajengwa' },
  fair: { en: 'Fair', sw: 'Wastani' },
  good: { en: 'Good', sw: 'Nzuri' },
  strong: { en: 'Strong', sw: 'Imara' },
};

export function computeCreditScore(input: CreditInputs): CreditScore {
  const { ledger, nowISO } = input;
  const income = ledger.filter((e) => e.amountTZS > 0);
  const expense = ledger.filter((e) => e.amountTZS < 0);
  const totalIncome = income.reduce((s, e) => s + e.amountTZS, 0);
  const totalExpense = expense.reduce((s, e) => s + Math.abs(e.amountTZS), 0);
  const net = totalIncome - totalExpense;

  const earliest = ledger.length
    ? ledger.reduce((min, e) => (e.date < min ? e.date : min), ledger[0].date)
    : nowISO;
  const tenureStart = input.tenureStartISO ?? earliest;

  // 1. Record-keeping — entries logged, capped; rewards ~24+ entries.
  const recScore = clamp(Math.round((Math.min(ledger.length, 24) / 24) * 120), 0, 120);

  // 2. Profitability — net margin vs income. No activity → 0; 40%+ margin → full.
  const hasActivity = ledger.length > 0;
  const margin = totalIncome > 0 ? net / totalIncome : hasActivity ? -1 : 0;
  const profScore = hasActivity
    ? clamp(Math.round(((margin + 0.2) / 0.6) * 140), 0, 140) // margin -0.2→0, +0.4→140
    : 0;

  // 3. Income stability — distinct income categories + count of income entries.
  const distinctIncomeCats = new Set(income.map((e) => e.category.split('·')[0].trim())).size;
  const stabScore = clamp(
    Math.round(
      (Math.min(distinctIncomeCats, 4) / 4) * 60 + (Math.min(income.length, 10) / 10) * 50
    ),
    0,
    110
  );

  // 4. Tenure — months of verified history, 12+ months → full.
  const months = monthsBetween(tenureStart, nowISO);
  const tenureScore = clamp(Math.round((Math.min(months, 12) / 12) * 90), 0, 90);

  // 5. Formal ties — cooperative/contract income, completed contracts, insurance.
  const hasCoop = income.some((e) =>
    /coop|amcos|ushirika|cooperative|contract|mkataba/i.test(e.category + e.description)
  );
  const formalScore = clamp(
    (hasCoop ? 40 : 0) +
      Math.min(input.contractsCompleted ?? 0, 3) * 12 +
      (input.hasActiveInsurance ? 14 : 0),
    0,
    90
  );

  const factors: CreditFactor[] = [
    {
      key: 'records',
      label: 'Record-keeping',
      labelSw: 'Utunzaji rekodi',
      score: recScore,
      max: 120,
      detail: `${ledger.length} logged entries`,
      detailSw: `Rekodi ${ledger.length} zimeingizwa`,
    },
    {
      key: 'profitability',
      label: 'Profitability',
      labelSw: 'Faida',
      score: profScore,
      max: 140,
      detail: totalIncome > 0 ? `${Math.round(margin * 100)}% net margin` : 'No income logged yet',
      detailSw: totalIncome > 0 ? `Faida ${Math.round(margin * 100)}%` : 'Hakuna mapato bado',
    },
    {
      key: 'stability',
      label: 'Income stability',
      labelSw: 'Uthabiti wa mapato',
      score: stabScore,
      max: 110,
      detail: `${distinctIncomeCats} income source(s)`,
      detailSw: `Vyanzo ${distinctIncomeCats} vya mapato`,
    },
    {
      key: 'tenure',
      label: 'Account history',
      labelSw: 'Historia ya akaunti',
      score: tenureScore,
      max: 90,
      detail: `${Math.round(months)} month(s) of history`,
      detailSw: `Miezi ${Math.round(months)} ya historia`,
    },
    {
      key: 'formal',
      label: 'Formal ties',
      labelSw: 'Uhusiano rasmi',
      score: formalScore,
      max: 90,
      detail: hasCoop ? 'Cooperative / contract income' : 'No formal ties yet',
      detailSw: hasCoop ? 'Mapato ya ushirika/mkataba' : 'Hakuna uhusiano rasmi bado',
    },
  ];

  const total = clamp(BASE + factors.reduce((s, f) => s + f.score, 0), 300, 850);
  const band = bandFor(total);

  return {
    score: total,
    band,
    bandLabel: BAND_LABELS[band].en,
    bandLabelSw: BAND_LABELS[band].sw,
    factors,
    generatedAt: nowISO,
  };
}
