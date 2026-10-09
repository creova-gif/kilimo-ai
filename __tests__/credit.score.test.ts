import { computeCreditScore, tryComputeCreditScore, bandFor } from '../lib/credit/score';
import { CreditDataSourceError } from '../lib/credit/dataSourceGuard';
import { SYNTHETIC_LEDGERS, SYNTHETIC_NOW } from '../lib/credit/fixtures/syntheticLedgers';
import type { LedgerEntry } from '../store/useFarmDataStore';

const NOW = SYNTHETIC_NOW;

describe('computeCreditScore', () => {
  it('returns base-floor score for an empty ledger', () => {
    const r = computeCreditScore({
      ledger: SYNTHETIC_LEDGERS.empty,
      nowISO: NOW,
      allowRealData: false,
    });
    expect(r.score).toBe(300);
    expect(r.band).toBe('building');
    expect(r.factors).toHaveLength(5);
  });

  it('rewards a profitable, consistent, long-tenure farmer with a higher score', () => {
    const r = computeCreditScore({
      ledger: SYNTHETIC_LEDGERS.steadyMaize,
      nowISO: NOW,
      hasActiveInsurance: true,
      contractsCompleted: 2,
      allowRealData: false,
    });
    expect(r.score).toBeGreaterThan(600);
    expect(r.score).toBeLessThanOrEqual(850);
    expect(['good', 'strong']).toContain(r.band);
    // and it outranks a brand-new farmer
    const fresh = computeCreditScore({
      ledger: SYNTHETIC_LEDGERS.newFarmer,
      nowISO: NOW,
      allowRealData: false,
    });
    expect(r.score).toBeGreaterThan(fresh.score);
  });

  it('never exceeds the 300–850 bounds', () => {
    const r = computeCreditScore({
      ledger: SYNTHETIC_LEDGERS.maxedOut,
      nowISO: NOW,
      hasActiveInsurance: true,
      contractsCompleted: 9,
      allowRealData: false,
    });
    expect(r.score).toBeLessThanOrEqual(850);
    expect(r.score).toBeGreaterThanOrEqual(300);
  });

  it('bandFor thresholds', () => {
    expect(bandFor(300)).toBe('building');
    expect(bandFor(560)).toBe('fair');
    expect(bandFor(660)).toBe('good');
    expect(bandFor(800)).toBe('strong');
  });
});

describe('computeCreditScore — CRE-179 legal hold', () => {
  const real: LedgerEntry = {
    id: 'l_real_1',
    date: NOW,
    category: 'Sale · Maize',
    description: 'farmer-typed',
    amountTZS: 500_000,
    source: 'self_reported',
  };

  it('throws on real data when allowRealData is false', () => {
    expect(() => computeCreditScore({ ledger: [real], nowISO: NOW, allowRealData: false })).toThrow(
      CreditDataSourceError
    );
  });

  it('tryComputeCreditScore reports blocked instead of throwing', () => {
    expect(tryComputeCreditScore({ ledger: [real], nowISO: NOW, allowRealData: false })).toEqual({
      status: 'blocked',
      reason: 'legal_hold',
    });
  });

  it('tryComputeCreditScore scores synthetic data', () => {
    const r = tryComputeCreditScore({
      ledger: SYNTHETIC_LEDGERS.steadyMaize,
      nowISO: NOW,
      allowRealData: false,
    });
    expect(r.status).toBe('ok');
  });

  it('scores real data only when explicitly allowed', () => {
    const r = computeCreditScore({ ledger: [real], nowISO: NOW, allowRealData: true });
    expect(r.score).toBeGreaterThanOrEqual(300);
  });
});
