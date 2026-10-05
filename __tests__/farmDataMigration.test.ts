// AsyncStorage is touched at module load (persist middleware); use the bundled mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { migrateFarmData, useFarmDataStore } from '../store/useFarmDataStore';

describe('fresh farm data', () => {
  it('starts new users with no fabricated records', () => {
    const s = useFarmDataStore.getState();
    expect(s.livestock).toEqual([]);
    expect(s.inventory).toEqual([]);
    expect(s.consultations).toEqual([]);
    expect(s.ledger).toEqual([]);
    expect(s.groups.some((g) => g.joined)).toBe(false);
    expect(s.insurance.every((p) => p.status === 'browse')).toBe(true);
  });
});

describe('migrateFarmData', () => {
  const legacy = {
    livestock: [{ id: 'a1' }, { id: 'a_1700000000000_ab12' }],
    inventory: [{ id: 'i1' }, { id: 'i4' }, { id: 'i_1700000000000_cd34' }],
    consultations: [{ id: 'co1' }, { id: 'co_1700000000000_ef56' }],
    ledger: [{ id: 'l1' }, { id: 'l7' }, { id: 'l_1700000000000_gh78' }],
    groups: [
      { id: 'g1', joined: true },
      { id: 'g2', joined: true },
    ],
    insurance: [
      { id: 'p2', status: 'active', startedAt: 'x', expiresAt: 'y' },
      { id: 'p3', status: 'browse' },
    ],
  };

  it('strips only the known legacy fixtures and keeps user records', () => {
    const out = migrateFarmData(legacy) as any;
    expect(out.livestock.map((x: any) => x.id)).toEqual(['a_1700000000000_ab12']);
    expect(out.inventory.map((x: any) => x.id)).toEqual(['i_1700000000000_cd34']);
    expect(out.consultations.map((x: any) => x.id)).toEqual(['co_1700000000000_ef56']);
    expect(out.ledger.map((x: any) => x.id)).toEqual(['l_1700000000000_gh78']);
    expect(out.groups).toEqual([
      { id: 'g1', joined: false },
      { id: 'g2', joined: true },
    ]);
    expect(out.insurance[0]).toMatchObject({ id: 'p2', status: 'browse' });
    expect(out.insurance[0].startedAt).toBeUndefined();
    expect(out.insurance[1]).toEqual({ id: 'p3', status: 'browse' });
  });

  it('is idempotent and tolerates empty state', () => {
    const once = migrateFarmData(legacy);
    expect(migrateFarmData(once)).toEqual(once);
    expect(migrateFarmData(undefined)).toMatchObject({ livestock: [], ledger: [] });
  });
});
