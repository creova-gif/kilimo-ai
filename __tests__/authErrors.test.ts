import { authErrorKey } from '../lib/authErrors';

describe('authErrorKey — maps raw backend/provider errors to localized keys', () => {
  it.each([
    ['Sign-in is not available: this build is not configured with a backend.', 'auth.notConfigured'],
    ['Huduma ya kuingia haipatikani: programu hii haijaunganishwa na seva.', 'auth.notConfigured'],
    ['Token has expired or is invalid', 'auth.invalidCode'],
    ['Invalid verification code', 'auth.invalidCode'],
    ['otp_expired', 'auth.invalidCode'],
    ['For security purposes, you can only request this after 47 seconds.', 'auth.rateLimited'],
    ['Too many requests', 'auth.rateLimited'],
    ['email rate limit exceeded', 'auth.rateLimited'],
    ['Network request failed', 'auth.network'],
    ['Failed to fetch', 'auth.network'],
    ['The request timed out', 'auth.network'],
    ['Error sending confirmation OTP to provider: Authentication Error', 'auth.sendFailed'],
    ['Error sending sms', 'auth.sendFailed'],
  ])('%s -> %s', (raw, key) => {
    expect(authErrorKey(new Error(raw))).toBe(key);
  });

  it('falls back to a generic key for anything unknown (never shows raw text)', () => {
    expect(authErrorKey(new Error('PGRST301 something odd'))).toBe('auth.generic');
    expect(authErrorKey(undefined)).toBe('auth.generic');
    expect(authErrorKey('plain string error')).toBe('auth.generic');
  });

  it('accepts error-like objects and plain strings', () => {
    expect(authErrorKey({ message: 'Token has expired or is invalid' })).toBe('auth.invalidCode');
    expect(authErrorKey('Network request failed')).toBe('auth.network');
  });
});
