import { agroFromProfile, fetchMyProfile, mapFarmRow } from '../lib/hydrateProfile';

function client(opts: { agro?: any; agroErr?: string; farm?: any; farmErr?: string }) {
  return {
    rpc: jest.fn().mockResolvedValue({ data: opts.agro ?? null, error: opts.agroErr ? { message: opts.agroErr } : null }),
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: opts.farm ?? null, error: opts.farmErr ? { message: opts.farmErr } : null }),
      }),
    }),
  };
}

describe('mapFarmRow', () => {
  it('maps snake_case columns and defaults safely', () => {
    expect(
      mapFarmRow({ primary_crops: ['Mahindi (Maize)'], region: 'Arusha', farm_size_acres: '3.5', main_activity: 'mifugo', has_livestock: true, has_irrigation: null, language: 'sw' })
    ).toEqual({ primaryCrops: ['Mahindi (Maize)'], region: 'Arusha', farmSizeAcres: 3.5, mainActivity: 'mifugo', hasLivestock: true, hasIrrigation: false, language: 'sw' });
  });
  it('returns null for no row and coerces an unknown activity', () => {
    expect(mapFarmRow(null)).toBeNull();
    expect(mapFarmRow({ main_activity: 'weird', primary_crops: null })?.mainActivity).toBe('mazao');
  });
});

describe('fetchMyProfile', () => {
  it('returns the server identity and farm for a returning user', async () => {
    const r = await fetchMyProfile(
      client({ agro: { id: 'AGRO-2026-NIDA-X', name: 'Amara', role: 'farmer', location: 'Arusha', verificationStatus: 'pending' }, farm: { region: 'Arusha', primary_crops: ['Mpunga (Rice)'], farm_size_acres: 2 } })
    );
    expect(r.ok).toBe(true);
    expect(r.hasAccount).toBe(true);
    expect(r.agro?.id).toBe('AGRO-2026-NIDA-X');
    expect(r.agro?.verificationStatus).toBe('pending');
    expect(r.farm?.primaryCrops).toEqual(['Mpunga (Rice)']);
  });
  it('reports a brand-new user (no Agro-ID) as hasAccount=false, not an error', async () => {
    const r = await fetchMyProfile(client({}));
    expect(r).toMatchObject({ ok: true, hasAccount: false, agro: null, farm: null });
  });
  it('never trusts an unknown verification status', async () => {
    const r = await fetchMyProfile(client({ agro: { id: 'A', verificationStatus: 'rejected' } }));
    expect(r.agro?.verificationStatus).toBe('unverified');
  });
  it('surfaces backend errors instead of pretending the user is new', async () => {
    const r = await fetchMyProfile(client({ agroErr: 'permission denied' }));
    expect(r).toMatchObject({ ok: false, hasAccount: false, message: 'permission denied' });
  });
  it('reports not_configured with no client', async () => {
    expect(await fetchMyProfile(null)).toMatchObject({ ok: false, message: 'not_configured' });
  });
});

describe('agroFromProfile', () => {
  it('builds the store shape from real server fields only', async () => {
    const mine = await fetchMyProfile(
      client({ agro: { id: 'AGRO-2026-REG-X', name: 'Amara', role: 'farmer', location: 'Arusha', joinDate: '2026-09-21T00:00:00Z', verificationStatus: 'unverified' } })
    );
    expect(agroFromProfile(mine)).toMatchObject({
      id: 'AGRO-2026-REG-X', name: 'Amara', role: 'farmer', location: 'Arusha', joinDate: '2026',
      tier: 'Free', mpesaLinked: false, biometricEnabled: false, verificationStatus: 'unverified',
    });
  });
  it('returns null unless the server has an account (never a half-empty identity)', async () => {
    expect(agroFromProfile(await fetchMyProfile(client({})))).toBeNull();
    expect(agroFromProfile(await fetchMyProfile(client({ agroErr: 'boom' })))).toBeNull();
    expect(agroFromProfile(await fetchMyProfile(null))).toBeNull();
  });
});
