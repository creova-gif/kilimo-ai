import { AGRO_ID_SHARING_ON_HOLD, agroIdSharingAllowed } from '../lib/credit/legalHold';

describe('Agro-ID sharing hold (CRE-179 / CRE-83)', () => {
  it('is on, and sharing is not allowed', () => {
    expect(AGRO_ID_SHARING_ON_HOLD).toBe(true);
    expect(agroIdSharingAllowed()).toBe(false);
  });

  it('ignores the real-data flag (no flag path)', () => {
    process.env.EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA = 'true';
    try {
      jest.isolateModules(() => {
        const m = require('../lib/credit/legalHold');
        expect(m.agroIdSharingAllowed()).toBe(false);
      });
    } finally {
      delete process.env.EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA;
    }
  });
});
