jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));
jest.mock('../components/MapViewWrapper', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((p: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    (global as any).__mapProps = p;
    return React.createElement(View, { testID: 'mapview' }, p.children);
  });
  const Polygon = (p: any) =>
    React.createElement(View, { testID: 'polygon', accessibilityHint: String(p.coordinates.length) });
  const Marker = () => React.createElement(View, { testID: 'marker' });
  return { __esModule: true, default: MapView, Polygon, Marker, PROVIDER_GOOGLE: 'google' };
});
const mockWeather = { configured: false, fetchCurrent: jest.fn() };
jest.mock('../lib/weather', () => ({
  weatherConfigured: () => mockWeather.configured,
  fetchCurrent: (...a: any[]) => mockWeather.fetchCurrent(...a),
}));
jest.mock('../lib/access', () => ({ Gate: ({ children }: any) => children }));
const mockCreateTask = jest.fn();
jest.mock('../hooks/useTasks', () => ({ useTasks: () => ({ createTask: mockCreateTask }) }));
jest.mock('../lib/offline', () => {
  const actual = jest.requireActual('../lib/offline');
  return {
    ...actual,
    enqueueAction: (a: any) =>
      require('../store/useKilimoStore').useKilimoStore.getState().enqueueAction(a),
  };
});

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MapScreen from '../app/map';
import VRASetupScreen from '../app/vra-setup';
import SoilAnalysis from '../app/soil-analysis';
import CropPlanningScreen from '../app/crop-planning';
import FarmTwinList from '../app/farm-twin/index';
import ScenarioEditor from '../app/farm-twin/[id]';
import { useKilimoStore } from '../store/useKilimoStore';
import { DEFAULT_INPUTS, useDigitalFarmTwinStore } from '../store/useDigitalFarmTwinStore';
import { runTwinModel } from '../lib/farmtwin/model';

/* ── tiny in-memory PostgREST fake ─────────────────────────────────────────────────────────── */
type Row = Record<string, any>;
function backend(seed: { farms?: Row[]; plots?: Row[]; soil_tests?: Row[] } = {}) {
  const tables: Record<string, Row[]> = {
    farms: [...(seed.farms ?? [])],
    plots: [...(seed.plots ?? [])],
    soil_tests: [...(seed.soil_tests ?? [])],
    tasks: [],
  };
  const from = (table: string) => {
    let verb = 'select';
    let payload: any;
    const filters: Row = {};
    const run = () => {
      const rows = tables[table];
      if (verb === 'select') return { data: rows, error: null };
      const hit = rows.find((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
      if (verb === 'update') {
        if (!hit) return { data: null, error: null };
        Object.assign(hit, payload);
        return { data: hit, error: null };
      }
      if (!hit) return { data: [], error: null };
      tables[table] = rows.filter((r) => r !== hit);
      return { data: [{ id: hit.id }], error: null };
    };
    const b: any = {
      select: () => b,
      update: (p: any) => ((verb = 'update'), (payload = p), b),
      delete: () => ((verb = 'delete'), b),
      eq: (k: string, v: any) => ((filters[k] = v), b),
      order: () => b,
      maybeSingle: () => b,
      single: () => b,
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  };
  (global as any).__TEST_SUPABASE__ = { from };
  return tables;
}

const farm = { id: 'f1', name: 'Mpakani', region: 'Mbeya', area_ha: 3, created_at: '2026-09-01T00:00:00Z' };
const square = [
  { lat: -8.9, lng: 33.4 },
  { lat: -8.9, lng: 33.401 },
  { lat: -8.901, lng: 33.401 },
];
const plotA = {
  id: 'p1',
  farm_id: 'f1',
  name: 'Kona A',
  crop: 'Mpunga (Rice)',
  area_ha: 1.5,
  status: 'growing',
  boundary: null,
  created_at: '2026-09-02T00:00:00Z',
};
const plotB = { ...plotA, id: 'p2', name: 'Kona B', crop: 'Mahindi (Maize)', area_ha: null, boundary: square };

beforeEach(() => {
  mockPush.mockClear();
  mockCreateTask.mockClear();
  mockWeather.configured = false;
  mockWeather.fetchCurrent.mockReset();
  mockParams = {};
  (global as any).__TEST_SUPABASE__ = null;
  (global as any).__mapProps = null;
  useKilimoStore.setState({ language: 'en', isOffline: false, farmProfile: null, syncQueue: [] } as any);
  useDigitalFarmTwinStore.setState({ scenarios: [] });
});

/* ── map ───────────────────────────────────────────────────────────────────────────────────── */
describe('Farm map', () => {
  it('empty account: honest empty state linking to Shamba, no fake fields or weather', async () => {
    backend();
    render(<MapScreen />);
    expect(await screen.findByText('No plots yet')).toBeTruthy();
    expect(screen.queryByText(/\+16°C|Corn field|Empty field|pH/)).toBeNull();
    fireEvent.press(screen.getByText('Go to Shamba'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/fields');
    expect(mockWeather.fetchCurrent).not.toHaveBeenCalled();
  });

  it('shows real plots; only plots with a boundary are drawn; weather is real or absent', async () => {
    backend({ farms: [farm], plots: [plotA, plotB] });
    mockWeather.configured = true;
    mockWeather.fetchCurrent.mockResolvedValue({
      location: 'Mbeya',
      temp: 19,
      feelsLike: 19,
      humidity: 70,
      windKph: 8,
      condition: 'cloud',
      conditionLabel: 'mawingu',
      pop: 0,
    });
    render(<MapScreen />);
    expect(await screen.findByText('Kona A')).toBeTruthy();
    expect(screen.getByText('Kona B')).toBeTruthy();
    expect(screen.getByText('1 of 2 plots on the map')).toBeTruthy();
    expect(screen.getAllByTestId('polygon')).toHaveLength(1);
    expect(await screen.findByText('Weather now in Mbeya')).toBeTruthy();
    expect(mockWeather.fetchCurrent).toHaveBeenCalledWith('Mbeya');
    expect(screen.getByText(/19°C · Cloudy/)).toBeTruthy();
  });

  it('no weather card when the weather request fails', async () => {
    backend({ farms: [farm], plots: [plotA] });
    mockWeather.configured = true;
    mockWeather.fetchCurrent.mockRejectedValue(new Error('network'));
    render(<MapScreen />);
    expect(await screen.findByText('Kona A')).toBeTruthy();
    await waitFor(() => expect(mockWeather.fetchCurrent).toHaveBeenCalled());
    expect(screen.queryByText(/Weather now/)).toBeNull();
  });

  it('draws a boundary by tapping corners and saves it to plots.boundary', async () => {
    const tables = backend({ farms: [farm], plots: [plotA] });
    render(<MapScreen />);
    fireEvent.press(await screen.findByText('Kona A'));
    fireEvent.press(screen.getByText('Draw boundary'));
    expect(screen.getByText('0 corners')).toBeTruthy();
    const tap = (latitude: number, longitude: number) =>
      act(() => (global as any).__mapProps.onPress({ nativeEvent: { coordinate: { latitude, longitude } } }));
    tap(-8.9, 33.4);
    tap(-8.9, 33.401);
    tap(-8.901, 33.401);
    expect(screen.getByText(/3 corners/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Save boundary'));
    });
    expect(await screen.findByText('Boundary saved for Kona A.')).toBeTruthy();
    expect(tables.plots[0].boundary).toEqual(square);
  });
});

/* ── VRA / input planner ───────────────────────────────────────────────────────────────────── */
describe('Input planner (vra-setup)', () => {
  it('without a plotId asks for a real plot, then computes rate × recorded area', async () => {
    backend({ farms: [farm], plots: [plotA] });
    render(<VRASetupScreen />);
    fireEvent.press(await screen.findByText('Kona A'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 50'), '50');
    expect(screen.getByText('75 kg in total')).toBeTruthy();
    fireEvent.press(screen.getByText('Add to my schedule'));
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Apply fertiliser on Kona A',
        titleSw: 'Weka mbolea kwenye Kona A',
        farmBlock: 'Kona A',
      })
    );
    expect(screen.queryByText(/Synced Successfully|Sync to Equipment/)).toBeNull();
  });

  it('an unknown plotId is reported honestly', async () => {
    backend({ farms: [farm], plots: [plotA] });
    mockParams = { plotId: 'gone' };
    render(<VRASetupScreen />);
    expect(await screen.findByText('Plot not found')).toBeTruthy();
    expect(screen.getByText('Kona A')).toBeTruthy();
  });

  it('a plot without a recorded area gets no invented total', async () => {
    backend({ farms: [farm], plots: [plotB] });
    mockParams = { plotId: 'p2' };
    render(<VRASetupScreen />);
    fireEvent.changeText(await screen.findByPlaceholderText('e.g. 50'), '40');
    expect(screen.getByText(/no area recorded/)).toBeTruthy();
    expect(screen.queryByText(/in total/)).toBeNull();
  });
});

/* ── soil tests ────────────────────────────────────────────────────────────────────────────── */
describe('Soil tests', () => {
  it('no tests → empty state; a saved test is queued and shown with generic pH guidance', async () => {
    backend({ farms: [farm], plots: [plotA] });
    render(<SoilAnalysis />);
    expect(await screen.findByText('No soil tests for Kona A')).toBeTruthy();
    expect(screen.queryByText(/6\.8|CRITICAL|Acidic Alert/)).toBeNull();

    fireEvent.press(screen.getByText('Add a soil test'));
    fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Enter at least one measurement.')).toBeTruthy();

    fireEvent.changeText(screen.getAllByPlaceholderText('Not measured')[0], '5.2');
    fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Soil test saved.')).toBeTruthy();
    expect(useKilimoStore.getState().syncQueue[0]).toMatchObject({
      type: 'soil_test_create',
      payload: { plot_id: 'p1', ph: 5.2 },
    });
    expect(screen.getAllByText('Waiting to sync').length).toBeGreaterThan(0);
    expect(screen.getByText('pH 5.2: strongly acidic')).toBeTruthy();
  });

  it('shows the farmer’s recorded values and a trend of their real readings', async () => {
    const row = (id: string, tested_on: string, ph: number | null, extra: Row = {}) => ({
      id,
      plot_id: 'p1',
      tested_on,
      ph,
      nitrogen_pct: null,
      phosphorus_ppm: null,
      potassium_ppm: null,
      organic_matter_pct: null,
      source: 'lab',
      created_at: '2026-09-01T00:00:00Z',
      ...extra,
    });
    backend({
      farms: [farm],
      plots: [plotA],
      soil_tests: [row('s-new', '2026-08-01', 6.4, { phosphorus_ppm: 12 }), row('s-old', '2026-02-01', 5.9)],
    });
    render(<SoilAnalysis />);
    expect(await screen.findByText('pH 6.4: within the usual range')).toBeTruthy();
    expect(screen.getByText('pH over time (2 tests)')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getAllByText('not measured').length).toBeGreaterThan(0);
  });
});

/* ── crop planning ─────────────────────────────────────────────────────────────────────────── */
describe('Crop planning', () => {
  it('shows general guidance only (no invented yields/prices) and adds 3 real tasks', async () => {
    backend({ farms: [farm], plots: [plotA] });
    render(<CropPlanningScreen />);
    expect(screen.queryByText(/TSh|t\/eka|Mavuno\/Eka/)).toBeNull();
    fireEvent.press(screen.getByText('Masika (long rains) · Mar–May'));
    fireEvent.press(screen.getByText('Plan Maize'));
    fireEvent.changeText(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), '2026-03-10');
    fireEvent.press(await screen.findByText('Kona A'));
    fireEvent.press(screen.getByText('Add 3 tasks to my schedule'));
    expect(mockCreateTask).toHaveBeenCalledTimes(3);
    expect(mockCreateTask.mock.calls[0][0]).toMatchObject({
      title: 'Plant Maize',
      titleSw: 'Panda Mahindi',
      farmBlock: 'Kona A',
    });
    expect(mockCreateTask.mock.calls[2][0].dueDate.slice(0, 10)).toBe('2026-07-08');
    expect(screen.getByText('Tasks added')).toBeTruthy();
  });

  it('is fully localised in Swahili', () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    render(<CropPlanningScreen />);
    expect(screen.getByText('Upangaji wa mazao')).toBeTruthy();
    expect(screen.getByText('Mwongozo wa jumla, si mpango wa shamba lako')).toBeTruthy();
  });
});

/* ── farm twin ─────────────────────────────────────────────────────────────────────────────── */
describe('Farm twin', () => {
  it('starts empty (no seed scenarios) and can start a scenario from a real plot', async () => {
    backend({ farms: [farm], plots: [plotA] });
    render(<FarmTwinList />);
    expect(screen.getByText('No scenarios yet')).toBeTruthy();
    expect(screen.queryByText(/Hali ya Sasa|Hali Bora|Moisture|GATE/)).toBeNull();
    fireEvent.press(screen.getByText('Start from one of my plots'));
    fireEvent.press(await screen.findByText('Kona A'));
    const sc = useDigitalFarmTwinStore.getState().scenarios;
    expect(sc).toHaveLength(1);
    expect(sc[0]).toMatchObject({
      name: 'Kona A',
      inputs: { crop: 'Mpunga', areaHa: 1.5 },
      source: { plotId: 'p1', plotName: 'Kona A', cropMatched: true, areaMissing: false },
    });
    expect(mockPush).toHaveBeenCalledWith(`/farm-twin/${sc[0].id}`);
  });

  it('editor labels results as estimates, localises advice and saves the farmer’s changes', () => {
    useDigitalFarmTwinStore.setState({
      scenarios: [
        {
          id: 'sc1',
          name: 'Mine',
          createdAt: 'x',
          updatedAt: 'x',
          inputs: DEFAULT_INPUTS,
          output: runTwinModel(DEFAULT_INPUTS),
        },
      ],
    });
    mockParams = { id: 'sc1' };
    render(<ScenarioEditor />);
    expect(screen.getAllByText('Estimates from your own inputs').length).toBeGreaterThan(0);
    expect(screen.getByText('Suggestions from the model')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Increase Area'));
    fireEvent.press(screen.getByText('Save'));
    expect(useDigitalFarmTwinStore.getState().scenarios[0].inputs.areaHa).toBe(2.5);
  });

  it('an unknown scenario id shows an honest not-found state', () => {
    mockParams = { id: 's1' };
    render(<ScenarioEditor />);
    expect(screen.getByText('Scenario not found')).toBeTruthy();
  });
});
