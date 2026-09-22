/**
 * Kilimo AI — offline sync engine hook.
 *
 * Mounts the ONE offline engine (lib/offline.ts: network listener + queue drainer) for as long as
 * the calling component lives, and exposes the queue state for UI. It does not drain anything
 * itself and it never writes to `offline_sync_logs` (that is an audit trail, written by the
 * drainer). Calling it from several components is safe: the engine is reference-counted.
 *
 * Usage:
 *   const { isOnline, pendingCount, failedCount, forceSync, retryFailed } = useSyncEngine();
 */

import { useEffect, useMemo } from 'react';
import { useKilimoStore } from '../store/useKilimoStore';
import { drainQueue, retryFailed, startOfflineEngine } from '../lib/offline';
import { summarizeQueue } from '../lib/syncQueue';

/** Queue counts only — no side effects. Use this for read-only UI (badges, banners). */
export function useQueueCounts() {
  const queue = useKilimoStore((s) => s.syncQueue);
  return useMemo(() => summarizeQueue(queue), [queue]);
}

export function useSyncEngine() {
  const isOnline = useKilimoStore((s) => s.isOnline);
  const isSyncing = useKilimoStore((s) => s.isSyncing);
  const lastSyncedAt = useKilimoStore((s) => s.lastSyncedAt);
  const { pending, failed } = useQueueCounts();

  useEffect(() => startOfflineEngine(), []);

  return {
    isOnline,
    isSyncing,
    lastSyncedAt,
    pendingCount: pending,
    failedCount: failed,
    /** Sync now (ignores backoff timers). */
    forceSync: () => drainQueue({ force: true }),
    /** Re-queue every failed item with a fresh attempt budget and sync. */
    retryFailed,
  };
}
