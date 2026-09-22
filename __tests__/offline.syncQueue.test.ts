import {
  BACKOFF_BASE_MS,
  MAX_ATTEMPTS,
  backoffDelayMs,
  classifyError,
  createSyncQueueItem,
  drainOnce,
  generateId,
  isOnlineState,
  isUuid,
  migrateSyncQueue,
  registerSyncType,
  summarizeQueue,
  type DrainDeps,
  type SyncQueueItem,
} from '../lib/syncQueue';
import { createFakeSupabase, type FakeClient } from '../test-utils/fakeSupabase';

const T0 = 1_800_000_000_000;

function task(title: string, over: Partial<SyncQueueItem> = {}, id = generateId()): SyncQueueItem {
  return {
    ...createSyncQueueItem(
      { type: 'task_create', payload: { id, title, status: 'pending' } },
      new Date(T0)
    ),
    ...over,
  };
}

/** A queue + deps wired to a fake client, with a controllable clock. */
function harness(items: SyncQueueItem[], client: FakeClient | null = createFakeSupabase()) {
  let queue = [...items];
  let now = T0;
  const audit: Array<[string, string, string | null]> = [];
  const deps: DrainDeps = {
    now: () => now,
    isOnline: () => true,
    getClient: () => client,
    getUserId: async (c) => (await (c as any).auth.getSession()).data.session?.user.id ?? null,
    getQueue: () => queue,
    patchItem: (id, patch) => {
      queue = queue.map((i) => (i.id === id ? { ...i, ...patch } : i));
    },
    removeItem: (id) => {
      queue = queue.filter((i) => i.id !== id);
    },
    audit: (item, outcome, detail) => audit.push([item.type, outcome, detail]),
  };
  return {
    deps,
    client,
    audit,
    get queue() {
      return queue;
    },
    set now(v: number) {
      now = v;
    },
    get now() {
      return now;
    },
    run: (over: Partial<DrainDeps> = {}) => drainOnce({ ...deps, ...over }),
  };
}

describe('isOnlineState — the one definition of online', () => {
  it('needs a connection and does not treat an unprobed (null) reachability as offline', () => {
    expect(isOnlineState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnlineState({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(isOnlineState({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isOnlineState({ isConnected: false, isInternetReachable: true })).toBe(false);
    expect(isOnlineState({ isConnected: null })).toBe(false);
  });
});

describe('ids', () => {
  it('generateId returns unique RFC-4122 v4 uuids', () => {
    const ids = new Set(Array.from({ length: 200 }, generateId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(isUuid(id)).toBe(true);
  });

  it('every new item carries an idempotency key and starts pending', () => {
    const item = createSyncQueueItem({ type: 'task_create', payload: { title: 'x' } });
    expect(isUuid(item.idempotencyKey)).toBe(true);
    expect(item).toMatchObject({ status: 'pending', retries: 0, table: 'tasks', op: 'insert' });
  });
});

describe('backoff + error classification', () => {
  it('doubles from 2s and caps at 60s', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(backoffDelayMs)).toEqual([
      BACKOFF_BASE_MS,
      4000,
      8000,
      16000,
      32000,
      60000,
      60000,
    ]);
  });

  it('classifies RLS / constraint / schema errors as permanent and network / 5xx / JWT as transient', () => {
    expect(classifyError({ code: '42501', message: 'rls' }).permanent).toBe(true);
    expect(classifyError({ code: '23514', message: 'check' }).permanent).toBe(true);
    expect(classifyError({ code: 'PGRST204', message: 'no column' }).permanent).toBe(true);
    expect(classifyError({ status: 422 }).permanent).toBe(true);
    expect(classifyError(new TypeError('Network request failed')).permanent).toBe(false);
    expect(classifyError({ status: 503 }).permanent).toBe(false);
    expect(classifyError({ code: 'PGRST301', message: 'JWT expired', status: 401 }).permanent).toBe(
      false
    );
  });
});

describe('drainOnce — ordering and success', () => {
  it('processes items strictly in queue order and removes each on success', async () => {
    const h = harness([task('one'), task('two'), task('three')]);
    const res = await h.run();
    expect(res).toMatchObject({ synced: 3, failed: 0, retryAt: null, skipped: null });
    expect(h.client!.rows('tasks').map((r) => r.title)).toEqual(['one', 'two', 'three']);
    expect(h.queue).toHaveLength(0);
    expect(h.audit.map((a) => a[1])).toEqual(['synced', 'synced', 'synced']);
  });

  it('a task completed before it synced runs AFTER its create (same row id)', async () => {
    const id = generateId();
    const create = task('Weed plot', {}, id);
    const complete = createSyncQueueItem({
      type: 'task_complete',
      payload: { match: { id }, values: { status: 'done' } },
    });
    const h = harness([create, complete]);
    await h.run();
    expect(h.client!.calls.map((c) => c.op)).toEqual(['upsert', 'update']);
    expect(h.client!.rows('tasks')[0]).toMatchObject({ id, status: 'done' });
  });

  it('uses the idempotency key as the row id when the payload has none, and sets the owner column', async () => {
    const item = createSyncQueueItem({
      type: 'market_listing_create',
      payload: { crop_name: 'Maize', quantity_kg: 10, price_per_kg: 500 },
    });
    const h = harness([item]);
    await h.run();
    expect(h.client!.rows('market_listings')[0]).toMatchObject({
      id: item.idempotencyKey,
      seller_id: 'user-1',
    });
  });

  it('a task_complete with no matching row is failed (kept), not reported as synced', async () => {
    const item = createSyncQueueItem({
      type: 'task_complete',
      payload: { match: { id: 'nope' }, values: { status: 'done' } },
    });
    const h = harness([item]);
    const res = await h.run();
    expect(res.synced).toBe(0);
    expect(h.queue[0]).toMatchObject({ status: 'failed', lastError: 'no_rows' });
  });
});

describe('drainOnce — dedupe on retry', () => {
  it('a write that landed but whose response was lost does not duplicate when retried', async () => {
    const id = generateId();
    const client = createFakeSupabase();
    const h = harness([task('Dig well', {}, id)], client);

    client.loseResponse = true; // row is written, caller sees a network error
    const first = await h.run();
    expect(first.synced).toBe(0);
    expect(h.queue[0]).toMatchObject({ retries: 1, status: 'pending' });
    expect(client.rows('tasks')).toHaveLength(1);

    client.loseResponse = false;
    h.now = T0 + 5000; // past the backoff
    const second = await h.run();
    expect(second.synced).toBe(1);
    expect(client.rows('tasks')).toHaveLength(1); // still ONE row
    expect(h.queue).toHaveLength(0);
  });

  it('a unique-violation on insert counts as already-applied', async () => {
    const client = createFakeSupabase();
    client.failWith = () => ({ code: '23505', message: 'duplicate key' });
    const h = harness([task('x')], client);
    expect((await h.run()).synced).toBe(1);
    expect(h.queue).toHaveLength(0);
  });

  it('two queue items with the same client id still produce one row', async () => {
    const id = generateId();
    const h = harness([task('a', {}, id), task('a', {}, id)]);
    await h.run();
    expect(h.client!.rows('tasks')).toHaveLength(1);
  });
});

describe('drainOnce — backoff', () => {
  it('a transient failure records the attempt, schedules exponential backoff and stops the pass', async () => {
    const client = createFakeSupabase();
    client.failWith = (c) => (c.arg?.title === 'first' ? 'throw' : null);
    const h = harness([task('first'), task('second')], client);

    const res = await h.run();
    expect(res.synced).toBe(0);
    expect(res.retryAt).toBe(T0 + 2000);
    expect(h.queue[0]).toMatchObject({ retries: 1, nextAttemptAt: T0 + 2000, status: 'pending' });
    // order preserved: 'second' was NOT attempted ahead of 'first'
    expect(client.calls.map((c) => c.arg.title)).toEqual(['first']);
  });

  it('does not touch the network again until the backoff has elapsed, then delays double', async () => {
    const client = createFakeSupabase();
    client.failWith = () => 'throw';
    const h = harness([task('flaky')], client);
    const expected = [2000, 4000, 8000, 16000, 32000];

    await h.run();
    const callsAfterFirst = client.calls.length;
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
      const at = h.queue[0].nextAttemptAt!;
      expect(at - h.now).toBe(expected[attempt - 1]);

      h.now = at - 1; // one ms too early: no request is made
      const early = await h.run();
      expect(early.retryAt).toBe(at);
      expect(client.calls.length).toBe(callsAfterFirst + attempt - 1);

      h.now = at;
      await h.run();
    }
  });

  it('after MAX_ATTEMPTS failures the item is marked failed and KEPT, with the reason', async () => {
    const client = createFakeSupabase();
    client.failWith = () => 'throw';
    const h = harness([task('never works')], client);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      h.now += 120_000;
      await h.run();
    }
    expect(h.queue).toHaveLength(1);
    expect(h.queue[0]).toMatchObject({ status: 'failed', retries: MAX_ATTEMPTS });
    expect(h.queue[0].lastError).toContain('Network request failed');
    expect(h.audit.at(-1)?.[1]).toBe('failed');

    // and a later pass leaves it alone (waits for an explicit retry)
    const calls = client.calls.length;
    const res = await h.run();
    expect(res.skipped).toBe('empty');
    expect(client.calls.length).toBe(calls);
  });

  it('ignoreBackoff (manual sync) attempts an item that is still waiting', async () => {
    const client = createFakeSupabase();
    let failing = true;
    client.failWith = () => (failing ? 'throw' : null);
    const h = harness([task('later')], client);
    await h.run();
    failing = false;
    expect((await h.run()).synced).toBe(0); // still in backoff
    expect((await h.run({ ignoreBackoff: true })).synced).toBe(1);
  });
});

describe('drainOnce — failures are kept and surfaced, never dropped', () => {
  it('a permanent error marks the item failed immediately and the pass continues past it', async () => {
    const client = createFakeSupabase();
    client.failWith = (c) => (c.arg?.title === 'bad' ? { code: '42501', message: 'rls' } : null);
    const h = harness([task('bad'), task('good')], client);

    const res = await h.run();
    expect(res).toMatchObject({ synced: 1, failed: 1 });
    expect(h.queue).toHaveLength(1);
    expect(h.queue[0]).toMatchObject({ status: 'failed', lastError: '42501', retries: 1 });
    expect(client.rows('tasks').map((r) => r.title)).toEqual(['good']);
    expect(h.audit).toContainEqual(['task_create', 'failed', '42501']);
  });

  it('an unsupported type is kept as failed and never faked as synced', async () => {
    const legacy: SyncQueueItem = {
      ...createSyncQueueItem({ type: 'scan_result', payload: { crop: 'maize' } }),
    };
    const h = harness([legacy, task('real')]);
    const res = await h.run();
    expect(res).toMatchObject({ synced: 1, failed: 1 });
    expect(h.queue).toHaveLength(1);
    expect(h.queue[0]).toMatchObject({ type: 'scan_result', status: 'failed', lastError: 'unsupported_type' });
    expect(h.client!.calls.every((c) => c.table === 'tasks')).toBe(true);
  });

  it('an item whose table/op does not match its registered type is unsupported', async () => {
    const item = createSyncQueueItem({ type: 'task_create', table: 'profiles', payload: {} });
    const h = harness([item]);
    await h.run();
    expect(h.queue[0]).toMatchObject({ status: 'failed', lastError: 'unsupported_table' });
    expect(h.client!.calls).toHaveLength(0);
  });

  it('a newly registered type becomes executable (future features register their own)', async () => {
    registerSyncType('farm_create_test', { table: 'farms', ops: ['insert'] });
    const item = createSyncQueueItem({ type: 'farm_create_test', payload: { name: 'Shamba' } });
    const h = harness([item]);
    await h.run();
    expect(h.client!.rows('farms')[0]).toMatchObject({ name: 'Shamba', id: item.idempotencyKey });
  });

  it('delete ops run and are idempotent', async () => {
    registerSyncType('farm_delete_test', { table: 'farms', ops: ['delete'] });
    const client = createFakeSupabase();
    client.rows('farms').push({ id: 'f1' }, { id: 'f2' });
    const item = createSyncQueueItem({
      type: 'farm_delete_test',
      payload: { match: { id: 'f1' } },
    });
    const h = harness([item], client);
    await h.run();
    expect(client.rows('farms')).toEqual([{ id: 'f2' }]);
  });

  it('an update with a malformed payload fails permanently instead of running', async () => {
    const item = createSyncQueueItem({ type: 'task_complete', payload: { taskId: 'legacy' } });
    const h = harness([item]);
    await h.run();
    expect(h.queue[0]).toMatchObject({ status: 'failed', lastError: 'invalid_payload' });
  });
});

describe('drainOnce — preconditions leave the queue untouched', () => {
  it('offline: nothing is attempted, nothing changes', async () => {
    const h = harness([task('a')]);
    const res = await h.run({ isOnline: () => false });
    expect(res.skipped).toBe('offline');
    expect(h.client!.calls).toHaveLength(0);
    expect(h.queue[0]).toMatchObject({ status: 'pending', retries: 0 });
  });

  it('no session: items stay PENDING (not failed) so a later sign-in can send them', async () => {
    const h = harness([task('a')], createFakeSupabase(null));
    const res = await h.run();
    expect(res.skipped).toBe('no_session');
    expect(h.queue[0]).toMatchObject({ status: 'pending', retries: 0 });
  });

  it('no backend configured: items stay pending', async () => {
    const h = harness([task('a')], null);
    expect((await h.run()).skipped).toBe('no_backend');
    expect(h.queue).toHaveLength(1);
  });

  it('a throwing session lookup is treated as no session', async () => {
    const h = harness([task('a')]);
    const res = await h.run({
      getUserId: async () => {
        throw new Error('storage locked');
      },
    });
    expect(res.skipped).toBe('no_session');
    expect(h.queue[0].status).toBe('pending');
  });

  it('an item discarded by the user mid-pass is not attempted', async () => {
    const a = task('a');
    const b = task('b');
    const h = harness([a, b]);
    const removeOnFirst: DrainDeps['removeItem'] = (id) => {
      h.deps.removeItem(id);
      if (id === a.id) h.deps.removeItem(b.id); // user discards b while a is finishing
    };
    await h.run({ removeItem: removeOnFirst });
    expect(h.client!.rows('tasks').map((r) => r.title)).toEqual(['a']);
  });

  it('audit failures never affect the queue', async () => {
    const h = harness([task('a')]);
    const res = await h.run({
      audit: () => {
        throw new Error('log table missing');
      },
    });
    expect(res.synced).toBe(1);
    expect(h.queue).toHaveLength(0);
  });
});

describe('drainOnce — notification bookkeeping', () => {
  it('counts only items that had actually been waiting as delayed', async () => {
    const waited = task('waited', { createdAt: new Date(T0 - 60_000).toISOString() });
    const instant = task('instant');
    const h = harness([waited, instant]);
    const res = await h.run();
    expect(res).toMatchObject({ synced: 2, syncedDelayed: 1 });
  });
});

describe('migrateSyncQueue — items persisted by earlier builds', () => {
  const base = { id: 'sync_1', createdAt: '2026-09-01T00:00:00.000Z', retries: 2 };

  it('splits the overloaded task_complete type into task_create / task_complete', () => {
    const [create, complete] = migrateSyncQueue([
      {
        ...base,
        type: 'task_complete',
        payload: { id: 'local_1', title: 'Scout', titleSw: 'Kagua', category: 'scouting', priority: 'high', status: 'pending', dueDate: 'd', xpReward: 15, farmBlock: 'A', coopId: 'c', assignedRole: 'vet' },
      },
      {
        ...base,
        id: 'sync_2',
        type: 'task_complete',
        payload: { taskId: 't-9', completedAt: '2026-09-02T00:00:00.000Z', userId: 'u' },
      },
    ]);
    expect(create).toMatchObject({ type: 'task_create', table: 'tasks', op: 'insert', status: 'pending', retries: 2 });
    expect(create.payload).toMatchObject({ title: 'Scout', title_sw: 'Kagua', xp_reward: 15, farm_block: 'A' });
    expect(create.payload).not.toHaveProperty('id'); // 'local_1' is not a uuid: the idempotency key is used
    expect(isUuid(create.idempotencyKey)).toBe(true);
    expect(complete).toMatchObject({ type: 'task_complete', op: 'update' });
    expect(complete.payload).toEqual({
      match: { id: 't-9' },
      values: { status: 'done', completed_at: '2026-09-02T00:00:00.000Z' },
    });
  });

  it('converts a legacy market_order into a server-shaped listing without escrow flags', () => {
    const [item] = migrateSyncQueue([
      { ...base, type: 'market_order', payload: { cropName: 'Maize', quantityKg: 100, pricePerKg: 450, smartContract: true } },
    ]);
    expect(item).toMatchObject({ type: 'market_listing_create', table: 'market_listings', status: 'pending' });
    expect(item.payload).toMatchObject({ crop_name: 'Maize', quantity_kg: 100, price_per_kg: 450, status: 'active' });
    expect(JSON.stringify(item.payload)).not.toMatch(/smart|escrow/i);
  });

  it('keeps never-implemented types as FAILED + visible instead of dropping or faking them', () => {
    const out = migrateSyncQueue(
      ['scan_result', 'irrigation_log', 'voice_note'].map((type, i) => ({ ...base, id: `s${i}`, type, payload: { n: i } }))
    );
    expect(out).toHaveLength(3);
    for (const i of out) expect(i).toMatchObject({ status: 'failed', lastError: 'unsupported_type' });
    expect(out.map((i) => i.payload)).toEqual([{ n: 0 }, { n: 1 }, { n: 2 }]);
  });

  it('is idempotent and drops only unrecognisable entries', () => {
    const once = migrateSyncQueue([{ ...base, type: 'market_order', payload: { cropName: 'Beans' } }, 'junk', null, {}]);
    expect(once).toHaveLength(1);
    expect(migrateSyncQueue(once)).toEqual(once);
    expect(migrateSyncQueue(undefined)).toEqual([]);
  });
});

describe('summarizeQueue', () => {
  it('counts pending and failed separately', () => {
    const items = [task('a'), task('b', { status: 'failed' }), task('c')];
    expect(summarizeQueue(items)).toEqual({ pending: 2, failed: 1, total: 3 });
  });
});
