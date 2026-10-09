import {
  assertScorableLedger,
  CreditDataSourceError,
  parseAllowRealData,
  realDataAllowed,
} from '../lib/credit/dataSourceGuard';
import { SYNTHETIC_LEDGERS, SYNTHETIC_NOW } from '../lib/credit/fixtures/syntheticLedgers';
import type { LedgerEntry } from '../store/useFarmDataStore';

const realEntry = (source?: LedgerEntry['source']): LedgerEntry => ({
  id: 'l_test_real',
  date: SYNTHETIC_NOW,
  category: 'Sale · Maize',
  description: 'farmer-typed entry',
  amountTZS: 100_000,
  ...(source ? { source } : {}),
});

describe('CRE-179 credit data-source guard', () => {
  it('parseAllowRealData accepts only the exact string "true"', () => {
    expect(parseAllowRealData('true')).toBe(true);
    for (const raw of ['TRUE', '1', 'yes', ' true', '', undefined]) {
      expect(parseAllowRealData(raw)).toBe(false);
    }
  });

  it('realDataAllowed is false in production even when the flag is "true"', () => {
    const onProductionOverride = jest.fn();
    expect(realDataAllowed({ raw: 'true', isProduction: true, onProductionOverride })).toBe(false);
    expect(onProductionOverride).toHaveBeenCalledTimes(1);
  });

  it('realDataAllowed is true outside production when the flag is "true"', () => {
    expect(realDataAllowed({ raw: 'true', isProduction: false })).toBe(true);
  });

  it('realDataAllowed defaults closed when the flag is unset', () => {
    expect(realDataAllowed({ raw: undefined, isProduction: false })).toBe(false);
  });

  it('accepts a fully synthetic ledger', () => {
    expect(() => assertScorableLedger(SYNTHETIC_LEDGERS.steadyMaize, false)).not.toThrow();
  });

  it('rejects one self_reported entry mixed into a synthetic ledger', () => {
    const ledger = [...SYNTHETIC_LEDGERS.steadyMaize, realEntry('self_reported')];
    expect(() => assertScorableLedger(ledger, false)).toThrow(CreditDataSourceError);
  });

  it('rejects a legacy entry with no source (treated as real data)', () => {
    expect(() => assertScorableLedger([realEntry()], false)).toThrow(CreditDataSourceError);
  });

  it('rejects a verified entry when real data is not allowed', () => {
    expect(() => assertScorableLedger([realEntry('verified')], false)).toThrow(
      CreditDataSourceError
    );
  });

  it('accepts an empty ledger', () => {
    expect(() => assertScorableLedger([], false)).not.toThrow();
  });

  it('accepts real entries when allowReal is true', () => {
    expect(() => assertScorableLedger([realEntry('self_reported')], true)).not.toThrow();
  });

  it('carries a stable error code', () => {
    try {
      assertScorableLedger([realEntry()], false);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as CreditDataSourceError).code).toBe('credit_real_data_not_cleared');
    }
  });
});
