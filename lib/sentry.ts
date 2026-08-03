/**
 * KILIMO AI — crash & error reporting (Sentry).
 *
 * Fully DSN-gated: with no EXPO_PUBLIC_SENTRY_DSN set, every export here is a
 * no-op, so local/dev builds and CI run identically without a Sentry project.
 * Set the DSN (client-safe, designed to be public) to activate on release
 * builds. We disable reporting in __DEV__ so day-to-day work doesn't spam the
 * project, and we do NOT send PII.
 *
 *   supabase/eas env → EXPO_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
 */
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!DSN;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Crash/error diagnostics only — no PII, conservative performance sampling.
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    // Don't report from developer machines; release builds only.
    enabled: !__DEV__,
  });
}

/** Report a handled error (e.g. from the app's ErrorBoundary). No-op if unset. */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
