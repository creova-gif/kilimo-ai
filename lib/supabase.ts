/**
 * Shared Supabase client singleton + auth helpers.
 *
 * Centralizes client construction so screens, hooks, and lib/ai.ts all share
 * one session state and don't duplicate the createClient boilerplate.
 *
 * Edge functions (openai-proxy, sms-send, rag-chat, …) resolve identity from
 * the Authorization Bearer JWT via auth.getUser(). Callers MUST use
 * `invokeAuthedFunction` (or pass an explicit Bearer header) so the OTP
 * session token is attached — the anon key alone yields 401 once the gate
 * is enforced.
 */

import { Platform } from 'react-native';

const SESSION_KEY = 'kilimo_session_token';

// Web-safe SecureStore wrapper (expo-secure-store is native-only).
const SecureStore = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    const ss = require('expo-secure-store');
    return ss.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    const ss = require('expo-secure-store');
    return ss.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    const ss = require('expo-secure-store');
    return ss.deleteItemAsync(key);
  },
};

let _client: any = null;

export function getSupabase() {
  if (_client) return _client;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url || !key) return null;
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (k: string) => SecureStore.getItemAsync(k),
          setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
          removeItem: (k: string) => SecureStore.deleteItemAsync(k),
        },
      },
    });
    return _client;
  } catch {
    return null;
  }
}

export const supabase = getSupabase();

/** Persist the access token used as a fallback when auth storage has no session. */
export async function cacheAccessToken(token: string | null | undefined): Promise<void> {
  if (!token) {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearCachedAccessToken(): Promise<void> {
  await cacheAccessToken(null);
}

/**
 * Resolve the current user's access token. Tries the live Supabase session
 * first, falls back to the SecureStore-cached token from OTP verify.
 */
export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      const tok = data?.session?.access_token;
      if (tok) return tok;
    } catch {
      // fall through to cached token
    }
  }
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Invoke a Supabase Edge Function with the authenticated user's JWT.
 * Without a token, returns a 401-shaped error and does not call the network
 * (avoids spending anon-key requests that the identity gate would reject).
 *
 * On a network call, returns the raw `functions.invoke` result so callers can
 * still distinguish FunctionsFetchError / FunctionsRelayError / HttpError.
 */
export async function invokeAuthedFunction<T = unknown>(
  name: string,
  options: { body?: Record<string, unknown> } = {}
): Promise<{ data: T | null; error: any }> {
  const sb = getSupabase();
  if (!sb) {
    return { data: null, error: { message: 'supabase_not_configured', status: 503 } };
  }
  const token = await getAccessToken();
  if (!token) {
    return { data: null, error: { message: 'not_authenticated', status: 401 } };
  }
  return sb.functions.invoke(name, {
    body: options.body,
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Test-only: reset the singleton between Jest cases. */
export function __resetSupabaseClientForTests() {
  _client = null;
}
