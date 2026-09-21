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
import { useTasks } from '../hooks/useTasks';

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
