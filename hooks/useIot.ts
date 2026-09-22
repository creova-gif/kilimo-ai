import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDevice,
  createReading,
  deleteDevice,
  deleteReading,
  failed,
  fetchDevices,
  fetchReadings,
  type DeviceInput,
  type IotDevice,
  type IotReading,
  type ReadingInput,
} from '../lib/iot';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type IotError = 'not_configured' | 'error' | null;
export type IotWriteReason = 'offline' | 'not_configured' | 'invalid' | 'error';

/** How far back readings are loaded for the latest-value and trend views. */
export const READING_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

type WriteFail = { ok: false; reason: IotWriteReason; message?: string };

/**
 * The signed-in farmer's real IoT devices and manually-logged readings. Empty means empty — there is
 * no seed data. Writes are online-only: while offline they refuse with `reason: 'offline'` rather than
 * queueing something the app cannot promise to sync.
 */
export function useIot() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [readings, setReadings] = useState<IotReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<IotError>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const client = getSupabase();
    const sinceIso = new Date(Date.now() - READING_WINDOW_DAYS * DAY_MS).toISOString();
    const [d, r] = await Promise.all([fetchDevices(client), fetchReadings(client, { sinceIso })]);
    if (mine !== seq.current) return; // a newer request superseded this one
    if (d.ok && r.ok) {
      setDevices(d.devices);
      setReadings(r.readings);
      setError(null);
      setLoaded(true);
    } else {
      const notConfigured =
        (failed(d) && d.reason === 'not_configured') || (failed(r) && r.reason === 'not_configured');
      setError(notConfigured ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const addDevice = useCallback(
    async (input: DeviceInput): Promise<{ ok: true; device: IotDevice } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await createDevice(getSupabase(), input);
      if (r.ok) setDevices((prev) => [r.device, ...prev]);
      return r;
    },
    [isOffline]
  );

  const removeDevice = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await deleteDevice(getSupabase(), id);
      if (r.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        setReadings((prev) => prev.filter((x) => x.deviceId !== id));
      }
      return r;
    },
    [isOffline]
  );

  const addReading = useCallback(
    async (input: ReadingInput): Promise<{ ok: true; reading: IotReading } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await createReading(getSupabase(), input);
      if (r.ok) setReadings((prev) => [r.reading, ...prev]);
      return r;
    },
    [isOffline]
  );

  const removeReading = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await deleteReading(getSupabase(), id);
      if (r.ok) setReadings((prev) => prev.filter((x) => x.id !== id));
      return r;
    },
    [isOffline]
  );

  return {
    devices,
    readings,
    loading,
    loaded,
    error,
    isOffline,
    refresh: load,
    addDevice,
    removeDevice,
    addReading,
    removeReading,
  };
}
