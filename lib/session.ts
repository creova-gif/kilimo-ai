/**
 * Sign out — the farmer's intent is honoured even when the network is not.
 *
 * supabase-js `auth.signOut()` removes the persisted session only after the server call succeeds
 * (other than 401/403/404). Offline it returns an error and leaves the Keychain session in place, so
 * useSessionRestore would sign the person straight back in at the next launch. We therefore:
 *   1. try to revoke the session server-side (best effort),
 *   2. ALWAYS remove the persisted session locally and stop token refresh,
 *   3. ALWAYS clear every user-scoped piece of local state (profile, notifications, unsynced queue …),
 *      so the next person to use this phone never inherits data or queued actions.
 * Dependencies are injected so this is unit-tested without a device.
 */
export interface SignOutDeps {
  /** The shared Supabase client, or null when the backend is not configured. */
  client: any | null;
  /** Removes the persisted auth session from storage (Keychain). */
  removePersistedSession: () => Promise<void>;
  /** Clears legacy/manual token storage. */
  clearLegacyToken?: () => Promise<void>;
  /** Clears all user-scoped local state. */
  clearUserData: () => void;
}

export interface SignOutResult {
  /** true when the server confirmed the session was revoked; false = only local sign-out happened. */
  revokedRemotely: boolean;
}

export async function signOutEverywhere(deps: SignOutDeps): Promise<SignOutResult> {
  let revokedRemotely = false;

  if (deps.client) {
    try {
      const { error } = await deps.client.auth.signOut();
      revokedRemotely = !error;
    } catch {
      revokedRemotely = false;
    }
    try {
      deps.client.auth.stopAutoRefresh?.();
    } catch {
      /* not fatal */
    }
  }

  // Local removal never depends on the network result above.
  try {
    await deps.removePersistedSession();
  } catch {
    /* best effort; clearUserData below still signs the UI out */
  }
  try {
    await deps.clearLegacyToken?.();
  } catch {
    /* ignore */
  }
  deps.clearUserData();

  return { revokedRemotely };
}

// ─── Wiring for the running app ───────────────────────────────────────────────

/** Changes made on this phone that are not yet saved to the account (waiting + failed). */
export function countUnsyncedChanges(): number {
  // Lazy require: the pure signOutEverywhere above stays importable in tests with no store/native deps.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useKilimoStore } = require('../store/useKilimoStore');
  return (useKilimoStore.getState().syncQueue as unknown[]).length;
}

/**
 * Sign the current person out of this device (Profile -> Log out).
 *
 * First gives the offline outbox a bounded chance to reach the server (skipped when offline),
 * because signing out clears the queue. Whatever cannot be saved is lost by design — the confirm
 * dialog says so — so the next person to use this phone never inherits, or syncs, someone else's
 * writes. Then runs `signOutEverywhere` with the real client, Keychain session and store.
 */
export async function signOutCurrentUser(
  opts: { drainTimeoutMs?: number } = {}
): Promise<SignOutResult> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { useKilimoStore } = require('../store/useKilimoStore');
  const { getSupabase } = require('./supabase');
  const { drainQueue } = require('./offline');
  const SecureStore = require('expo-secure-store');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const timeoutMs = opts.drainTimeoutMs ?? 4000;
  const state = useKilimoStore.getState();
  if (state.isOnline && state.syncQueue.some((i: { status?: string }) => i.status !== 'failed')) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        drainQueue({ force: true }),
        new Promise((resolve) => {
          timer = setTimeout(resolve, timeoutMs);
        }),
      ]);
    } catch {
      /* draining is best effort; sign-out proceeds */
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const client = getSupabase();
  return signOutEverywhere({
    client,
    // signOut({ scope: 'local' }) removes the persisted session even when the network is down.
    removePersistedSession: async () => {
      await client?.auth.signOut({ scope: 'local' });
    },
    clearLegacyToken: () => SecureStore.deleteItemAsync('kilimo_session_token'),
    clearUserData: () => useKilimoStore.getState().clearUserData(),
  });
}
