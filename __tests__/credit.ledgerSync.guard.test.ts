/**
 * CRE-179 / Rex's ruling: real ledger data never syncs to the server, with
 * no flag or environment override. Only source 'synthetic' entries may sync.
 */
import type { LedgerEntry } from '../store/useFarmDataStore';

const insert = jest.fn().mockResolvedValue({ error: null });
const order = jest.fn();
const eq = jest.fn(() => ({ order }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ insert, select }));
const getSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u_syn' } } } });

let mockSupabase: any = { from, auth: { getSession } };
jest.mock('../lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import { fetchLedger, pushLedgerEntry } from '../lib/credit/ledgerSync';

const entry = (source?: LedgerEntry['source']): LedgerEntry => ({
  id: 'l_1',
  date: '2026-06-01T00:00:00.000Z',
  category: 'Sale · Maize',
  description: 'x',
  amountTZS: 100_000,
  ...(source ? { source } : {}),
});

const ENV_KEYS = ['EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA', 'CREDIT_SCORE_ALLOW_REAL_DATA'];

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase = { from, auth: { getSession } };
});
afterEach(() => ENV_KEYS.forEach((k) => delete process.env[k]));

describe('pushLedgerEntry under the CRE-179 hard-off', () => {
  it.each(['self_reported', 'verified', undefined] as const)(
    'refuses a %s entry with legal_hold and never touches supabase',
    async (source) => {
      await expect(pushLedgerEntry(entry(source))).resolves.toEqual({
        ok: false,
        reason: 'legal_hold',
      });
      expect(from).not.toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
    }
  );

  it('stays blocked even with the real-data flag set (no flag path)', async () => {
    ENV_KEYS.forEach((k) => (process.env[k] = 'true'));
    await expect(pushLedgerEntry(entry('self_reported'))).resolves.toEqual({
      ok: false,
      reason: 'legal_hold',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('does not block a synthetic entry (sends it labelled synthetic)', async () => {
    await expect(pushLedgerEntry(entry('synthetic'))).resolves.toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('agro_ledger');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source: 'synthetic' }));
  });

  it('a synthetic entry can still fail for ordinary reasons (no_backend)', async () => {
    mockSupabase = null;
    await expect(pushLedgerEntry(entry('synthetic'))).resolves.toEqual({
      ok: false,
      reason: 'no_backend',
    });
  });
});

describe('pushLedgerEntry returns generic failure codes', () => {
  it('maps a server error to insert_failed without echoing its text', async () => {
    insert.mockResolvedValueOnce({
      error: { message: 'duplicate key value (client_id)=(l_1) amount_tzs=100000' },
    });
    await expect(pushLedgerEntry(entry('synthetic'))).resolves.toEqual({
      ok: false,
      reason: 'insert_failed',
    });
  });

  it('maps a thrown error to network_error', async () => {
    getSession.mockRejectedValueOnce(new Error('fetch failed: https://x.supabase.co token=abc'));
    await expect(pushLedgerEntry(entry('synthetic'))).resolves.toEqual({
      ok: false,
      reason: 'network_error',
    });
  });
});

describe('fetchLedger under the CRE-179 hard-off', () => {
  it('only requests and returns synthetic rows', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          client_id: 's1',
          entry_date: 'd',
          category: 'c',
          description: 'd',
          amount_tzs: 1,
          source: 'synthetic',
        },
        {
          client_id: 'r1',
          entry_date: 'd',
          category: 'c',
          description: 'd',
          amount_tzs: 1,
          source: 'self_reported',
        },
      ],
      error: null,
    });
    const rows = await fetchLedger();
    expect(eq).toHaveBeenCalledWith('source', 'synthetic');
    expect(rows).toEqual([
      { id: 's1', date: 'd', category: 'c', description: 'd', amountTZS: 1, source: 'synthetic' },
    ]);
  });
});
