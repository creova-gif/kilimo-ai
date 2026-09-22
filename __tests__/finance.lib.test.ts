import {
  ENTRY_FETCH_LIMIT,
  addDays,
  createEntry,
  csvCell,
  currentMonthKey,
  deleteEntry,
  entriesInMonth,
  entriesToCsv,
  fetchEntries,
  formatTzs,
  getSessionUserId,
  hasErrors,
  isValidDateString,
  lastMonths,
  mapEntryRow,
  monthKey,
  normalizeCategory,
  parseAmount,
  shiftMonth,
  sortEntries,
  sumAmounts,
  todayString,
  totals,
  totalsByCategory,
  totalsByMonth,
  updateEntry,
  validateEntryInput,
  type EntryInput,
  type FinanceEntry,
} from '../lib/finance';

/** A chainable, awaitable stand-in for the Supabase query builder that records every call. */
function makeClient(
  result: { data?: any; error?: { message: string } | null } = { data: [], error: null },
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

const entry = (over: Partial<FinanceEntry> = {}): FinanceEntry => ({
  id: 'e1',
  kind: 'income',
  category: 'crops',
  amountTzs: 1000,
  description: '',
  entryDate: '2026-09-10',
  plotId: null,
  createdAt: '2026-09-10T08:00:00Z',
  ...over,
});

const NOW = new Date(2026, 8, 21, 12, 0, 0); // 21 Sep 2026, local

describe('money helpers', () => {
  it('parseAmount accepts real amounts and rejects everything else', () => {
    expect(parseAmount('84,000')).toBe(84000);
    expect(parseAmount(' 84 000 ')).toBe(84000);
    expect(parseAmount('1250.50')).toBe(1250.5);
    expect(parseAmount('99999999999.99')).toBe(99999999999.99);
    for (const bad of ['', '0', '0.00', '-5', 'abc', '1.234', '1e5', '12,5,5x', '100000000000', null, undefined]) {
      expect(parseAmount(bad as any)).toBeNull();
    }
  });

  it('formatTzs groups thousands and only shows cents when there are cents', () => {
    expect(formatTzs(84000)).toBe('TZS 84,000');
    expect(formatTzs(0)).toBe('TZS 0');
    expect(formatTzs(1234567)).toBe('TZS 1,234,567');
    expect(formatTzs(1250.5)).toBe('TZS 1,250.50');
    expect(formatTzs(-500)).toBe('-TZS 500');
  });

  it('sums through integer cents (no float drift)', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // the trap
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(totals([entry({ amountTzs: 0.1 }), entry({ id: 'b', amountTzs: 0.2 })]).income).toBe(0.3);
  });
});

describe('dates and months', () => {
  it('validates real calendar dates only', () => {
    expect(isValidDateString('2026-09-21')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // leap day
    for (const bad of ['2026-02-30', '2026-13-01', '2025-02-29', '21-09-2026', 'yesterday', '', '2026-9-1']) {
      expect(isValidDateString(bad)).toBe(false);
    }
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
    expect(shiftMonth('2026-09', 0)).toBe('2026-09');
  });

  it('formats local dates and month keys', () => {
    expect(todayString(NOW)).toBe('2026-09-21');
    expect(currentMonthKey(NOW)).toBe('2026-09');
    expect(monthKey('2026-09-21')).toBe('2026-09');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('validateEntryInput', () => {
  const ok: EntryInput = {
    kind: 'expense',
    category: 'inputs',
    amount: '42,500',
    description: 'Urea',
    entryDate: '2026-09-20',
  };

  it('accepts a valid entry', () => {
    expect(hasErrors(validateEntryInput(ok, NOW))).toBe(false);
  });

  it('flags a bad amount, bad date, future date and over-long note', () => {
    expect(validateEntryInput({ ...ok, amount: '0' }, NOW).amount).toBe(true);
    expect(validateEntryInput({ ...ok, entryDate: '2026-02-30' }, NOW).date).toBe(true);
    const future = validateEntryInput({ ...ok, entryDate: '2026-09-22' }, NOW);
    expect(future.dateFuture).toBe(true);
    expect(future.date).toBeUndefined();
    expect(validateEntryInput({ ...ok, entryDate: '2026-09-21' }, NOW).dateFuture).toBeUndefined(); // today is fine
    expect(validateEntryInput({ ...ok, description: 'x'.repeat(201) }, NOW).description).toBe(true);
  });
});

describe('aggregates', () => {
  const list = [
    entry({ id: 'a', kind: 'income', category: 'crops', amountTzs: 84000, entryDate: '2026-09-02' }),
    entry({ id: 'b', kind: 'expense', category: 'inputs', amountTzs: 42500, entryDate: '2026-09-05' }),
    entry({ id: 'c', kind: 'expense', category: 'transport', amountTzs: 18000, entryDate: '2026-09-09' }),
    entry({ id: 'd', kind: 'expense', category: 'inputs', amountTzs: 7500, entryDate: '2026-09-09' }),
    entry({ id: 'e', kind: 'income', category: 'crops', amountTzs: 60000, entryDate: '2026-08-15' }),
  ];

  it('totals income, expense and net', () => {
    expect(totals(list)).toEqual({ income: 144000, expense: 68000, net: 76000 });
    expect(totals([])).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('filters and buckets by month', () => {
    expect(entriesInMonth(list, '2026-09')).toHaveLength(4);
    expect(totalsByMonth(list)).toEqual([
      { month: '2026-08', income: 60000, expense: 0, net: 60000 },
      { month: '2026-09', income: 84000, expense: 68000, net: 16000 },
    ]);
  });

  it('lastMonths fills genuinely empty months with real zeros, oldest first', () => {
    const r = lastMonths(list, '2026-10', 3);
    expect(r.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(r[2]).toEqual({ month: '2026-10', income: 0, expense: 0, net: 0 });
    expect(r[1].net).toBe(16000);
  });

  it('breaks a kind down by category, largest first', () => {
    expect(totalsByCategory(list, 'expense')).toEqual([
      { category: 'inputs', total: 50000, count: 2 },
      { category: 'transport', total: 18000, count: 1 },
    ]);
    expect(totalsByCategory(list, 'income')[0]).toEqual({ category: 'crops', total: 144000, count: 2 });
  });

  it('sorts newest first by entry date, then by when it was logged', () => {
    // c and d tie on both keys, so the (stable) sort keeps their original order.
    expect(sortEntries(list).map((e) => e.id)).toEqual(['c', 'd', 'b', 'a', 'e']);
    const sameDay = sortEntries([
      entry({ id: 'early', entryDate: '2026-09-09', createdAt: '2026-09-09T06:00:00Z' }),
      entry({ id: 'late', entryDate: '2026-09-09', createdAt: '2026-09-09T18:00:00Z' }),
    ]);
    expect(sameDay.map((e) => e.id)).toEqual(['late', 'early']);
  });
});

describe('row mapping', () => {
  it('maps a DB row and falls back for unknown categories and null description', () => {
    const e = mapEntryRow({
      id: 'x',
      kind: 'expense',
      category: 'made_up',
      amount_tzs: '42500.00',
      description: null,
      entry_date: '2026-09-05',
      plot_id: null,
      created_at: '2026-09-05T10:00:00Z',
    });
    expect(e).toMatchObject({ kind: 'expense', category: 'other', amountTzs: 42500, description: '' });
    expect(normalizeCategory('crops')).toBe('crops');
    expect(normalizeCategory(undefined)).toBe('other');
  });
});

describe('CSV export', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1234')).toBe("'+1234");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(42500)).toBe('42500'); // numbers are untouched
  });

  it('writes a header and one row per entry', () => {
    const csv = entriesToCsv([entry({ description: 'Sold maize, 200 kg', amountTzs: 84000 })]);
    expect(csv.split('\n')).toEqual([
      'date,type,category,amount_tzs,description',
      '2026-09-10,income,crops,84000,"Sold maize, 200 kg"',
    ]);
    expect(entriesToCsv([])).toBe('date,type,category,amount_tzs,description');
  });
});

describe('CRUD against the finance_entries table', () => {
  const row = {
    id: 'new1',
    kind: 'income',
    category: 'crops',
    amount_tzs: '84000.00',
    description: 'Sold maize',
    entry_date: '2026-09-20',
    plot_id: null,
    created_at: '2026-09-20T10:00:00Z',
  };
  const input: EntryInput = {
    kind: 'income',
    category: 'crops',
    amount: '84,000',
    description: ' Sold maize ',
    entryDate: '2026-09-20',
  };

  it('every call fails closed when there is no backend', async () => {
    expect(await fetchEntries(null)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await createEntry(null, input)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await updateEntry(undefined, 'x', input)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await deleteEntry(null, 'x')).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('fetchEntries reads the table newest-first with a limit and maps rows', async () => {
    const { client, calls } = makeClient({ data: [row], error: null });
    const r = await fetchEntries(client);
    expect(r.ok).toBe(true);
    if (r.ok === true) expect(r.entries[0]).toMatchObject({ id: 'new1', amountTzs: 84000 });
    expect(calls[0].table).toBe('finance_entries');
    const names = calls[0].chain.map(([n]) => n);
    expect(names).toEqual(['select', 'order', 'order', 'limit']);
    expect(calls[0].chain[3][1]).toEqual([ENTRY_FETCH_LIMIT]);
  });

  it('fetchEntries reports a backend error, and a thrown error, without inventing rows', async () => {
    const failing = makeClient({ data: null, error: { message: 'permission denied' } });
    expect(await fetchEntries(failing.client)).toEqual({ ok: false, reason: 'error', message: 'permission denied' });
    const throwing = { from: () => { throw new Error('network down'); } };
    expect(await fetchEntries(throwing)).toEqual({ ok: false, reason: 'error', message: 'network down' });
  });

  it('createEntry rejects invalid input without touching the network', async () => {
    const { client } = makeClient();
    expect(await createEntry(client, { ...input, amount: 'nope' }, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(await createEntry(client, { ...input, entryDate: '2026-12-01' }, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('createEntry inserts a clean payload (no user_id, numeric amount, trimmed note)', async () => {
    const { client, calls } = makeClient({ data: row, error: null });
    const r = await createEntry(client, input, NOW);
    expect(r.ok).toBe(true);
    const insert = calls[0].chain.find(([n]) => n === 'insert')!;
    expect(insert[1][0]).toEqual({
      kind: 'income',
      category: 'crops',
      amount_tzs: 84000,
      description: 'Sold maize',
      entry_date: '2026-09-20',
    });
    expect(insert[1][0]).not.toHaveProperty('user_id');
  });

  it('createEntry stores an empty note as null and surfaces a backend error', async () => {
    const ok = makeClient({ data: row, error: null });
    await createEntry(ok.client, { ...input, description: '   ' }, NOW);
    expect(ok.calls[0].chain.find(([n]) => n === 'insert')![1][0].description).toBeNull();

    const bad = makeClient({ data: null, error: { message: 'new row violates row-level security policy' } });
    const r = await createEntry(bad.client, input, NOW);
    expect(r).toEqual({ ok: false, reason: 'error', message: 'new row violates row-level security policy' });
  });

  it('updateEntry targets one id; deleteEntry targets one id', async () => {
    const up = makeClient({ data: row, error: null });
    const r = await updateEntry(up.client, 'new1', input, NOW);
    expect(r.ok).toBe(true);
    expect(up.calls[0].chain.find(([n]) => n === 'eq')![1]).toEqual(['id', 'new1']);
    expect(up.calls[0].chain.some(([n]) => n === 'update')).toBe(true);

    const del = makeClient({ data: null, error: null });
    expect(await deleteEntry(del.client, 'new1')).toEqual({ ok: true });
    expect(del.calls[0].chain.map(([n]) => n)).toEqual(['delete', 'eq']);
    expect(del.calls[0].chain[1][1]).toEqual(['id', 'new1']);

    const delFail = makeClient({ data: null, error: { message: 'boom' } });
    expect(await deleteEntry(delFail.client, 'x')).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('getSessionUserId', () => {
  it('returns the id, null when signed out, null when there is no client or the lookup throws', async () => {
    expect(await getSessionUserId(makeClient().client)).toBe('u1');
    expect(await getSessionUserId(makeClient({}, null).client)).toBeNull();
    expect(await getSessionUserId(null)).toBeNull();
    expect(await getSessionUserId({ auth: { getSession: () => Promise.reject(new Error('x')) } })).toBeNull();
  });
});
