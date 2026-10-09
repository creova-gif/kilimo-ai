import { computeCreditScore } from '../lib/credit/score';
import {
  MAXED_OUT_EXTRAS,
  SYNTHETIC_LEDGERS,
  SYNTHETIC_NOW,
} from '../lib/credit/fixtures/syntheticLedgers';

const score = (ledger: (typeof SYNTHETIC_LEDGERS)['empty'], extras = {}) =>
  computeCreditScore({ ledger, nowISO: SYNTHETIC_NOW, allowRealData: false, ...extras });
const factor = (r: ReturnType<typeof score>, key: string) => r.factors.find((f) => f.key === key)!;

describe('synthetic credit fixtures (CRE-179)', () => {
  it('every entry is clearly marked synthetic and dated at or before SYNTHETIC_NOW', () => {
    const now = new Date(SYNTHETIC_NOW).getTime();
    const ids = new Set<string>();
    for (const [key, ledger] of Object.entries(SYNTHETIC_LEDGERS)) {
      for (const e of ledger) {
        expect({ key, source: e.source }).toEqual({ key, source: 'synthetic' });
        expect(e.id.startsWith('syn_')).toBe(true);
        expect(e.description.startsWith('[SYNTHETIC] ')).toBe(true);
        expect(new Date(e.date).getTime()).toBeLessThanOrEqual(now);
        expect(ids.has(e.id)).toBe(false);
        ids.add(e.id);
      }
    }
  });

  it('personas exercise their intended scoring branches', () => {
    expect(score(SYNTHETIC_LEDGERS.empty).score).toBe(300);

    const fresh = score(SYNTHETIC_LEDGERS.newFarmer);
    expect(SYNTHETIC_LEDGERS.newFarmer).toHaveLength(2);
    expect(factor(fresh, 'tenure').score).toBeLessThanOrEqual(3);

    const steady = score(SYNTHETIC_LEDGERS.steadyMaize);
    expect(SYNTHETIC_LEDGERS.steadyMaize.length).toBeGreaterThanOrEqual(24);
    expect(factor(steady, 'records').score).toBe(120);
    expect(factor(steady, 'tenure').score).toBe(90);
    expect(factor(steady, 'stability').score).toBe(110);
    expect(factor(steady, 'formal').score).toBe(40);
    expect(factor(steady, 'profitability').score).toBeGreaterThan(0);

    expect(factor(score(SYNTHETIC_LEDGERS.lossMaking), 'profitability').score).toBe(0);

    const expOnly = score(SYNTHETIC_LEDGERS.expenseOnly);
    expect(factor(expOnly, 'profitability').score).toBe(0);
    expect(factor(expOnly, 'profitability').detail).toBe('No income logged yet');

    // Under the hold, non-ledger inputs (insurance, contracts) are not scored,
    // so the 850 cap is only reachable in the explicit real-data mode. The
    // ledger here is still 100% synthetic.
    expect(
      score(SYNTHETIC_LEDGERS.maxedOut, { ...MAXED_OUT_EXTRAS, allowRealData: true }).score
    ).toBe(850);
    expect(score(SYNTHETIC_LEDGERS.maxedOut, MAXED_OUT_EXTRAS).score).toBe(800);
  });
});
