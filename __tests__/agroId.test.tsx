jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('../lib/pdf/pnl', () => ({ exportPnlPdf: jest.fn(async () => undefined) }));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AgroIdScreen from '../app/agro-id';
import { ledgerFromFinance } from '../lib/credit/ledger';
import { useKilimoStore } from '../store/useKilimoStore';

/** Every query on a table resolves to the fixture; auth has a signed-in user. */
function backend(tables: Record<string, { data: any; error: any }>) {
  const from = jest.fn((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const b: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') return (res: any) => Promise.resolve(result).then(res);
          return () => b;
        },
      }
    );
    return b;
  });
  return {
    from,
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
  };
}

const agroId = {
  id: 'KIL-TZ-0001',
  name: 'Amina Mushi',
  role: 'farmer',
  location: 'Arusha',
  tier: 'Free',
  joinDate: '2026-01-15T00:00:00Z',
  mpesaLinked: false,
  biometricEnabled: false,
  verificationStatus: 'unverified',
};

const entryRow = (id: string, kind: 'income' | 'expense', amount: number, date: string) => ({
  id,
  kind,
  category: kind === 'income' ? 'sales' : 'seed',
  amount_tzs: String(amount),
  description: kind === 'income' ? 'Maize sale' : 'Seed purchase',
  entry_date: date,
  plot_id: null,
  created_at: `${date}T08:00:00Z`,
});

describe('ledgerFromFinance', () => {
  it('signs amounts by kind', () => {
    const l = ledgerFromFinance([
      {
        id: 'a',
        kind: 'income',
        category: 'sales',
        amountTzs: 100,
        description: '',
        entryDate: '2026-09-01',
        plotId: null,
        createdAt: 't',
      },
      {
        id: 'b',
        kind: 'expense',
        category: 'seed',
        amountTzs: 40,
        description: '',
        entryDate: '2026-09-02',
        plotId: null,
        createdAt: 't',
      },
    ] as any);
    expect(l.map((e) => e.amountTZS)).toEqual([100, -40]);
    expect(l[0].date).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('Agro ID screen', () => {
  beforeEach(() => {
    useKilimoStore.setState({ isOffline: false, language: 'en', agroId } as any);
  });

  it('shows no credit estimate and no sample transactions for a new ledger', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ finance_entries: { data: [], error: null } });
    render(<AgroIdScreen />);
    await waitFor(() => expect(screen.getByText(/Record your income and expenses/)).toBeTruthy());
    expect(screen.getByText('Amina Mushi')).toBeTruthy();
    expect(screen.queryByText(/Compost|Superior|KCl|SP-36/)).toBeNull();
  });

  it('computes the estimate from real entries and shows them', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      finance_entries: {
        data: [
          entryRow('e2', 'expense', 40000, '2026-09-10'),
          entryRow('e1', 'income', 250000, '2026-08-01'),
        ],
        error: null,
      },
    });
    render(<AgroIdScreen />);
    await waitFor(() => expect(screen.getByText('Maize sale')).toBeTruthy());
    expect(screen.getByText('Seed purchase')).toBeTruthy();
    expect(screen.getByText(/not a lender’s decision/)).toBeTruthy();
  });

  it('asks to set up an Agro ID when there is none', async () => {
    useKilimoStore.setState({ agroId: null } as any);
    (global as any).__TEST_SUPABASE__ = backend({});
    render(<AgroIdScreen />);
    expect(screen.getByText('No Agro ID yet')).toBeTruthy();
  });
});
