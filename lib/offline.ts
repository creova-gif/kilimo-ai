import NetInfo from '@react-native-community/netinfo';
import { useKilimoStore } from '../store/useKilimoStore';
import { supabase } from './supabase';
import { listingToDbRow } from '../hooks/useMarketIntelligence';
import { diagnoseCropPhoto, aiConfigured } from './ai';
import { sendSms } from './sms';

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
      } else if (item.type === 'scan_result') {
        // Real sync: app/scan.tsx queues here when diagnoseCropPhoto() fails
        // with a network error mid-scan — the photo was already captured and
        // base64-encoded, so re-run the same real vision call now that
        // connectivity is back, instead of discarding it.
        if (!aiConfigured()) throw new Error('AI backend not configured');
        const payload = item.payload as {
          base64: string;
          mimeType: string;
          language: 'sw' | 'en';
        };
        const diagnosis = await diagnoseCropPhoto(payload.base64, { mimeType: payload.mimeType });
        const sw = payload.language === 'sw';
        const disease = diagnosis.disease ?? (sw ? 'Tatizo halijatambulika' : 'Issue not identified');

        // Persisted so the farmer can find the answer later, not just in a
        // transient notification (components/diseaseModal.tsx already uses
        // this same log for its own diagnoses).
        useKilimoStore.getState().addCropHealthLog({
          id: `log_${Date.now()}`,
          source: 'queued_scan',
          crop: diagnosis.crop,
          disease,
          severity: diagnosis.severity,
          confidence: diagnosis.confidence,
          actions: diagnosis.actions,
          date: new Date().toLocaleDateString(),
        });

        store.addNotification({
          title: sw ? `Uchunguzi wa Picha Umekamilika` : `Photo Diagnosis Ready`,
          body: sw
            ? `Picha uliyopiga ukiwa nje ya mtandao imechunguzwa: ${disease}.`
            : `Your offline photo scan has been analyzed: ${disease}.`,
          type: diagnosis.severity === 'critical' ? 'warning' : 'info',
        });

        // Mirrors fireCriticalSideEffects' SMS escalation in scan.tsx — the
        // task-creation/reminder half of that flow needs hook-bound state
        // (useTasks/useNotifications) this module can't call outside a
        // component, so only the SMS channel is replicated here.
        if (diagnosis.severity === 'critical') {
          const agroId = useKilimoStore.getState().agroId;
          if (agroId?.phoneNumber) {
            sendSms({
              to: agroId.phoneNumber,
              event: 'critical_diagnosis',
              body: sw
                ? `KILIMO AI: ${disease} imegunduliwa kwenye picha uliyopiga nje ya mtandao. Angalia app.`
                : `KILIMO AI: ${disease} detected in your offline photo scan. Check the app.`,
              meta: { disease },
            }).catch(() => {
              /* stub may log but never throws */
            });
          }
        }
      } else {
        // irrigation_log / voice_note: no code path in this app currently
        // enqueues these types (grep confirms zero producers), so this is
        // unreachable today. Left as a simulated no-op rather than guessing
        // at a schema for data nothing yet generates; wire a real backend
        // call here if/when a producer for these types ships.
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
