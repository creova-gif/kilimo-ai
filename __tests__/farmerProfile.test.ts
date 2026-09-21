import { saveFarmerProfile, toFarmerProfileRow, type FarmerProfileInput } from '../lib/farmerProfile';

const input: FarmerProfileInput = {
  name: 'Amara Test',
  role: 'farmer',
  region: 'Arusha',
  primaryCrops: ['Mahindi (Maize)'],
  farmSizeAcres: 3.5,
  mainActivity: 'mazao',
  hasLivestock: false,
  hasIrrigation: true,
  language: 'sw',
};

function fakeClient(opts: { userId?: string | null; upsertError?: { message: string } | null } = {}) {
  const upsert = jest.fn().mockResolvedValue({ error: opts.upsertError ?? null });
  const from = jest.fn().mockReturnValue({ upsert });
  const getSession = jest
    .fn()
    .mockResolvedValue({ data: { session: opts.userId ? { user: { id: opts.userId } } : null } });
  return { client: { auth: { getSession }, from }, upsert, from };
}

describe('toFarmerProfileRow', () => {
  it('maps to the snake_case columns of farmer_profiles', () => {
    const row = toFarmerProfileRow('u1', input, new Date('2026-09-20T00:00:00Z'));
    expect(row).toEqual({
      user_id: 'u1',
      name: 'Amara Test',
      role: 'farmer',
      region: 'Arusha',
      primary_crops: ['Mahindi (Maize)'],
      farm_size_acres: 3.5,
      main_activity: 'mazao',
      has_livestock: false,
      has_irrigation: true,
      language: 'sw',
      updated_at: '2026-09-20T00:00:00.000Z',
    });
  });
});

describe('saveFarmerProfile', () => {
  it('upserts into farmer_profiles for the signed-in user', async () => {
    const { client, upsert, from } = fakeClient({ userId: 'user-1' });
    await expect(saveFarmerProfile(client, input)).resolves.toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('farmer_profiles');
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'user-1', region: 'Arusha' });
  });

  it('reports not_configured without a client (no backend)', async () => {
    await expect(saveFarmerProfile(null, input)).resolves.toEqual({ ok: false, reason: 'not_configured' });
  });

  it('reports not_signed_in and does NOT write when there is no session', async () => {
    const { client, upsert } = fakeClient({ userId: null });
    await expect(saveFarmerProfile(client, input)).resolves.toEqual({ ok: false, reason: 'not_signed_in' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('surfaces a backend error truthfully instead of claiming success', async () => {
    const { client } = fakeClient({ userId: 'u', upsertError: { message: 'permission denied' } });
    await expect(saveFarmerProfile(client, input)).resolves.toEqual({
      ok: false,
      reason: 'error',
      message: 'permission denied',
    });
  });

  it('turns a thrown network error into an error result', async () => {
    const client = { auth: { getSession: jest.fn().mockRejectedValue(new Error('Network request failed')) }, from: jest.fn() };
    await expect(saveFarmerProfile(client, input)).resolves.toEqual({
      ok: false,
      reason: 'error',
      message: 'Network request failed',
    });
  });
});
