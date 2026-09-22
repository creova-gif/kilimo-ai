jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  addMonths,
  buildClaimSummary,
  claimTotals,
  createClaim,
  createPolicy,
  deleteClaim,
  deletePolicy,
  failed,
  fetchClaims,
  fetchPolicies,
  incidentWithinPolicy,
  isInForce,
  mapClaimRow,
  mapPolicyRow,
  parseDay,
  parseTzs,
  policyOverview,
  policyStanding,
  todayString,
  updateClaimStatus,
  updatePolicyStatus,
  validateClaimInput,
  validatePolicyInput,
  type InsuranceClaim,
  type InsurancePolicy,
} from '../lib/insurance';
import { translate } from '../lib/i18n';

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
const callsOf = (calls: [string, any[]][], name: string) => calls.filter(([n]) => n === name);

// Local noon so todayString() is the same calendar day in any runner time zone.
const NOW = new Date(2026, 8, 21, 12, 0, 0).getTime(); // 2026-09-21

const policy = (over: Partial<InsurancePolicy> = {}): InsurancePolicy => ({
  id: 'p1',
  provider: 'Test Insurer',
  policyNumber: 'TI-100',
  cropOrAsset: 'Maize, 5 acres',
  coverAmountTzs: 1_000_000,
  premiumTzs: 50_000,
  startDate: '2026-06-01',
  endDate: '2027-05-31',
  status: 'active',
  notes: null,
  createdAt: '2026-06-01T00:00:00Z',
  ...over,
});

const claim = (over: Partial<InsuranceClaim> = {}): InsuranceClaim => ({
  id: 'c1',
  policyId: 'p1',
  incidentDate: '2026-08-15',
  incidentType: 'drought',
  description: 'Dry spell killed the seedlings',
  estimatedLossTzs: 200_000,
  status: 'draft',
  createdAt: '2026-08-16T00:00:00Z',
  ...over,
});

describe('row mapping', () => {
  it('maps a policy row; numeric strings become numbers, nulls stay null', () => {
    expect(
      mapPolicyRow({
        id: 'p1',
        provider: 'X',
        policy_number: null,
        crop_or_asset: 'Rice',
        cover_amount_tzs: '1500000',
        premium_tzs: null,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'active',
        notes: null,
        created_at: 't',
      })
    ).toMatchObject({ coverAmountTzs: 1_500_000, premiumTzs: null, policyNumber: null });
  });

  it('maps a claim row and defaults an unknown incident type to other', () => {
    expect(mapClaimRow({ id: 'c', policy_id: 'p', incident_date: '2026-08-01', incident_type: 'meteor', description: 'd', estimated_loss_tzs: null, status: 'draft', created_at: 't' })).toMatchObject({
      incidentType: 'other',
      estimatedLossTzs: null,
      policyId: 'p',
    });
  });
});

describe('calendar-day helpers', () => {
  it('parseDay accepts real dates only', () => {
    expect(parseDay('2026-09-21')).toBe(Date.UTC(2026, 8, 21));
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('2026-13-01')).toBeNull();
    expect(parseDay('21/09/2026')).toBeNull();
    expect(parseDay('')).toBeNull();
    expect(parseDay('2028-02-29')).not.toBeNull(); // leap year
    expect(parseDay('2027-02-29')).toBeNull();
  });

  it('todayString uses the local calendar day', () => {
    expect(todayString(NOW)).toBe('2026-09-21');
  });

  it('addMonths clamps to month end and crosses years', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-09-21', 6)).toBe('2027-03-21');
    expect(addMonths('2026-09-21', 12)).toBe('2027-09-21');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('nope', 1)).toBeNull();
  });
});

describe('parseTzs', () => {
  it('ignores thousands separators, empty is null, junk is NaN', () => {
    expect(parseTzs('1,500,000')).toBe(1_500_000);
    expect(parseTzs('1 500 000')).toBe(1_500_000);
    expect(parseTzs('')).toBeNull();
    expect(parseTzs('12abc')).toBeNaN();
    expect(parseTzs('-5')).toBeNaN();
  });
});

describe('policyStanding', () => {
  it('is active well before the end date', () => {
    expect(policyStanding(policy(), NOW)).toEqual({ state: 'active', daysLeft: 252 });
  });

  it('flags a policy ending within 30 days, counting the last day as in force', () => {
    expect(policyStanding(policy({ endDate: '2026-10-21' }), NOW)).toEqual({ state: 'expiring_soon', daysLeft: 30 });
    expect(policyStanding(policy({ endDate: '2026-10-22' }), NOW).state).toBe('active');
    expect(policyStanding(policy({ endDate: '2026-09-21' }), NOW)).toEqual({ state: 'expiring_soon', daysLeft: 0 });
  });

  it('treats a passed end date as expired even if the row still says active', () => {
    expect(policyStanding(policy({ endDate: '2026-09-20' }), NOW)).toEqual({ state: 'expired', daysLeft: null });
  });

  it('is upcoming before the start date', () => {
    expect(policyStanding(policy({ startDate: '2026-10-01' }), NOW).state).toBe('upcoming');
  });

  it('a manual cancel or expire always wins over the dates', () => {
    expect(policyStanding(policy({ status: 'cancelled' }), NOW).state).toBe('cancelled');
    expect(policyStanding(policy({ status: 'expired' }), NOW).state).toBe('expired');
  });

  it('isInForce covers active and expiring_soon only', () => {
    expect(isInForce(policy(), NOW)).toBe(true);
    expect(isInForce(policy({ endDate: '2026-10-01' }), NOW)).toBe(true);
    expect(isInForce(policy({ endDate: '2026-01-01' }), NOW)).toBe(false);
    expect(isInForce(policy({ status: 'cancelled' }), NOW)).toBe(false);
  });
});

describe('incidentWithinPolicy', () => {
  it('is inclusive at both ends', () => {
    const p = policy();
    expect(incidentWithinPolicy(p, '2026-06-01')).toBe(true);
    expect(incidentWithinPolicy(p, '2027-05-31')).toBe(true);
    expect(incidentWithinPolicy(p, '2026-05-31')).toBe(false);
    expect(incidentWithinPolicy(p, '2027-06-01')).toBe(false);
    expect(incidentWithinPolicy(p, 'bad')).toBe(false);
  });
});

describe('claim totals', () => {
  const cs = [
    claim({ id: 'a', estimatedLossTzs: 100_000, status: 'draft' }),
    claim({ id: 'b', estimatedLossTzs: 250_000, status: 'submitted_record' }),
    claim({ id: 'c', estimatedLossTzs: null, status: 'closed' }),
    claim({ id: 'd', policyId: 'p2', estimatedLossTzs: 999_999, status: 'draft' }),
  ];

  it('sums estimates across all claims and counts those without one', () => {
    expect(claimTotals(cs)).toEqual({
      count: 4,
      totalEstimatedLossTzs: 1_349_999,
      withoutEstimate: 1,
      byStatus: { draft: 2, submitted_record: 1, closed: 1 },
    });
  });

  it('can be scoped to one policy', () => {
    expect(claimTotals(cs, 'p1')).toMatchObject({ count: 3, totalEstimatedLossTzs: 350_000, withoutEstimate: 1 });
    expect(claimTotals(cs, 'none')).toMatchObject({ count: 0, totalEstimatedLossTzs: 0 });
  });

  it('policyOverview flags losses above the recorded cover, and never when no cover was recorded', () => {
    expect(policyOverview(policy({ coverAmountTzs: 300_000 }), cs).exceedsCover).toBe(true);
    expect(policyOverview(policy({ coverAmountTzs: 350_000 }), cs).exceedsCover).toBe(false);
    expect(policyOverview(policy({ coverAmountTzs: null }), cs).exceedsCover).toBe(false);
    expect(policyOverview(policy(), []).totals.count).toBe(0);
  });
});

describe('validation', () => {
  const okPolicy = { provider: 'X', cropOrAsset: 'Maize', startDate: '2026-06-01', endDate: '2027-05-31' };

  it('a minimal policy is valid; cover and premium are optional', () => {
    expect(validatePolicyInput(okPolicy)).toEqual({});
    expect(validatePolicyInput({ ...okPolicy, coverAmount: '1,000,000', premium: '50000' })).toEqual({});
  });

  it('catches missing text, junk amounts, bad dates and end-before-start', () => {
    expect(validatePolicyInput({ ...okPolicy, provider: ' ' })).toEqual({ provider: true });
    expect(validatePolicyInput({ ...okPolicy, cropOrAsset: '' })).toEqual({ cropOrAsset: true });
    expect(validatePolicyInput({ ...okPolicy, coverAmount: 'lots' })).toEqual({ coverAmount: true });
    expect(validatePolicyInput({ ...okPolicy, premium: '-1' })).toEqual({ premium: true });
    expect(validatePolicyInput({ ...okPolicy, startDate: '2026-02-30' })).toEqual({ startDate: true });
    expect(validatePolicyInput({ ...okPolicy, endDate: '' })).toEqual({ endDate: true });
    expect(validatePolicyInput({ ...okPolicy, endDate: '2026-05-31' })).toEqual({ endDate: true });
    expect(validatePolicyInput({ ...okPolicy, endDate: okPolicy.startDate })).toEqual({}); // same-day is fine
  });

  const okClaim = { policyId: 'p1', incidentDate: '2026-08-15', incidentType: 'flood' as const, description: 'Field flooded' };

  it('a claim needs a policy, a real non-future date, a type and a description', () => {
    expect(validateClaimInput(okClaim, NOW)).toEqual({});
    expect(validateClaimInput({ ...okClaim, policyId: '' }, NOW)).toEqual({ policyId: true });
    expect(validateClaimInput({ ...okClaim, incidentDate: '2026-09-22' }, NOW)).toEqual({ incidentDate: true }); // tomorrow
    expect(validateClaimInput({ ...okClaim, incidentDate: '2026-09-21' }, NOW)).toEqual({}); // today is fine
    expect(validateClaimInput({ ...okClaim, incidentDate: 'yesterday' }, NOW)).toEqual({ incidentDate: true });
    expect(validateClaimInput({ ...okClaim, incidentType: '' }, NOW)).toEqual({ incidentType: true });
    expect(validateClaimInput({ ...okClaim, description: '   ' }, NOW)).toEqual({ description: true });
    expect(validateClaimInput({ ...okClaim, estimatedLoss: 'x' }, NOW)).toEqual({ estimatedLoss: true });
  });
});

describe('queries', () => {
  it('report not_configured, errors, and honest empties', async () => {
    expect(await fetchPolicies(null)).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(await fetchClaims(undefined)).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(await fetchPolicies(fakeClient({ data: [], error: null }).client)).toEqual({ ok: true, policies: [] });
    expect(await fetchClaims(fakeClient({ data: [], error: null }).client)).toEqual({ ok: true, claims: [] });
    const r = await fetchPolicies(fakeClient({ data: null, error: { message: 'boom' } }).client);
    expect(r).toMatchObject({ ok: false, reason: 'error', message: 'boom' });
    expect(failed(r)).toBe(true);
  });
});

describe('writes', () => {
  it('createPolicy sends a clean payload with no user_id and no status (DB default)', async () => {
    const { client, calls } = fakeClient({
      data: { id: 'p9', provider: 'X', crop_or_asset: 'Maize', start_date: '2026-06-01', end_date: '2027-05-31', status: 'active', created_at: 't' },
      error: null,
    });
    const r = await createPolicy(client, {
      provider: ' X ',
      policyNumber: '',
      cropOrAsset: 'Maize',
      coverAmount: '1,000,000',
      premium: '',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
    });
    expect(r.ok).toBe(true);
    const payload = callsOf(calls, 'insert')[0][1][0];
    expect(payload).toEqual({
      provider: 'X',
      policy_number: null,
      crop_or_asset: 'Maize',
      cover_amount_tzs: 1_000_000,
      premium_tzs: null,
      start_date: '2026-06-01',
      end_date: '2027-05-31',
      notes: null,
    });
    expect(payload).not.toHaveProperty('user_id');
  });

  it('createPolicy refuses invalid input without touching the network', async () => {
    const { client } = fakeClient();
    const r = await createPolicy(client, { provider: '', cropOrAsset: 'x', startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(r).toMatchObject({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('createClaim always starts as a draft — the app never files anything', async () => {
    const { client, calls } = fakeClient({
      data: { id: 'c9', policy_id: 'p1', incident_date: '2026-08-15', incident_type: 'flood', description: 'd', status: 'draft', created_at: 't' },
      error: null,
    });
    const r = await createClaim(
      client,
      { policyId: 'p1', incidentDate: '2026-08-15', incidentType: 'flood', description: ' Field flooded ', estimatedLoss: '120,000' },
      NOW
    );
    expect(r.ok).toBe(true);
    expect(callsOf(calls, 'insert')[0][1][0]).toEqual({
      policy_id: 'p1',
      incident_date: '2026-08-15',
      incident_type: 'flood',
      description: 'Field flooded',
      estimated_loss_tzs: 120_000,
      status: 'draft',
    });
  });

  it('createClaim rejects a future incident date', async () => {
    const { client } = fakeClient();
    const r = await createClaim(client, { policyId: 'p1', incidentDate: '2026-10-01', incidentType: 'flood', description: 'd' }, NOW);
    expect(r).toMatchObject({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('status updates and deletes target the right row', async () => {
    const { client, calls } = fakeClient({ error: null });
    expect(await updateClaimStatus(client, 'c1', 'submitted_record')).toEqual({ ok: true });
    expect(callsOf(calls, 'update')[0][1][0]).toEqual({ status: 'submitted_record' });
    expect(await updatePolicyStatus(client, 'p1', 'cancelled')).toEqual({ ok: true });
    expect(callsOf(calls, 'update')[1][1][0]).toEqual({ status: 'cancelled' });
    expect(await deletePolicy(client, 'p1')).toEqual({ ok: true });
    expect(await deleteClaim(client, 'c1')).toEqual({ ok: true });
    expect(callsOf(calls, 'eq').map((c) => c[1])).toEqual([['id', 'c1'], ['id', 'p1'], ['id', 'p1'], ['id', 'c1']]);
    expect(await deleteClaim(null, 'c1')).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(await deleteClaim(fakeClient({ error: { message: 'x' } }).client, 'c1')).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('buildClaimSummary', () => {
  const t = (k: any, p?: any) => translate('en', k, p);

  it('assembles a plain-text summary the farmer can send themselves', () => {
    const text = buildClaimSummary(policy(), claim(), t);
    expect(text).toContain('Insurer: Test Insurer');
    expect(text).toContain('Policy number: TI-100');
    expect(text).toContain('Insured crop or asset: Maize, 5 acres');
    expect(text).toContain('Date of incident: 2026-08-15');
    expect(text).toContain('Type of incident: Drought');
    expect(text).toContain('Estimated loss: TZS 200,000');
    expect(text).toContain('Description: Dry spell killed the seedlings');
    expect(text).toContain('written by the policy holder');
  });

  it('omits lines it has no data for instead of printing blanks or zeros', () => {
    const text = buildClaimSummary(policy({ policyNumber: null }), claim({ estimatedLossTzs: null }), t);
    expect(text).not.toContain('Policy number');
    expect(text).not.toContain('Estimated loss');
  });

  it('is localizable', () => {
    const sw = buildClaimSummary(policy(), claim(), (k, p) => translate('sw', k, p));
    expect(sw).toContain('Kampuni ya bima: Test Insurer');
    expect(sw).toContain('Ukame');
  });
});
