/**
 * Pure helpers that turn an outbox item (lib/syncQueue.ts) into translated, human wording for the
 * offline-queue screen. Kept separate from the screen so the wording rules are unit-tested.
 */
import type { SyncQueueItem } from '../../lib/syncQueue';
import type { TranslationKey } from '../../lib/i18n';

const TABLE_KEYS: Record<string, TranslationKey> = {
  tasks: 'profile.queue.table.tasks',
  farms: 'profile.queue.table.farms',
  plots: 'profile.queue.table.plots',
  finance_entries: 'profile.queue.table.finance',
  payment_records: 'profile.queue.table.payments',
  livestock: 'profile.queue.table.livestock',
  livestock_events: 'profile.queue.table.livestock',
  inventory_items: 'profile.queue.table.inventory',
  inventory_movements: 'profile.queue.table.inventory',
  market_listings: 'profile.queue.table.market',
  peer_posts: 'profile.queue.table.community',
  consultation_requests: 'profile.queue.table.consultations',
  iot_devices: 'profile.queue.table.devices',
  iot_readings: 'profile.queue.table.devices',
  insurance_policies: 'profile.queue.table.insurance',
  insurance_claims: 'profile.queue.table.insurance',
};

/** What kind of record the change touches ("Task", "Farm", … or a generic "Record"). */
export function queueTableKey(item: Pick<SyncQueueItem, 'table' | 'type'>): TranslationKey {
  const table = item.table ?? tableFromType(item.type);
  return (table && TABLE_KEYS[table]) || 'profile.queue.table.other';
}

function tableFromType(type: string): string | undefined {
  if (type.startsWith('task_')) return 'tasks';
  if (type.startsWith('market_listing')) return 'market_listings';
  return undefined;
}

/** New / edit / delete. */
export function queueOpKey(item: Pick<SyncQueueItem, 'op' | 'type'>): TranslationKey {
  const op =
    item.op ?? (/_(update|complete|cancel)$/.test(item.type) ? 'update' : /_delete$/.test(item.type) ? 'delete' : 'insert');
  if (op === 'update') return 'profile.queue.op.update';
  if (op === 'delete') return 'profile.queue.op.delete';
  return 'profile.queue.op.insert';
}

/**
 * Why an item is stuck, in words a farmer can act on. `lastError` holds the machine code written by
 * the drainer (see drainOnce/classifyError). null = no failure recorded yet.
 */
export function queueReasonKey(lastError: string | undefined | null): TranslationKey | null {
  if (!lastError) return null;
  const code = lastError.split(':')[0].trim();
  if (code.startsWith('unsupported_')) return 'profile.queue.reason.unsupported';
  if (code === 'invalid_payload') return 'profile.queue.reason.invalid';
  if (code === 'no_rows') return 'profile.queue.reason.missing';
  if (code === '42501' || code === 'http_401' || code === 'http_403' || /^PGRST3/.test(code))
    return 'profile.queue.reason.permission';
  if (/^23/.test(code)) return 'profile.queue.reason.conflict';
  if (/^(22|42)/.test(code) || /^PGRST[12]/.test(code) || /^http_4/.test(code))
    return 'profile.queue.reason.invalid';
  return 'profile.queue.reason.network';
}
