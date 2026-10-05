/**
 * Development-only OTP bypass.
 *
 * Mock auth runs only when the caller passes Metro's `__DEV__` flag. A
 * production bundle inlines `__DEV__` as false, so acceptMockOtp() refuses
 * the test code. assertProductionMockAuthDisabled() throws if a production
 * build is ever evaluated with the dev flag still on.
 *
 * scripts/assert-mock-auth-gated.js fails the bundle (it runs when Babel
 * loads) if this gate is removed or the OTP literal moves back into the hook.
 */

export const MOCK_OTP = '123456';

export function mockAuthAllowed(dev: boolean): boolean {
  return dev === true;
}

/** Accept the fixed test OTP only in a dev bundle. */
export function acceptMockOtp(token: string, dev: boolean): boolean {
  if (dev !== true) return false;
  return token === MOCK_OTP;
}

export function mockOtpDebugMessage(channel: 'phone' | 'email'): string {
  if (channel === 'email') {
    return `[DEBUG MOCK] Nambari ya siri (OTP) ya barua pepe ni: ${MOCK_OTP}\n\n[DEBUG MOCK] Your test email OTP verification code is: ${MOCK_OTP}`;
  }
  return `[DEBUG MOCK] Nambari ya siri (OTP) ya majaribio ni: ${MOCK_OTP}\n\n[DEBUG MOCK] Your test OTP verification code is: ${MOCK_OTP}`;
}

export function assertProductionMockAuthDisabled(dev: boolean, nodeEnv: string | undefined): void {
  if (nodeEnv === 'production' && dev === true) {
    throw new Error('Mock auth must not be enabled in production builds');
  }
}

assertProductionMockAuthDisabled(
  typeof __DEV__ !== 'undefined' && __DEV__ === true,
  process.env.NODE_ENV
);
