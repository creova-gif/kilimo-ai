jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { en } from '../lib/i18n/en';
import { sw } from '../lib/i18n/sw';
import { translate } from '../lib/i18n';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('i18n resources', () => {
  it('Swahili defines exactly the same keys as English', () => {
    expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
  });

  it('no translation is empty or left identical to a key', () => {
    for (const [k, v] of Object.entries(sw)) {
      expect(v.trim().length).toBeGreaterThan(0);
      expect(v).not.toBe(k);
    }
  });

  it('placeholders match between languages for every key', () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(sw[k])).toEqual(placeholders(en[k]));
    }
  });

  it('translate() switches language and interpolates params', () => {
    expect(translate('en', 'common.retry')).toBe('Try again');
    expect(translate('sw', 'common.retry')).toBe('Jaribu tena');
    expect(translate('en', 'state.offline.lastSynced', { time: '10:42' })).toBe(
      'Last synced 10:42'
    );
    expect(translate('sw', 'state.offline.lastSynced', { time: '10:42' })).toContain('10:42');
  });

  it('leaves an unknown placeholder visible instead of blank', () => {
    expect(translate('en', 'state.offline.lastSynced')).toContain('{time}');
  });
});
