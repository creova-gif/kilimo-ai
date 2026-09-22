jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { signOutEverywhere, signOutCurrentUser, countUnsyncedChanges } from '../lib/session';
import { useKilimoStore } from '../store/useKilimoStore';
import { enqueueAction, __resetOfflineForTests } from '../lib/offline';
import { createFakeSupabase, type FakeClient } from '../test-utils/fakeSupabase';

function deps(over: Partial<Parameters<typeof signOutEverywhere>[0]> = {}) {
  const calls: string[] = [];
  const client = {
    auth: {
      signOut: jest.fn(async () => {
        calls.push('remote');
        return { error: null };
      }),
      stopAutoRefresh: jest.fn(() => calls.push('stopRefresh')),
    },
  };
  return {
    calls,
    client,
    d: {
      client,
      removePersistedSession: jest.fn(async () => void calls.push('removePersisted')),
      clearLegacyToken: jest.fn(async () => void calls.push('clearLegacy')),
      clearUserData: jest.fn(() => void calls.push('clearUser')),
      ...over,
    } as Parameters<typeof signOutEverywhere>[0],
  };
}

describe('signOutEverywhere', () => {
  it('revokes on the server AND clears local session + user data when online', async () => {
    const { d, calls } = deps();
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: true });
    expect(calls).toEqual(['remote', 'stopRefresh', 'removePersisted', 'clearLegacy', 'clearUser']);
  });

  it('OFFLINE: still removes the persisted session and clears data (no zombie session at next launch)', async () => {
    const { d, client, calls } = deps();
    client.auth.signOut.mockResolvedValue({ error: { message: 'Network request failed' } });
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.removePersistedSession).toHaveBeenCalled();
    expect(d.clearUserData).toHaveBeenCalled();
    expect(calls).toContain('removePersisted');
  });

  it('a THROWN network error is handled the same way', async () => {
    const { d, client } = deps();
    client.auth.signOut.mockRejectedValue(new Error('boom'));
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.clearUserData).toHaveBeenCalled();
  });

  it('works with no backend configured (client null)', async () => {
    const { d } = deps({ client: null });
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.removePersistedSession).toHaveBeenCalled();
    expect(d.clearUserData).toHaveBeenCalled();
  });

  it('clears user data even if removing the persisted session throws', async () => {
    const { d } = deps({
      removePersistedSession: jest.fn(async () => {
        throw new Error('keychain locked');
      }),
    });
    await signOutEverywhere(d);
    expect(d.clearUserData).toHaveBeenCalled();
  });
});

describe('signOutCurrentUser — the real wiring used by Profile -> Log out', () => {
  const SecureStore = require('expo-secure-store');
  let client: FakeClient & { auth: any };
  const store = () => useKilimoStore.getState();

  beforeEach(() => {
    __resetOfflineForTests();
    client = createFakeSupabase('user-1') as any;
    client.auth.signOut = jest.fn(async () => ({ error: null }));
    client.auth.stopAutoRefresh = jest.fn();
    (global as any).__TEST_SUPABASE__ = client;
    SecureStore.deleteItemAsync.mockClear();
    useKilimoStore.setState({ syncQueue: [] });
    store().setConnectivity(true);
    store().setAgroId({ id: 'A-1', name: 'Asha' } as any);
  });
  afterEach(() => {
    (global as any).__TEST_SUPABASE__ = null;
  });

  const queueTask = (title: string) =>
    enqueueAction({ type: 'task_create', payload: { title, status: 'pending' } });

  it('counts unsynced changes (waiting + failed) for the confirm dialog', () => {
    store().setConnectivity(false);
    const a = queueTask('a');
    queueTask('b');
    store().patchSyncQueueItem(a.id, { status: 'failed', lastError: '42501' });
    expect(countUnsyncedChanges()).toBe(2);
  });

  it('online: gives the outbox a chance to reach the server, THEN signs out and clears everything', async () => {
    store().setConnectivity(false);
    queueTask('last minute task');
    store().setConnectivity(true);

    const result = await signOutCurrentUser();

    expect(result).toEqual({ revokedRemotely: true });
    expect(client.rows('tasks').map((r) => r.title)).toEqual(['last minute task']);
    expect(client.auth.signOut).toHaveBeenCalledWith(); // server revoke
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }); // persisted session removed
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kilimo_session_token');
    expect(store().syncQueue).toHaveLength(0);
    expect(store().agroId).toBeNull();
    expect(store().isAuthenticated).toBe(false);
  });

  it('offline: no drain is attempted, yet the session is removed locally and user data (queue) cleared', async () => {
    store().setConnectivity(false);
    queueTask('unsent');
    client.auth.signOut.mockImplementation(async (arg?: any) =>
      arg ? { error: null } : { error: { message: 'Network request failed' } }
    );

    const result = await signOutCurrentUser();

    expect(result).toEqual({ revokedRemotely: false });
    expect(client.calls).toHaveLength(0);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(store().syncQueue).toHaveLength(0);
    expect(store().isAuthenticated).toBe(false);
  });

  it('a hanging server cannot trap the person on the profile screen (drain is time-boxed)', async () => {
    store().setConnectivity(false);
    queueTask('stuck');
    store().setConnectivity(true);
    client.from = () =>
      ({ upsert: () => new Promise(() => {}), insert: () => Promise.resolve({ error: null }) }) as any;

    const started = Date.now();
    await signOutCurrentUser({ drainTimeoutMs: 50 });

    expect(Date.now() - started).toBeLessThan(2000);
    expect(store().isAuthenticated).toBe(false);
    expect(store().syncQueue).toHaveLength(0);
  });
});
