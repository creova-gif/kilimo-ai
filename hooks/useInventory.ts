/**
 * Inventory hooks (KIL-004). Real rows from `inventory_items` / `inventory_movements`; empty means
 * empty — no seed fallback. Stock only ever changes through movements (a database trigger applies
 * each one atomically), so after a movement we re-read the item rather than trusting a local sum.
 * Writes are online-only for now: while offline they resolve to `{ ok: false, reason: 'offline' }`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createItem,
  deleteItem,
  fetchItems,
  fetchMovements,
  inventorySummary,
  recordMovement,
  sortMovements,
  updateItem,
  type Item,
  type ItemInput,
  type Movement,
  type MovementInput,
} from '../lib/inventory';
import { fail, reasonOf, type Fail, type FailReason } from '../lib/recordsCommon';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export function useInventory() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FailReason | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** `silent` reloads (after a write) refresh the data without flipping `loading`. */
  const load = useCallback(
    async (silent = false) => {
      if (isOffline) {
        setLoading(false);
        return;
      }
      const mine = ++seq.current;
      if (!silent) setLoading(true);
      const r = await fetchItems(getSupabase());
      if (!alive.current || mine !== seq.current) return; // unmounted, or a newer request superseded this one
      if (r.ok) {
        setItems(r.items);
        setLoaded(true);
        setError(null);
      } else {
        setError(reasonOf(r));
      }
      setLoading(false);
    },
    [isOffline]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(false), [load]);
  const reload = useCallback(() => load(true), [load]);

  const add = useCallback(
    async (input: ItemInput) => {
      if (isOffline) return fail('offline');
      const r = await createItem(getSupabase(), input);
      if (r.ok && alive.current) {
        setItems((prev) => [...prev, r.item].sort((a, b) => a.name.localeCompare(b.name)));
      }
      return r;
    },
    [isOffline]
  );

  const update = useCallback(
    async (id: string, input: ItemInput) => {
      if (isOffline) return fail('offline');
      const r = await updateItem(getSupabase(), id, input);
      if (r.ok && alive.current) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? r.item : i)).sort((a, b) => a.name.localeCompare(b.name))
        );
      }
      return r;
    },
    [isOffline]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | Fail> => {
      if (isOffline) return fail('offline');
      const r = await deleteItem(getSupabase(), id);
      if (r.ok && alive.current) setItems((prev) => prev.filter((i) => i.id !== id));
      return r;
    },
    [isOffline]
  );

  const summary = useMemo(() => inventorySummary(items), [items]);

  return { items, summary, loading, loaded, error, isOffline, refresh, reload, add, update, remove };
}

/**
 * The movement history of one item, plus `record()`. `onChanged` fires after a successful movement
 * so the list screen re-reads the item's server-computed quantity.
 */
export function useItemMovements(item: Pick<Item, 'id' | 'quantity'> | null, onChanged?: () => void) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const itemId = item?.id ?? null;
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FailReason | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const quantityRef = useRef(item?.quantity ?? 0);
  quantityRef.current = item?.quantity ?? 0;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!itemId) return;
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchMovements(getSupabase(), itemId);
    if (!alive.current || mine !== seq.current) return;
    if (r.ok) {
      setMovements(sortMovements(r.movements));
      setError(null);
      setLoaded(true);
    } else {
      setError(reasonOf(r));
    }
    setLoading(false);
  }, [itemId, isOffline]);

  // A different item (or none) means a clean slate — never show one item's history under another.
  useEffect(() => {
    seq.current++;
    setMovements([]);
    setLoaded(false);
    setError(null);
    setLoading(false);
  }, [itemId]);

  // Declared after the reset above so that, when the item changes, it clears first and then loads.
  useEffect(() => {
    load();
  }, [load]);

  const record = useCallback(
    async (input: MovementInput) => {
      if (!itemId) return fail('invalid');
      if (isOffline) return fail('offline');
      const r = await recordMovement(getSupabase(), { id: itemId, quantity: quantityRef.current }, input);
      if (r.ok && alive.current) {
        setMovements((prev) => sortMovements([r.movement, ...prev]));
        onChangedRef.current?.();
      }
      return r;
    },
    [itemId, isOffline]
  );

  return { movements, loading, loaded, error, isOffline, reload: load, record };
}
