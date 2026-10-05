/**
 * Pins JWT propagation for edge-function invokes (CRE-17 / Bugbot).
 *
 * openai-proxy, sms-send, rag-chat, and siblings resolve identity from
 * Authorization Bearer via auth.getUser(). Without the user JWT,
 * functions.invoke ships only the anon key and the gate returns 401.
 */

const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual('@supabase/supabase-js');
  return {
    ...actual,
    createClient: () => ({
      functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
      auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    }),
  };
});

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

import {
  __resetSupabaseClientForTests,
  cacheAccessToken,
  clearCachedAccessToken,
  invokeAuthedFunction,
} from '../lib/supabase';
import { chat } from '../lib/ai';
import { sendSms } from '../lib/sms';

describe('invokeAuthedFunction JWT propagation', () => {
  beforeEach(async () => {
    mockInvoke.mockReset();
    mockGetSession.mockReset();
    mockSecureStore.clear();
    __resetSupabaseClientForTests();
    await clearCachedAccessToken();
  });

  it('attaches Authorization Bearer with the user access token', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-abc' } },
    });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await invokeAuthedFunction('openai-proxy', {
      body: { action: 'chat', messages: [] },
    });

    expect(result.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith(
      'openai-proxy',
      expect.objectContaining({
        headers: { Authorization: 'Bearer user-jwt-abc' },
        body: { action: 'chat', messages: [] },
      })
    );
  });

  it('falls back to the cached OTP token when getSession has no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await cacheAccessToken('cached-otp-token');
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await invokeAuthedFunction('sms-send', { body: { to: '+2557', message: 'hi' } });

    expect(mockInvoke).toHaveBeenCalledWith(
      'sms-send',
      expect.objectContaining({
        headers: { Authorization: 'Bearer cached-otp-token' },
      })
    );
  });

  it('returns 401 and does not invoke when unauthenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await invokeAuthedFunction('rag-chat', { body: { query: 'x' } });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ message: 'not_authenticated', status: 401 });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('attaches the session JWT for rag-chat (same path as AI/SMS)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-rag' } },
    });
    mockInvoke.mockResolvedValue({ data: { answer: 'ok' }, error: null });

    await invokeAuthedFunction('rag-chat', { body: { query: 'maize' } });

    expect(mockInvoke).toHaveBeenCalledWith(
      'rag-chat',
      expect.objectContaining({
        headers: { Authorization: 'Bearer user-jwt-rag' },
      })
    );
  });
});

describe('authenticated AI / SMS callers', () => {
  beforeEach(async () => {
    mockInvoke.mockReset();
    mockGetSession.mockReset();
    mockSecureStore.clear();
    __resetSupabaseClientForTests();
    await clearCachedAccessToken();
  });

  it('chat() does not 401 when a user JWT is present', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-ai' } },
    });
    mockInvoke.mockResolvedValue({ data: { content: 'habari' }, error: null });

    await expect(chat([{ role: 'user', content: 'hi' }])).resolves.toBe('habari');
    expect(mockInvoke).toHaveBeenCalledWith(
      'openai-proxy',
      expect.objectContaining({
        headers: { Authorization: 'Bearer user-jwt-ai' },
      })
    );
  });

  it('chat() throws unauthorized when no JWT is available', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('chat() maps a server 401 (invalid/expired JWT) to unauthorized', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'stale-or-wrong-jwt' } },
    });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'not_authenticated', status: 401, context: { status: 401 } },
    });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    expect(mockInvoke).toHaveBeenCalledWith(
      'openai-proxy',
      expect.objectContaining({
        headers: { Authorization: 'Bearer stale-or-wrong-jwt' },
      })
    );
  });

  it('sendSms() returns not_authenticated without a JWT', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await sendSms({
      to: '+255712345678',
      body: 'test',
      event: 'price_alert',
    });

    expect(result).toEqual({ ok: false, reason: 'not_authenticated' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('sendSms() succeeds when JWT is present (no false 401)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-sms' } },
    });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await sendSms({
      to: '+255712345678',
      body: 'test',
      event: 'price_alert',
    });

    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalledWith(
      'sms-send',
      expect.objectContaining({
        headers: { Authorization: 'Bearer user-jwt-sms' },
      })
    );
  });

  it('still classifies FunctionsFetchError as network (not unauthorized)', async () => {
    const { FunctionsFetchError } = jest.requireActual('@supabase/supabase-js');
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-net' } },
    });
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Failed to fetch')),
    });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
