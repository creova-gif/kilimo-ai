import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEntry,
  deleteEntry,
  fetchEntries,
  getSessionUserId,
  sortEntries,
  updateEntry,
  type EntryInput,
  type FinanceEntry,
  type FinanceFailure,
} from '../lib/finance';
import {
  cancelPayment,
  createPayment,
  deletePayment,
  fetchPayments,
  type PaymentInput,
  type PaymentRecord,
} from '../lib/paymentRecords';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

/** Why the list could not be loaded (null = fine). */
export type FinanceLoadError = 'not_configured' | 'signed_out' | 'error' | null;

type Fetched<T> = { ok: true; rows: T[] } | { ok: false; reason: FinanceFailure };

/**
 * Shared loader for the two owner-scoped lists. Real rows only — an empty table is an empty list, there
 * is no seed fallback. While offline nothing is fetched and the last results stay on screen (the screen
 * shows a banner). A signed-out user gets `signed_out`, not a misleading empty ledger.
 */
function useOwnedRows<T>(fetchRows: (client: any) => Promise<Fetched<T>>) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FinanceLoadError>(null);
  const seq = useRef(0);
  const fetchRef = useRef(fetchRows);
  fetchRef.current = fetchRows;

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const client = getSupabase();
    if (!client) {
      setError('not_configured');
      setLoading(false);
      return;
    }
    const uid = await getSessionUserId(client);
    if (mine !== seq.current) return; // a newer request superseded this one
    if (!uid) {
      setError('signed_out');
      setLoading(false);
      return;
    }
    const r = await fetchRef.current(client);
    if (mine !== seq.current) return;
    if (r.ok === true) {
      setRows(r.rows);
      setError(null);
      setLoaded(true);
    } else {
      setError(r.reason === 'not_configured' ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, setRows, loading, loaded, error, isOffline, refresh: load };
}

/** A write that did not happen. `offline` is returned without touching the network. */
export type WriteFailure = { ok: false; reason: FinanceFailure; message?: string };

/** The signed-in user's income/expense ledger, with online-only add / edit / delete. */
export function useFinance() {
  const base = useOwnedRows<FinanceEntry>(async (c) => {
    const r = await fetchEntries(c);
    return r.ok === true ? { ok: true, rows: sortEntries(r.entries) } : r;
  });
  const { setRows, isOffline } = base;
  const [busy, setBusy] = useState(false);

  const add = useCallback(
    async (input: EntryInput): Promise<{ ok: true; entry: FinanceEntry } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await createEntry(getSupabase(), input);
      setBusy(false);
      if (r.ok === true) setRows((prev) => sortEntries([r.entry, ...prev]));
      return r;
    },
    [isOffline, setRows]
  );

  const edit = useCallback(
    async (id: string, input: EntryInput): Promise<{ ok: true; entry: FinanceEntry } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await updateEntry(getSupabase(), id, input);
      setBusy(false);
      if (r.ok === true) setRows((prev) => sortEntries(prev.map((e) => (e.id === id ? r.entry : e))));
      return r;
    },
    [isOffline, setRows]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await deleteEntry(getSupabase(), id);
      setBusy(false);
      if (r.ok === true) setRows((prev) => prev.filter((e) => e.id !== id));
      return r;
    },
    [isOffline, setRows]
  );

  return {
    entries: base.rows,
    loading: base.loading,
    loaded: base.loaded,
    error: base.error,
    isOffline,
    busy,
    add,
    edit,
    remove,
    refresh: base.refresh,
  };
}

/** The signed-in user's payment records (a note-keeping list — it never moves money). */
export function usePaymentRecords() {
  const base = useOwnedRows<PaymentRecord>(async (c) => {
    const r = await fetchPayments(c);
    return r.ok === true ? { ok: true, rows: r.records } : r;
  });
  const { setRows, isOffline } = base;
  const [busy, setBusy] = useState(false);

  const add = useCallback(
    async (input: PaymentInput): Promise<{ ok: true; record: PaymentRecord } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await createPayment(getSupabase(), input);
      setBusy(false);
      if (r.ok === true) setRows((prev) => [r.record, ...prev]);
      return r;
    },
    [isOffline, setRows]
  );

  const cancel = useCallback(
    async (id: string): Promise<{ ok: true; record: PaymentRecord } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await cancelPayment(getSupabase(), id);
      setBusy(false);
      if (r.ok === true) setRows((prev) => prev.map((p) => (p.id === id ? r.record : p)));
      return r;
    },
    [isOffline, setRows]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFailure> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      setBusy(true);
      const r = await deletePayment(getSupabase(), id);
      setBusy(false);
      if (r.ok === true) setRows((prev) => prev.filter((p) => p.id !== id));
      return r;
    },
    [isOffline, setRows]
  );

  return {
    records: base.rows,
    loading: base.loading,
    loaded: base.loaded,
    error: base.error,
    isOffline,
    busy,
    add,
    cancel,
    remove,
    refresh: base.refresh,
  };
}
