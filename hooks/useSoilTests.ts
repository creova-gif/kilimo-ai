import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSoilTest,
  fetchSoilTests,
  mergeSoilTests,
  pendingSoilTests,
  queueSoilTest,
  type SoilTest,
  type SoilTestInput,
} from '../lib/soilTests';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

/**
 * The farmer's own soil test results (`soil_tests`). Empty means none recorded — nothing is
 * seeded. New tests go through the offline outbox and show as pending until they sync.
 */
export function useSoilTests() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const syncQueue = useKilimoStore((s) => s.syncQueue);
  const [server, setServer] = useState<SoilTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<'not_configured' | 'error' | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchSoilTests(getSupabase());
    if (mine !== seq.current) return;
    if (r.ok) {
      setServer(r.tests);
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

  const tests = useMemo(
    () => mergeSoilTests(server, pendingSoilTests(syncQueue ?? [])),
    [server, syncQueue]
  );

  const addTest = useCallback((input: SoilTestInput) => queueSoilTest(input), []);

  const removeTest = useCallback(
    async (id: string) => {
      if (isOffline) return { ok: false, reason: 'offline' as const };
      const r = await deleteSoilTest(getSupabase(), id);
      if (r.ok) setServer((prev) => prev.filter((t) => t.id !== id));
      return r;
    },
    [isOffline]
  );

  return { tests, loading, loaded, error, isOffline, refresh: load, addTest, removeTest };
}
