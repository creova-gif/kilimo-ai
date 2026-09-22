jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TasksScreen from '../app/tasks';
import { useKilimoStore } from '../store/useKilimoStore';
import { __resetOfflineForTests } from '../lib/offline';
import { createFakeSupabase, type FakeClient } from '../test-utils/fakeSupabase';
import { translate } from '../lib/i18n';

/** Fake backend: `select().order()` returns the table (or an error); writes are recorded. */
function backend(seed: any[] = [], selectError: string | null = null): FakeClient {
  const fake = createFakeSupabase('user-1');
  fake.tables.tasks = [...seed];
  const from = fake.from.bind(fake);
  fake.from = (table: string) => ({
    ...from(table),
    select: () => ({
      order: jest.fn(async () =>
        selectError
          ? { data: null, error: { message: selectError } }
          : { data: [...fake.rows(table)], error: null }
      ),
    }),
  });
  (global as any).__TEST_SUPABASE__ = fake;
  return fake;
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const row = (over: any = {}) => ({
  id: 't1',
  title: 'Weed plot A',
  title_sw: 'Palilia shamba A',
  category: 'scouting',
  priority: 'high',
  status: 'pending',
  due_date: inDays(1),
  xp_reward: 25,
  farm_block: 'Block A',
  assigned_role: 'employee',
  ...over,
});

beforeEach(() => {
  __resetOfflineForTests();
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ syncQueue: [], notifications: [], language: 'en' });
  useKilimoStore.getState().setConnectivity(true);
  mockPush.mockClear();
});

describe('Tasks screen', () => {
  it('empty: shows an honest empty state with an add action (nothing seeded)', async () => {
    backend([]);
    render(<TasksScreen />);
    expect(await screen.findByText('No tasks yet')).toBeTruthy();
    expect(screen.getAllByText('Add task').length).toBeGreaterThan(0);
    // The legacy "simulate IoT alarm" buttons that created fabricated tasks are gone.
    expect(screen.queryByText(/Cow Fever|Pump Failure|pH Drop|Simulate/i)).toBeNull();
  });

  it('data: lists real rows with priority, due label and progress', async () => {
    backend([row(), row({ id: 't2', title: 'Pay seed supplier', title_sw: null, category: 'finance', priority: 'low', status: 'done', due_date: inDays(-2) })]);
    render(<TasksScreen />);
    expect(await screen.findByText('Weed plot A')).toBeTruthy();
    expect(screen.getByText('Pay seed supplier')).toBeTruthy();
    expect(screen.getByText('Scouting · Due tomorrow · Block A')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('1 of 2 done')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('filters by status', async () => {
    backend([row(), row({ id: 't2', title: 'Pay seed supplier', status: 'done' })]);
    render(<TasksScreen />);
    await screen.findByText('Weed plot A');
    fireEvent.press(screen.getByText('Done'));
    expect(screen.queryByText('Weed plot A')).toBeNull();
    expect(screen.getByText('Pay seed supplier')).toBeTruthy();
  });

  it('error: shows an error state with retry when the list could not load', async () => {
    const fake = backend([], 'permission denied');
    render(<TasksScreen />);
    expect(await screen.findByText('Could not load your tasks')).toBeTruthy();
    fake.from = (() => ({ select: () => ({ order: async () => ({ data: [row()], error: null }) }) })) as any;
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Weed plot A')).toBeTruthy();
  });

  it('Swahili: renders copy and the Swahili task title', async () => {
    useKilimoStore.setState({ language: 'sw' });
    backend([row()]);
    render(<TasksScreen />);
    expect(await screen.findByText('Palilia shamba A')).toBeTruthy();
    expect(screen.getByText('Kazi za shamba')).toBeTruthy();
    expect(screen.getByText('Ukaguzi · Mwisho kesho · Block A')).toBeTruthy();
  });

  it('offline: a task created offline is queued and shown as waiting to sync', async () => {
    const fake = backend([]);
    useKilimoStore.getState().setConnectivity(false);
    render(<TasksScreen />);
    expect(screen.getByText(translate('en', 'offline.banner'))).toBeTruthy();
    expect(screen.getByText('Your tasks load when you are online')).toBeTruthy();

    fireEvent.press(screen.getByTestId('tasks-add'));
    expect(screen.getByText(translate('en', 'schedule.form.offlineNote'))).toBeTruthy();
    // Validation: no name → error, nothing queued.
    fireEvent.press(screen.getByTestId('task-form-save'));
    expect(screen.getByText('Enter a task name.')).toBeTruthy();
    expect(useKilimoStore.getState().syncQueue).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('task-form-title'), 'Spray beans');
    await act(async () => {
      fireEvent.press(screen.getByTestId('task-form-save'));
    });

    expect(await screen.findByText('Spray beans')).toBeTruthy();
    expect(screen.getByTestId('sync-pending')).toBeTruthy();
    expect(screen.getByText('Task saved on this phone. It will sync when you reconnect.')).toBeTruthy();
    const [item] = useKilimoStore.getState().syncQueue;
    expect(item).toMatchObject({ type: 'task_create', status: 'pending' });
    expect(item.payload).toMatchObject({ title: 'Spray beans', synced_offline: true });
    expect(fake.calls).toHaveLength(0); // nothing sent while offline
  });

  it('cancel asks for confirmation, then goes through the outbox', async () => {
    useKilimoStore.getState().setConnectivity(false); // keep items in the queue for inspection
    backend([]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('tasks-add'));
    fireEvent.changeText(screen.getByTestId('task-form-title'), 'Check pump');
    await act(async () => fireEvent.press(screen.getByTestId('task-form-save')));
    const id = (useKilimoStore.getState().syncQueue[0].payload as any).id;

    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _b, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(screen.getByTestId(`task-cancel-${id}`));
    expect(alert).toHaveBeenCalled();
    await waitFor(() =>
      expect(useKilimoStore.getState().syncQueue.map((i) => i.type)).toContain('task_cancel')
    );
    expect(screen.queryByText('Check pump')).toBeNull();
    alert.mockRestore();
  });

  it('complete: ticking a task queues task_complete and shows it as done', async () => {
    backend([row()]);
    render(<TasksScreen />);
    await screen.findByText('Weed plot A');
    useKilimoStore.getState().setConnectivity(false);
    await act(async () => fireEvent.press(screen.getByTestId('task-check-t1')));
    expect(useKilimoStore.getState().syncQueue[0]).toMatchObject({ type: 'task_complete' });
    expect(screen.getByLabelText('"Weed plot A" is done')).toBeTruthy();
    expect(screen.getByText('Task marked as done.')).toBeTruthy();
    expect(screen.getByTestId('sync-pending')).toBeTruthy();
  });

  it('calendar link routes to the calendar screen', async () => {
    backend([row()]);
    render(<TasksScreen />);
    await screen.findByText('Weed plot A');
    fireEvent.press(screen.getByText('Calendar view'));
    expect(mockPush).toHaveBeenCalledWith('/calendar');
  });
});
