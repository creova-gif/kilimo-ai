/**
 * Kilimo AI — Agro ID Auth Hook
 *
 * Handles:
 * - Supabase session check on app boot
 * - Biometric authentication (Face ID / fingerprint)
 * - Sign-in / sign-out flows
 * - Agro ID creation (first-time registration)
 * - State bridge to global Zustand store
 */

import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { useKilimoStore, AgroID } from '../store/useKilimoStore';

const SESSION_KEY = 'kilimo_session_token';

// ─── Web-safe SecureStore wrapper (expo-secure-store not supported on web) ──
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

// ─── Supabase client (only when real credentials are present) ────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    // supabase stays null — mock mode
  }
}

// ─── Auth Hook ───────────────────────────────────────────────────────────────

export function useAgroAuth() {
  const { agroId, isAuthenticated, setAgroId, clearAgroId } = useKilimoStore();
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // ── Check biometric capability ───────────────────────────────────────────
  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) {
        LocalAuthentication.isEnrolledAsync().then((enrolled) => {
          setBiometricAvailable(enrolled);
        });
      }
    });
  }, []);

  // ── Restore session on boot ──────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(SESSION_KEY);
        if (!token || isAuthenticated) return;

        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser(token);
          if (user) {
            // Fetch Agro ID profile from DB
            const { data: profile } = await supabase
              .from('agro_profiles')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (profile) {
              setAgroId(profile as AgroID);
            }
          }
        }
      } catch (err) {
        console.warn('[AgroID] Session restore failed:', err);
      }
    }

    restoreSession();
  }, []);

  // ── Biometric unlock ─────────────────────────────────────────────────────
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm your Agro ID identity',
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  }, [biometricAvailable]);

  // ── Phone OTP sign-in ────────────────────────────────────────────────────
  const signInWithPhone = useCallback(async (phone: string) => {
    setLoading(true);
    try {
      if (!supabase) {
        if (__DEV__) console.log('[AgroAuth MOCK] Simulating phone OTP send for:', phone);
        await new Promise((r) => setTimeout(r, 1000));
        await SecureStore.setItemAsync('kilimo_phone', phone);
        const { Alert } = require('react-native');
        Alert.alert(
          'Kilimo AI (Mock Auth)',
          `[DEBUG MOCK] Nambari ya siri (OTP) ya majaribio ni: 123456\n\n[DEBUG MOCK] Your test OTP verification code is: 123456`
        );
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms' },
      });
      if (error) throw error;
      await SecureStore.setItemAsync('kilimo_phone', phone);
    } catch (err: any) {
      throw new Error(err.message ?? 'Failed to send OTP', { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);
  const signInWithEmail = useCallback(async (email: string) => {
    if (__DEV__) console.log('[AgroAuth] signInWithEmail starting for:', email);
    setLoading(true);
    try {
      if (!supabase) {
        if (__DEV__) console.log('[AgroAuth MOCK] Simulating email OTP send for:', email);
        await new Promise((r) => setTimeout(r, 1000));
        await SecureStore.setItemAsync('kilimo_email', email);
        const { Alert } = require('react-native');
        Alert.alert(
          'Kilimo AI (Mock Auth)',
          `[DEBUG MOCK] Nambari ya siri (OTP) ya barua pepe ni: 123456\n\n[DEBUG MOCK] Your test email OTP verification code is: 123456`
        );
        return { success: true };
      }
      if (__DEV__) console.log('[AgroAuth] Calling Supabase signInWithOtp for email...');
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) {
        console.error('[AgroAuth] Supabase signInWithOtp returned error:', error);
        throw error;
      }
      await SecureStore.setItemAsync('kilimo_email', email);
      return { success: true };
    } catch (err: any) {
      console.error('[AgroAuth] signInWithEmail exception caught:', err);
      throw new Error(err.message ?? 'Failed to send OTP to email', { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (contact: string, token: string) => {
      setLoading(true);
      const normalized = contact.trim().replace(/\s/g, '');
      const isEmail = normalized.includes('@');
      try {
        if (!supabase) {
          if (__DEV__)
            console.log(
              '[AgroAuth MOCK] Simulating OTP verification for:',
              normalized,
              'token:',
              token
            );
          await new Promise((r) => setTimeout(r, 800));
          if (token === '123456') {
            await SecureStore.setItemAsync(SESSION_KEY, 'mock-access-token');
            const mockUserId = 'mock-user-' + normalized.replace(/[^a-zA-Z0-9]/g, '');
            const currentAgroId = useKilimoStore.getState().agroId;
            if (currentAgroId && currentAgroId.id === mockUserId) {
              return {
                existingUser: true,
                user: { id: mockUserId, email: isEmail ? normalized : normalized + '@mock.com' },
              };
            }
            return {
              existingUser: false,
              user: { id: mockUserId, email: isEmail ? normalized : normalized + '@mock.com' },
            };
          } else {
            throw new Error('Invalid verification code');
          }
        }

        const verifyPayload: any = {
          token,
          type: isEmail ? 'email' : 'sms',
        };
        if (isEmail) {
          verifyPayload.email = normalized;
        } else {
          verifyPayload.phone = normalized;
        }

        const { data, error } = await supabase.auth.verifyOtp(verifyPayload);
        if (error) throw error;

        // Persist session token securely
        await SecureStore.setItemAsync(SESSION_KEY, data.session?.access_token ?? '');

        // Check if profile exists, to hydrate if it's an existing user.
        const { data: profile, error: profileError } = await supabase
          .from('agro_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (!profileError && profile) {
          setAgroId(profile as AgroID);
          return { existingUser: true, user: data.user };
        }
        return { existingUser: false, user: data.user };
      } catch (err: any) {
        throw new Error(err.message ?? 'Failed to verify OTP', { cause: err });
      } finally {
        setLoading(false);
      }
    },
    [setAgroId]
  );

  // ── Sign out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      if (supabase) await supabase.auth.signOut();
      clearAgroId();
    } catch (err) {
      console.warn('[AgroID] Sign out error:', err);
    } finally {
      setLoading(false);
    }
  }, [clearAgroId]);

  // ── Delete account ─────────────────────────────────────────────────────────
  // Permanently removes the user's auth identity and all their data via the
  // `delete-account` edge function (service role + cascade), then clears the
  // local session. Required by App Store 5.1.1(v) / Google Play data deletion.
  const deleteAccount = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
        if (error) return { ok: false, error: error.message ?? 'delete_failed' };
        if (data?.error) return { ok: false, error: String(data.error) };
      }
      // Clear local session regardless (also covers offline/mock mode).
      await SecureStore.deleteItemAsync(SESSION_KEY);
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch {
          /* session already gone after deletion */
        }
      }
      clearAgroId();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'delete_failed' };
    } finally {
      setLoading(false);
    }
  }, [clearAgroId]);

  return {
    agroId,
    isAuthenticated,
    loading,
    biometricAvailable,
    signInWithPhone,
    signInWithEmail,
    verifyOtp,
    signOut,
    deleteAccount,
    authenticateWithBiometric,
  };
}
