/**
 * KILIMO AI — credit-score data-source guard (CRE-179 legal hold).
 *
 * Legal (Rex, Kito) has put the Agro-ID credit score on hold: until Rex
 * clears it, the score may run on SYNTHETIC data only. Real farmer data
 * (source 'self_reported' or 'verified', or no source at all, which is how
 * every pre-CRE-179 persisted entry looks) is rejected unless real data is
 * explicitly allowed.
 *
 * Real data is allowed only when the flag is the exact string 'true' AND the
 * build is not production. Production is always closed, whatever the flag.
 *   - client (Expo, statically inlined): EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA
 *   - server (edge functions / Worker):  CREDIT_SCORE_ALLOW_REAL_DATA
 *
 * scripts/assert-credit-real-data-off.js fails CI, EAS and bundle builds if
 * either spelling is set for production or preview.
 *
 * Pure functions with explicit inputs (same pattern as lib/auth/mockAuthPolicy.ts),
 * so they are unit-testable without touching env.
 */

import type { LedgerEntry } from '../../store/useFarmDataStore';

export const ALLOW_REAL_DATA_FLAG = 'CREDIT_SCORE_ALLOW_REAL_DATA';

export class CreditDataSourceError extends Error {
  readonly code = 'credit_real_data_not_cleared';

  constructor(message = 'Credit score is limited to synthetic data (CRE-179 legal hold)') {
    super(message);
    this.name = 'CreditDataSourceError';
  }
}

/** True ONLY for the exact string 'true'. Anything else ('1', 'TRUE', 'yes', '', undefined) is false. */
export function parseAllowRealData(raw: string | undefined): boolean {
  return raw === 'true';
}

/**
 * Effective permission. Returns false in production even when the flag is
 * set (and calls onProductionOverride, which the app wires to Sentry), so a
 * mis-set flag never opens the gate on a release build.
 */
export function realDataAllowed(opts: {
  raw: string | undefined;
  isProduction: boolean;
  onProductionOverride?: () => void;
}): boolean {
  const requested = parseAllowRealData(opts.raw);
  if (opts.isProduction) {
    if (requested) opts.onProductionOverride?.();
    return false;
  }
  return requested;
}

/** True only for entries explicitly marked synthetic. A missing source is real data. */
export function isSyntheticEntry(entry: Pick<LedgerEntry, 'source'>): boolean {
  return entry.source === 'synthetic';
}

/** Throws CreditDataSourceError unless allowReal, or every entry has source === 'synthetic'. */
export function assertScorableLedger(ledger: LedgerEntry[], allowReal: boolean): void {
  if (allowReal === true) return;
  const realCount = ledger.filter((e) => !isSyntheticEntry(e)).length;
  if (realCount > 0) {
    throw new CreditDataSourceError(
      `Credit score is limited to synthetic data (CRE-179 legal hold); ${realCount} real entr${
        realCount === 1 ? 'y' : 'ies'
      } rejected`
    );
  }
}
