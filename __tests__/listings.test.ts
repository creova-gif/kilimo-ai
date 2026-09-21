import {
  createListing,
  fetchListing,
  fetchListings,
  formatMoney,
  mapListingRow,
  markListingSold,
  telUrl,
  validateListingInput,
  whatsappUrl,
} from '../lib/listings';

const row = {
  id: 'l1',
  seller_id: 's1',
  crop_name: 'Maize',
  crop_name_sw: 'Mahindi',
  quantity_kg: '500',
  price_per_kg: '480',
  currency: 'TZS',
  location: 'Mbeya',
  quality_grade: 'A',
  status: 'active',
  notes: null,
  contact_phone: '+255712345678',
  created_at: '2026-09-21T00:00:00Z',
};

/** Chainable, thenable fake of the PostgREST builder that records every call. */
function fakeClient(result: { data?: any; error?: { message: string } | null } = { data: [], error: null }) {
  const calls: [string, any[]][] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (res: any) => Promise.resolve(result).then(res);
        return (...args: any[]) => {
          calls.push([prop, args]);
          return builder;
        };
      },
    }
  );
  return { client: { from: jest.fn((t: string) => (calls.push(['from', [t]]), builder)) }, calls };
}

describe('mapListingRow', () => {
  it('maps snake_case + numeric strings', () => {
    expect(mapListingRow(row)).toMatchObject({
      id: 'l1',
      sellerId: 's1',
      cropName: 'Maize',
      cropNameSw: 'Mahindi',
      quantityKg: 500,
      pricePerKg: 480,
      contactPhone: '+255712345678',
      status: 'active',
    });
  });
});

describe('fetchListings', () => {
  it('is empty and not_configured without a client', async () => {
    expect(await fetchListings(null)).toEqual({ ok: false, listings: [], reason: 'not_configured' });
  });

  it('queries ACTIVE listings newest-first by default (empty table = empty marketplace)', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    const r = await fetchListings(client);
    expect(r).toEqual({ ok: true, listings: [] });
    expect(calls).toContainEqual(['eq', ['status', 'active']]);
    expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]]);
  });

  it('applies crop and sanitized search filters', async () => {
    const { client, calls } = fakeClient({ data: [row], error: null });
    const r = await fetchListings(client, { crop: 'Maize', search: 'mb%eya,(x)' });
    expect(r.listings).toHaveLength(1);
    expect(calls).toContainEqual(['eq', ['crop_name', 'Maize']]);
    const or = calls.find(([n]) => n === 'or')!;
    expect(or[1][0]).toContain('%mb eya  x%'); // %, comma and parens cannot alter the pattern
    expect(or[1][0]).not.toMatch(/mb%eya/);
  });

  it("seller view lists that seller's rows of any status", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await fetchListings(client, { sellerId: 's1' });
    expect(calls).toContainEqual(['eq', ['seller_id', 's1']]);
    expect(calls.find(([n, a]) => n === 'eq' && a[0] === 'status')).toBeUndefined();
  });

  it('surfaces a backend error instead of an empty success', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } });
    expect(await fetchListings(client)).toMatchObject({
      ok: false,
      reason: 'error',
      message: 'permission denied',
    });
  });
});

describe('fetchListing', () => {
  it('returns null (not an error) for an unknown id', async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await fetchListing(client, 'nope')).toEqual({ ok: true, listing: null });
  });
});

describe('validateListingInput', () => {
  const ok = { cropName: 'Maize', quantityKg: '100', pricePerKg: '480', location: 'Mbeya' };
  it('accepts a complete listing without a contact phone', () => {
    expect(validateListingInput(ok)).toEqual({});
  });
  it('flags every missing/invalid field', () => {
    expect(
      validateListingInput({ cropName: ' ', quantityKg: '0', pricePerKg: 'abc', location: '' })
    ).toEqual({ cropName: true, quantityKg: true, pricePerKg: true, location: true });
  });
  it('validates an optional contact phone with the same normalizer as sign-in', () => {
    expect(validateListingInput({ ...ok, contactPhone: '0712 345 678' })).toEqual({});
    expect(validateListingInput({ ...ok, contactPhone: '12' })).toEqual({ contactPhone: true });
  });
});

describe('createListing', () => {
  const input = {
    cropName: 'Maize',
    quantityKg: '100',
    pricePerKg: '480',
    location: 'Mbeya',
    contactPhone: '0712345678',
  };

  it('inserts for the signed-in seller with an E.164 phone and NO escrow flags', async () => {
    const { client, calls } = fakeClient({ data: row, error: null });
    const r = await createListing(client, 's1', input);
    expect(r.ok).toBe(true);
    const payload = calls.find(([n]) => n === 'insert')![1][0];
    expect(payload).toMatchObject({
      seller_id: 's1',
      crop_name: 'Maize',
      quantity_kg: 100,
      price_per_kg: 480,
      contact_phone: '+255712345678',
    });
    expect(payload).not.toHaveProperty('escrow_funded');
    expect(payload).not.toHaveProperty('smart_contract');
  });

  it('does not call the backend for invalid input', async () => {
    const { client } = fakeClient();
    expect(await createListing(client, 's1', { ...input, quantityKg: '0' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('reports not_configured with no client', async () => {
    expect(await createListing(null, 's1', input)).toEqual({ ok: false, reason: 'not_configured' });
  });
});

describe('markListingSold', () => {
  it('updates status to sold for that id', async () => {
    const { client, calls } = fakeClient({ error: null });
    expect(await markListingSold(client, 'l1')).toEqual({ ok: true });
    expect(calls).toContainEqual(['update', [{ status: 'sold' }]]);
    expect(calls).toContainEqual(['eq', ['id', 'l1']]);
  });
});

describe('presentation helpers', () => {
  it('formats money with thousands separators', () => {
    expect(formatMoney(1800)).toBe('TZS 1,800');
    expect(formatMoney(6500.4)).toBe('TZS 6,500');
    expect(formatMoney(1234567)).toBe('TZS 1,234,567');
  });
  it('builds contact links', () => {
    expect(telUrl('+255712345678')).toBe('tel:+255712345678');
    expect(whatsappUrl('+255712345678')).toBe('https://wa.me/255712345678');
    expect(whatsappUrl('+255712345678', 'Habari, Mahindi?')).toBe(
      'https://wa.me/255712345678?text=Habari%2C%20Mahindi%3F'
    );
  });
});
