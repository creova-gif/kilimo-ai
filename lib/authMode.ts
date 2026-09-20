/**
 * Decides how authentication behaves for this build.
 *
 * - `real`          Supabase credentials are present → talk to the backend.
 * - `mock`          DEV ONLY, and only when explicitly opted in with
 *                   EXPO_PUBLIC_ENABLE_MOCK_AUTH=1 and no credentials. Accepts a
 *                   fixed OTP and creates a fake local session. Never available
 *                   in a release build.
 * - `unconfigured`  Everything else. Auth must refuse to proceed (fail closed)
 *                   rather than silently admitting the user.
 *
 * Previously any build without EXPO_PUBLIC_SUPABASE_* fell back to a mock that
 * accepted OTP 123456, including release builds (gap G-016).
 */
export type AuthMode = 'real' | 'mock' | 'unconfigured';

export interface AuthModeInput {
  url: string | undefined;
  key: string | undefined;
  /** React Native's `__DEV__`. */
  isDev: boolean;
  /** Value of EXPO_PUBLIC_ENABLE_MOCK_AUTH. */
  mockFlag: string | undefined;
}

export function resolveAuthMode({ url, key, isDev, mockFlag }: AuthModeInput): AuthMode {
  const hasUrl = Boolean(url);
  const hasKey = Boolean(key);
  if (hasUrl && hasKey) return 'real';
  // A half-configured pair is a misconfiguration, not a reason to fall back to mock.
  if (hasUrl !== hasKey) return 'unconfigured';
  if (isDev && mockFlag === '1') return 'mock';
  return 'unconfigured';
}

export const AUTH_NOT_CONFIGURED_MESSAGE =
  'Sign-in is not available: this build is not configured with a backend. ' +
  'Huduma ya kuingia haipatikani: programu hii haijaunganishwa na seva.';
