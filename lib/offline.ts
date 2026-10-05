import NetInfo from '@react-native-community/netinfo';
import { useKilimoStore } from '../store/useKilimoStore';
import { supabase } from './supabase';
import { listingToDbRow } from '../hooks/useMarketIntelligence';

export function initializeOfflineManager() {
  if (__DEV__) console.log('[OfflineManager] Initializing network listener...');

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = !!state.isConnected && !!state.isInternetReachable;
    const store = useKilimoStore.getState();

    // Only trigger status change if different
    if (store.isOnline !== isOnline) {
      if (__DEV__)
        console.log(`[OfflineManager] Network status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      store.setOnlineStatus(isOnline);
      // We also update isOffline for backward compatibility with the existing property
      store.setOffline(!isOnline);

      // If we just came online, attempt to sync the queue
      if (isOnline && store.syncQueue.length > 0) {
        processSyncQueue();
      }
    }
  });

  return unsubscribe;
}

export async function processSyncQueue() {
  const store = useKilimoStore.getState();
  if (store.syncQueue.length === 0 || !store.isOnline) return;

  if (__DEV__)
    console.log(`[OfflineManager] Processing sync queue (${store.syncQueue.length} items)...`);

  for (const item of store.syncQueue) {
    try {
      if (__DEV__) console.log(`[OfflineManager] Syncing item: ${item.type} [${item.id}]`);

      if (item.type === 'market_order') {
        // Real sync: market_order queue items back a farmer's crop listing
        // (createListing() in hooks/useMarketIntelligence.ts queues here when
        // offline).
        if (!supabase) throw new Error('Supabase not configured');
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const row = listingToDbRow(item.payload as any, user.id);
        const { error } = await supabase.from('market_listings').insert(row);
        if (error) throw error;
      } else if (item.type === 'task_complete') {
        // Real sync: hooks/useTasks.ts queues here for BOTH task creation
        // and task completion done while offline, reusing this one type
        // literal — distinguish by payload shape. Previously this branch
        // only simulated a network call and then dequeued the item as if
        // it had synced: a task created or completed offline was silently
        // discarded the moment connectivity returned, with the UI showing
        // a success checkmark the whole time.
        if (!supabase) throw new Error('Supabase not configured');
        const payload = item.payload as any;
        if (payload && typeof payload.taskId === 'string') {
          // Completion: { taskId, completedAt, userId }
          const { error } = await supabase
            .from('tasks')
            .update({ status: 'done', completed_at: payload.completedAt })
            .eq('id', payload.taskId);
          if (error) throw error;
        } else {
          // Creation: full Task object (mirrors useTasks.ts's createTask)
          const { error } = await supabase.from('tasks').insert({
            title: payload.title,
            title_sw: payload.titleSw,
            category: payload.category,
            priority: payload.priority,
            status: payload.status,
            due_date: payload.dueDate,
            xp_reward: payload.xpReward,
            farm_block: payload.farmBlock,
            coop_id: payload.coopId,
            synced_offline: true,
            assigned_role: payload.assignedRole,
          });
          if (error) throw error;
        }
      } else {
        // scan_result / irrigation_log / voice_note: no code path in this
        // app currently enqueues these types (grep confirms zero producers),
        // so this is unreachable today. Left as a simulated no-op rather
        // than guessing at a schema for data nothing yet generates; wire a
        // real backend call here if/when a producer for these types ships.
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Successfully synced! Remove from queue.
      store.dequeueAction(item.id);
      store.removeFromSyncQueue(item.id); // for safety
    } catch (err) {
      console.warn(`[OfflineManager] Failed to sync item ${item.id}`, err);
      // It will remain in the queue to be retried next time
    }
  }

  store.setLastSyncedAt(new Date().toISOString());
  if (__DEV__) console.log('[OfflineManager] Sync queue processing complete.');
}
