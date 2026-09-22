jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { translate } from '../lib/i18n';
import {
  dueLabel,
  noonIso,
  parseLocalIsoDate,
  pickLocalized,
  taskSyncStates,
  taskTitle,
} from '../lib/scheduleFormat';

const t = (k: any, p?: any) => translate('en', k, p);
const item = (type: string, payload: any, status = 'pending') =>
  ({ id: Math.random().toString(), type, payload, status, createdAt: '', retries: 0, idempotencyKey: 'k' }) as any;

describe('scheduleFormat', () => {
  it('taskSyncStates reads create / complete / cancel ids from the real outbox; failed wins', () => {
    const s = taskSyncStates([
      item('task_create', { id: 'a' }),
      item('task_complete', { match: { id: 'b' }, values: {} }, 'failed'),
      item('task_cancel', { match: { id: 'b' }, values: {} }),
      item('listing_create', { id: 'c' }),
    ]);
    expect(s).toEqual({ a: 'pending', b: 'failed' });
  });

  it('dueLabel is calendar-day relative', () => {
    const now = new Date(2026, 8, 21, 23, 0);
    expect(dueLabel(t, new Date(2026, 8, 22, 1, 0).toISOString(), now)).toBe('Due tomorrow');
    expect(dueLabel(t, new Date(2026, 8, 21, 6, 0).toISOString(), now)).toBe('Due today');
    expect(dueLabel(t, new Date(2026, 8, 20).toISOString(), now)).toBe('Overdue');
    expect(dueLabel(t, new Date(2026, 8, 26).toISOString(), now)).toBe('Due in 5 days');
    expect(dueLabel(t, undefined, now)).toBe('No due date');
  });

  it('parses plot dates as local days and keeps chosen days stable', () => {
    const d = parseLocalIsoDate('2026-09-21')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 21]);
    expect(parseLocalIsoDate('bad')).toBeNull();
    expect(new Date(noonIso(d)).getDate()).toBe(21);
  });

  it('picks bilingual data by language', () => {
    expect(taskTitle({ title: 'Weed', titleSw: 'Palilia' }, 'sw')).toBe('Palilia');
    expect(taskTitle({ title: 'Weed', titleSw: undefined }, 'sw')).toBe('Weed');
    expect(taskTitle({ title: 'Weed', titleSw: 'Palilia' }, 'en')).toBe('Weed');
    expect(pickLocalized('en', { en: 'Maize', sw: 'Mahindi' })).toBe('Maize');
    expect(pickLocalized('sw', { en: 'Maize', sw: 'Mahindi' })).toBe('Mahindi');
  });
});
