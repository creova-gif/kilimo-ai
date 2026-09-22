jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Globals (not top-level consts): jest.mock factories run when the module is first imported.
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));
jest.mock('@react-native-community/netinfo', () => {
  const listeners: Array<(s: any) => void> = [];
  const unsubscribe = jest.fn();
  const NetInfo = {
    addEventListener: jest.fn((cb: (s: any) => void) => {
      listeners.push(cb);
      return unsubscribe;
    }),
    fetch: jest.fn(async () => (global as any).__NET_STATE__),
  };
  (global as any).__NET_EMIT__ = (s: any) => listeners.forEach((l) => l(s));
  (global as any).__NET_UNSUB__ = unsubscribe;
  return { __esModule: true, default: NetInfo };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKilimoStore } from '../store/useKilimoStore';
import {
  __resetOfflineForTests,
  discardQueueItem,
  drainQueue,
  enqueueAction,
  getQueueState,
  processSyncQueue,
  retryFailed,
  startOfflineEngine,
} from '../lib/offline';
import { MAX_ATTEMPTS, isUuid } from '../lib/syncQueue';
import { createFakeSupabase, type FakeClient } from '../test-utils/fakeSupabase';

const NetInfo = require('@react-native-community/netinfo').default;
const ONLINE = { isConnected: true, isInternetReachable: true };
const OFFLINE = { isConnected: false, isInternetReachable: false };

let client: FakeClient;
const store = () => useKilimoStore.getState();
const emitNet = (s: any) => (global as any).__NET_EMIT__(s);
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

function taskCreate(title: string, id?: string) {
  return {
    type: 'task_create',
    payload: { ...(id ? { id } : {}), title, status: 'pending' },
  };
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-21T08:00:00Z'));
  __resetOfflineForTests();
  client = createFakeSupabase('user-1');
  (global as any).__TEST_SUPABASE__ = client;
  (global as any).__NET_STATE__ = ONLINE;
  NetInfo.addEventListener.mockClear();
  NetInfo.fetch.mockClear();
  (global as any).__NET_UNSUB__.mockClear();
  await AsyncStorage.clear();
  useKilimoStore.setState({
    syncQueue: [],
    notifications: [],
    unreadCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
    language: 'en',
  });
  store().setConnectivity(true);
});

afterEach(() => {
  jest.useRealTimers();
  (global as any).__TEST_SUPABASE__ = null;
});

describe('one queue, one drainer', () => {
  it('online: enqueueAction writes to the REAL table (tasks), not just a log', async () => {
    const item = enqueueAction(taskCreate('Weed plot 1'));
    await jest.advanceTimersByTimeAsync(0);
    expect(isUuid(item.idempotencyKey)).toBe(true);
    expect(client.rows('tasks')).toEqual([
      expect.objectContaining({ id: item.idempotencyKey, title: 'Weed plot 1' }),
    ]);
    expect(store().syncQueue).toHaveLength(0);
  });

  it('offline_sync_logs is audit-only: one row per synced item, and the queue never depends on it', async () => {
    enqueueAction(taskCreate('a'));
    await jest.advanceTimersByTimeAsync(0);
    await flush();
    const logs = client.rows('offline_sync_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event_type: 'task_create',
      payload: { table: 'tasks', op: 'insert', outcome: 'synced', attempts: 1, error: null },
    });
    // No call ever tried to read or delete from the log to decide anything.
    expect(client.calls.filter((c) => c.table === 'offline_sync_logs').map((c) => c.op)).toEqual(['insert']);
  });

  it('a broken/missing audit table cannot block or undo a sync', async () => {
    const realFailWith = client.failWith;
    client.failWith = (c) => (c.table === 'offline_sync_logs' ? { code: '42P01', message: 'no table' } : realFailWith(c));
    enqueueAction(taskCreate('a'));
    await jest.advanceTimersByTimeAsync(0);
    await flush();
    expect(client.rows('tasks')).toHaveLength(1);
    expect(store().syncQueue).toHaveLength(0);
  });

  it('is single-flight: concurrent drains never write an item twice', async () => {
    store().setConnectivity(false);
    enqueueAction(taskCreate('a'));
    enqueueAction(taskCreate('b'));
    store().setConnectivity(true);
    await Promise.all([drainQueue(), drainQueue(), drainQueue()]);
    expect(client.calls.filter((c) => c.table === 'tasks' && c.op === 'upsert')).toHaveLength(2);
    expect(client.rows('tasks')).toHaveLength(2);
  });

  it('an item enqueued while a pass is running is picked up by the follow-up pass', async () => {
    store().setConnectivity(false);
    enqueueAction(taskCreate('first'));
    store().setConnectivity(true);
    const p = drainQueue();
    enqueueAction(taskCreate('second')); // arrives mid-pass
    await p;
    await jest.advanceTimersByTimeAsync(0);
    expect(client.rows('tasks').map((r) => r.title)).toEqual(['first', 'second']);
    expect(store().syncQueue).toHaveLength(0);
    expect(store().isSyncing).toBe(false);
  });
});

describe('reconnect drain', () => {
  it('queues while offline, then drains in order once NetInfo reports online', async () => {
    (global as any).__NET_STATE__ = OFFLINE; // the engine's initial NetInfo.fetch() agrees
    const stop = startOfflineEngine();
    emitNet(OFFLINE);
    expect(store().isOffline).toBe(true);
    expect(store().isOnline).toBe(false);

    enqueueAction(taskCreate('one'));
    enqueueAction(taskCreate('two'));
    enqueueAction({ type: 'task_cancel', op: 'update', payload: { match: { id: 'x' }, values: { status: 'cancelled' } } });
    await jest.advanceTimersByTimeAsync(5000);
    expect(client.calls).toHaveLength(0); // nothing sent while offline
    expect(getQueueState()).toMatchObject({ pending: 3, failed: 0, isOnline: false });

    jest.setSystemTime(new Date('2026-09-21T08:05:00Z')); // they waited five minutes
    emitNet(ONLINE);
    expect(store().isOnline).toBe(true);
    expect(store().isOffline).toBe(false);
    await jest.advanceTimersByTimeAsync(1500);
    await flush();

    // creates landed in order; the cancel of an unknown row is kept as failed, not faked
    expect(client.rows('tasks').map((r) => r.title)).toEqual(['one', 'two']);
    expect(store().syncQueue).toHaveLength(1);
    expect(store().syncQueue[0]).toMatchObject({ type: 'task_cancel', status: 'failed', lastError: 'no_rows' });
    expect(store().lastSyncedAt).not.toBeNull();
    // a notification for the writes that had been waiting, in the active language
    expect(store().notifications[0]).toMatchObject({ title: 'Sync complete', body: 'Saved to your account: 2', type: 'success' });
    stop();
  });

  it('the notification follows the user language', async () => {
    store().setLanguage('sw');
    store().setConnectivity(false);
    enqueueAction(taskCreate('a'));
    jest.setSystemTime(new Date('2026-09-21T09:00:00Z'));
    store().setConnectivity(true);
    await drainQueue();
    expect(store().notifications[0].title).toBe('Usawazishaji umekamilika');
  });

  it('does not notify for an instant, online save', async () => {
    enqueueAction(taskCreate('a'));
    await jest.advanceTimersByTimeAsync(0);
    expect(store().notifications).toHaveLength(0);
  });

  it('a drain already pending at startup (previous session outbox) starts without any network event', async () => {
    store().setConnectivity(false);
    enqueueAction(taskCreate('from last session'));
    store().setConnectivity(true);
    const stop = startOfflineEngine();
    await jest.advanceTimersByTimeAsync(0);
    await flush();
    expect(client.rows('tasks')).toHaveLength(1);
    stop();
  });

  it('is ref-counted: two mounts share one NetInfo listener, removed with the last unmount', () => {
    const a = startOfflineEngine();
    const b = startOfflineEngine();
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    a();
    a(); // double-stop is harmless
    expect((global as any).__NET_UNSUB__).not.toHaveBeenCalled();
    b();
    expect((global as any).__NET_UNSUB__).toHaveBeenCalledTimes(1);
  });

  it('applies the ONE online definition to NetInfo: unknown reachability counts as online', () => {
    const stop = startOfflineEngine();
    emitNet({ isConnected: true, isInternetReachable: null });
    expect(store().isOnline).toBe(true);
    emitNet({ isConnected: true, isInternetReachable: false });
    expect(store().isOnline).toBe(false);
    expect(store().isOffline).toBe(true);
    stop();
  });

  it('isOnline and isOffline can never disagree, whichever setter is used', () => {
    for (const set of [() => store().setConnectivity(false), () => store().setOffline(true), () => store().setOnlineStatus(false)]) {
      set();
      expect(store().isOnline).toBe(false);
      expect(store().isOffline).toBe(true);
      store().setConnectivity(true);
      expect(store().isOnline).toBe(true);
      expect(store().isOffline).toBe(false);
    }
  });
});

describe('backoff and failed items through the real engine', () => {
  it('a failing server is retried on a timer with growing delays, then kept as failed', async () => {
    client.failWith = (c) => (c.table === 'tasks' ? 'throw' : null);
    enqueueAction(taskCreate('flaky'));
    await jest.advanceTimersByTimeAsync(0);
    expect(store().syncQueue[0]).toMatchObject({ retries: 1, status: 'pending' });

    // 2s, 4s, 8s, 16s, 32s later the timer retries by itself (no network event needed)
    for (const delay of [2000, 4000, 8000, 16000, 32000]) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    expect(store().syncQueue[0]).toMatchObject({ status: 'failed', retries: MAX_ATTEMPTS });
    expect(store().syncQueue).toHaveLength(1); // retained
    expect(getQueueState()).toMatchObject({ pending: 0, failed: 1 });
    const callsWhenFailed = client.calls.length;
    await jest.advanceTimersByTimeAsync(120_000);
    expect(client.calls.length).toBe(callsWhenFailed); // no further automatic attempts
  });

  it('retryFailed() gives failed items a fresh budget and sends them once the server is healthy', async () => {
    client.failWith = () => ({ code: '42501', message: 'rls' });
    enqueueAction(taskCreate('blocked'));
    await jest.advanceTimersByTimeAsync(0);
    expect(store().syncQueue[0].status).toBe('failed');

    client.failWith = () => null; // server fixed
    expect(retryFailed()).toBe(1);
    await jest.advanceTimersByTimeAsync(0);
    await flush();
    expect(client.rows('tasks')).toHaveLength(1);
    expect(store().syncQueue).toHaveLength(0);
  });

  it('processSyncQueue (manual "sync now") bypasses backoff', async () => {
    let failing = true;
    client.failWith = () => (failing ? 'throw' : null);
    enqueueAction(taskCreate('later'));
    await jest.advanceTimersByTimeAsync(0);
    failing = false;
    await processSyncQueue();
    expect(client.rows('tasks')).toHaveLength(1);
    expect(store().syncQueue).toHaveLength(0);
  });

  it('discardQueueItem is the only way to drop a failed item, and it is explicit', async () => {
    client.failWith = () => ({ code: '23514', message: 'check' });
    const item = enqueueAction(taskCreate('bad'));
    await jest.advanceTimersByTimeAsync(0);
    expect(store().syncQueue).toHaveLength(1);
    discardQueueItem(item.id);
    expect(store().syncQueue).toHaveLength(0);
  });

  it('with no signed-in session nothing is sent and nothing is marked failed', async () => {
    (global as any).__TEST_SUPABASE__ = createFakeSupabase(null);
    enqueueAction(taskCreate('a'));
    await jest.advanceTimersByTimeAsync(0);
    expect(store().syncQueue[0]).toMatchObject({ status: 'pending', retries: 0 });
  });
});

describe('persistence round-trip', () => {
  const key = 'kilimo-ai-store';
  const persisted = async () => JSON.parse((await AsyncStorage.getItem(key)) as string).state;

  it('the outbox (ids, status, backoff, errors) survives a restart; transient flags do not', async () => {
    store().setConnectivity(false);
    const a = enqueueAction(taskCreate('pending one'));
    const b = enqueueAction(taskCreate('will fail'));
    store().patchSyncQueueItem(b.id, {
      status: 'failed',
      retries: 3,
      lastError: '42501',
      failedAt: '2026-09-21T08:00:00.000Z',
    });
    store().patchSyncQueueItem(a.id, { retries: 2, nextAttemptAt: 1_800_000_000_000 });
    store().setSyncing(true);
    await flush();

    const saved = await persisted();
    expect(saved.syncQueue.map((i: any) => i.id)).toEqual([a.id, b.id]);
    expect(saved).not.toHaveProperty('isSyncing');

    // "restart": the app process dies (storage keeps what was written), memory is empty, rehydrate
    const raw = (await AsyncStorage.getItem(key)) as string;
    useKilimoStore.setState({ syncQueue: [], isSyncing: false });
    await AsyncStorage.setItem(key, raw);
    await useKilimoStore.persist.rehydrate();
    expect(store().isSyncing).toBe(false);

    expect(store().syncQueue).toEqual([
      expect.objectContaining({ id: a.id, idempotencyKey: a.idempotencyKey, status: 'pending', retries: 2, nextAttemptAt: 1_800_000_000_000, type: 'task_create' }),
      expect.objectContaining({ id: b.id, idempotencyKey: b.idempotencyKey, status: 'failed', retries: 3, lastError: '42501' }),
    ]);
  });

  it('a queue persisted by the previous build (v4) is migrated, not lost', async () => {
    const legacy = [
      { id: 'sync_1', type: 'task_complete', payload: { id: 'local_9', title: 'Old offline task', status: 'pending' }, createdAt: '2026-09-01T00:00:00.000Z', retries: 0 },
      { id: 'sync_2', type: 'task_complete', payload: { taskId: 't-1', completedAt: '2026-09-02T00:00:00.000Z' }, createdAt: '2026-09-02T00:00:00.000Z', retries: 1 },
      { id: 'sync_3', type: 'market_order', payload: { cropName: 'Maize', quantityKg: 5, pricePerKg: 400 }, createdAt: '2026-09-02T00:00:00.000Z', retries: 0 },
      { id: 'sync_4', type: 'voice_note', payload: {}, createdAt: '2026-09-02T00:00:00.000Z', retries: 0 },
    ];
    await AsyncStorage.setItem(key, JSON.stringify({ state: { syncQueue: legacy, language: 'sw' }, version: 4 }));
    await useKilimoStore.persist.rehydrate();

    const q = store().syncQueue;
    expect(q.map((i) => [i.id, i.type, i.status])).toEqual([
      ['sync_1', 'task_create', 'pending'],
      ['sync_2', 'task_complete', 'pending'],
      ['sync_3', 'market_listing_create', 'pending'],
      ['sync_4', 'voice_note', 'failed'],
    ]);
    q.forEach((i) => expect(isUuid(i.idempotencyKey)).toBe(true));

    // ...and the migrated items really drain: the orphaned offline task now reaches `tasks`.
    client.rows('tasks').push({ id: 't-1', status: 'pending' });
    await drainQueue();
    expect(client.rows('tasks').find((r) => r.title === 'Old offline task')).toBeTruthy();
    expect(client.rows('tasks').find((r) => r.id === 't-1')?.status).toBe('done');
    expect(client.rows('market_listings')[0]).toMatchObject({ crop_name: 'Maize', seller_id: 'user-1' });
    expect(store().syncQueue.map((i) => i.type)).toEqual(['voice_note']); // kept, visible
  });
});

describe('sign-out clears the outbox', () => {
  it('clearUserData removes queued writes so the next person never inherits or syncs them', () => {
    store().setConnectivity(false);
    enqueueAction(taskCreate('mine'));
    expect(store().syncQueue).toHaveLength(1);
    store().clearUserData();
    expect(store().syncQueue).toHaveLength(0);
    expect(store().isAuthenticated).toBe(false);
  });
});
