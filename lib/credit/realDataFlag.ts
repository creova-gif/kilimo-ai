/**
 * KILIMO AI — client-side value of the CRE-179 credit real-data flag.
 *
 * Computed once at module load. The env var is read with a LITERAL member
 * access so Expo can inline it (no dynamic process.env[name]). Production
 * bundles always resolve to false; if the flag is set anyway, the override is
 * reported to Sentry (no-op when Sentry is not configured).
 */

import { realDataAllowed } from './dataSourceGuard';
import { captureError } from '../sentry';

const isProductionBuild =
  process.env.NODE_ENV === 'production' && !(typeof __DEV__ !== 'undefined' && __DEV__);

export const CREDIT_ALLOW_REAL: boolean = realDataAllowed({
  raw: process.env.EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA,
  isProduction: isProductionBuild,
  onProductionOverride: () =>
    captureError(
      new Error('EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA set on a production build; ignored'),
      { tracking: 'CRE-179' }
    ),
});
