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
        // offline). Previously this whole loop only simulated a network call
        // and discarded every queued item regardless of type — a listing
        // created offline was never actually saved anywhere once the device
        // came back online. Other item types (scan_result, task_complete,
        // irrigation_log, voice_note) still only simulate below; each needs
        // its own real backend call and is tracked as a separate follow-up.
        if (!supabase) throw new Error('Supabase not configured');
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const row = listingToDbRow(item.payload as any, user.id);
        const { error } = await supabase.from('market_listings').insert(row);
        if (error) throw error;
      } else {
        // Simulate network request to backend
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
