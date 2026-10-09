/**
 * KILIMO AI — synthetic credit-score ledgers (CRE-179 legal hold).
 *
 * Until Legal (Rex) clears it, the credit score may run on synthetic data
 * only. These personas exist so development, tests and the optional in-app
 * "Sample score" can exercise every scoring branch in lib/credit/score.ts
 * without touching a real farmer's ledger.
 *
 * Rules for every entry (enforced by __tests__/credit.syntheticFixtures.test.ts):
 *   - source: 'synthetic'
 *   - id starts with `syn_`
 *   - description starts with `[SYNTHETIC] `
 *   - dates are derived from SYNTHETIC_NOW (never Date.now())
 *   - no real people, phone numbers, Agro-IDs, cooperatives or buyers
 *   - NEVER generated from, sampled from or "anonymised" out of real ledgers
 *
 * Never copy these into SEED_LEDGER (store/useFarmDataStore.ts), which must
 * stay [].
 */

import type { LedgerEntry } from '../../../store/useFarmDataStore';

export const SYNTHETIC_NOW = '2026-06-01T00:00:00.000Z';

export type PersonaKey =
  | 'empty'
  | 'newFarmer'
  | 'steadyMaize'
  | 'lossMaking'
  | 'expenseOnly'
  | 'maxedOut';

const DAY_MS = 86_400_000;
const daysBefore = (d: number) =>
  new Date(new Date(SYNTHETIC_NOW).getTime() - d * DAY_MS).toISOString();

type Row = [daysAgo: number, category: string, note: string, amountTZS: number];

function persona(key: string, rows: Row[]): LedgerEntry[] {
  return rows.map(([d, category, note, amountTZS], i) => ({
    id: `syn_${key}_${String(i + 1).padStart(2, '0')}`,
    date: daysBefore(d),
    category,
    description: `[SYNTHETIC] ${note}`,
    amountTZS,
    source: 'synthetic' as const,
  }));
}

/** 13 months of a mixed smallholder: 4 income sources incl. a cooperative payout. */
const steadyMaizeRows: Row[] = [];
for (let m = 0; m < 13; m++) {
  const base = 395 - m * 30; // oldest first, ~13 months back to ~1 month back
  steadyMaizeRows.push([base, 'Input · Fertilizer', `Fertilizer, month ${m + 1}`, -90_000]);
  if (m % 3 === 0) {
    steadyMaizeRows.push([base - 10, 'Sale · Maize', `Maize sale, month ${m + 1}`, 260_000]);
  } else if (m % 3 === 1) {
    steadyMaizeRows.push([base - 10, 'Livestock · Milk', `Milk sales, month ${m + 1}`, 90_000]);
  } else {
    steadyMaizeRows.push([
      base - 10,
      'Services · Ploughing hire',
      `Ploughing hire, month ${m + 1}`,
      70_000,
    ]);
  }
}
steadyMaizeRows.push([120, 'Cooperative · Payout', 'Synthetic Coop A season payout', 180_000]);

/** 14 months, high margin, 4 income sources, 10+ incomes, cooperative income. */
const maxedOutRows: Row[] = [];
for (let m = 0; m < 14; m++) {
  const base = 425 - m * 30;
  maxedOutRows.push([base, 'Input · Seed', `Seed, month ${m + 1}`, -50_000]);
  const cats = [
    'Sale · Maize',
    'Livestock · Milk',
    'Services · Ploughing hire',
    'Cooperative · Payout',
  ];
  const cat = cats[m % 4];
  maxedOutRows.push([base - 12, cat, `${cat.split('·')[1].trim()}, month ${m + 1}`, 400_000]);
}

export const SYNTHETIC_LEDGERS: Record<PersonaKey, LedgerEntry[]> = {
  empty: [],
  newFarmer: persona('newFarmer', [
    [6, 'Input · Seed', 'Starter maize seed', -40_000],
    [2, 'Sale · Vegetables', 'Roadside vegetable sale', 65_000],
  ]),
  steadyMaize: persona('steadyMaize', steadyMaizeRows),
  lossMaking: persona('lossMaking', [
    [200, 'Input · Fertilizer', 'Fertilizer on credit', -250_000],
    [170, 'Labour', 'Weeding labour', -120_000],
    [140, 'Transport', 'Hired transport to market', -60_000],
    [120, 'Sale · Maize', 'Small maize sale after poor rains', 110_000],
  ]),
  expenseOnly: persona('expenseOnly', [
    [90, 'Input · Seed', 'Seed purchase', -70_000],
    [60, 'Input · Fertilizer', 'Fertilizer purchase', -110_000],
    [30, 'Labour', 'Planting labour', -45_000],
  ]),
  maxedOut: persona('maxedOut', maxedOutRows),
};

/** Extra scorer inputs that let `maxedOut` reach the 850 cap. */
export const MAXED_OUT_EXTRAS = { hasActiveInsurance: true, contractsCompleted: 3 } as const;
