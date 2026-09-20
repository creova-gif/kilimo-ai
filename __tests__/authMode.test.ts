import { resolveAuthMode, AUTH_NOT_CONFIGURED_MESSAGE } from '../lib/authMode';

const URL = 'http://127.0.0.1:54321';
const KEY = 'anon-key';

describe('resolveAuthMode', () => {
  it('is "real" whenever Supabase credentials are present, in dev or release', () => {
    expect(resolveAuthMode({ url: URL, key: KEY, isDev: true, mockFlag: undefined })).toBe('real');
    expect(resolveAuthMode({ url: URL, key: KEY, isDev: false, mockFlag: undefined })).toBe('real');
  });

  it('never allows mock auth in a release build, even if the flag is set', () => {
    expect(resolveAuthMode({ url: '', key: '', isDev: false, mockFlag: '1' })).toBe('unconfigured');
    expect(resolveAuthMode({ url: undefined, key: undefined, isDev: false, mockFlag: '1' })).toBe(
      'unconfigured'
    );
  });

  it('fails closed in dev when no credentials AND no explicit mock flag', () => {
    expect(resolveAuthMode({ url: '', key: '', isDev: true, mockFlag: undefined })).toBe(
      'unconfigured'
    );
    expect(resolveAuthMode({ url: '', key: '', isDev: true, mockFlag: '0' })).toBe('unconfigured');
  });

  it('allows mock only in dev with the explicit flag and no credentials', () => {
    expect(resolveAuthMode({ url: '', key: '', isDev: true, mockFlag: '1' })).toBe('mock');
  });

  it('treats a half-configured pair (url without key, or vice versa) as unconfigured', () => {
    expect(resolveAuthMode({ url: URL, key: '', isDev: false, mockFlag: undefined })).toBe(
      'unconfigured'
    );
    expect(resolveAuthMode({ url: '', key: KEY, isDev: false, mockFlag: undefined })).toBe(
      'unconfigured'
    );
  });

  it('exposes a bilingual, user-facing not-configured message', () => {
    expect(AUTH_NOT_CONFIGURED_MESSAGE).toMatch(/not (available|configured)/i);
    expect(AUTH_NOT_CONFIGURED_MESSAGE).toMatch(/haipatikani|haijaunganishwa/i);
  });
});
