/**
 * Livestock hooks (KIL-004). Real rows from `livestock` / `livestock_events`; empty means empty —
 * there is no seed fallback. Writes are online-only for now: while offline they resolve to
 * `{ ok: false, reason: 'offline' }` and the screen shows an honest "needs a connection" message.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addAnimalEvent,
  animalToInput,
  createAnimal,
  deleteAnimal,
  deleteAnimalEvent,
  fetchAnimalEvents,
  fetchAnimals,
  fetchVaccinationEvents,
  herdSummary,
  sortEvents,
  updateAnimal,
  upcomingVaccinations,
  type Animal,
  type AnimalEvent,
  type AnimalInput,
  type AnimalStatus,
  type EventInput,
} from '../lib/livestock';
import { fail, reasonOf, type Fail, type FailReason } from '../lib/recordsCommon';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export function useLivestock() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [vaccinationEvents, setVaccinationEvents] = useState<AnimalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FailReason | null>(null);
  const [remindersFailed, setRemindersFailed] = useState(false);
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
      const client = getSupabase();
      const [a, v] = await Promise.all([fetchAnimals(client), fetchVaccinationEvents(client)]);
      if (!alive.current || mine !== seq.current) return; // unmounted, or a newer request superseded this one
      if (a.ok) {
        setAnimals(a.animals);
        setLoaded(true);
        setError(null);
        if (v.ok) {
          setVaccinationEvents(v.events);
          setRemindersFailed(false);
        } else {
          setRemindersFailed(true);
        }
      } else {
        setError(reasonOf(a));
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
    async (input: AnimalInput) => {
      if (isOffline) return fail('offline');
      const r = await createAnimal(getSupabase(), input);
      if (r.ok && alive.current) setAnimals((prev) => [r.animal, ...prev]);
      return r;
    },
    [isOffline]
  );

  const update = useCallback(
    async (id: string, input: AnimalInput) => {
      if (isOffline) return fail('offline');
      const r = await updateAnimal(getSupabase(), id, input);
      if (r.ok && alive.current) setAnimals((prev) => prev.map((a) => (a.id === id ? r.animal : a)));
      return r;
    },
    [isOffline]
  );

  /** Quick status change (sold / deceased / slaughtered / back to active). */
  const setStatus = useCallback(
    async (animal: Animal, status: AnimalStatus) => update(animal.id, { ...animalToInput(animal), status }),
    [update]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | Fail> => {
      if (isOffline) return fail('offline');
      const r = await deleteAnimal(getSupabase(), id);
      if (r.ok && alive.current) {
        setAnimals((prev) => prev.filter((a) => a.id !== id));
        setVaccinationEvents((prev) => prev.filter((e) => e.animalId !== id));
      }
      return r;
    },
    [isOffline]
  );

  const summary = useMemo(() => herdSummary(animals), [animals]);
  const vaccinations = useMemo(
    () => upcomingVaccinations(animals, vaccinationEvents),
    [animals, vaccinationEvents]
  );

  return {
    animals,
    summary,
    vaccinations,
    remindersFailed,
    loading,
    loaded,
    error,
    isOffline,
    refresh,
    reload,
    add,
    update,
    setStatus,
    remove,
  };
}

/**
 * The event history of one animal, plus add/delete. `onChanged` fires after a successful write so
 * the herd screen can silently re-sync (a weighing updates the animal's weight, a vaccination
 * changes the upcoming-vaccination alerts).
 */
export function useAnimalEvents(animalId: string | null, onChanged?: () => void) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [events, setEvents] = useState<AnimalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<FailReason | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!animalId) return;
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchAnimalEvents(getSupabase(), animalId);
    if (!alive.current || mine !== seq.current) return;
    if (r.ok) {
      setEvents(sortEvents(r.events));
      setError(null);
      setLoaded(true);
    } else {
      setError(reasonOf(r));
    }
    setLoading(false);
  }, [animalId, isOffline]);

  // A different animal (or none) means a clean slate — never show one animal's history under another.
  useEffect(() => {
    seq.current++;
    setEvents([]);
    setLoaded(false);
    setError(null);
    setLoading(false);
  }, [animalId]);

  // Declared after the reset above so that, when the animal changes, it clears first and then loads.
  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (input: EventInput) => {
      if (!animalId) return fail('invalid');
      if (isOffline) return fail('offline');
      const r = await addAnimalEvent(getSupabase(), animalId, input);
      if (r.ok && alive.current) {
        setEvents((prev) => sortEvents([r.event, ...prev]));
        onChangedRef.current?.();
      }
      return r;
    },
    [animalId, isOffline]
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: true } | Fail> => {
      if (isOffline) return fail('offline');
      const r = await deleteAnimalEvent(getSupabase(), id);
      if (r.ok && alive.current) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        onChangedRef.current?.();
      }
      return r;
    },
    [isOffline]
  );

  return { events, loading, loaded, error, isOffline, reload: load, add, remove };
}
