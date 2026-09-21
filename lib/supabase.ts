/**
 * The ONE Supabase client for the whole app.
 *
 * Every screen, hook and lib module must import from here. Previously five
 * modules each called createClient() with no shared storage, so the session
 * created at OTP sign-in lived only inside useAgroAuth's private client: every
 * other call (mint-agro-id, farmer profile, tasks, notifications…) went out with
 * just the anon key and failed, and onboarding silently fell back to a local
 * provisional Agro-ID while claiming success.
 *
 * The session is persisted in the iOS Keychain / Android Keystore (chunked —
 * see secureSessionStorage.ts) and auto-refreshed while the app is foregrounded.
 * The client only exists when BOTH EXPO_PUBLIC_SUPABASE_URL and _ANON_KEY are
 * set; otherwise this exports null and callers must fail closed / show an
 * honest "unavailable" state (see lib/authMode.ts).
 */

import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage, type AuthStorage } from './secureSessionStorage';

const SESSION_KEY = 'kilimo_session_token';

let _client: any | null | undefined; // undefined = not created yet, null = not configured

function webStorage(): AuthStorage {
  const ls = () => (typeof window !== 'undefined' ? window.localStorage : undefined);
  return {
    async getItem(k) {
      return ls()?.getItem(k) ?? null;
    },
    async setItem(k, v) {
      ls()?.setItem(k, v);
    },
    async removeItem(k) {
      ls()?.removeItem(k);
    },
  };
}

function sessionStorage(): AuthStorage {
  return Platform.OS === 'web' ? webStorage() : createChunkedStorage(SecureStore);
}

export function getSupabase() {
  if (_client !== undefined) return _client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    _client = null;
    return _client;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    _client = createClient(url, key, {
      auth: {
        storage: sessionStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    // Refresh tokens only while the app is in the foreground (supabase-js RN guidance).
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') _client?.auth.startAutoRefresh();
        else _client?.auth.stopAutoRefresh();
      });
    }
  } catch {
    _client = null;
  }
  return _client;
}

export const supabase = getSupabase();

/**
 * Resolve the current user's access token. Tries the live Supabase session
 * first, falls back to the SecureStore-cached token from useAgroAuth.
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
