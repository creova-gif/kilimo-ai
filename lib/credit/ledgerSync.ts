/**
 * KILIMO AI — Agro-ID ledger server sync (offline-first).
 *
 * The ledger is the backbone of the credit passport, so it must live on the
 * server (not just device AsyncStorage) to be trustworthy and verifiable.
 * These helpers best-effort push/pull to Supabase; callers keep the local
 * Zustand store as the offline cache and call pushLedgerEntry() after a local
 * add. Failures are swallowed and surfaced via the return flag so the UI can
 * show a "pending sync" state rather than blocking the farmer.
 *
 * Requires the `agro_ledger` table + RLS (see
 * supabase/migrations/*_agro_ledger.sql).
 *
 * CRE-179 / Legal ruling (Rex, via Dr Mafie, 2026-10-09): real farmer
 * ledger data must NOT leave the device until CRE-83 clears. Only entries
 * explicitly marked source 'synthetic' may sync. Anything else (including
 * entries with no source) is refused with reason 'legal_hold'. This is
 * hard-off: there is deliberately NO flag or environment override here.
 */

import { supabase } from '../supabase';
import type { LedgerEntry } from '../../store/useFarmDataStore';
import { isSyntheticEntry } from './dataSourceGuard';

export interface SyncResult {
  ok: boolean;
  reason?: string;
}

/** Push a single ledger entry to the server. Best-effort. */
export async function pushLedgerEntry(entry: LedgerEntry): Promise<SyncResult> {
  // CRE-179 hard-off: real data never syncs (no flag, no env override).
  if (!isSyntheticEntry(entry)) return { ok: false, reason: 'legal_hold' };
  if (!supabase) return { ok: false, reason: 'no_backend' };
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) return { ok: false, reason: 'not_authenticated' };

    const { error } = await supabase.from('agro_ledger').insert({
      client_id: entry.id,
      user_id: userId,
      entry_date: entry.date,
      category: entry.category,
      description: entry.description,
      amount_tzs: entry.amountTZS,
      // Never let a synthetic row land with the server default
      // 'self_reported'. Note: the current RLS insert policy only accepts
      // 'self_reported', so synthetic rows are rejected server-side until a
      // migration allows them; that fails closed.
      source: 'synthetic',
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'network_error' };
  }
}

/**
 * Fetch the signed-in user's server-side SYNTHETIC ledger rows (newest
 * first). CRE-179 hard-off: real rows are never pulled back; the query is
 * filtered to source = 'synthetic' server-side and re-checked here.
 */
export async function fetchLedger(): Promise<LedgerEntry[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('agro_ledger')
      .select('client_id, entry_date, category, description, amount_tzs, source')
      .eq('source', 'synthetic')
      .order('entry_date', { ascending: false });
    if (error || !data) return null;
    return data
      .filter((r: any) => r.source === 'synthetic')
      .map((r: any) => ({
        id: r.client_id,
        date: r.entry_date,
        category: r.category,
        description: r.description,
        amountTZS: r.amount_tzs,
        source: 'synthetic' as const,
      }));
  } catch {
    return null;
  }
}
