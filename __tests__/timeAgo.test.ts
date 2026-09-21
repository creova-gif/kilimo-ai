import { timeAgoKey } from '../lib/timeAgo';
import { cropNames } from '../constants/onboardingOptions';

const now = Date.parse('2026-09-21T12:00:00Z');
describe('timeAgoKey', () => {
  it.each([
    ['2026-09-21T11:59:40Z', 'time.justNow', undefined],
    ['2026-09-21T11:30:00Z', 'time.minutes', 30],
    ['2026-09-21T09:00:00Z', 'time.hours', 3],
    ['2026-09-19T12:00:00Z', 'time.days', 2],
  ])('%s -> %s', (iso, key, n) => {
    const r = timeAgoKey(iso, now);
    expect(r.key).toBe(key);
    expect(r.params?.n).toBe(n);
  });
  it('treats a future or invalid timestamp as "just now" (never negative)', () => {
    expect(timeAgoKey('2026-09-22T00:00:00Z', now).key).toBe('time.justNow');
    expect(timeAgoKey('garbage', now).key).toBe('time.justNow');
  });
});

describe('cropNames', () => {
  it('splits "Swahili (English)" labels', () => {
    expect(cropNames('Mahindi (Maize)')).toEqual({ sw: 'Mahindi', en: 'Maize' });
    expect(cropNames('Mboga (Vegetables)')).toEqual({ sw: 'Mboga', en: 'Vegetables' });
  });
  it('falls back to the raw label when there is no parenthesis', () => {
    expect(cropNames('Cocoa')).toEqual({ sw: 'Cocoa', en: 'Cocoa' });
  });
});
