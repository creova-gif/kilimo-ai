/**
 * Kilimo AI — the in-app notifications feed (KIL-007).
 *
 * Source of truth: the base table `public.user_notifications` (column `body`). The `notifications`
 * VIEW that earlier code subscribed to cannot emit Realtime postgres_changes — only tables in the
 * `supabase_realtime` publication can, and `user_notifications` was added to it in
 * supabase/migrations/20260920000500_realtime_publication.sql.
 *
 * Delivery:
 *   1. Fetch the latest rows for the signed-in user (RLS also limits rows to their own).
 *   2. Subscribe to postgres_changes on user_notifications filtered by `user_id=eq.<uid>`.
 *   3. Until the channel reports SUBSCRIBED — and again whenever it errors, times out or closes, or
 *      when the client has no Realtime at all (the local stack excludes it) — poll every
 *      POLL_INTERVAL_MS. Every time the app returns to the foreground the feed refreshes.
 *
 * The feed is shared (one zustand store): hooks/useNotifications.ts runs the sync once for the
 * whole app, app/notifications.tsx renders it and mutates rows through the helpers below.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

export const NOTIFICATIONS_TABLE = 'user_notifications';
export const POLL_INTERVAL_MS = 60_000;
export const FEED_LIMIT = 50;

export interface RemoteNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  status: string | null;
  delivery_method?: string | null;
  created_at: string;
}

/** idle = sync not started yet; unavailable = no backend in this build; signedOut = no session. */
export type FeedStatus = 'idle' | 'unavailable' | 'signedOut' | 'loading' | 'ready' | 'error';
/** How new rows reach the device right now. */
export type FeedMode = 'none' | 'realtime' | 'polling';

export interface FeedState {
  status: FeedStatus;
  mode: FeedMode;
  rows: RemoteNotification[];
  userId: string | null;
  lastFetchedAt: string | null;
  /** True when the most recent fetch failed (rows, if any, are from an earlier fetch). */
  stale: boolean;
}

const INITIAL: FeedState = {
  status: 'idle',
  mode: 'none',
  rows: [],
  userId: null,
  lastFetchedAt: null,
  stale: false,
};

export const useNotificationsFeed = create<FeedState>(() => ({ ...INITIAL }));

const setFeed = (patch: Partial<FeedState>) => useNotificationsFeed.setState(patch);

export function resetNotificationsFeed(status: FeedStatus = 'idle') {
  useNotificationsFeed.setState({ ...INITIAL, status });
}

// Minimal shape of the supabase-js client this module uses (keeps tests' fakes small).
export interface FeedClient {
  from: (table: string) => any;
  channel?: (name: string) => any;
  removeChannel?: (ch: any) => unknown;
}

export async function fetchNotificationRows(
  client: FeedClient,
  userId: string,
  limit = FEED_LIMIT
): Promise<{ ok: true; rows: RemoteNotification[] } | { ok: false; error: string }> {
  try {
    const { data, error } = await client
      .from(NOTIFICATIONS_TABLE)
      .select('id, user_id, title, body, type, status, delivery_method, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: String(error.message ?? error) };
    return { ok: true, rows: (data ?? []) as RemoteNotification[] };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

// ─── The single running sync ──────────────────────────────────────────────────

interface ActiveSync {
  client: FeedClient;
  userId: string;
  refresh: () => Promise<boolean>;
}
let active: ActiveSync | null = null;
let stopActive: (() => void) | null = null;

export interface StartOptions {
  client: FeedClient;
  userId: string;
  pollMs?: number;
  /** Called with the full row list after every successful fetch. */
  onRows?: (rows: RemoteNotification[]) => void;
}

const REALTIME_DOWN = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

/**
 * Start keeping the feed fresh for one user. Returns a stop function. Starting again (e.g. a
 * different user signs in) stops the previous sync first.
 */
export function startNotificationsSync({
  client,
  userId,
  pollMs = POLL_INTERVAL_MS,
  onRows,
}: StartOptions): () => void {
  stopActive?.();

  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let channel: any = null;

  const refresh = async (): Promise<boolean> => {
    if (stopped) return false;
    if (useNotificationsFeed.getState().rows.length === 0) setFeed({ status: 'loading' });
    const res = await fetchNotificationRows(client, userId);
    if (stopped) return false;
    if (res.ok === true) {
      const rows = (res as { rows: RemoteNotification[] }).rows;
      setFeed({ status: 'ready', rows, stale: false, lastFetchedAt: new Date().toISOString() });
      onRows?.(rows);
      return true;
    }
    const hasRows = useNotificationsFeed.getState().rows.length > 0;
    setFeed({ status: hasRows ? 'ready' : 'error', stale: true });
    return false;
  };

  const startPolling = () => {
    if (stopped) return;
    if (!timer) timer = setInterval(() => void refresh(), pollMs);
    setFeed({ mode: 'polling' });
  };
  const stopPolling = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  useNotificationsFeed.setState({ ...INITIAL, status: 'loading', userId });
  void refresh();
  // Poll until Realtime proves it is working.
  startPolling();

  if (typeof client.channel === 'function') {
    try {
      channel = client
        .channel(`${NOTIFICATIONS_TABLE}:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: NOTIFICATIONS_TABLE,
            filter: `user_id=eq.${userId}`,
          },
          () => void refresh()
        )
        .subscribe((status: string) => {
          if (stopped) return;
          if (status === 'SUBSCRIBED') {
            stopPolling();
            setFeed({ mode: 'realtime' });
            void refresh(); // catch anything that arrived before the channel was up
          } else if (REALTIME_DOWN.has(status)) {
            startPolling();
          }
        });
    } catch {
      channel = null;
      startPolling();
    }
  }

  const appSub = AppState.addEventListener?.('change', (next: AppStateStatus) => {
    if (next === 'active') void refresh();
  });

  const stop = () => {
    if (stopped) return;
    stopped = true;
    stopPolling();
    try {
      appSub?.remove?.();
    } catch {
      /* ignore */
    }
    if (channel) {
      try {
        client.removeChannel?.(channel);
      } catch {
        /* ignore */
      }
    }
    if (active?.refresh === refresh) active = null;
    if (stopActive === stop) stopActive = null;
  };

  active = { client, userId, refresh };
  stopActive = stop;
  return stop;
}

/** Refresh now (pull-to-refresh, a push arrived). False when no sync is running or it failed. */
export function refreshNotifications(): Promise<boolean> {
  return active ? active.refresh() : Promise.resolve(false);
}

// ─── Row mutations (optimistic, reverted on failure) ─────────────────────────

function patchRows(fn: (rows: RemoteNotification[]) => RemoteNotification[]) {
  const prev = useNotificationsFeed.getState().rows;
  useNotificationsFeed.setState({ rows: fn(prev) });
  return () => useNotificationsFeed.setState({ rows: prev });
}

async function run(
  revert: () => void,
  op: () => PromiseLike<{ error: any }> | null
): Promise<boolean> {
  try {
    const res = op ? await op() : null;
    if (!res || res.error) {
      revert();
      return false;
    }
    return true;
  } catch {
    revert();
    return false;
  }
}

export function markNotificationRead(id: string): Promise<boolean> {
  const a = active;
  const revert = patchRows((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'read' } : r)));
  return run(revert, () =>
    a ? a.client.from(NOTIFICATIONS_TABLE).update({ status: 'read' }).eq('id', id) : null
  );
}

export function markAllNotificationsRead(): Promise<boolean> {
  const a = active;
  const revert = patchRows((rows) => rows.map((r) => ({ ...r, status: 'read' })));
  return run(revert, () =>
    a
      ? a.client
          .from(NOTIFICATIONS_TABLE)
          .update({ status: 'read' })
          .eq('user_id', a.userId)
      : null
  );
}

export function deleteNotification(id: string): Promise<boolean> {
  const a = active;
  const revert = patchRows((rows) => rows.filter((r) => r.id !== id));
  return run(revert, () =>
    a ? a.client.from(NOTIFICATIONS_TABLE).delete().eq('id', id) : null
  );
}

export const isUnread = (r: RemoteNotification) => r.status !== 'read';

/** Test helper. */
export function __resetNotificationsFeedForTests() {
  stopActive?.();
  stopActive = null;
  active = null;
  resetNotificationsFeed();
}
