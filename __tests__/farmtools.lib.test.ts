jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../lib/supabase', () => ({ getSupabase: () => null, supabase: null }));
// Keep queued writes in the store without starting a network drain.
jest.mock('../lib/offline', () => {
  const actual = jest.requireActual('../lib/offline');
  return {
    ...actual,
    enqueueAction: (a: any) =>
      require('../store/useKilimoStore').useKilimoStore.getState().enqueueAction(a),
  };
});

import { runTwinModel } from '../lib/farmtwin/model';
import {
  centroid,
  COUNTRY_REGION,
  polygonAreaHa,
  regionForBoundaries,
  setPlotBoundary,
} from '../lib/farmGeo';
import {
  dropSeedScenarios,
  fmtTZS,
  matchTwinCrop,
  prefillFromPlot,
  SEED_SCENARIO_IDS,
  twinAdvice,
} from '../lib/farmTwinPlots';
import { buildPlanTasks, CROP_GUIDES, SEASONS, seasonForMonth } from '../lib/cropPlan';
import { applicationPlan, parseRate } from '../lib/vraCalc';
import {
  deleteSoilTest,
  fetchSoilTests,
  mergeSoilTests,
  pendingSoilTests,
  phBand,
  phSeries,
  queueSoilTest,
  SOIL_TEST_SYNC_TYPE,
  toSoilTestRow,
  validateSoilTestInput,
  type SoilTest,
} from '../lib/soilTests';
import { getSyncTypeConfig } from '../lib/syncQueue';
import { en } from '../lib/i18n/en';
import { sw } from '../lib/i18n/sw';
import { useDigitalFarmTwinStore, DEFAULT_INPUTS, MAX_SCENARIOS } from '../store/useDigitalFarmTwinStore';
import { useKilimoStore } from '../store/useKilimoStore';

/* ── farmGeo ───────────────────────────────────────────────────────────────────────────────── */
describe('farmGeo', () => {
  // ~100 m × ~100 m square near the equator ≈ 1 ha
  const d = 100 / 111_320;
  const square = [
    { lat: -6.8, lng: 37.6 },
    { lat: -6.8, lng: 37.6 + d / Math.cos((6.8 * Math.PI) / 180) },
    { lat: -6.8 + d, lng: 37.6 + d / Math.cos((6.8 * Math.PI) / 180) },
    { lat: -6.8 + d, lng: 37.6 },
  ];

  it('computes an approximate polygon area in hectares', () => {
    const a = polygonAreaHa(square) as number;
    expect(a).toBeGreaterThan(0.98);
    expect(a).toBeLessThan(1.02);
    expect(polygonAreaHa(square.slice(0, 2))).toBeNull();
  });

  it('centroid and region come only from real boundaries', () => {
    expect(centroid(null)).toBeNull();
    const c = centroid(square)!;
    expect(c.lat).toBeCloseTo(-6.8 + d / 2, 6);
    expect(regionForBoundaries([null, undefined])).toBeNull();
    const r = regionForBoundaries([square])!;
    expect(r.latitude).toBeCloseTo(c.lat, 6);
    expect(r.latitudeDelta).toBeGreaterThanOrEqual(0.003);
    expect(COUNTRY_REGION.latitudeDelta).toBeGreaterThan(5);
  });

  it('setPlotBoundary updates only the boundary column and reports not_found honestly', async () => {
    const calls: any[] = [];
    const client = (data: any) => ({
      from: (table: string) => {
        const b: any = {
          update: (p: any) => (calls.push({ table, p }), b),
          eq: () => b,
          select: () => b,
          maybeSingle: () => Promise.resolve({ data, error: null }),
        };
        return b;
      },
    });
    expect(await setPlotBoundary(null, 'p1', square)).toEqual({ ok: false, reason: 'not_configured' });
    expect(await setPlotBoundary(client(null), 'p1', square.slice(0, 2))).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(calls).toHaveLength(0);

    const missing = await setPlotBoundary(client(null), 'p1', square);
    expect(missing).toEqual({ ok: false, reason: 'not_found' });
    expect(calls[0]).toEqual({ table: 'plots', p: { boundary: square } });

    const ok = await setPlotBoundary(
      client({ id: 'p1', farm_id: 'f1', name: 'A', status: 'growing', boundary: square }),
      'p1',
      square
    );
    expect(ok.ok).toBe(true);
    expect(ok.data?.boundary).toHaveLength(4);

    await setPlotBoundary(client({ id: 'p1', farm_id: 'f1', name: 'A', boundary: null }), 'p1', null);
    expect(calls[calls.length - 1].p).toEqual({ boundary: null });
  });
});

/* ── farm twin ─────────────────────────────────────────────────────────────────────────────── */
describe('farm twin helpers', () => {
  it('matches free-text plot crops to model crops, or null', () => {
    expect(matchTwinCrop('Mahindi (Maize)')).toBe('Mahindi');
    expect(matchTwinCrop('sweet maize')).toBe('Mahindi');
    expect(matchTwinCrop('Maharage')).toBe('Maharagwe');
    expect(matchTwinCrop('Muhogo')).toBe('Mihogo');
    expect(matchTwinCrop('Avocado')).toBeNull();
    expect(matchTwinCrop(null)).toBeNull();
  });

  it('prefills only crop and area from a plot, flagging adjustments', () => {
    expect(prefillFromPlot({ crop: 'Rice', areaHa: 1.5 })).toEqual({
      inputs: { crop: 'Mpunga', areaHa: 1.5 },
      crop: 'Mpunga',
      areaHa: 1.5,
      areaAdjusted: false,
    });
    const tiny = prefillFromPlot({ crop: 'Avocado', areaHa: 0.1 });
    expect(tiny.crop).toBeNull();
    expect(tiny.inputs).toEqual({ areaHa: 0.5 });
    expect(tiny.areaAdjusted).toBe(true);
    expect(prefillFromPlot({ crop: null, areaHa: null })).toEqual({
      inputs: {},
      crop: null,
      areaHa: null,
      areaAdjusted: false,
    });
  });

  it('drops only the two known demo scenarios', () => {
    expect(SEED_SCENARIO_IDS).toEqual(['s1', 's2']);
    expect(dropSeedScenarios([{ id: 's1' }, { id: 'sc_1' }, { id: 's2' }])).toEqual([{ id: 'sc_1' }]);
    expect(dropSeedScenarios(undefined)).toEqual([]);
    expect(dropSeedScenarios('junk')).toEqual([]);
  });

  it('localised advice follows the same rules as the model (one key per model tip)', () => {
    const cases = [
      DEFAULT_INPUTS,
      { ...DEFAULT_INPUTS, rainfallMm: 150, fertilizerKgHa: 0, soilHealth: 20, plantingDensityPct: 150 },
      { ...DEFAULT_INPUTS, fertilizerKgHa: 400, plantingDensityPct: 50, irrigated: true },
      { ...DEFAULT_INPUTS, crop: 'Nyanya' as const, rainfallMm: 2000, soilHealth: 10 },
    ];
    for (const c of cases) {
      const out = runTwinModel(c);
      const keys = twinAdvice(c, out);
      expect(keys).toHaveLength(out.advice.length);
      for (const k of keys) {
        expect(en[k.key]).toBeTruthy();
        expect(sw[k.key]).toBeTruthy();
      }
    }
    const low = twinAdvice({ ...DEFAULT_INPUTS, fertilizerKgHa: 0 }, runTwinModel({ ...DEFAULT_INPUTS, fertilizerKgHa: 0 }));
    expect(low.find((a) => a.key === 'planning.twin.advice.fertLow')?.params).toEqual({ rec: 120 });
  });

  it('formats shillings with the sign', () => {
    expect(fmtTZS(1234567.4)).toBe('TSh 1,234,567');
    expect(fmtTZS(-5000)).toBe('-TSh 5,000');
  });
});

describe('useDigitalFarmTwinStore', () => {
  beforeEach(() => useDigitalFarmTwinStore.setState({ scenarios: [] }));

  it('starts empty and reset() clears to empty (no seed scenarios)', () => {
    useDigitalFarmTwinStore.getState().reset();
    expect(useDigitalFarmTwinStore.getState().scenarios).toEqual([]);
    useDigitalFarmTwinStore.getState().createScenario('Mine');
    useDigitalFarmTwinStore.getState().reset();
    expect(useDigitalFarmTwinStore.getState().scenarios).toEqual([]);
  });

  it('creates a scenario from a plot with its source, and enforces the limit', () => {
    const s = useDigitalFarmTwinStore.getState();
    const id = s.createScenario('Kona A', { crop: 'Mpunga', areaHa: 1.5 }, { plotId: 'p1', plotName: 'Kona A' });
    const sc = useDigitalFarmTwinStore.getState().scenarios.find((x) => x.id === id)!;
    expect(sc.inputs.crop).toBe('Mpunga');
    expect(sc.inputs.areaHa).toBe(1.5);
    expect(sc.source).toEqual({ plotId: 'p1', plotName: 'Kona A' });
    expect(sc.output).toEqual(runTwinModel(sc.inputs));
    for (let i = 1; i < MAX_SCENARIOS; i++) s.createScenario(`x${i}`);
    expect(useDigitalFarmTwinStore.getState().scenarios).toHaveLength(MAX_SCENARIOS);
    expect(s.createScenario('too many')).toBe('');
    expect(s.duplicateScenario(id, 'copy')).toBe('');
  });

  it('drops persisted demo scenarios on rehydrate but keeps the farmer’s own', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const mine = {
      id: 'sc_mine',
      name: 'Mine',
      createdAt: 'x',
      updatedAt: 'x',
      inputs: DEFAULT_INPUTS,
      output: runTwinModel(DEFAULT_INPUTS),
    };
    await AsyncStorage.setItem(
      'kilimo-farm-twin-v1',
      JSON.stringify({
        state: { scenarios: [{ ...mine, id: 's1', name: 'Hali ya Sasa' }, { ...mine, id: 's2' }, mine] },
        version: 0,
      })
    );
    await useDigitalFarmTwinStore.persist.rehydrate();
    expect(useDigitalFarmTwinStore.getState().scenarios.map((s) => s.id)).toEqual(['sc_mine']);
  });
});

/* ── crop planning ─────────────────────────────────────────────────────────────────────────── */
describe('cropPlan', () => {
  it('maps months to seasons', () => {
    expect(seasonForMonth(4)).toBe('masika');
    expect(seasonForMonth(11)).toBe('vuli');
    expect(seasonForMonth(7)).toBe('kiangazi');
    expect(seasonForMonth(1)).toBe('kiangazi');
  });

  it('builds plant / scout / harvest tasks from the chosen planting date', () => {
    const maize = CROP_GUIDES.masika[0];
    const tasks = buildPlanTasks(maize, '2026-03-10')!;
    expect(tasks.map((t) => t.kind)).toEqual(['plant', 'scout', 'harvest']);
    expect(tasks[0].dueDate.slice(0, 10)).toBe('2026-03-10');
    expect(tasks[1].dueDate.slice(0, 10)).toBe('2026-03-24');
    expect(tasks[2].dueDate.slice(0, 10)).toBe('2026-07-08'); // +120 days
    expect(buildPlanTasks(maize, '2026-02-30')).toBeNull();
  });

  it('has no invented yields or prices and every key is translated', () => {
    for (const s of SEASONS) {
      for (const g of CROP_GUIDES[s]) {
        expect(Object.keys(g).sort()).toEqual(['id', 'nameKey', 'tipKeys', 'typicalDays', 'water']);
        for (const k of [g.nameKey, ...g.tipKeys]) {
          expect(en[k]).toBeTruthy();
          expect(sw[k]).toBeTruthy();
        }
      }
    }
  });
});

/* ── VRA calculator ────────────────────────────────────────────────────────────────────────── */
describe('vraCalc', () => {
  it('parses rates and rejects invalid or unrealistic values', () => {
    expect(parseRate('', 'fertilizer')).toBeNull();
    expect(parseRate('50,5', 'fertilizer')).toBe(50.5);
    expect(parseRate('0', 'fertilizer')).toBeNaN();
    expect(parseRate('abc', 'water')).toBeNaN();
    expect(parseRate('500', 'pesticide')).toBeNaN();
  });

  it('total = rate × recorded area; no area → no total', () => {
    expect(applicationPlan('50', 'fertilizer', 1.5)).toEqual({ ratePerHa: 50, total: 75, unit: 'kg' });
    expect(applicationPlan('2', 'pesticide', null)).toEqual({ ratePerHa: 2, total: null, unit: 'L' });
    expect(applicationPlan('x', 'fertilizer', 1)).toBeNull();
  });
});

/* ── soil tests ────────────────────────────────────────────────────────────────────────────── */
describe('soilTests', () => {
  const now = new Date(2026, 8, 21, 12);
  beforeEach(() => useKilimoStore.setState({ syncQueue: [] } as any));

  it('validates: plot, real non-future date, ranges, at least one value', () => {
    expect(validateSoilTestInput({ plotId: 'p1', testedOn: '2026-09-01', ph: '6.2' }, now)).toEqual({});
    const e = validateSoilTestInput(
      { plotId: '', testedOn: '2026-13-01', ph: '15', nitrogenPct: 'x' },
      now
    );
    expect(e).toMatchObject({ plot: true, testedOn: true, ph: true, nitrogenPct: true });
    expect(validateSoilTestInput({ plotId: 'p1', testedOn: '2026-09-30', ph: '6' }, now).future).toBe(true);
    expect(validateSoilTestInput({ plotId: 'p1', testedOn: '2026-09-01' }, now).empty).toBe(true);
  });

  it('maps input to a row with blanks as null (never 0)', () => {
    expect(
      toSoilTestRow({ plotId: 'p1', testedOn: '2026-09-01', ph: '5,4', potassiumPpm: ' ', source: 'kit' }, 'id1')
    ).toEqual({
      id: 'id1',
      plot_id: 'p1',
      tested_on: '2026-09-01',
      ph: 5.4,
      nitrogen_pct: null,
      phosphorus_ppm: null,
      potassium_ppm: null,
      organic_matter_pct: null,
      source: 'kit',
      notes: null,
    });
  });

  it('queues a valid test in the outbox (registered type), and refuses an invalid one', () => {
    expect(getSyncTypeConfig(SOIL_TEST_SYNC_TYPE)).toMatchObject({ table: 'soil_tests', ops: ['insert'] });
    expect(queueSoilTest({ plotId: 'p1', testedOn: '2026-09-01' }, now)).toEqual({ ok: false, reason: 'invalid' });
    expect(useKilimoStore.getState().syncQueue).toHaveLength(0);
    const r = queueSoilTest({ plotId: 'p1', testedOn: '2026-09-01', ph: '6.1' }, now);
    expect(r.ok).toBe(true);
    const q = useKilimoStore.getState().syncQueue;
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ type: 'soil_test_create', payload: { id: r.id, ph: 6.1 } });
    const pending = pendingSoilTests(q);
    expect(pending[0]).toMatchObject({ id: r.id, plotId: 'p1', ph: 6.1, pending: true });
  });

  it('merges server and pending tests without duplicates, newest first', () => {
    const t = (id: string, testedOn: string, pending = false): SoilTest => ({
      id,
      plotId: 'p1',
      testedOn,
      ph: 6,
      nitrogenPct: null,
      phosphorusPpm: null,
      potassiumPpm: null,
      organicMatterPct: null,
      source: 'lab',
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      pending,
    });
    const merged = mergeSoilTests([t('a', '2026-01-01'), t('b', '2026-05-01')], [t('b', '2026-05-01', true), t('c', '2026-03-01', true)]);
    expect(merged.map((x) => [x.id, !!x.pending])).toEqual([
      ['b', false],
      ['c', true],
      ['a', false],
    ]);
    expect(phSeries(merged, 'p1').map((s) => s.testedOn)).toEqual(['2026-01-01', '2026-03-01', '2026-05-01']);
  });

  it('pH bands are broad and null-safe', () => {
    expect(phBand(null)).toBeNull();
    expect(phBand(5.2)).toBe('strongAcid');
    expect(phBand(5.8)).toBe('acid');
    expect(phBand(6.5)).toBe('optimal');
    expect(phBand(7.5)).toBe('alkaline');
    expect(phBand(8.4)).toBe('strongAlkaline');
  });

  it('fetch/delete report not_configured, errors and not_found honestly', async () => {
    expect(await fetchSoilTests(null)).toMatchObject({ ok: false, reason: 'not_configured' });
    const errClient = {
      from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'x' } }) }) }),
    };
    expect(await fetchSoilTests(errClient)).toMatchObject({ ok: false, reason: 'error', tests: [] });
    const delClient = (data: any) => ({
      from: () => ({ delete: () => ({ eq: () => ({ select: () => Promise.resolve({ data, error: null }) }) }) }),
    });
    expect(await deleteSoilTest(delClient([]), 'x')).toEqual({ ok: false, reason: 'not_found' });
    expect(await deleteSoilTest(delClient([{ id: 'x' }]), 'x')).toEqual({ ok: true });
  });
});
