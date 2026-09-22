jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';

import { useFarms } from '../hooks/useFarms';
import FarmsScreen from '../app/(tabs)/fields';
import PlotDetailScreen from '../app/field/[id]';
import { todayIso } from '../lib/farms';
import { useKilimoStore } from '../store/useKilimoStore';

/* ── in-memory PostgREST fake (select / insert / update / delete + eq / single / maybeSingle) ── */
type Row = Record<string, any>;
function memoryBackend(
  seed: { farms?: Row[]; plots?: Row[]; tasks?: Row[] } = {},
  opts: { selectError?: string } = {}
) {
  const tables: Record<string, Row[]> = {
    farms: [...(seed.farms ?? [])],
    plots: [...(seed.plots ?? [])],
    tasks: [...(seed.tasks ?? [])],
  };
  const log: { table: string; verb: string; payload?: any; filters: Row }[] = [];
  let n = 0;

  const from = (table: string) => {
    let verb = 'select';
    let payload: any;
    const filters: Row = {};
    let single = false;
    const run = () => {
      log.push({ table, verb, payload, filters: { ...filters } });
      const rows = tables[table];
      if (verb === 'select') {
        if (opts.selectError) return { data: null, error: { message: opts.selectError } };
        return { data: rows, error: null };
      }
      if (verb === 'insert') {
        const name = String(payload.name ?? '')
          .trim()
          .toLowerCase();
        if (name && rows.some((r) => String(r.name).trim().toLowerCase() === name)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value' } };
        }
        const now = new Date().toISOString();
        const row = { id: `new${++n}`, created_at: now, updated_at: now, ...payload };
        rows.push(row);
        return { data: row, error: null };
      }
      const hit = rows.find((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
      if (verb === 'update') {
        if (!hit) return { data: null, error: null };
        Object.assign(hit, payload);
        return { data: hit, error: null };
      }
      // delete
      if (!hit) return { data: [], error: null };
      tables[table] = rows.filter((r) => r !== hit);
      if (table === 'farms') tables.plots = tables.plots.filter((p) => p.farm_id !== hit.id);
      return { data: [{ id: hit.id }], error: null };
    };
    const b: any = {
      select: () => b,
      insert: (p: any) => ((verb = 'insert'), (payload = p), b),
      update: (p: any) => ((verb = 'update'), (payload = p), b),
      delete: () => ((verb = 'delete'), b),
      eq: (k: string, v: any) => ((filters[k] = v), b),
      order: () => b,
      single: () => ((single = true), b),
      maybeSingle: () => ((single = true), b),
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    void single;
    return b;
  };
  return { client: { from }, tables, log };
}

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return todayIso(d);
};

const farm = (over: Row = {}) => ({
  id: 'f1',
  name: 'Mpakani',
  region: 'Mbeya',
  area_ha: 3,
  notes: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
});
const plot = (over: Row = {}) => ({
  id: 'p1',
  farm_id: 'f1',
  name: 'Kona A',
  crop: 'Mahindi (Maize)',
  area_ha: 1.5,
  planting_date: iso(-30),
  expected_harvest: iso(60),
  status: 'growing',
  boundary: null,
  notes: null,
  created_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  ...over,
});
const task = (over: Row = {}) => ({
  id: 't1',
  title: 'Weed Kona A',
  category: 'scouting',
  priority: 'medium',
  status: 'pending',
  due_date: '2026-10-01T06:00:00Z',
  xp_reward: 10,
  farm_block: 'Kona A',
  created_at: '2026-09-03T00:00:00Z',
  ...over,
});

const setBackend = (b: any) => {
  (global as any).__TEST_SUPABASE__ = b?.client ?? null;
};

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockParams = {};
  (global as any).__TEST_SUPABASE__ = null;
  useKilimoStore.setState({ language: 'en', isOffline: false, farmProfile: null } as any);
});

/* ── useFarms ─────────────────────────────────────────────────────────────────────────────── */
describe('useFarms', () => {
  it('starts empty and stays empty for an empty account (no seed data)', async () => {
    setBackend(memoryBackend());
    const { result } = renderHook(() => useFarms());
    expect(result.current.farms).toEqual([]);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.farms).toEqual([]);
    expect(result.current.plots).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads and maps the real farms and plots', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.farms[0]).toMatchObject({ id: 'f1', name: 'Mpakani', areaHa: 3 });
    expect(result.current.plots[0]).toMatchObject({
      id: 'p1',
      farmId: 'f1',
      crop: 'Mahindi (Maize)',
    });
  });

  it('exposes a backend error rather than an empty list', async () => {
    setBackend(memoryBackend({}, { selectError: 'permission denied' }));
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.error).toBe('error'));
    expect(result.current.loaded).toBe(false);
  });

  it('reports not_configured when there is no backend', async () => {
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.error).toBe('not_configured'));
  });

  it('does not fetch or write while offline; writes say so instead of pretending', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const backend = memoryBackend({ farms: [farm()] });
    setBackend(backend);
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loaded).toBe(false);
    let r: any;
    await act(async () => {
      r = await result.current.createFarm({ name: 'New' });
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    expect(backend.log).toHaveLength(0);
  });

  it('createFarm merges the server row; a duplicate name changes nothing', async () => {
    const backend = memoryBackend({ farms: [farm()] });
    setBackend(backend);
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    let ok: any;
    await act(async () => {
      ok = await result.current.createFarm({ name: 'Second farm', region: 'Iringa' });
    });
    expect(ok.ok).toBe(true);
    expect(result.current.farms.map((f) => f.name)).toEqual(['Mpakani', 'Second farm']);

    let dup: any;
    await act(async () => {
      dup = await result.current.createFarm({ name: '  mpakani ' });
    });
    expect(dup).toMatchObject({ ok: false, reason: 'duplicate' });
    expect(result.current.farms).toHaveLength(2);
  });

  it('deleteFarm removes its plots locally too; a missing row is not_found and changes nothing', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    let r: any;
    await act(async () => {
      r = await result.current.deleteFarm('nope');
    });
    expect(r).toEqual({ ok: false, reason: 'not_found' });
    expect(result.current.farms).toHaveLength(1);

    await act(async () => {
      r = await result.current.deleteFarm('f1');
    });
    expect(r.ok).toBe(true);
    expect(result.current.farms).toEqual([]);
    expect(result.current.plots).toEqual([]);
  });

  it('setPlotStatus updates the plot in state from the server row', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    const { result } = renderHook(() => useFarms());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setPlotStatus('p1', 'harvested');
    });
    expect(result.current.plots[0].status).toBe('harvested');
  });
});

/* ── Shamba tab ───────────────────────────────────────────────────────────────────────────── */
describe('Shamba tab', () => {
  it('shows an honest empty state (no ZONES demo data) with a CTA to add the first farm', async () => {
    setBackend(memoryBackend());
    render(<FarmsScreen />);
    expect(await screen.findByText('You have not added a farm yet')).toBeTruthy();
    expect(screen.getByText('Add my first farm')).toBeTruthy();
    expect(screen.queryByText(/Zone 42/)).toBeNull();
    expect(screen.queryByText(/North Valleya/)).toBeNull();
    expect(screen.queryByText('Start from my profile')).toBeNull(); // no profile, nothing to offer
  });

  it('is Swahili when the app language is Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    setBackend(memoryBackend());
    render(<FarmsScreen />);
    expect(await screen.findByText('Bado hujaongeza shamba')).toBeTruthy();
    expect(screen.getByText('Ongeza shamba langu la kwanza')).toBeTruthy();
  });

  it('offers to prefill from the profile but never creates anything until Save', async () => {
    useKilimoStore.setState({
      farmProfile: {
        primaryCrops: ['Mahindi (Maize)'],
        region: 'Mbeya',
        farmSizeAcres: 5,
        mainActivity: 'mazao',
        hasLivestock: false,
        hasIrrigation: false,
      },
    } as any);
    const backend = memoryBackend();
    setBackend(backend);
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByText('Start from my profile'));

    expect(
      await screen.findByText('Filled in from your profile. Check the details, then save.')
    ).toBeTruthy();
    expect(screen.getByTestId('farm-area').props.value).toBe('5');
    expect(screen.getByTestId('farm-name').props.value).toBe(''); // the name is never guessed
    expect(backend.log.some((l) => l.verb === 'insert')).toBe(false);
  });

  it('lists real farms with their plots, crop, stage and progress', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    render(<FarmsScreen />);
    expect(await screen.findByText('Mpakani')).toBeTruthy();
    expect(screen.getByText('Maize')).toBeTruthy();
    expect(screen.getByText('Early growth')).toBeTruthy();
    expect(screen.getByLabelText('Progress 33 percent')).toBeTruthy();
    expect(screen.getByText('1 plot')).toBeTruthy();
    expect(screen.getByText('1.5 of 3 ha is in plots')).toBeTruthy();
  });

  it('opens the plot detail route for a tapped plot', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByText('Maize'));
    expect(mockPush).toHaveBeenCalledWith('/field/p1');
  });

  it('a farm with no plots says so and offers to add one', async () => {
    setBackend(memoryBackend({ farms: [farm()] }));
    render(<FarmsScreen />);
    expect(await screen.findByText('No plots on this farm yet.')).toBeTruthy();
    expect(screen.getByLabelText('Add plot: Mpakani')).toBeTruthy();
  });

  it('creates a farm through the form and only then confirms it', async () => {
    const backend = memoryBackend();
    setBackend(backend);
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByText('Add my first farm'));
    fireEvent.changeText(await screen.findByTestId('farm-name'), 'Shamba Kubwa');
    fireEvent.changeText(screen.getByTestId('farm-area'), '4,5');
    fireEvent.press(screen.getByTestId('farm-save'));

    expect(await screen.findByText('Farm saved.')).toBeTruthy();
    const insert = backend.log.find((l) => l.verb === 'insert');
    expect(insert?.payload).toMatchObject({ name: 'Shamba Kubwa', area_ha: 4.5 });
    expect(insert?.payload).not.toHaveProperty('user_id');
    expect(await screen.findByText('Shamba Kubwa')).toBeTruthy();
  });

  it('validates before saving: a blank name shows an error and calls the backend zero times', async () => {
    const backend = memoryBackend();
    setBackend(backend);
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByText('Add my first farm'));
    fireEvent.press(await screen.findByTestId('farm-save'));
    expect(await screen.findByText('Enter a name.')).toBeTruthy();
    expect(backend.log.some((l) => l.verb === 'insert')).toBe(false);
  });

  it('shows a duplicate-name message and no success notice when the server refuses', async () => {
    setBackend(memoryBackend({ farms: [farm()] }));
    render(<FarmsScreen />);
    await screen.findByText('Mpakani');
    fireEvent.press(screen.getAllByText('Add farm')[0]);
    fireEvent.changeText(await screen.findByTestId('farm-name'), 'Mpakani');
    fireEvent.press(screen.getByTestId('farm-save'));
    expect(await screen.findByText('You already have a farm with this name.')).toBeTruthy();
    expect(screen.queryByText('Farm saved.')).toBeNull();
  });

  it('adds a plot to a farm and validates dates', async () => {
    const backend = memoryBackend({ farms: [farm()] });
    setBackend(backend);
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByLabelText('Add plot: Mpakani'));
    fireEvent.changeText(await screen.findByTestId('plot-name'), 'Kona B');
    fireEvent.changeText(screen.getByTestId('plot-planting'), '2026-10-05');
    fireEvent.changeText(screen.getByTestId('plot-harvest'), '2026-09-01');
    fireEvent.press(screen.getByTestId('plot-save'));
    expect(
      await screen.findByText('The harvest date cannot be before the planting date.')
    ).toBeTruthy();
    expect(backend.log.some((l) => l.verb === 'insert')).toBe(false);

    fireEvent.changeText(screen.getByTestId('plot-harvest'), '2027-01-15');
    fireEvent.press(screen.getByTestId('plot-save'));
    expect(await screen.findByText('Plot saved.')).toBeTruthy();
    const insert = backend.log.find((l) => l.verb === 'insert' && l.table === 'plots');
    expect(insert?.payload).toMatchObject({
      farm_id: 'f1',
      name: 'Kona B',
      planting_date: '2026-10-05',
      expected_harvest: '2027-01-15',
    });
  });

  it('confirms before deleting a farm and reports success only after the server deleted it', async () => {
    const backend = memoryBackend({ farms: [farm()], plots: [plot()] });
    setBackend(backend);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<FarmsScreen />);
    fireEvent.press(await screen.findByLabelText('Delete: Mpakani'));
    expect(backend.log.some((l) => l.verb === 'delete')).toBe(false); // not yet
    const buttons = alert.mock.calls[0][2] as any[];
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive').onPress();
    });
    expect(await screen.findByText('Farm deleted.')).toBeTruthy();
    expect(backend.tables.plots).toHaveLength(0);
    alert.mockRestore();
  });

  it('shows an error state with retry when the backend fails (not an empty account)', async () => {
    setBackend(memoryBackend({}, { selectError: 'boom' }));
    render(<FarmsScreen />);
    expect(await screen.findByText('Could not load your farms')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('You have not added a farm yet')).toBeNull();
  });

  it('says farms are unavailable when no backend is configured', async () => {
    render(<FarmsScreen />);
    expect(
      await screen.findByText('Farms are not available: this build is not connected to a backend.')
    ).toBeTruthy();
  });

  it('shows an offline state, not an empty account, when offline before anything loaded', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    const backend = memoryBackend({ farms: [farm()] });
    setBackend(backend);
    render(<FarmsScreen />);
    expect(await screen.findByText('You are offline')).toBeTruthy();
    expect(screen.queryByText('You have not added a farm yet')).toBeNull();
    expect(backend.log).toHaveLength(0);
  });
});

/* ── Plot detail ──────────────────────────────────────────────────────────────────────────── */
describe('Plot detail', () => {
  beforeEach(() => {
    mockParams = { id: 'p1' };
  });

  it('shows the real plot with an estimated lifecycle and its linked tasks only', async () => {
    setBackend(
      memoryBackend({
        farms: [farm()],
        plots: [plot()],
        tasks: [
          task(),
          task({ id: 't2', title: 'Spray Kona B', farm_block: 'Kona B' }),
          task({ id: 't3', title: 'No block', farm_block: null }),
        ],
      })
    );
    render(<PlotDetailScreen />);
    expect(await screen.findByText('Weed Kona A')).toBeTruthy();
    expect(screen.queryByText('Spray Kona B')).toBeNull(); // different plot
    expect(screen.queryByText('No block')).toBeNull();
    expect(screen.getAllByText('Maize').length).toBeGreaterThan(0);
    expect(screen.getByText('33% of the way to harvest')).toBeTruthy();
    expect(
      screen.getByText(
        'An estimate from your planting and expected harvest dates, not a measurement.'
      )
    ).toBeTruthy();
    expect(screen.getByText('To do')).toBeTruthy();
  });

  it('says so when no tasks are linked (no invented tasks)', async () => {
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    render(<PlotDetailScreen />);
    expect(await screen.findByText('No tasks linked to this plot yet.')).toBeTruthy();
  });

  it('does not invent progress when the dates are missing', async () => {
    setBackend(
      memoryBackend({
        farms: [farm()],
        plots: [plot({ planting_date: null, expected_harvest: null })],
      })
    );
    render(<PlotDetailScreen />);
    expect(
      await screen.findByText('Add planting and expected harvest dates to see an estimate.')
    ).toBeTruthy();
    expect(screen.queryByText(/of the way to harvest/)).toBeNull();
  });

  it('shows a not-found state for an unknown plot id', async () => {
    mockParams = { id: 'ghost' };
    setBackend(memoryBackend({ farms: [farm()], plots: [plot()] }));
    render(<PlotDetailScreen />);
    expect(await screen.findByText('Plot not found')).toBeTruthy();
  });

  it('marks a plot harvested only after the server confirms', async () => {
    const backend = memoryBackend({ farms: [farm()], plots: [plot()] });
    setBackend(backend);
    render(<PlotDetailScreen />);
    fireEvent.press(await screen.findByText('Mark as harvested'));
    expect(await screen.findByText('Plot marked as harvested.')).toBeTruthy();
    expect(backend.tables.plots[0].status).toBe('harvested');
    expect(screen.queryByText('Mark as harvested')).toBeNull();
  });

  it('deletes after confirmation and goes back', async () => {
    const backend = memoryBackend({ farms: [farm()], plots: [plot()] });
    setBackend(backend);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<PlotDetailScreen />);
    fireEvent.press(await screen.findByText('Delete'));
    const buttons = alert.mock.calls[0][2] as any[];
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive').onPress();
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(backend.tables.plots).toHaveLength(0);
    alert.mockRestore();
  });

  it('keeps an existing boundary when a plot is edited', async () => {
    const poly = [
      { lat: -8.9, lng: 33.4 },
      { lat: -8.9, lng: 33.5 },
      { lat: -9.0, lng: 33.5 },
    ];
    const backend = memoryBackend({ farms: [farm()], plots: [plot({ boundary: poly })] });
    setBackend(backend);
    render(<PlotDetailScreen />);
    fireEvent.press(await screen.findByText('Edit'));
    fireEvent.changeText(await screen.findByTestId('plot-name'), 'Kona A2');
    fireEvent.press(screen.getByTestId('plot-save'));
    expect(await screen.findByText('Plot saved.')).toBeTruthy();
    expect(backend.tables.plots[0]).toMatchObject({ name: 'Kona A2', boundary: poly });
  });
});
