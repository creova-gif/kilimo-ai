import {
  cancelPayment,
  createPayment,
  deletePayment,
  fetchPayments,
  mapPaymentRow,
  normalizeNetwork,
  statusForDirection,
  validatePaymentInput,
  type PaymentInput,
} from '../lib/paymentRecords';

/** Chainable, awaitable query-builder stand-in that records calls. */
function makeClient(result: { data?: any; error?: { message: string } | null } = { data: [], error: null }) {
  const calls: { table: string; chain: [string, any[]][] }[] = [];
  const client = {
    from: jest.fn((table: string) => {
      const call = { table, chain: [] as [string, any[]][] };
      calls.push(call);
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
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
  return { client, calls };
}

const row = (over: Partial<any> = {}) => ({
  id: 'p1',
  direction: 'received',
  counterparty: 'Mama Neema',
  phone: '+255712345678',
  amount_tzs: '84000.00',
  network: 'mpesa',
  reference: 'QWE123',
  status: 'recorded',
  note: null,
  created_at: '2026-09-21T09:00:00Z',
  ...over,
});

const base: PaymentInput = {
  direction: 'received',
  counterparty: 'Mama Neema',
  phone: '0712 345 678',
  amount: '84,000',
  network: 'mpesa',
  reference: 'QWE123',
  note: 'Maize, 200 kg',
};

describe('payment status can never claim money moved', () => {
  it('a request is pending a provider; sent/received are only user records', () => {
    expect(statusForDirection('request')).toBe('pending_provider');
    expect(statusForDirection('sent')).toBe('recorded');
    expect(statusForDirection('received')).toBe('recorded');
  });

  it('no status value means "completed" or "succeeded"', () => {
    // The whole vocabulary a row can hold, as mapped from the DB, is these three.
    const mapped = ['recorded', 'pending_provider', 'cancelled', 'completed', 'success', 'done', undefined].map(
      (status) => mapPaymentRow(row({ status })).status
    );
    expect(new Set(mapped)).toEqual(new Set(['recorded', 'pending_provider', 'cancelled']));
  });
});

describe('validatePaymentInput', () => {
  it('accepts a complete record and one with only the required fields', () => {
    expect(validatePaymentInput(base)).toEqual({});
    expect(
      validatePaymentInput({ direction: 'sent', counterparty: 'Yara', amount: '42500', network: 'cash' })
    ).toEqual({});
  });

  it('requires a name and a positive amount', () => {
    expect(validatePaymentInput({ ...base, counterparty: '   ' }).counterparty).toBe(true);
    expect(validatePaymentInput({ ...base, counterparty: 'x'.repeat(81) }).counterparty).toBe(true);
    expect(validatePaymentInput({ ...base, amount: '0' }).amount).toBe(true);
    expect(validatePaymentInput({ ...base, amount: 'lots' }).amount).toBe(true);
  });

  it('validates a phone number with lib/phone.ts, but only when one is given', () => {
    expect(validatePaymentInput({ ...base, phone: '' }).phone).toBeUndefined();
    expect(validatePaymentInput({ ...base, phone: undefined }).phone).toBeUndefined();
    expect(validatePaymentInput({ ...base, phone: '0712345678' }).phone).toBeUndefined();
    expect(validatePaymentInput({ ...base, phone: '712 345 678' }).phone).toBeUndefined();
    expect(validatePaymentInput({ ...base, phone: '12345' }).phone).toBe(true);
    expect(validatePaymentInput({ ...base, phone: 'not a number' }).phone).toBe(true);
  });

  it('bounds the free-text fields', () => {
    expect(validatePaymentInput({ ...base, reference: 'r'.repeat(61) }).reference).toBe(true);
    expect(validatePaymentInput({ ...base, note: 'n'.repeat(301) }).note).toBe(true);
  });
});

describe('row mapping', () => {
  it('maps a row and normalises unknown values', () => {
    const p = mapPaymentRow(row({ network: 'venmo', direction: 'weird' }));
    expect(p).toMatchObject({
      id: 'p1',
      counterparty: 'Mama Neema',
      phone: '+255712345678',
      amountTzs: 84000,
      network: 'other',
      direction: 'request', // an unknown direction never becomes "received"/"sent"
      note: '',
    });
    expect(normalizeNetwork('halopesa')).toBe('halopesa');
    expect(normalizeNetwork(null)).toBe('other');
  });
});

describe('CRUD against payment_records', () => {
  it('fails closed with no backend', async () => {
    expect(await fetchPayments(null)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await createPayment(null, base)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await cancelPayment(undefined, 'x')).toEqual({ ok: false, reason: 'not_configured' });
    expect(await deletePayment(null, 'x')).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('fetchPayments reads newest-first and maps rows; a backend error is an error, not an empty list', async () => {
    const ok = makeClient({ data: [row()], error: null });
    const r = await fetchPayments(ok.client);
    expect(r.ok).toBe(true);
    if (r.ok === true) expect(r.records).toHaveLength(1);
    expect(ok.calls[0].table).toBe('payment_records');

    const bad = makeClient({ data: null, error: { message: 'boom' } });
    expect(await fetchPayments(bad.client)).toEqual({ ok: false, reason: 'error', message: 'boom' });
  });

  it('createPayment refuses invalid input without touching the network', async () => {
    const { client } = makeClient();
    expect(await createPayment(client, { ...base, phone: '123' })).toEqual({ ok: false, reason: 'invalid' });
    expect(await createPayment(client, { ...base, counterparty: '' })).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('a saved "received" or "sent" record is stored as recorded, with the phone in E.164', async () => {
    const { client, calls } = makeClient({ data: row(), error: null });
    const r = await createPayment(client, base);
    expect(r.ok).toBe(true);
    const payload = calls[0].chain.find(([n]) => n === 'insert')![1][0];
    expect(payload).toEqual({
      direction: 'received',
      counterparty: 'Mama Neema',
      phone: '+255712345678',
      amount_tzs: 84000,
      network: 'mpesa',
      reference: 'QWE123',
      status: 'recorded',
      note: 'Maize, 200 kg',
    });
    expect(payload).not.toHaveProperty('user_id');
  });

  it('a request is stored as pending_provider — never as recorded', async () => {
    const { client, calls } = makeClient({ data: row({ direction: 'request', status: 'pending_provider' }), error: null });
    await createPayment(client, { ...base, direction: 'request' });
    expect(calls[0].chain.find(([n]) => n === 'insert')![1][0].status).toBe('pending_provider');
  });

  it('ignores a status smuggled in by the caller: it is always derived from the direction', async () => {
    const { client, calls } = makeClient({ data: row(), error: null });
    await createPayment(client, { ...base, direction: 'request', status: 'recorded' } as any);
    expect(calls[0].chain.find(([n]) => n === 'insert')![1][0].status).toBe('pending_provider');
    await createPayment(client, { ...base, direction: 'sent', status: 'completed' } as any);
    expect(calls[1].chain.find(([n]) => n === 'insert')![1][0].status).toBe('recorded');
  });

  it('empty optional fields are stored as null', async () => {
    const { client, calls } = makeClient({ data: row(), error: null });
    await createPayment(client, { direction: 'sent', counterparty: 'Yara', amount: '42500', network: 'cash', phone: '  ', reference: '', note: '' });
    const payload = calls[0].chain.find(([n]) => n === 'insert')![1][0];
    expect(payload).toMatchObject({ phone: null, reference: null, note: null });
  });

  it('cancelPayment only ever sets status to cancelled, for one id', async () => {
    const { client, calls } = makeClient({ data: row({ status: 'cancelled' }), error: null });
    const r = await cancelPayment(client, 'p1');
    expect(r.ok).toBe(true);
    expect(calls[0].chain.find(([n]) => n === 'update')![1][0]).toEqual({ status: 'cancelled' });
    expect(calls[0].chain.find(([n]) => n === 'eq')![1]).toEqual(['id', 'p1']);
  });

  it('deletePayment deletes one id and reports failure', async () => {
    const ok = makeClient({ data: null, error: null });
    expect(await deletePayment(ok.client, 'p1')).toEqual({ ok: true });
    expect(ok.calls[0].chain.map(([n]) => n)).toEqual(['delete', 'eq']);
    const bad = makeClient({ data: null, error: { message: 'nope' } });
    expect(await deletePayment(bad.client, 'p1')).toMatchObject({ ok: false, reason: 'error' });
  });
});
