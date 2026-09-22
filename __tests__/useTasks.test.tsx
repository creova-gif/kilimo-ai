jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// A global holder (not a top-level const): jest.mock factories run when hooks/useTasks is
// first imported, before any const declared in this file has been initialised.
const setBackend = (client: any) => {
  (global as any).__TEST_SUPABASE__ = client;
};
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useTasks, overlayPendingTasks, taskToRow, type Task } from '../hooks/useTasks';
import { useKilimoStore } from '../store/useKilimoStore';
import { drainQueue, __resetOfflineForTests } from '../lib/offline';
import { createSyncQueueItem, isUuid } from '../lib/syncQueue';
import { createFakeSupabase, type FakeClient } from '../test-utils/fakeSupabase';

function clientReturning(rows: any[], error: { message: string } | null = null) {
  const order = jest.fn().mockResolvedValue({ data: rows, error });
  const select = jest.fn().mockReturnValue({ order });
  return { from: jest.fn().mockReturnValue({ select }) };
}

describe('useTasks — no fabricated data', () => {
  beforeEach(() => {
    setBackend(null);
  });

  it('is empty (not seeded) when the backend is not configured', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
    expect(result.current.pendingTasks).toEqual([]);
  });
});

describe('useTasks — with a backend', () => {
  it('keeps an EMPTY server response empty (old code kept the seed tasks)', async () => {
    setBackend(clientReturning([]));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('maps real rows from the tasks table', async () => {
    setBackend(
      clientReturning([
        {
          id: 'a',
          title: 'Weed plot 1',
          category: 'scouting',
          priority: 'high',
          status: 'pending',
          due_date: '2026-09-22T06:00:00Z',
          xp_reward: 10,
        },
      ])
    );
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    expect(result.current.tasks[0]).toMatchObject({
      id: 'a',
      title: 'Weed plot 1',
      priority: 'high',
    });
    expect(result.current.pendingTasks).toHaveLength(1);
  });

  it('exposes a backend error instead of silently showing stale/seed data', async () => {
    setBackend(clientReturning([], { message: 'permission denied' }));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.tasks).toEqual([]);
  });
});

// ─── Writes go through the offline outbox ─────────────────────────────────────

/** Fake backend whose `tasks` select returns whatever has been written. */
function writableBackend(): FakeClient {
  const fake = createFakeSupabase('user-1');
  const from = fake.from.bind(fake);
  fake.from = (table: string) => ({
    ...from(table),
    select: () => ({
      order: jest.fn(async () => ({ data: [...fake.rows(table)], error: null })),
    }),
  });
  return fake;
}

const NEW_TASK = {
  title: 'Weed plot 1',
  category: 'scouting' as const,
  priority: 'high' as const,
  status: 'pending' as const,
  xpReward: 10,
};

describe('useTasks — offline-first writes', () => {
  let backend: FakeClient;
  beforeEach(() => {
    __resetOfflineForTests();
    backend = writableBackend();
    setBackend(backend);
    useKilimoStore.setState({ syncQueue: [], notifications: [] });
    useKilimoStore.getState().setConnectivity(true);
  });

  it('online: createTask writes the task with a client-generated uuid as the row id', async () => {
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.createTask(NEW_TASK);
    });
    await waitFor(() => expect(backend.rows('tasks')).toHaveLength(1));

    const local = result.current.tasks[0];
    expect(isUuid(local.id)).toBe(true); // was `local_${Date.now()}`, which the server could never match
    expect(backend.rows('tasks')[0]).toMatchObject({ id: local.id, title: 'Weed plot 1', synced_offline: false });
    await waitFor(() => expect(useKilimoStore.getState().syncQueue).toHaveLength(0));
  });

  it('offline: createTask is queued as task_create (not task_complete), nothing is sent, the task stays visible', async () => {
    useKilimoStore.getState().setConnectivity(false);
    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.createTask(NEW_TASK);
    });

    expect(backend.calls).toHaveLength(0);
    const [item] = useKilimoStore.getState().syncQueue;
    expect(item).toMatchObject({ type: 'task_create', table: 'tasks', op: 'insert', status: 'pending' });
    expect(item.payload).toMatchObject({ id: result.current.tasks[0].id, title: 'Weed plot 1', synced_offline: true });
    expect(result.current.tasks[0].syncedOffline).toBe(true);
  });

  it('a task created AND completed offline reaches the server as one done row after reconnect', async () => {
    useKilimoStore.getState().setConnectivity(false);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.createTask(NEW_TASK);
    });
    const id = result.current.tasks[0].id;
    await act(async () => {
      await result.current.completeTask(id);
    });

    expect(useKilimoStore.getState().syncQueue.map((i) => i.type)).toEqual(['task_create', 'task_complete']);
    expect(result.current.tasks[0].status).toBe('done');

    await act(async () => {
      useKilimoStore.getState().setConnectivity(true);
    });
    await act(async () => {
      await drainQueue();
    });

    expect(backend.rows('tasks')).toHaveLength(1); // exactly one row, no duplicate
    expect(backend.rows('tasks')[0]).toMatchObject({ id, status: 'done' });
    expect(backend.rows('tasks')[0].completed_at).toEqual(expect.any(String));
    expect(useKilimoStore.getState().syncQueue).toHaveLength(0);
  });

  it('cancelTask is queued instead of silently doing nothing offline', async () => {
    backend.rows('tasks').push({ id: 'srv-1', title: 'Existing', status: 'pending', category: 'general', priority: 'low', xp_reward: 10 });
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    await act(async () => {
      useKilimoStore.getState().setConnectivity(false);
    });
    await act(async () => {
      await result.current.cancelTask('srv-1');
    });
    expect(useKilimoStore.getState().syncQueue[0]).toMatchObject({ type: 'task_cancel', status: 'pending' });
    expect(result.current.tasks[0].status).toBe('cancelled');
  });

  it('refreshing while a create is still queued does not make the task vanish', async () => {
    useKilimoStore.getState().setConnectivity(false);
    const { result } = renderHook(() => useTasks());
    await act(async () => {
      await result.current.createTask(NEW_TASK);
    });
    // connectivity is back per the store, but the drain has not run (e.g. still in backoff)
    await act(async () => {
      useKilimoStore.setState({ isOffline: false, isOnline: true });
    });
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.tasks.map((t) => t.title)).toContain('Weed plot 1');
  });
});

describe('overlayPendingTasks', () => {
  const server: Task[] = [
    { id: 'a', title: 'A', category: 'general', priority: 'low', status: 'pending', xpReward: 10, syncedOffline: false, createdAt: 'x' },
    { id: 'b', title: 'B', category: 'general', priority: 'low', status: 'pending', xpReward: 10, syncedOffline: false, createdAt: 'x' },
  ];
  const task = (id: string): Task => ({ ...server[0], id, title: 'New', syncedOffline: true });

  it('adds unsynced creates, and applies queued completes/cancels to server rows', () => {
    const queue = [
      createSyncQueueItem({ type: 'task_create', payload: taskToRow(task('n1')) }),
      createSyncQueueItem({ type: 'task_complete', payload: { match: { id: 'a' }, values: { status: 'done', completed_at: 'T' } } }),
      createSyncQueueItem({ type: 'task_cancel', payload: { match: { id: 'b' }, values: { status: 'cancelled' } } }),
    ];
    const out = overlayPendingTasks(server, queue);
    expect(out.map((t) => [t.id, t.status])).toEqual([['n1', 'pending'], ['a', 'done'], ['b', 'cancelled']]);
    expect(out[0].syncedOffline).toBe(true);
    expect(out[1].completedAt).toBe('T');
  });

  it('does not duplicate a create the server already has, and keeps FAILED creates visible', () => {
    const failed = { ...createSyncQueueItem({ type: 'task_create', payload: taskToRow(task('n2')) }), status: 'failed' as const };
    const already = createSyncQueueItem({ type: 'task_create', payload: taskToRow(task('a')) });
    const out = overlayPendingTasks(server, [failed, already]);
    expect(out.map((t) => t.id)).toEqual(['n2', 'a', 'b']);
  });
});
