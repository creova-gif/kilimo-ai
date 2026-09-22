jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// A global holder (not a top-level const): jest.mock factories run when the hook module is first
// imported, before any const declared in this file is initialised.
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFinance, usePaymentRecords } from '../hooks/useFinance';
import { useKilimoStore } from '../store/useKilimoStore';

type Result = { data?: any; error?: { message: string } | null };

/**
 * A backend whose tables answer with `results[table]` (or a function of the recorded chain, so a test
 * can answer a select differently from an insert). Records every call.
 */
function makeBackend(
  results: Record<string, Result | ((chain: string[]) => Result)>,
  session: any = { user: { id: 'u1' } }
) {
  const calls: { table: string; chain: [string, any[]][] }[] = [];
  const client = {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session } }) },
    from: jest.fn((table: string) => {
      const call = { table, chain: [] as [string, any[]][] };
      calls.push(call);
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') {
              return (res: any, rej: any) => {
                const r = results[table];
                const value = typeof r === 'function' ? r(call.chain.map(([n]) => n)) : r;
                return Promise.resolve(value ?? { data: [], error: null }).then(res, rej);
              };
            }
            return (...args: any[]) => {
              call.chain.push([prop, args]);
              return builder;
            };
          },
        }
      );
      return builder;
    }),
  };
  (global as any).__TEST_SUPABASE__ = client;
  return { client, calls };
}

const entryRow = (over: Partial<any> = {}) => ({
  id: 'e1',
  kind: 'income',
  category: 'crops',
  amount_tzs: '84000.00',
  description: 'Sold maize',
  entry_date: '2026-09-10',
  plot_id: null,
  created_at: '2026-09-10T08:00:00Z',
  ...over,
});

const payRow = (over: Partial<any> = {}) => ({
  id: 'p1',
  direction: 'received',
  counterparty: 'Mama Neema',
  phone: null,
  amount_tzs: '5000.00',
  network: 'mpesa',
  reference: null,
  status: 'recorded',
  note: null,
  created_at: '2026-09-21T09:00:00Z',
  ...over,
});

beforeEach(() => {
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ isOffline: false } as any);
});

describe('useFinance — no fabricated data', () => {
  it('reports not_configured (and an empty list) when there is no backend', async () => {
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.error).toBe('not_configured'));
    expect(result.current.entries).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  it('reports signed_out — and never queries the table — when there is no session', async () => {
    const { calls } = makeBackend({}, null);
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.error).toBe('signed_out'));
    expect(result.current.entries).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('keeps an EMPTY server response empty (no seed entries)', async () => {
    makeBackend({ finance_entries: { data: [], error: null } });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('maps real rows and orders them newest first', async () => {
    makeBackend({
      finance_entries: {
        data: [
          entryRow({ id: 'old', entry_date: '2026-08-01' }),
          entryRow({ id: 'new', entry_date: '2026-09-20' }),
        ],
        error: null,
      },
    });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries.map((e) => e.id)).toEqual(['new', 'old']);
    expect(result.current.entries[0]).toMatchObject({ kind: 'income', amountTzs: 84000 });
  });

  it('surfaces a backend error instead of an empty ledger', async () => {
    makeBackend({ finance_entries: { data: null, error: { message: 'permission denied' } } });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.error).toBe('error'));
    expect(result.current.loaded).toBe(false);
    expect(result.current.entries).toEqual([]);
  });

  it('refresh() recovers after a failure', async () => {
    let fail = true;
    makeBackend({
      finance_entries: () => (fail ? { data: null, error: { message: 'boom' } } : { data: [entryRow()], error: null }),
    });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.error).toBe('error'));
    fail = false;
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.entries).toHaveLength(1);
  });
});

describe('useFinance — offline', () => {
  it('does not fetch and refuses writes without touching the network', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const { client } = makeBackend({ finance_entries: { data: [entryRow()], error: null } });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loaded).toBe(false);
    expect(result.current.isOffline).toBe(true);

    let added: any;
    await act(async () => {
      added = await result.current.add({ kind: 'income', category: 'crops', amount: '1000', entryDate: '2026-09-01' });
    });
    expect(added).toEqual({ ok: false, reason: 'offline' });
    expect(await result.current.edit('e1', { kind: 'income', category: 'crops', amount: '1', entryDate: '2026-09-01' })).toEqual({ ok: false, reason: 'offline' });
    expect(await result.current.remove('e1')).toEqual({ ok: false, reason: 'offline' });
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('useFinance — writes', () => {
  const input = { kind: 'expense' as const, category: 'inputs' as const, amount: '42,500', description: 'Urea', entryDate: '2026-09-05' };

  it('add() inserts, then puts the saved row in the list in date order', async () => {
    makeBackend({
      finance_entries: (chain) =>
        chain.includes('insert')
          ? { data: entryRow({ id: 'created', kind: 'expense', category: 'inputs', amount_tzs: '42500.00', entry_date: '2026-09-05' }), error: null }
          : { data: [entryRow({ id: 'a', entry_date: '2026-09-10' })], error: null },
    });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.add(input);
    });
    expect(r.ok).toBe(true);
    expect(result.current.entries.map((e) => e.id)).toEqual(['a', 'created']);
    expect(result.current.busy).toBe(false);
  });

  it('add() surfaces a failure and leaves the list unchanged', async () => {
    makeBackend({
      finance_entries: (chain) =>
        chain.includes('insert') ? { data: null, error: { message: 'rls' } } : { data: [entryRow()], error: null },
    });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.add(input);
    });
    expect(r).toMatchObject({ ok: false, reason: 'error' });
    expect(result.current.entries).toHaveLength(1);
  });

  it('add() with invalid input is rejected as invalid and never reaches the table', async () => {
    const { calls } = makeBackend({ finance_entries: { data: [], error: null } });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const before = calls.length;
    let r: any;
    await act(async () => {
      r = await result.current.add({ ...input, amount: '-3' });
    });
    expect(r).toEqual({ ok: false, reason: 'invalid' });
    expect(calls.length).toBe(before);
  });

  it('edit() replaces the row; remove() drops it', async () => {
    makeBackend({
      finance_entries: (chain) =>
        chain.includes('update')
          ? { data: entryRow({ id: 'e1', amount_tzs: '99000.00' }), error: null }
          : chain.includes('delete')
            ? { data: null, error: null }
            : { data: [entryRow({ id: 'e1' }), entryRow({ id: 'e2', entry_date: '2026-09-01' })], error: null },
    });
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    await act(async () => {
      await result.current.edit('e1', { ...input, kind: 'income', category: 'crops', amount: '99000' });
    });
    expect(result.current.entries.find((e) => e.id === 'e1')!.amountTzs).toBe(99000);

    await act(async () => {
      await result.current.remove('e2');
    });
    expect(result.current.entries.map((e) => e.id)).toEqual(['e1']);
  });
});

describe('usePaymentRecords', () => {
  it('is empty (not seeded) for a signed-in user with no records', async () => {
    makeBackend({ payment_records: { data: [], error: null } });
    const { result } = renderHook(() => usePaymentRecords());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.records).toEqual([]);
  });

  it('reports not_configured / signed_out honestly', async () => {
    const a = renderHook(() => usePaymentRecords());
    await waitFor(() => expect(a.result.current.error).toBe('not_configured'));
    makeBackend({}, null);
    const b = renderHook(() => usePaymentRecords());
    await waitFor(() => expect(b.result.current.error).toBe('signed_out'));
  });

  it('add() saves a record, cancel() marks a request cancelled, remove() drops it', async () => {
    makeBackend({
      payment_records: (chain) =>
        chain.includes('insert')
          ? { data: payRow({ id: 'new', direction: 'request', status: 'pending_provider' }), error: null }
          : chain.includes('update')
            ? { data: payRow({ id: 'new', direction: 'request', status: 'cancelled' }), error: null }
            : chain.includes('delete')
              ? { data: null, error: null }
              : { data: [payRow()], error: null },
    });
    const { result } = renderHook(() => usePaymentRecords());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.add({ direction: 'request', counterparty: 'Mama Neema', amount: '5000', network: 'mpesa' });
    });
    expect(result.current.records[0]).toMatchObject({ id: 'new', status: 'pending_provider' });

    await act(async () => {
      await result.current.cancel('new');
    });
    expect(result.current.records[0].status).toBe('cancelled');

    await act(async () => {
      await result.current.remove('new');
    });
    expect(result.current.records.map((r) => r.id)).toEqual(['p1']);
  });

  it('refuses writes while offline without touching the network', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const { client } = makeBackend({});
    const { result } = renderHook(() => usePaymentRecords());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(await result.current.add({ direction: 'sent', counterparty: 'X', amount: '1', network: 'cash' })).toEqual({ ok: false, reason: 'offline' });
    expect(await result.current.cancel('x')).toEqual({ ok: false, reason: 'offline' });
    expect(await result.current.remove('x')).toEqual({ ok: false, reason: 'offline' });
    expect(client.from).not.toHaveBeenCalled();
  });
});
