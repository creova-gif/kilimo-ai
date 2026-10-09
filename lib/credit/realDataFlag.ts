/**
 * KILIMO AI — client-side value of the CRE-179 credit real-data flag.
 *
 * Computed once at module load. The env var is read with a LITERAL member
 * access so Expo can inline it (no dynamic process.env[name]).
 *
 * Treated as production (always closed), whatever the flag says:
 *   - release bundles (NODE_ENV=production and !__DEV__)
 *   - any web page served from a non-local host, even a dev server
 *     (e.g. the public `expo start --web` workflow in .replit), because
 *     there __DEV__ is true but real farmers can reach it
 * If the flag is set anyway, the override is reported to Sentry (no-op when
 * Sentry is not configured).
 */

import { realDataAllowed } from './dataSourceGuard';
import { captureError } from '../sentry';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '']);

export function isPublicWebHost(hostname: string | undefined | null): boolean {
  if (hostname === undefined || hostname === null) return false; // not a browser
  return !LOCAL_HOSTS.has(hostname);
}

export function clientRealDataAllowed(opts: {
  raw: string | undefined;
  nodeEnv: string | undefined;
  dev: boolean;
  hostname: string | undefined | null;
  report?: () => void;
}): boolean {
  const isProduction =
    (opts.nodeEnv === 'production' && !opts.dev) || isPublicWebHost(opts.hostname);
  return realDataAllowed({ raw: opts.raw, isProduction, onProductionOverride: opts.report });
}

// Native has no location; a browser always does.
const browserLocation = (globalThis as { location?: { hostname?: unknown } }).location;
const browserHostname =
  typeof browserLocation?.hostname === 'string' ? browserLocation.hostname : null;

export const CREDIT_ALLOW_REAL: boolean = clientRealDataAllowed({
  raw: process.env.EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA,
  nodeEnv: process.env.NODE_ENV,
  dev: typeof __DEV__ !== 'undefined' && __DEV__ === true,
  hostname: browserHostname,
  report: () =>
    captureError(
      new Error('EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA set on a production build; ignored'),
      { tracking: 'CRE-179' }
    ),
});
