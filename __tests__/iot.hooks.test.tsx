jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useIot } from '../hooks/useIot';
import { useInsurance } from '../hooks/useInsurance';
import { useKilimoStore } from '../store/useKilimoStore';

type Result = { data?: any; error?: { message: string } | null };

/** Backend fake that answers per table and records writes. */
function backend(tables: Record<string, Result>) {
  const writes: { table: string; op: string; args: any[] }[] = [];
  const from = jest.fn((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    let op = 'select';
    const builder: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            // A single-row fixture answers writes (.select().single()); plain list reads get [].
            const listRead = op === 'select' && result.data && !Array.isArray(result.data);
            return (res: any) => Promise.resolve(listRead ? { ...result, data: [] } : result).then(res);
          }
          return (...args: any[]) => {
            if (['insert', 'update', 'delete'].includes(prop)) {
              op = prop;
              writes.push({ table, op: prop, args });
            }
            return builder;
          };
        },
      }
    );
    return builder;
  });
  return { client: { from }, writes, from };
}

const deviceRow = { id: 'd1', name: 'North probe', kind: 'soil_moisture', location: null, status: 'registered', last_seen_at: null, created_at: '2026-09-01T00:00:00Z' };
const readingRow = { id: 'r1', device_id: 'd1', metric: 'soil_moisture', value: '41', unit: '%', recorded_at: '2026-09-20T08:00:00Z', source: 'manual' };
const policyRow = { id: 'p1', provider: 'Insurer', policy_number: null, crop_or_asset: 'Maize', cover_amount_tzs: '1000000', premium_tzs: null, start_date: '2026-06-01', end_date: '2027-05-31', status: 'active', notes: null, created_at: 't' };
const claimRow = { id: 'c1', policy_id: 'p1', incident_date: '2026-08-15', incident_type: 'drought', description: 'Dry', estimated_loss_tzs: '100000', status: 'draft', created_at: 't' };

beforeEach(() => {
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ isOffline: false } as any);
});

describe('useIot', () => {
  it('is empty and reports not_configured when there is no backend (no seed data)', async () => {
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.devices).toEqual([]);
    expect(result.current.readings).toEqual([]);
    expect(result.current.error).toBe('not_configured');
    expect(result.current.loaded).toBe(false);
  });

  it('keeps an EMPTY server response empty and marks it loaded', async () => {
    (global as any).__TEST_SUPABASE__ = backend({}).client;
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.devices).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads real devices and readings', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      iot_devices: { data: [deviceRow], error: null },
      iot_readings: { data: [readingRow], error: null },
    }).client;
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.devices[0]).toMatchObject({ id: 'd1', name: 'North probe' });
    expect(result.current.readings[0]).toMatchObject({ deviceId: 'd1', value: 41 });
  });

  it('exposes a backend error and stays not-loaded (never an empty-looking success)', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ iot_devices: { data: null, error: { message: 'boom' } } }).client;
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.error).toBe('error'));
    expect(result.current.loaded).toBe(false);
  });

  it('does not fetch while offline, and refuses writes with reason "offline"', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const b = backend({});
    (global as any).__TEST_SUPABASE__ = b.client;
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(b.from).not.toHaveBeenCalled();
    let r: any;
    await act(async () => {
      r = await result.current.addDevice({ name: 'Probe', kind: 'other' });
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    await act(async () => {
      r = await result.current.addReading({ deviceId: 'd1', metric: 'soil_moisture', value: '40' });
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    await act(async () => {
      r = await result.current.removeDevice('d1');
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    expect(b.writes).toEqual([]);
  });

  it('adds a device and a reading, then removes the device together with its readings', async () => {
    const b = backend({
      iot_devices: { data: { ...deviceRow, id: 'd2', name: 'New probe' }, error: null },
      iot_readings: { data: { ...readingRow, id: 'r2', device_id: 'd2', value: 55 }, error: null },
    });
    (global as any).__TEST_SUPABASE__ = b.client;
    const { result } = renderHook(() => useIot());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    // the fake answers every select for a table with the same single object, so start from a clean slate:
    await act(async () => {
      await result.current.addDevice({ name: 'New probe', kind: 'soil_moisture' });
    });
    expect(result.current.devices.some((d) => d.id === 'd2')).toBe(true);
    await act(async () => {
      await result.current.addReading({ deviceId: 'd2', metric: 'soil_moisture', value: '55' });
    });
    expect(result.current.readings.some((r) => r.id === 'r2')).toBe(true);
    expect(b.writes.map((w) => `${w.table}:${w.op}`)).toEqual(['iot_devices:insert', 'iot_readings:insert']);
    await act(async () => {
      await result.current.removeDevice('d2');
    });
    expect(result.current.devices.some((d) => d.id === 'd2')).toBe(false);
    expect(result.current.readings.some((r) => r.deviceId === 'd2')).toBe(false);
  });

  it('does not change local state when a write fails', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ iot_devices: { data: null, error: { message: 'denied' } } }).client;
    const { result } = renderHook(() => useIot());
    let r: any;
    await act(async () => {
      r = await result.current.addDevice({ name: 'Probe', kind: 'other' });
    });
    expect(r).toMatchObject({ ok: false, reason: 'error' });
    expect(result.current.devices).toEqual([]);
  });
});

describe('useInsurance', () => {
  it('is empty and reports not_configured when there is no backend', async () => {
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.policies).toEqual([]);
    expect(result.current.claims).toEqual([]);
    expect(result.current.error).toBe('not_configured');
  });

  it('loads real policies and claims', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      insurance_policies: { data: [policyRow], error: null },
      insurance_claims: { data: [claimRow], error: null },
    }).client;
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.policies[0]).toMatchObject({ id: 'p1', coverAmountTzs: 1_000_000 });
    expect(result.current.claims[0]).toMatchObject({ id: 'c1', status: 'draft' });
  });

  it('refuses every write while offline', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const b = backend({});
    (global as any).__TEST_SUPABASE__ = b.client;
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let r: any;
    await act(async () => {
      r = await result.current.setClaimStatus('c1', 'submitted_record');
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    await act(async () => {
      r = await result.current.removePolicy('p1');
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    expect(b.writes).toEqual([]);
  });

  it('marking a claim as sent only flips a status flag locally and in the record — nothing is transmitted', async () => {
    const b = backend({
      insurance_policies: { data: [policyRow], error: null },
      insurance_claims: { data: [claimRow], error: null },
    });
    (global as any).__TEST_SUPABASE__ = b.client;
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setClaimStatus('c1', 'submitted_record');
    });
    expect(result.current.claims[0].status).toBe('submitted_record');
    expect(b.writes).toEqual([{ table: 'insurance_claims', op: 'update', args: [{ status: 'submitted_record' }] }]);
  });

  it('deleting a policy also drops its claims from local state (matches ON DELETE CASCADE)', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      insurance_policies: { data: [policyRow], error: null },
      insurance_claims: { data: [claimRow], error: null },
    }).client;
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.removePolicy('p1');
    });
    expect(result.current.policies).toEqual([]);
    expect(result.current.claims).toEqual([]);
  });

  it('does not change local state when a write fails', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      insurance_policies: { data: [policyRow], error: null },
      insurance_claims: { data: [claimRow], error: null },
    }).client;
    const { result } = renderHook(() => useInsurance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    // swap in a backend whose writes fail
    (global as any).__TEST_SUPABASE__ = backend({ insurance_claims: { error: { message: 'denied' } } }).client;
    let r: any;
    await act(async () => {
      r = await result.current.setClaimStatus('c1', 'closed');
    });
    expect(r).toMatchObject({ ok: false, reason: 'error' });
    expect(result.current.claims[0].status).toBe('draft');
  });
});
