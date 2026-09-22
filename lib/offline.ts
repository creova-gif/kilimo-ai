/**
 * Kilimo AI — offline core.
 *
 * ONE outbox, ONE drainer, ONE definition of "online".
 *
 *   enqueueAction()  -> writes an item into the persisted outbox (`useKilimoStore.syncQueue`) and,
 *                       when online, starts a drain. Every offline-capable write goes through here.
 *   drainQueue()     -> the only function that consumes the outbox. Single-flight; ordered;
 *                       idempotent inserts; exponential backoff; failures are kept and surfaced.
 *   getQueueState()  -> snapshot for screens.  retryFailed() / discardQueueItem() -> user actions.
 *   startOfflineEngine() -> the network listener that drives drainQueue (mounted once, by
 *                       hooks/useSyncEngine.ts in the root layout; ref-counted, safe to call twice).
 *
 * `offline_sync_logs` is an audit trail only: one row per item that reached a final outcome
 * (synced / failed). It is written best-effort and NEVER decides whether an item stays queued.
 *
 * Adding a feature (farms, finance, …):
 *   registerSyncType('farm_create', { table: 'farms', ops: ['insert'] });        // once, at import
 *   enqueueAction({ type: 'farm_create', payload: { name: 'Shamba', ... } });    // insert -> row
 *   enqueueAction({ type: 'farm_update', op: 'update',
 *                   payload: { match: { id }, values: { name } } });             // update
 * Inserts should put a client-generated uuid in `payload.id` (see generateId) when the UI needs to
 * refer to the row before it syncs; otherwise the item's idempotency key becomes the row id.
 * An item whose type is not registered is kept as `failed` (`unsupported_type`) — never faked.
 */

import { AppState, type AppStateStatus } from 'react-native';
import { useKilimoStore } from '../store/useKilimoStore';
import { getSupabase } from './supabase';
import { translate } from './i18n';
import {
  drainOnce,
  isOnlineState,
  summarizeQueue,
  type DrainResult,
  type NewSyncAction,
  type SyncClient,
  type SyncQueueItem,
} from './syncQueue';

export {
  registerSyncType,
  generateId,
  isOnlineState,
  summarizeQueue,
  MAX_ATTEMPTS,
  backoffDelayMs,
} from './syncQueue';
export type { NewSyncAction, SyncQueueItem, SyncOp, SyncTypeConfig, DrainResult } from './syncQueue';

/** Wait this long after connectivity returns before draining, so the link can settle. */
export const RECONNECT_DELAY_MS = 1000;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface QueueState {
  items: SyncQueueItem[];
  pending: number;
  failed: number;
  total: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  /** Earliest scheduled retry (epoch ms) among pending items, or null. */
  nextAttemptAt: number | null;
}

/**
 * Add a write to the outbox. Returns the queued item (its `idempotencyKey` is the row id for
 * inserts that did not supply one). Never throws. When online a drain starts immediately, so
 * "online" writes and "offline" writes share one ordered path.
 */
export function enqueueAction(action: NewSyncAction): SyncQueueItem {
  const item = useKilimoStore.getState().enqueueAction(action);
  if (useKilimoStore.getState().isOnline) void drainQueue();
  return item;
}

export function getQueueState(): QueueState {
  const s = useKilimoStore.getState();
  const { pending, failed, total } = summarizeQueue(s.syncQueue);
  const due = s.syncQueue
    .filter((i) => i.status !== 'failed' && i.nextAttemptAt)
    .map((i) => i.nextAttemptAt as number);
  return {
    items: s.syncQueue,
    pending,
    failed,
    total,
    isOnline: s.isOnline,
    isSyncing: s.isSyncing,
    lastSyncedAt: s.lastSyncedAt,
    nextAttemptAt: due.length ? Math.min(...due) : null,
  };
}

/** Put every failed item back in the queue with a fresh attempt budget and try again now. */
export function retryFailed(): number {
  const s = useKilimoStore.getState();
  let n = 0;
  for (const item of s.syncQueue) {
    if (item.status !== 'failed') continue;
    s.patchSyncQueueItem(item.id, {
      status: 'pending',
      retries: 0,
      lastError: undefined,
      failedAt: undefined,
      nextAttemptAt: undefined,
    });
    n++;
  }
  if (n > 0) void drainQueue({ force: true });
  return n;
}

/** The person chose to throw this item away. The only path (besides success) that removes an item. */
export function discardQueueItem(id: string): void {
  useKilimoStore.getState().dequeueAction(id);
}

// ─── The single drainer ───────────────────────────────────────────────────────

let inflight: Promise<DrainResult> | null = null;
let rerun = false;
let rerunForce = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAt = 0;
let retryForce = false;

/** Wake the drainer at `at` (epoch ms). One timer; the earliest request wins, `force` is sticky. */
function scheduleDrain(at: number, force = false) {
  const keepForce = force || (retryTimer !== null && retryForce);
  if (retryTimer && retryAt <= at) {
    retryForce = keepForce;
    return; // an earlier (or equal) wake-up is already scheduled
  }
  if (retryTimer) clearTimeout(retryTimer);
  retryAt = at;
  retryForce = keepForce;
  retryTimer = setTimeout(
    () => {
      const f = retryForce;
      retryTimer = null;
      retryAt = 0;
      retryForce = false;
      void drainQueue({ force: f });
    },
    Math.max(0, at - Date.now())
  );
}

function cancelScheduledDrain() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAt = 0;
  retryForce = false;
}

function auditLog(client: SyncClient, item: SyncQueueItem, outcome: 'synced' | 'failed', detail: string | null) {
  // Audit only: fire-and-forget, never awaited, never allowed to throw into the drain.
  void Promise.resolve()
    .then(() =>
      client.from('offline_sync_logs').insert({
        sync_id: item.idempotencyKey,
        event_type: item.type,
        payload: {
          table: item.table ?? null,
          op: item.op ?? null,
          outcome,
          attempts: item.retries + (outcome === 'synced' ? 1 : 0),
          error: detail,
        },
        created_at: item.createdAt,
      })
    )
    .catch(() => {
      /* audit log is best-effort */
    });
}

async function runPass(force: boolean): Promise<DrainResult> {
  const store = () => useKilimoStore.getState();
  return drainOnce({
    now: () => Date.now(),
    isOnline: () => store().isOnline,
    getClient: () => getSupabase() as SyncClient | null,
    getUserId: async (client) => {
      const { data } = await (client as any).auth.getSession();
      return data?.session?.user?.id ?? null;
    },
    getQueue: () => store().syncQueue,
    patchItem: (id, patch) => store().patchSyncQueueItem(id, patch),
    removeItem: (id) => store().dequeueAction(id),
    audit: (item, outcome, detail) => {
      const client = getSupabase() as SyncClient | null;
      if (client) auditLog(client, item, outcome, detail);
    },
    ignoreBackoff: force,
  });
}

/**
 * Drain the outbox. Safe to call from anywhere, any number of times: only one pass runs at a time;
 * a call made during a pass makes it run once more when it finishes (so nothing enqueued mid-pass
 * is missed). `force` ignores backoff timers (a person pressed "sync now").
 */
export function drainQueue(opts: { force?: boolean } = {}): Promise<DrainResult> {
  if (inflight) {
    rerun = true;
    rerunForce = rerunForce || !!opts.force;
    return inflight;
  }
  // Nothing waiting: do not flip `isSyncing` (and re-render the banner) for a no-op.
  if (!useKilimoStore.getState().syncQueue.some((i) => i.status !== 'failed')) {
    return Promise.resolve({ synced: 0, failed: 0, syncedDelayed: 0, retryAt: null, skipped: 'empty' });
  }

  const job = (async () => {
    const store = useKilimoStore.getState();
    const total: DrainResult = { synced: 0, failed: 0, syncedDelayed: 0, retryAt: null, skipped: null };
    let force = !!opts.force;
    store.setSyncing(true);
    try {
      do {
        rerun = false;
        const res = await runPass(force);
        force = rerunForce;
        rerunForce = false;
        total.synced += res.synced;
        total.failed += res.failed;
        total.syncedDelayed += res.syncedDelayed;
        total.skipped = res.skipped;
        total.retryAt = res.retryAt;
      } while (rerun);
    } catch (err) {
      // drainOnce handles per-item errors; this is a defensive net so isSyncing can never stick.
      if (__DEV__) console.warn('[Offline] drain pass crashed', err);
    } finally {
      inflight = null;
      useKilimoStore.getState().setSyncing(false);
    }

    const s = useKilimoStore.getState();
    if (total.synced > 0) s.setLastSyncedAt(new Date().toISOString());
    // A notification only for writes that had actually been waiting — not for every instant save.
    if (total.syncedDelayed > 0) {
      s.addNotification({
        title: translate(s.language, 'offline.syncedTitle'),
        body: translate(s.language, 'offline.syncedBody', { count: total.syncedDelayed }),
        type: 'success',
      });
    }
    if (total.retryAt) scheduleDrain(total.retryAt);
    return total;
  })();

  inflight = job;
  return job;
}

/** Back-compat name used by app/offline-queue.tsx: a manual "sync now" (ignores backoff). */
export async function processSyncQueue(): Promise<void> {
  await drainQueue({ force: true });
}

// ─── Network listener ─────────────────────────────────────────────────────────

let engineRefs = 0;
let stopEngine: (() => void) | null = null;

function applyNetInfo(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) {
  const online = isOnlineState(state);
  const store = useKilimoStore.getState();
  const reconnected = online && !store.isOnline;
  store.setConnectivity(online);
  // Coming back online is a reason to retry immediately, even items that were in backoff.
  if (online) scheduleDrain(Date.now() + RECONNECT_DELAY_MS, reconnected);
  else cancelScheduledDrain();
}

function getNetInfo() {
  // Lazy so importing this module never touches the native NetInfo module (keeps tests/web light).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-community/netinfo');
  return mod.default ?? mod;
}

/**
 * Start listening for connectivity and app-foreground events and keep the outbox drained.
 * Reference-counted: every caller gets its own stop function; the listener lives until the last
 * one stops. Mounted once by hooks/useSyncEngine.ts.
 */
export function startOfflineEngine(): () => void {
  engineRefs++;
  if (engineRefs === 1) {
    const NetInfo = getNetInfo();
    const unsubNet = NetInfo.addEventListener(applyNetInfo);
    Promise.resolve(NetInfo.fetch())
      .then(applyNetInfo)
      .catch(() => {});

    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      // Timers do not fire while the app is suspended: catch up on foreground.
      if (next === 'active') void drainQueue();
    });

    // Anything already persisted (a previous session's outbox) starts draining now.
    void drainQueue();

    stopEngine = () => {
      try {
        unsubNet();
      } catch {
        /* ignore */
      }
      appSub?.remove?.();
      cancelScheduledDrain();
    };
  }

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    engineRefs = Math.max(0, engineRefs - 1);
    if (engineRefs === 0) {
      stopEngine?.();
      stopEngine = null;
    }
  };
}

/** @deprecated Use startOfflineEngine (mounted by useSyncEngine). Kept as an alias. */
export const initializeOfflineManager = startOfflineEngine;

/** Test helper: reset module-level timers/flags. */
export function __resetOfflineForTests() {
  cancelScheduledDrain();
  inflight = null;
  rerun = false;
  rerunForce = false;
  engineRefs = 0;
  stopEngine = null;
}
