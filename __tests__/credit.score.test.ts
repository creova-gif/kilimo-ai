import { computeCreditScore, bandFor } from '../lib/credit/score';
import type { LedgerEntry } from '../lib/credit/ledger';

const NOW = '2026-06-01T00:00:00.000Z';
const daysAgo = (d: number) => new Date(new Date(NOW).getTime() - d * 86400_000).toISOString();

describe('computeCreditScore', () => {
  it('returns base-floor score for an empty ledger', () => {
    const r = computeCreditScore({ ledger: [], nowISO: NOW });
    expect(r.score).toBe(300);
    expect(r.band).toBe('building');
    expect(r.factors).toHaveLength(5);
  });

  it('rewards a profitable, consistent, long-tenure farmer with a higher score', () => {
    const ledger: LedgerEntry[] = [
      {
        id: '1',
        date: daysAgo(360),
        category: 'Input · Seed',
        description: 'seed',
        amountTZS: -200_000,
      },
      {
        id: '2',
        date: daysAgo(330),
        category: 'Sale · Maize',
        description: 'maize',
        amountTZS: 800_000,
      },
      {
        id: '3',
        date: daysAgo(300),
        category: 'Cooperative',
        description: 'AMCOS payout',
        amountTZS: 300_000,
      },
      {
        id: '4',
        date: daysAgo(200),
        category: 'Sale · Beans',
        description: 'beans',
        amountTZS: 400_000,
      },
      {
        id: '5',
        date: daysAgo(60),
        category: 'Sale · Maize',
        description: 'maize',
        amountTZS: 600_000,
      },
    ];
    const r = computeCreditScore({
      ledger,
      nowISO: NOW,
      hasActiveInsurance: true,
      contractsCompleted: 2,
    });
    expect(r.score).toBeGreaterThan(600);
    expect(r.score).toBeLessThanOrEqual(850);
    expect(['good', 'strong']).toContain(r.band);
  });

  it('never exceeds the 300–850 bounds', () => {
    const ledger: LedgerEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      date: daysAgo(400 - i),
      category: `Sale · Crop${i % 5}`,
      description: 'x',
      amountTZS: 1_000_000,
    }));
    const r = computeCreditScore({
      ledger,
      nowISO: NOW,
      hasActiveInsurance: true,
      contractsCompleted: 9,
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
