jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { Alert, Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import FinanceScreen from '../app/finance';
import MobileMoneyScreen from '../app/mobile-money';
import UpgradeScreen from '../app/upgrade';
import { useKilimoStore } from '../store/useKilimoStore';
import { currentMonthKey, todayString } from '../lib/finance';

type Result = { data?: any; error?: { message: string } | null };

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

const insertsFor = (calls: { table: string; chain: [string, any[]][] }[], table: string) =>
  calls
    .filter((c) => c.table === table)
    .flatMap((c) => c.chain.filter(([n]) => n === 'insert').map(([, a]) => a[0]));

const today = todayString();

const entryRow = (over: Partial<any> = {}) => ({
  id: 'e1',
  kind: 'income',
  category: 'crops',
  amount_tzs: '84000.00',
  description: 'Sold maize',
  entry_date: today,
  plot_id: null,
  created_at: `${today}T08:00:00Z`,
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
  created_at: `${today}T09:00:00Z`,
  ...over,
});

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ language: 'en', isOffline: false } as any);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/* ───────────────────────────── finance ledger ───────────────────────────── */
describe('Finance ledger screen', () => {
  it('shows an honest EMPTY ledger — none of the old seeded/mock content', async () => {
    makeBackend({ finance_entries: { data: [], error: null } });
    render(<FinanceScreen />);
    expect(await screen.findByText('No records yet')).toBeTruthy();
    for (const fake of [/Tandale/, /Mbeya Millers/, /Uza Mahindi/, /Yara/, /AUTO-SYNC/, /Last sync/, /Vodacom/, /Tigo Pesa/, /Invoice/i, /Ankara/]) {
      expect(screen.queryByText(fake)).toBeNull();
    }
    // no fabricated budget or predictive cash-flow alert either
    expect(screen.queryByText(/CASH FLOW/i)).toBeNull();
    expect(screen.queryByText(/Budget/i)).toBeNull();
    expect(screen.queryAllByText(/^\+|^-TZS/)).toHaveLength(0);
  });

  it('shows the current month with real totals and the real entries', async () => {
    makeBackend({
      finance_entries: {
        data: [
          entryRow({ id: 'a', kind: 'income', amount_tzs: '84000.00', description: 'Sold maize' }),
          entryRow({ id: 'b', kind: 'expense', category: 'inputs', amount_tzs: '42500.00', description: 'Urea' }),
        ],
        error: null,
      },
    });
    render(<FinanceScreen />);
    expect(await screen.findByText('Sold maize')).toBeTruthy();
    expect(screen.getByText('Urea')).toBeTruthy();
    expect(screen.getByText('+TZS 84,000')).toBeTruthy();
    expect(screen.getByText('-TZS 42,500')).toBeTruthy();
    // summary: income 84,000 / expenses 42,500 / balance 41,500
    expect(screen.getByLabelText('Income: TZS 84,000')).toBeTruthy();
    expect(screen.getByLabelText('Expenses: TZS 42,500')).toBeTruthy();
    expect(screen.getByLabelText('Balance: TZS 41,500')).toBeTruthy();
    // both languages of the month header come from the dictionary, not Intl
    const key = currentMonthKey();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    expect(screen.getByTestId('finance-month').props.children).toBe(`${monthNames[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`);
    expect(screen.queryByText(/Expenses were higher/i)).toBeNull();
  });

  it('warns — factually — when a month\'s expenses exceed its income', async () => {
    makeBackend({
      finance_entries: { data: [entryRow({ kind: 'expense', amount_tzs: '10000.00', description: 'Diesel' })], error: null },
    });
    render(<FinanceScreen />);
    expect(await screen.findByText('Your expenses were higher than your income this month.')).toBeTruthy();
  });

  it('renders in Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    makeBackend({ finance_entries: { data: [], error: null } });
    render(<FinanceScreen />);
    expect(await screen.findByText('Bado hakuna rekodi')).toBeTruthy();
    expect(screen.getByText('Daftari la Fedha')).toBeTruthy();
    expect(screen.getByText('Ongeza rekodi')).toBeTruthy();
  });

  it('filters the entry list by kind', async () => {
    makeBackend({
      finance_entries: {
        data: [
          entryRow({ id: 'a', kind: 'income', description: 'Sold maize' }),
          entryRow({ id: 'b', kind: 'expense', category: 'inputs', description: 'Urea' }),
        ],
        error: null,
      },
    });
    render(<FinanceScreen />);
    await screen.findByText('Sold maize');
    fireEvent.press(screen.getByLabelText('Expenses', { exact: true }));
    expect(screen.queryByText('Sold maize')).toBeNull();
    expect(screen.getByText('Urea')).toBeTruthy();
  });

  it('adds a real entry: validates first, then inserts and confirms it was saved', async () => {
    const { calls } = makeBackend({
      finance_entries: (chain) =>
        chain.includes('insert')
          ? { data: entryRow({ id: 'new', description: 'Sold beans', amount_tzs: '62000.00' }), error: null }
          : { data: [], error: null },
    });
    render(<FinanceScreen />);
    await screen.findByText('No records yet');
    fireEvent.press(screen.getByTestId('finance-add'));

    // empty amount -> field error, nothing sent
    fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Enter an amount above zero, for example 84000.')).toBeTruthy();
    expect(insertsFor(calls, 'finance_entries')).toHaveLength(0);

    // bad date -> field error
    fireEvent.changeText(screen.getByTestId('entry-amount'), '62,000');
    fireEvent.changeText(screen.getByTestId('entry-date'), '2026-02-30');
    fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Use a real date like 2026-09-21.')).toBeTruthy();
    expect(insertsFor(calls, 'finance_entries')).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('entry-date'), today);
    fireEvent.changeText(screen.getByTestId('entry-description'), 'Sold beans');
    fireEvent.press(screen.getByTestId('entry-save'));

    await waitFor(() => expect(insertsFor(calls, 'finance_entries')).toHaveLength(1));
    expect(insertsFor(calls, 'finance_entries')[0]).toEqual({
      kind: 'income',
      category: 'crops',
      amount_tzs: 62000,
      description: 'Sold beans',
      entry_date: today,
    });
    expect(await screen.findByText('Entry saved.')).toBeTruthy();
    expect(screen.getByText('Sold beans')).toBeTruthy();
  });

  it('a failed save keeps the form open and says so — it never claims success', async () => {
    makeBackend({
      finance_entries: (chain) =>
        chain.includes('insert') ? { data: null, error: { message: 'rls' } } : { data: [], error: null },
    });
    render(<FinanceScreen />);
    await screen.findByText('No records yet');
    fireEvent.press(screen.getByTestId('finance-add'));
    fireEvent.changeText(screen.getByTestId('entry-amount'), '1000');
    fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Could not save. Check your connection and try again.')).toBeTruthy();
    expect(screen.queryByText('Entry saved.')).toBeNull();
    expect(screen.getByTestId('entry-amount')).toBeTruthy(); // form still open
  });

  it('edits an existing entry and deletes it after confirmation', async () => {
    const { calls } = makeBackend({
      finance_entries: (chain) =>
        chain.includes('update')
          ? { data: entryRow({ description: 'Sold maize (fixed)', amount_tzs: '90000.00' }), error: null }
          : chain.includes('delete')
            ? { data: null, error: null }
            : { data: [entryRow()], error: null },
    });
    render(<FinanceScreen />);
    fireEvent.press(await screen.findByText('Sold maize'));
    expect(screen.getByDisplayValue('84000')).toBeTruthy(); // form pre-filled with the real entry
    fireEvent.changeText(screen.getByTestId('entry-amount'), '90000');
    fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Sold maize (fixed)')).toBeTruthy();
    expect(calls.some((c) => c.chain.some(([n]) => n === 'update'))).toBe(true);

    // delete: asks first, only deletes on confirm
    fireEvent.press(screen.getByText('Sold maize (fixed)'));
    fireEvent.press(screen.getByTestId('entry-delete'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete this entry?',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ style: 'destructive' })])
    );
    expect(calls.some((c) => c.chain.some(([n]) => n === 'delete'))).toBe(false);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      await buttons.find((b: any) => b.style === 'destructive').onPress();
    });
    expect(calls.some((c) => c.chain.some(([n]) => n === 'delete'))).toBe(true);
    expect(await screen.findByText('Entry deleted.')).toBeTruthy();
    expect(screen.queryByText('Sold maize (fixed)')).toBeNull();
  });

  it('navigates months, and an empty month is honestly empty', async () => {
    makeBackend({ finance_entries: { data: [entryRow()], error: null } });
    render(<FinanceScreen />);
    await screen.findByText('Sold maize');
    expect(screen.getByLabelText('Next month').props.accessibilityState.disabled).toBe(true); // cannot go into the future
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(await screen.findByText(/^Nothing recorded in /)).toBeTruthy();
    expect(screen.queryByText('Sold maize')).toBeNull();
    expect(screen.getByLabelText('Income: TZS 0')).toBeTruthy();
  });

  it('shares the month as CSV text via the system share sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    makeBackend({ finance_entries: { data: [entryRow()], error: null } });
    render(<FinanceScreen />);
    await screen.findByText('Sold maize');
    await act(async () => {
      fireEvent.press(screen.getByTestId('finance-share'));
    });
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0] as { message: string };
    expect(arg.message).toBe(`date,type,category,amount_tzs,description\n${today},income,crops,84000,Sold maize`);
  });

  it('shows an error state with retry when the backend fails (not an empty ledger)', async () => {
    makeBackend({ finance_entries: { data: null, error: { message: 'boom' } } });
    render(<FinanceScreen />);
    expect(await screen.findByText('Could not load your ledger')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('No records yet')).toBeNull();
  });

  it('says it is unavailable when there is no backend, and asks a signed-out user to sign in', async () => {
    (global as any).__TEST_SUPABASE__ = null;
    const a = render(<FinanceScreen />);
    expect(await a.findByText('Not available on this device')).toBeTruthy();
    a.unmount();

    makeBackend({}, null);
    render(<FinanceScreen />);
    expect(await screen.findByText('Sign in to keep your records')).toBeTruthy();
  });

  it('offline: banner, no fetch, and the add button is disabled with a reason', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const { client } = makeBackend({ finance_entries: { data: [entryRow()], error: null } });
    render(<FinanceScreen />);
    expect(await screen.findByText(/You are offline/)).toBeTruthy();
    expect(screen.getByText('Connect to see your records')).toBeTruthy();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('links to the payment records screen and states the ledger is not a mobile-money sync', async () => {
    makeBackend({ finance_entries: { data: [], error: null } });
    render(<FinanceScreen />);
    await screen.findByText('No records yet');
    expect(screen.getByText(/not connected to any mobile money account/)).toBeTruthy();
    fireEvent.press(screen.getByText('Payment records'));
    expect(mockPush).toHaveBeenCalledWith('/mobile-money');
  });
});

/* ───────────────────────────── payment records ───────────────────────────── */
describe('Payment records screen (mobile-money)', () => {
  const NOTICE = /KILIMO AI is not connected to M-Pesa, Tigo Pesa, Airtel Money, HaloPesa or any bank/;

  it('always shows the permanent "no money moves here" notice — in every state', async () => {
    // loading
    makeBackend({ payment_records: { data: [], error: null } });
    const loading = render(<MobileMoneyScreen />);
    expect(screen.getByTestId('payments-notice')).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
    // empty
    expect(await screen.findByText('No payment records yet')).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
    loading.unmount();

    // error
    makeBackend({ payment_records: { data: null, error: { message: 'boom' } } });
    const err = render(<MobileMoneyScreen />);
    expect(await screen.findByText('Could not load your records')).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
    err.unmount();

    // with records
    makeBackend({ payment_records: { data: [payRow()], error: null } });
    const withRows = render(<MobileMoneyScreen />);
    expect(await screen.findByText('Mama Neema')).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
    withRows.unmount();

    // offline
    useKilimoStore.setState({ isOffline: true } as any);
    makeBackend({});
    render(<MobileMoneyScreen />);
    expect(await screen.findByText('Connect to see your records')).toBeTruthy();
    expect(screen.getByText(NOTICE)).toBeTruthy();
  });

  it('has none of the old fake content: seeded transactions, wallet balance, send/airtime/bills', async () => {
    makeBackend({ payment_records: { data: [], error: null } });
    render(<MobileMoneyScreen />);
    await screen.findByText('No payment records yet');
    for (const fake of [/Mwanzo Coop/, /Yara Tanzania/, /TARI/, /Vodacom/, /Airtime/i, /Pay Bills/i, /Lipa Bili/, /TSh /, /Balance/i, /imetumwa/, /sent to/i, /Success/]) {
      expect(screen.queryByText(fake)).toBeNull();
    }
  });

  it('lists real records with an honest status, and offers to cancel a pending request', async () => {
    makeBackend({
      payment_records: {
        data: [
          payRow({ id: 'r1', direction: 'received', counterparty: 'Mama Neema', amount_tzs: '84000.00', status: 'recorded', phone: '+255712345678', reference: 'QWE123' }),
          payRow({ id: 'r2', direction: 'request', counterparty: 'Buyer Co', amount_tzs: '120000.00', status: 'pending_provider', network: 'tigopesa' }),
          payRow({ id: 'r3', direction: 'request', counterparty: 'Old Buyer', amount_tzs: '1000.00', status: 'cancelled', network: 'cash' }),
        ],
        error: null,
      },
    });
    render(<MobileMoneyScreen />);
    expect(await screen.findByText('Mama Neema')).toBeTruthy();
    expect(screen.getByText('TZS 84,000')).toBeTruthy();
    expect(screen.getByText(/M-Pesa · \+255712345678 · QWE123/)).toBeTruthy();
    expect(screen.getByText('Recorded by you')).toBeTruthy();
    expect(screen.getByText('Nothing sent · waiting for a provider')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    // only the pending request offers "Cancel request"
    expect(screen.getAllByText('Cancel request')).toHaveLength(1);
    // no status anywhere says completed / success / done
    expect(screen.queryByText(/completed|success|done|paid successfully/i)).toBeNull();
  });

  it('records a payment: validates the phone, saves as `recorded`, and says NO money moved', async () => {
    const { calls } = makeBackend({
      payment_records: (chain) =>
        chain.includes('insert') ? { data: payRow({ id: 'new', counterparty: 'Yara' }), error: null } : { data: [], error: null },
    });
    render(<MobileMoneyScreen />);
    await screen.findByText('No payment records yet');
    fireEvent.press(screen.getByTestId('pay-action-sent'));
    // the sheet itself repeats that nothing is sent
    expect(screen.getByTestId('pay-form-helper').props.children).toMatch(/does not send or receive any money/);

    fireEvent.changeText(screen.getByTestId('pay-counterparty'), 'Yara');
    fireEvent.changeText(screen.getByTestId('pay-phone'), '12345');
    fireEvent.changeText(screen.getByTestId('pay-amount'), '42,500');
    fireEvent.press(screen.getByTestId('pay-save'));
    expect(await screen.findByText('Enter a valid phone number, for example 0712 345 678.')).toBeTruthy();
    expect(insertsFor(calls, 'payment_records')).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('pay-phone'), '0712 345 678');
    fireEvent.press(screen.getByTestId('pay-save'));
    await waitFor(() => expect(insertsFor(calls, 'payment_records')).toHaveLength(1));
    expect(insertsFor(calls, 'payment_records')[0]).toMatchObject({
      direction: 'sent',
      counterparty: 'Yara',
      phone: '+255712345678',
      amount_tzs: 42500,
      status: 'recorded',
    });
    expect(await screen.findByText('Record saved. No money was moved.')).toBeTruthy();
    // the old fake alert must never fire
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('a request is saved as pending_provider and the confirmation says nothing was sent', async () => {
    const { calls } = makeBackend({
      payment_records: (chain) =>
        chain.includes('insert')
          ? { data: payRow({ id: 'new', direction: 'request', status: 'pending_provider', counterparty: 'Buyer Co' }), error: null }
          : { data: [], error: null },
    });
    render(<MobileMoneyScreen />);
    await screen.findByText('No payment records yet');
    fireEvent.press(screen.getByTestId('pay-action-request'));
    expect(screen.getByTestId('pay-form-helper').props.children).toMatch(/Nothing is sent to anyone/);
    fireEvent.changeText(screen.getByTestId('pay-counterparty'), 'Buyer Co');
    fireEvent.changeText(screen.getByTestId('pay-amount'), '120000');
    fireEvent.press(screen.getByTestId('pay-save'));
    await waitFor(() => expect(insertsFor(calls, 'payment_records')).toHaveLength(1));
    expect(insertsFor(calls, 'payment_records')[0].status).toBe('pending_provider');
    expect(await screen.findByText('Note saved. No request was sent to anyone.')).toBeTruthy();
  });

  it('a failed save keeps the form open and never claims success', async () => {
    makeBackend({
      payment_records: (chain) =>
        chain.includes('insert') ? { data: null, error: { message: 'rls' } } : { data: [], error: null },
    });
    render(<MobileMoneyScreen />);
    await screen.findByText('No payment records yet');
    fireEvent.press(screen.getByTestId('pay-action-received'));
    fireEvent.changeText(screen.getByTestId('pay-counterparty'), 'Someone');
    fireEvent.changeText(screen.getByTestId('pay-amount'), '1000');
    fireEvent.press(screen.getByTestId('pay-save'));
    expect(await screen.findByText('Could not save. Check your connection and try again.')).toBeTruthy();
    expect(screen.queryByText(/Record saved|Note saved/)).toBeNull();
  });

  it('cancels a request and deletes a record (after confirmation)', async () => {
    const { calls } = makeBackend({
      payment_records: (chain) =>
        chain.includes('update')
          ? { data: payRow({ id: 'r2', direction: 'request', status: 'cancelled', counterparty: 'Buyer Co' }), error: null }
          : chain.includes('delete')
            ? { data: null, error: null }
            : { data: [payRow({ id: 'r2', direction: 'request', status: 'pending_provider', counterparty: 'Buyer Co' })], error: null },
    });
    render(<MobileMoneyScreen />);
    fireEvent.press(await screen.findByText('Cancel request'));
    expect(await screen.findByText('Request cancelled.')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(calls.some((c) => c.chain.some(([n, a]) => n === 'update' && a[0]?.status === 'cancelled'))).toBe(true);

    fireEvent.press(screen.getByText('Delete'));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      await buttons.find((b: any) => b.style === 'destructive').onPress();
    });
    expect(await screen.findByText('Record deleted.')).toBeTruthy();
    expect(screen.queryByText('Buyer Co')).toBeNull();
  });

  it('offline: actions are disabled and saving is refused', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const { client } = makeBackend({});
    render(<MobileMoneyScreen />);
    expect(await screen.findByText(/You are offline/)).toBeTruthy();
    expect(screen.getByTestId('pay-action-sent').props.accessibilityState.disabled).toBe(true);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('renders the notice in Swahili too', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    makeBackend({ payment_records: { data: [], error: null } });
    render(<MobileMoneyScreen />);
    expect(await screen.findByText('Bado hakuna rekodi za malipo')).toBeTruthy();
    expect(screen.getByText('Pesa haziwezi kuhamishwa kupitia programu hii bado')).toBeTruthy();
    expect(screen.getByText('Rekodi za Malipo')).toBeTruthy();
  });
});

/* ───────────────────────────────── plans ───────────────────────────────── */
describe('Plans screen (upgrade)', () => {
  it('says billing is not enabled and offers NO purchase or upgrade action', () => {
    const updateAgroId = jest.fn();
    useKilimoStore.setState({ updateAgroId } as any);
    render(<UpgradeScreen />);
    expect(screen.getByText('Billing is not enabled yet')).toBeTruthy();
    expect(screen.getByText(/nothing will be charged/)).toBeTruthy();
    // the only button on the screen is the header back button
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Back');
    for (const fake of [/Confirm plan/i, /Coming Soon/i, /Upgrade to/i, /Subscribe/i, /Pay now/i, /via M-Pesa/i, /Payments processed/i]) {
      expect(screen.queryByText(fake)).toBeNull();
      expect(screen.queryByLabelText(fake)).toBeNull();
    }
    expect(updateAgroId).not.toHaveBeenCalled();
  });

  it('labels only Free as available; paid plans are "Planned" with prices marked not final', () => {
    render(<UpgradeScreen />);
    expect(within(screen.getByTestId('plan-free')).getByText('Available now')).toBeTruthy();
    expect(within(screen.getByTestId('plan-free')).getAllByText('Free').length).toBeGreaterThan(0);
    for (const id of ['premium', 'cooperative']) {
      expect(within(screen.getByTestId(`plan-${id}`)).getByText('Planned')).toBeTruthy();
    }
    expect(screen.getByText('TZS 15,000 per month (planned, not final)')).toBeTruthy();
    expect(screen.getByText('TZS 50,000 per month (planned, not final)')).toBeTruthy();
    expect(screen.getAllByText('Available now')).toHaveLength(1);
    // no payment-dependent promise
    expect(screen.queryByText(/payouts/i)).toBeNull();
    expect(screen.getByText(/nothing can be purchased/)).toBeTruthy();
  });

  it('renders in Swahili', () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    render(<UpgradeScreen />);
    expect(screen.getByText('Malipo ya vifurushi bado hayajawashwa')).toBeTruthy();
    expect(screen.getByText('Inapatikana sasa')).toBeTruthy();
    expect(screen.getAllByText('Imepangwa')).toHaveLength(2);
  });
});
