import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFarm as createFarmRow,
  createPlot as createPlotRow,
  deleteFarm as deleteFarmRow,
  deletePlot as deletePlotRow,
  fetchFarmsAndPlots,
  setPlotStatus as setPlotStatusRow,
  updateFarm as updateFarmRow,
  updatePlot as updatePlotRow,
  type Farm,
  type FarmInput,
  type MutationResult,
  type Plot,
  type PlotInput,
  type PlotStatus,
} from '../lib/farms';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type FarmsError = 'not_configured' | 'error' | null;

/**
 * The signed-in farmer's real farms and plots (`farms` / `plots`). Empty means empty — nothing is
 * seeded. Reads keep the last result on screen while offline; writes are online-only for now and
 * report `reason: 'offline'` instead of pretending to save (offline queuing is a later wave).
 * A successful write updates local state from the row the server returned, never optimistically.
 */
export function useFarms() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FarmsError>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchFarmsAndPlots(getSupabase());
    if (mine !== seq.current) return; // a newer request superseded this one
    if (r.ok) {
      setFarms(r.farms);
      setPlots(r.plots);
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

  /** Runs a write only while online; `apply` merges the server's row into local state on success. */
  const write = useCallback(
    async <T>(
      run: (client: any) => Promise<MutationResult<T>>,
      apply: (data: T | undefined) => void
    ): Promise<MutationResult<T>> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await run(getSupabase());
      if (r.ok) apply(r.data);
      return r;
    },
    [isOffline]
  );

  const createFarm = useCallback(
    (input: FarmInput) =>
      write<Farm>(
        (c) => createFarmRow(c, input),
        (d) => d && setFarms((prev) => [...prev, d])
      ),
    [write]
  );

  const updateFarm = useCallback(
    (id: string, input: FarmInput) =>
      write<Farm>(
        (c) => updateFarmRow(c, id, input),
        (d) => d && setFarms((prev) => prev.map((f) => (f.id === id ? d : f)))
      ),
    [write]
  );

  const deleteFarm = useCallback(
    (id: string) =>
      write<void>(
        (c) => deleteFarmRow(c, id),
        () => {
          setFarms((prev) => prev.filter((f) => f.id !== id));
          // The database cascades the delete to the farm's plots.
          setPlots((prev) => prev.filter((p) => p.farmId !== id));
        }
      ),
    [write]
  );

  const createPlot = useCallback(
    (farmId: string, input: PlotInput) =>
      write<Plot>(
        (c) => createPlotRow(c, farmId, input),
        (d) => d && setPlots((prev) => [...prev, d])
      ),
    [write]
  );

  const updatePlot = useCallback(
    (id: string, input: PlotInput) =>
      write<Plot>(
        (c) => updatePlotRow(c, id, input),
        (d) => d && setPlots((prev) => prev.map((p) => (p.id === id ? d : p)))
      ),
    [write]
  );

  const setPlotStatus = useCallback(
    (id: string, status: PlotStatus) =>
      write<Plot>(
        (c) => setPlotStatusRow(c, id, status),
        (d) => d && setPlots((prev) => prev.map((p) => (p.id === id ? d : p)))
      ),
    [write]
  );

  const deletePlot = useCallback(
    (id: string) =>
      write<void>(
        (c) => deletePlotRow(c, id),
        () => setPlots((prev) => prev.filter((p) => p.id !== id))
      ),
    [write]
  );

  return {
    farms,
    plots,
    loading,
    loaded,
    error,
    isOffline,
    refresh: load,
    createFarm,
    updateFarm,
    deleteFarm,
    createPlot,
    updatePlot,
    setPlotStatus,
    deletePlot,
  };
}
