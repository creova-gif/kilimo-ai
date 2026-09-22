jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { AppState } from 'react-native';
import {
  NOTIFICATIONS_TABLE,
  POLL_INTERVAL_MS,
  __resetNotificationsFeedForTests,
  deleteNotification,
  markNotificationRead,
  startNotificationsSync,
  useNotificationsFeed,
} from '../lib/notificationsFeed';
import { mirrorRemoteNotifications, REMOTE_ID_PREFIX } from '../hooks/useNotifications';
import { useKilimoStore } from '../store/useKilimoStore';

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const row = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  user_id: 'u1',
  title: `Title ${id}`,
  body: `Body ${id}`,
  type: 'weather_alert',
  status: 'sent',
  created_at: '2026-09-21T08:00:00Z',
  ...over,
});

/** supabase-js fake: records selects/filters; `rows` is what a select returns. */
function fakeClient(opts: { rows?: any[]; realtime?: 'none' | 'ok' | 'error'; writeError?: boolean } = {}) {
  const state = { rows: opts.rows ?? [row('a')], selects: 0, filters: [] as any[], writes: [] as any[] };
  let channelCb: ((status: string) => void) | null = null;
  let onChange: (() => void) | null = null;
  const channelSpec: any[] = [];
  const from = jest.fn((table: string) => {
    const chain: any = {
      _op: 'select',
      select: () => chain,
      update: (v: any) => ((chain._op = 'update'), (chain._v = v), chain),
      delete: () => ((chain._op = 'delete'), chain),
      eq: (k: string, v: any) => (state.filters.push([table, k, v]), chain),
      order: () => chain,
      limit: () => chain,
      then: (res: any, rej: any) => {
        if (chain._op === 'select') {
          state.selects++;
          return Promise.resolve({ data: state.rows, error: null }).then(res, rej);
        }
        state.writes.push([chain._op, chain._v]);
        return Promise.resolve({ error: opts.writeError ? { message: 'rls' } : null }).then(res, rej);
      },
    };
    return chain;
  });
  const client: any = { from, removeChannel: jest.fn() };
  if (opts.realtime !== 'none') {
    client.channel = jest.fn((name: string) => {
      const ch: any = {
        on: (_evt: string, spec: any, cb: () => void) => {
          channelSpec.push({ name, spec });
          onChange = cb;
          return ch;
        },
        subscribe: (cb: (s: string) => void) => {
          channelCb = cb;
          return ch;
        },
      };
      return ch;
    });
  }
  return {
    client,
    state,
    channelSpec,
    emitStatus: (s: string) => channelCb?.(s),
    emitChange: () => onChange?.(),
  };
}

let appListener: ((s: string) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers();
  __resetNotificationsFeedForTests();
  appListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_t: string, cb: any) => {
    appListener = cb;
    return { remove: jest.fn() };
  }) as any);
});

afterEach(() => {
  __resetNotificationsFeedForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('notifications feed (KIL-007)', () => {
  it('subscribes to the BASE TABLE user_notifications filtered by the user, not the view', async () => {
    const f = fakeClient();
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    expect(NOTIFICATIONS_TABLE).toBe('user_notifications');
    expect(f.channelSpec[0].spec).toEqual({
      event: '*',
      schema: 'public',
      table: 'user_notifications',
      filter: 'user_id=eq.u1',
    });
    expect(f.client.from).toHaveBeenCalledWith('user_notifications');
    expect(f.client.from).not.toHaveBeenCalledWith('notifications');
    expect(f.state.filters).toContainEqual(['user_notifications', 'user_id', 'u1']);
    expect(useNotificationsFeed.getState().rows.map((r) => r.id)).toEqual(['a']);
    expect(useNotificationsFeed.getState().status).toBe('ready');
  });

  it('falls back to polling when the client has no Realtime (local stack)', async () => {
    const f = fakeClient({ realtime: 'none' });
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    expect(f.state.selects).toBe(1);
    expect(useNotificationsFeed.getState().mode).toBe('polling');

    f.state.rows = [row('b'), row('a')];
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(f.state.selects).toBe(2);
    expect(useNotificationsFeed.getState().rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('stops polling once Realtime is SUBSCRIBED and resumes on CHANNEL_ERROR', async () => {
    const f = fakeClient();
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    f.emitStatus('SUBSCRIBED');
    await flush();
    expect(useNotificationsFeed.getState().mode).toBe('realtime');
    const afterSubscribe = f.state.selects;

    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    await flush();
    expect(f.state.selects).toBe(afterSubscribe); // no polling while realtime works

    f.emitChange(); // an INSERT arrived
    await flush();
    expect(f.state.selects).toBe(afterSubscribe + 1);

    f.emitStatus('CHANNEL_ERROR');
    expect(useNotificationsFeed.getState().mode).toBe('polling');
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(f.state.selects).toBe(afterSubscribe + 2);
  });

  it('refreshes when the app returns to the foreground', async () => {
    const f = fakeClient({ realtime: 'none' });
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    const before = f.state.selects;
    appListener?.('active');
    await flush();
    expect(f.state.selects).toBe(before + 1);
  });

  it('stop() ends polling and removes the channel', async () => {
    const f = fakeClient();
    const stop = startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    stop();
    const n = f.state.selects;
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    await flush();
    expect(f.state.selects).toBe(n);
    expect(f.client.removeChannel).toHaveBeenCalled();
  });

  it('reverts an optimistic mark-read / delete when the server rejects it', async () => {
    const f = fakeClient({ realtime: 'none', writeError: true });
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    expect(await markNotificationRead('a')).toBe(false);
    expect(useNotificationsFeed.getState().rows[0].status).toBe('sent');
    expect(await deleteNotification('a')).toBe(false);
    expect(useNotificationsFeed.getState().rows).toHaveLength(1);
  });

  it('keeps an optimistic mark-read when the server accepts it', async () => {
    const f = fakeClient({ realtime: 'none' });
    startNotificationsSync({ client: f.client, userId: 'u1' });
    await flush();
    expect(await markNotificationRead('a')).toBe(true);
    expect(useNotificationsFeed.getState().rows[0].status).toBe('read');
    expect(f.state.writes).toContainEqual(['update', { status: 'read' }]);
  });

  it('shows an error state (not an empty inbox) when the first fetch fails', async () => {
    const client: any = {
      from: () => {
        const c: any = {
          select: () => c,
          eq: () => c,
          order: () => c,
          limit: () => c,
          then: (res: any, rej: any) =>
            Promise.resolve({ data: null, error: { message: 'down' } }).then(res, rej),
        };
        return c;
      },
    };
    startNotificationsSync({ client, userId: 'u1' });
    await flush();
    expect(useNotificationsFeed.getState().status).toBe('error');
  });
});

describe('mirrorRemoteNotifications', () => {
  it('replaces server rows in the store idempotently and keeps local notices', () => {
    useKilimoStore.setState({ notifications: [], unreadCount: 0 });
    useKilimoStore.getState().addNotification({ title: 'Sync complete', body: 'x', type: 'success' });
    const rows = [row('a'), row('b', { status: 'read', created_at: '2026-09-20T08:00:00Z' })];
    mirrorRemoteNotifications(rows as any);
    mirrorRemoteNotifications(rows as any);
    const n = useKilimoStore.getState().notifications;
    expect(n.filter((x) => x.id.startsWith(REMOTE_ID_PREFIX))).toHaveLength(2);
    expect(n.some((x) => x.title === 'Sync complete')).toBe(true);
    expect(useKilimoStore.getState().unreadCount).toBe(2); // local notice + unread row 'a'
  });
});
