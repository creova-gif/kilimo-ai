jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CalendarScreen from '../app/calendar';
import { useKilimoStore } from '../store/useKilimoStore';
import { __resetOfflineForTests } from '../lib/offline';
import { createFakeSupabase } from '../test-utils/fakeSupabase';
import { translate } from '../lib/i18n';

type Tables = { tasks?: any[]; farms?: any[]; plots?: any[] };
function backend(seed: Tables = {}, errors: Partial<Record<keyof Tables, string>> = {}) {
  const fake = createFakeSupabase('user-1');
  fake.tables = { tasks: [], farms: [], plots: [], ...seed } as any;
  const from = fake.from.bind(fake);
  fake.from = (table: string) => ({
    ...from(table),
    select: () => ({
      order: jest.fn(async () =>
        (errors as any)[table]
          ? { data: null, error: { message: (errors as any)[table] } }
          : { data: [...fake.rows(table)], error: null }
      ),
    }),
  });
  (global as any).__TEST_SUPABASE__ = fake;
  return fake;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const noonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString();

const taskRow = (over: any = {}) => ({
  id: 't1',
  title: 'Weed plot A',
  category: 'scouting',
  priority: 'high',
  status: 'pending',
  due_date: noonToday,
  xp_reward: 25,
  ...over,
});
const farmRow = { id: 'f1', name: 'Mpakani', created_at: '2026-01-01', updated_at: '2026-01-01' };
const plotRow = (over: any = {}) => ({
  id: 'p1',
  farm_id: 'f1',
  name: 'Kona A',
  crop: 'Mahindi (Maize)',
  planting_date: isoDay(today),
  expected_harvest: null,
  status: 'growing',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...over,
});

beforeEach(() => {
  __resetOfflineForTests();
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ syncQueue: [], notifications: [], language: 'en' });
  useKilimoStore.getState().setConnectivity(true);
});

const monthLabel = (lang: 'en' | 'sw', d = today) =>
  translate(lang, 'schedule.monthYear', {
    month: translate(lang, `schedule.month.${d.getMonth()}` as any),
    year: d.getFullYear(),
  });

describe('Calendar screen', () => {
  it('empty: no invented events — an empty month and an empty day', async () => {
    backend();
    render(<CalendarScreen />);
    expect(await screen.findByText(translate('en', 'schedule.calendar.monthEmpty'))).toBeTruthy();
    expect(screen.getByText('Nothing scheduled')).toBeTruthy();
    expect(screen.getByTestId('calendar-month').props.children).toBe(monthLabel('en'));
    // The legacy AI assistant panel and its canned replies are gone.
    expect(screen.queryByText(/Sankofa|Calendar Assistant/i)).toBeNull();
  });

  it('data: shows real tasks by due date and plot planting / harvest dates', async () => {
    const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    backend({
      tasks: [taskRow()],
      farms: [farmRow],
      plots: [plotRow(), plotRow({ id: 'p2', name: 'Kona B', crop: null, planting_date: null, expected_harvest: isoDay(nextWeek) })],
    });
    render(<CalendarScreen />);
    expect(await screen.findByText('Weed plot A')).toBeTruthy();
    expect(await screen.findByText('Planting: Kona A')).toBeTruthy();
    expect(screen.getByText('Maize · from your plot records')).toBeTruthy();
    expect(screen.getByText('1 tasks · 1 plot dates')).toBeTruthy();
    expect(
      screen.getByLabelText(
        `${translate('en', 'schedule.dayMonth', { day: today.getDate(), month: translate('en', `schedule.month.${today.getMonth()}` as any) })}: 2 scheduled`
      )
    ).toBeTruthy();

    // Navigate to the harvest day (may be next month).
    if (nextWeek.getMonth() !== today.getMonth()) fireEvent.press(screen.getByTestId('calendar-next'));
    fireEvent.press(screen.getByTestId(`calendar-day-${nextWeek.getDate()}`));
    expect(screen.getByText('Expected harvest: Kona B')).toBeTruthy();
    expect(screen.getByText('From your plot records')).toBeTruthy();
    expect(screen.queryByText('Weed plot A')).toBeNull();
  });

  it('month navigation changes the heading', async () => {
    backend();
    render(<CalendarScreen />);
    await screen.findByText('Nothing scheduled');
    fireEvent.press(screen.getByTestId('calendar-prev'));
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    expect(screen.getByTestId('calendar-month').props.children).toBe(monthLabel('en', prev));
  });

  it('error: warns (with retry) when tasks or plot dates fail to load', async () => {
    backend({}, { tasks: 'permission denied', plots: 'boom' });
    render(<CalendarScreen />);
    expect(await screen.findByTestId('calendar-tasks-error')).toBeTruthy();
    expect(await screen.findByTestId('calendar-plots-error')).toBeTruthy();
    expect(screen.getAllByText('Try again').length).toBe(2);
  });

  it('Swahili: month, weekday and agenda copy come from schedule.* keys', async () => {
    useKilimoStore.setState({ language: 'sw' });
    backend({ farms: [farmRow], plots: [plotRow()] });
    render(<CalendarScreen />);
    expect(await screen.findByText('Upandaji: Kona A')).toBeTruthy();
    expect(screen.getByText('Mahindi · kutoka kumbukumbu za kitalu chako')).toBeTruthy();
    expect(screen.getByText('Kalenda ya shamba')).toBeTruthy();
    expect(screen.getByTestId('calendar-month').props.children).toBe(monthLabel('sw'));
    expect(screen.getByText('Jpi')).toBeTruthy();
  });

  it('offline: adding a task for the selected day queues it and marks it waiting to sync', async () => {
    backend();
    useKilimoStore.getState().setConnectivity(false);
    render(<CalendarScreen />);
    expect(screen.getByText(translate('en', 'offline.banner'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('calendar-add'));
    fireEvent.changeText(screen.getByTestId('task-form-title'), 'Plant beans');
    await act(async () => fireEvent.press(screen.getByTestId('task-form-save')));

    expect(await screen.findByText('Plant beans')).toBeTruthy();
    expect(screen.getByTestId('sync-pending')).toBeTruthy();
    const [item] = useKilimoStore.getState().syncQueue;
    expect(item.type).toBe('task_create');
    const due = new Date((item.payload as any).due_date);
    expect(due.getDate()).toBe(today.getDate()); // due on the selected calendar day
    await waitFor(() => expect(screen.getByText('1 tasks · 0 plot dates')).toBeTruthy());
  });
});
