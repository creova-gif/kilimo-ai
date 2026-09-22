import {
  acresToHa,
  cropDisplay,
  createFarm,
  createPlot,
  daysFromToday,
  deleteFarm,
  deletePlot,
  farmAreaSummary,
  fetchFarmsAndPlots,
  formatAcres,
  formatHa,
  formatIsoDate,
  hasErrors,
  haToAcres,
  mapFarmRow,
  mapPlotRow,
  parseAreaHa,
  parseBoundary,
  parseIsoDate,
  plotLifecycle,
  prefillFromProfile,
  setPlotStatus,
  tasksForPlot,
  todayIso,
  toFarmRow,
  toPlotRow,
  totalPlotAreaHa,
  updateFarm,
  updatePlot,
  validateFarmInput,
  validatePlotInput,
} from '../lib/farms';

/** Local noon, so timezone offsets never move the calendar day. */
const at = (iso: string) => new Date(`${iso}T12:00:00`);

/** Chainable, thenable fake of the PostgREST builder; results are keyed by `<table>.<verb>`. */
function fakeClient(results: Record<string, { data?: any; error?: any }> = {}) {
  const calls: [string, any[]][] = [];
  const client = {
    from: jest.fn((table: string) => {
      calls.push(['from', [table]]);
      let verb = 'select';
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') {
              return (res: any, rej: any) =>
                Promise.resolve(results[`${table}.${verb}`] ?? { data: [], error: null }).then(
                  res,
                  rej
                );
            }
            return (...args: any[]) => {
              if (prop === 'insert' || prop === 'update' || prop === 'delete') verb = prop;
              calls.push([prop, args]);
              return builder;
            };
          },
        }
      );
      return builder;
    }),
  };
  return { client, calls };
}

const farmRow = {
  id: 'f1',
  name: 'Mpakani',
  region: 'Mbeya',
  area_ha: '2.5000',
  notes: null,
  created_at: '2026-09-21T00:00:00Z',
  updated_at: '2026-09-21T00:00:00Z',
};
const plotRow = {
  id: 'p1',
  farm_id: 'f1',
  name: 'Kona A',
  crop: 'Mahindi (Maize)',
  area_ha: 1,
  planting_date: '2026-09-01',
  expected_harvest: '2026-12-01',
  status: 'growing',
  boundary: null,
  notes: 'sandy',
  created_at: '2026-09-21T00:00:00Z',
  updated_at: '2026-09-21T00:00:00Z',
};

describe('row mapping', () => {
  it('maps a farm row (numeric strings become numbers)', () => {
    expect(mapFarmRow(farmRow)).toMatchObject({
      id: 'f1',
      name: 'Mpakani',
      region: 'Mbeya',
      areaHa: 2.5,
    });
  });

  it('maps a plot row and defaults unknown status to planned', () => {
    expect(mapPlotRow(plotRow)).toMatchObject({
      farmId: 'f1',
      crop: 'Mahindi (Maize)',
      areaHa: 1,
      plantingDate: '2026-09-01',
      expectedHarvest: '2026-12-01',
      status: 'growing',
      boundary: null,
    });
    expect(mapPlotRow({ ...plotRow, status: 'weird' }).status).toBe('planned');
    expect(mapPlotRow({ ...plotRow, area_ha: null }).areaHa).toBeNull();
  });

  it('only accepts a well-formed boundary polygon', () => {
    const poly = [
      { lat: -8.9, lng: 33.4 },
      { lat: -8.9, lng: 33.5 },
      { lat: -9.0, lng: 33.5 },
    ];
    expect(parseBoundary(poly)).toEqual(poly);
    expect(parseBoundary(poly.slice(0, 2))).toBeNull(); // < 3 vertices
    expect(parseBoundary([...poly.slice(0, 2), { lat: 'x', lng: 1 }])).toBeNull();
    expect(parseBoundary([...poly.slice(0, 2), { lat: 95, lng: 1 }])).toBeNull(); // out of range
    expect(parseBoundary(null)).toBeNull();
    expect(mapPlotRow({ ...plotRow, boundary: poly }).boundary).toEqual(poly);
  });
});

describe('area helpers', () => {
  it('parses typed areas in hectares or acres; blank is null, junk is NaN', () => {
    expect(parseAreaHa('2,5', 'ha')).toBe(2.5);
    expect(parseAreaHa('  3.25 ', 'ha')).toBe(3.25);
    expect(parseAreaHa('', 'ha')).toBeNull();
    expect(parseAreaHa(undefined, 'ha')).toBeNull();
    expect(parseAreaHa('abc', 'ha')).toBeNaN();
    expect(parseAreaHa('1.2.3', 'ha')).toBeNaN();
    expect(parseAreaHa('-4', 'ha')).toBeNaN();
    expect(parseAreaHa('0', 'ha')).toBe(0);
    expect(parseAreaHa('5', 'acres')).toBeCloseTo(2.0234, 3);
  });

  it('converts between hectares and acres', () => {
    expect(haToAcres(1)).toBeCloseTo(2.47105, 4);
    expect(acresToHa(haToAcres(3.7))).toBeCloseTo(3.7, 6);
  });

  it('formats areas without trailing zeros and keeps whole hundreds intact', () => {
    expect(formatHa(1.5)).toBe('1.5');
    expect(formatHa(2)).toBe('2');
    expect(formatHa(0)).toBe('0');
    expect(formatHa(100)).toBe('100');
    expect(formatHa(250)).toBe('250');
    expect(formatHa(12.34)).toBe('12.3');
    expect(formatHa(null)).toBeNull();
    expect(formatAcres(1)).toBe('2.47');
    expect(formatAcres(undefined)).toBeNull();
  });

  it('sums known plot areas and counts unknown ones separately (unknown is not zero)', () => {
    expect(totalPlotAreaHa([{ areaHa: 1.5 }, { areaHa: null }, { areaHa: 0.25 }])).toEqual({
      totalHa: 1.75,
      unknownCount: 1,
    });
    expect(totalPlotAreaHa([])).toEqual({ totalHa: 0, unknownCount: 0 });
  });

  it('summarises a farm against its plots, including over-allocation', () => {
    expect(farmAreaSummary({ areaHa: 3 }, [{ areaHa: 1 }, { areaHa: 1.5 }])).toEqual({
      plotCount: 2,
      allocatedHa: 2.5,
      unknownCount: 0,
      unallocatedHa: 0.5,
      overAllocated: false,
    });
    const over = farmAreaSummary({ areaHa: 1 }, [{ areaHa: 2 }]);
    expect(over.overAllocated).toBe(true);
    expect(over.unallocatedHa).toBe(0);
    // No recorded farm size: never claims a remainder.
    expect(farmAreaSummary({ areaHa: null }, [{ areaHa: 2 }]).unallocatedHa).toBeNull();
  });
});

describe('dates', () => {
  it('parses only real calendar dates', () => {
    expect(parseIsoDate('2026-09-21')).toBe(Date.UTC(2026, 8, 21));
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('21/09/2026')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate('2028-02-29')).not.toBeNull(); // leap day
    expect(parseIsoDate('2027-02-29')).toBeNull();
  });

  it('computes whole days from the local today', () => {
    const now = at('2026-09-21');
    expect(todayIso(now)).toBe('2026-09-21');
    expect(daysFromToday('2026-09-21', now)).toBe(0);
    expect(daysFromToday('2026-09-30', now)).toBe(9);
    expect(daysFromToday('2026-09-01', now)).toBe(-20);
    expect(daysFromToday('nope', now)).toBeNull();
  });

  it('formats a date without shifting the day', () => {
    expect(formatIsoDate('2026-09-21', 'en')).toContain('21');
    expect(formatIsoDate('bad', 'en')).toBeNull();
    expect(formatIsoDate(null, 'sw')).toBeNull();
  });
});

describe('plotLifecycle — an estimate from status + dates only', () => {
  const growing = {
    status: 'growing' as const,
    plantingDate: '2026-09-01',
    expectedHarvest: '2026-12-01',
  };

  it('honours the recorded status for planned / harvested / fallow', () => {
    const now = at('2026-10-01');
    expect(plotLifecycle({ ...growing, status: 'planned' }, now)).toMatchObject({
      stage: 'planned',
      progressPct: 0,
    });
    expect(plotLifecycle({ ...growing, status: 'harvested' }, now)).toMatchObject({
      stage: 'harvested',
      progressPct: 100,
    });
    expect(plotLifecycle({ ...growing, status: 'fallow' }, now)).toMatchObject({
      stage: 'fallow',
      progressPct: null,
    });
  });

  it('walks a growing plot through early, mid, late, harvest window and overdue', () => {
    // 2026-09-01 .. 2026-12-01 is 91 days.
    expect(plotLifecycle(growing, at('2026-09-01'))).toMatchObject({
      stage: 'early',
      progressPct: 0,
    });
    expect(plotLifecycle(growing, at('2026-09-20'))).toMatchObject({ stage: 'early' }); // 19/91 = 21%
    expect(plotLifecycle(growing, at('2026-10-16'))).toMatchObject({
      stage: 'mid',
      progressPct: 49,
    }); // 45/91
    expect(plotLifecycle(growing, at('2026-11-10'))).toMatchObject({ stage: 'late' }); // 70/91 = 77%
    expect(plotLifecycle(growing, at('2026-11-25'))).toMatchObject({ stage: 'harvestSoon' }); // 85/91 = 93%
    expect(plotLifecycle(growing, at('2026-12-01'))).toMatchObject({
      stage: 'harvestSoon',
      progressPct: 100,
    });
    const late = plotLifecycle(growing, at('2026-12-05'));
    expect(late).toMatchObject({ stage: 'overdue', progressPct: 100, daysToHarvest: -4 });
  });

  it('reports days since planting and days to harvest', () => {
    const lc = plotLifecycle(growing, at('2026-10-01'));
    expect(lc.daysSincePlanting).toBe(30);
    expect(lc.daysToHarvest).toBe(61);
  });

  it('does not invent progress when the dates are missing', () => {
    const now = at('2026-10-01');
    expect(
      plotLifecycle({ status: 'growing', plantingDate: null, expectedHarvest: null }, now)
    ).toEqual({
      stage: 'growing',
      progressPct: null,
      daysSincePlanting: null,
      daysToHarvest: null,
    });
    const noHarvest = plotLifecycle(
      { status: 'growing', plantingDate: '2026-09-01', expectedHarvest: null },
      now
    );
    expect(noHarvest).toMatchObject({ stage: 'growing', progressPct: null, daysSincePlanting: 30 });
    // Harvest date passed but no planting date: still flagged as overdue, without a fake percentage curve.
    expect(
      plotLifecycle({ status: 'growing', plantingDate: null, expectedHarvest: '2026-09-15' }, now)
    ).toMatchObject({ stage: 'overdue', daysToHarvest: -16 });
  });

  it('a planting date in the future stays at the start rather than going negative', () => {
    const lc = plotLifecycle(growing, at('2026-08-15'));
    expect(lc.progressPct).toBe(0);
    expect(lc.daysSincePlanting).toBe(0);
  });
});

describe('crops and profile prefill', () => {
  it('localizes known crop labels and keeps free text as typed', () => {
    expect(cropDisplay('Mahindi (Maize)', 'en')).toBe('Maize');
    expect(cropDisplay('mahindi (maize)', 'sw')).toBe('Mahindi');
    expect(cropDisplay('Dragon fruit', 'sw')).toBe('Dragon fruit');
    expect(cropDisplay('  ', 'en')).toBeNull();
    expect(cropDisplay(null, 'en')).toBeNull();
  });

  it('builds prefill suggestions from the profile and returns null when there is nothing', () => {
    expect(
      prefillFromProfile({
        region: 'Mbeya',
        farmSizeAcres: 5,
        primaryCrops: ['Mahindi (Maize)', ' '],
      })
    ).toMatchObject({ region: 'Mbeya', areaAcres: 5, crops: ['Mahindi (Maize)'] });
    expect(prefillFromProfile({ region: '', farmSizeAcres: 0, primaryCrops: [] })).toBeNull();
    expect(prefillFromProfile(null)).toBeNull();
  });
});

describe('validation and row building', () => {
  it('requires a farm name and a valid area', () => {
    expect(validateFarmInput({ name: '  ' })).toEqual({ name: true });
    expect(validateFarmInput({ name: 'A', area: 'x1' })).toEqual({ area: true });
    expect(hasErrors(validateFarmInput({ name: 'A', area: '2' }))).toBe(false);
    expect(hasErrors(validateFarmInput({ name: 'A' }))).toBe(false); // area optional
  });

  it('validates plot dates, ordering and boundary', () => {
    expect(validatePlotInput({ name: 'P', plantingDate: '2026-13-40' })).toEqual({
      plantingDate: true,
    });
    expect(validatePlotInput({ name: 'P', expectedHarvest: 'soon' })).toEqual({
      expectedHarvest: true,
    });
    expect(
      validatePlotInput({ name: 'P', plantingDate: '2026-10-01', expectedHarvest: '2026-09-01' })
    ).toEqual({ dateOrder: true });
    expect(validatePlotInput({ name: 'P', boundary: [{ lat: 1, lng: 1 }] })).toEqual({
      boundary: true,
    });
    expect(
      hasErrors(
        validatePlotInput({ name: 'P', plantingDate: '2026-09-01', expectedHarvest: '2026-09-01' })
      )
    ).toBe(false);
  });

  it('builds trimmed rows with blanks as null and converts acres', () => {
    expect(
      toFarmRow({ name: ' Mpakani ', region: '', area: '5', unit: 'acres', notes: '  ' })
    ).toEqual({
      name: 'Mpakani',
      region: null,
      area_ha: 2.0234,
      notes: null,
    });
    expect(
      toPlotRow({
        name: ' Kona ',
        crop: ' Maize ',
        plantingDate: '',
        expectedHarvest: '2026-12-01',
      })
    ).toEqual({
      name: 'Kona',
      crop: 'Maize',
      area_ha: null,
      planting_date: null,
      expected_harvest: '2026-12-01',
      status: 'planned',
      boundary: null,
      notes: null,
    });
  });
});

describe('fetchFarmsAndPlots', () => {
  it('is not_configured without a client', async () => {
    expect(await fetchFarmsAndPlots(null)).toEqual({
      ok: false,
      farms: [],
      plots: [],
      reason: 'not_configured',
    });
  });

  it('returns an honest empty result for an empty account', async () => {
    const { client } = fakeClient();
    expect(await fetchFarmsAndPlots(client)).toEqual({ ok: true, farms: [], plots: [] });
  });

  it('maps real rows from both tables', async () => {
    const { client } = fakeClient({
      'farms.select': { data: [farmRow], error: null },
      'plots.select': { data: [plotRow], error: null },
    });
    const r = await fetchFarmsAndPlots(client);
    expect(r.ok).toBe(true);
    expect(r.farms).toHaveLength(1);
    expect(r.plots[0]).toMatchObject({ id: 'p1', farmId: 'f1' });
  });

  it('surfaces a backend error instead of an empty list', async () => {
    const { client } = fakeClient({ 'plots.select': { data: null, error: { message: 'boom' } } });
    expect(await fetchFarmsAndPlots(client)).toMatchObject({
      ok: false,
      reason: 'error',
      message: 'boom',
    });
  });
});

describe('farm writes', () => {
  it('createFarm inserts the trimmed row and returns the mapped record', async () => {
    const { client, calls } = fakeClient({ 'farms.insert': { data: farmRow, error: null } });
    const r = await createFarm(client, { name: ' Mpakani ', region: 'Mbeya', area: '2.5' });
    expect(r).toMatchObject({ ok: true, data: { id: 'f1', areaHa: 2.5 } });
    expect(calls).toContainEqual([
      'insert',
      [{ name: 'Mpakani', region: 'Mbeya', area_ha: 2.5, notes: null }],
    ]);
  });

  it('never sends user_id (the database defaults it to auth.uid())', async () => {
    const { client, calls } = fakeClient({ 'farms.insert': { data: farmRow, error: null } });
    await createFarm(client, { name: 'A' });
    const insert = calls.find((c) => c[0] === 'insert')![1][0];
    expect(insert).not.toHaveProperty('user_id');
  });

  it('does not call the backend for invalid input', async () => {
    const { client } = fakeClient();
    expect(await createFarm(client, { name: '' })).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('reports not_configured with no client', async () => {
    expect(await createFarm(null, { name: 'A' })).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('maps a unique-violation to duplicate and other errors to error', async () => {
    const dup = fakeClient({
      'farms.insert': { data: null, error: { code: '23505', message: 'duplicate key value' } },
    });
    expect(await createFarm(dup.client, { name: 'A' })).toMatchObject({
      ok: false,
      reason: 'duplicate',
    });
    const bad = fakeClient({ 'farms.insert': { data: null, error: { message: 'nope' } } });
    expect(await createFarm(bad.client, { name: 'A' })).toMatchObject({
      ok: false,
      reason: 'error',
      message: 'nope',
    });
  });

  it('updateFarm reports not_found when RLS matched no row (never a silent success)', async () => {
    const none = fakeClient({ 'farms.update': { data: null, error: null } });
    expect(await updateFarm(none.client, 'f1', { name: 'A' })).toEqual({
      ok: false,
      reason: 'not_found',
    });
    const ok = fakeClient({ 'farms.update': { data: farmRow, error: null } });
    const r = await updateFarm(ok.client, 'f1', { name: 'A' });
    expect(r.ok).toBe(true);
    expect(ok.calls).toContainEqual(['eq', ['id', 'f1']]);
  });

  it('deleteFarm requires a row to have been removed', async () => {
    const gone = fakeClient({ 'farms.delete': { data: [{ id: 'f1' }], error: null } });
    expect(await deleteFarm(gone.client, 'f1')).toEqual({ ok: true });
    const none = fakeClient({ 'farms.delete': { data: [], error: null } });
    expect(await deleteFarm(none.client, 'f1')).toEqual({ ok: false, reason: 'not_found' });
    const err = fakeClient({ 'farms.delete': { data: null, error: { message: 'x' } } });
    expect(await deleteFarm(err.client, 'f1')).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('plot writes', () => {
  it('createPlot attaches the farm id and sends the full plot row', async () => {
    const { client, calls } = fakeClient({ 'plots.insert': { data: plotRow, error: null } });
    const r = await createPlot(client, 'f1', {
      name: 'Kona A',
      crop: 'Mahindi (Maize)',
      area: '1',
      plantingDate: '2026-09-01',
      expectedHarvest: '2026-12-01',
      status: 'growing',
    });
    expect(r).toMatchObject({ ok: true, data: { id: 'p1', status: 'growing' } });
    expect(calls).toContainEqual([
      'insert',
      [
        {
          farm_id: 'f1',
          name: 'Kona A',
          crop: 'Mahindi (Maize)',
          area_ha: 1,
          planting_date: '2026-09-01',
          expected_harvest: '2026-12-01',
          status: 'growing',
          boundary: null,
          notes: null,
        },
      ],
    ]);
  });

  it('rejects a harvest date before the planting date without a network call', async () => {
    const { client } = fakeClient();
    const r = await createPlot(client, 'f1', {
      name: 'P',
      plantingDate: '2026-10-01',
      expectedHarvest: '2026-09-01',
    });
    expect(r).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('updatePlot preserves an existing boundary when it is passed through', async () => {
    const poly = [
      { lat: 1, lng: 1 },
      { lat: 1, lng: 2 },
      { lat: 2, lng: 2 },
    ];
    const { client, calls } = fakeClient({
      'plots.update': { data: { ...plotRow, boundary: poly }, error: null },
    });
    const r = await updatePlot(client, 'p1', { name: 'Kona A', boundary: poly });
    expect(r.data?.boundary).toEqual(poly);
    const update = calls.find((c) => c[0] === 'update')![1][0];
    expect(update.boundary).toEqual(poly);
  });

  it('setPlotStatus updates only the status and validates it', async () => {
    const { client, calls } = fakeClient({
      'plots.update': { data: { ...plotRow, status: 'harvested' }, error: null },
    });
    const r = await setPlotStatus(client, 'p1', 'harvested');
    expect(r.data?.status).toBe('harvested');
    expect(calls).toContainEqual(['update', [{ status: 'harvested' }]]);
    expect(await setPlotStatus(client, 'p1', 'bogus' as any)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('deletePlot requires a row to have been removed', async () => {
    const ok = fakeClient({ 'plots.delete': { data: [{ id: 'p1' }], error: null } });
    expect(await deletePlot(ok.client, 'p1')).toEqual({ ok: true });
    const none = fakeClient({ 'plots.delete': { data: [], error: null } });
    expect(await deletePlot(none.client, 'p1')).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('tasksForPlot', () => {
  const tasks = [
    { id: '1', farmBlock: 'Kona A' },
    { id: '2', farmBlock: ' kona a ' },
    { id: '3', farmBlock: 'Kona B' },
    { id: '4', farmBlock: undefined },
    { id: '5', farmBlock: null },
  ];

  it('links tasks whose farm_block equals the plot name, ignoring case and padding', () => {
    expect(tasksForPlot(tasks, { name: 'Kona A' }).map((t) => t.id)).toEqual(['1', '2']);
  });

  it('never matches tasks without a block, or a plot without a name', () => {
    expect(tasksForPlot(tasks, { name: '   ' })).toEqual([]);
    expect(tasksForPlot(tasks, { name: 'Nowhere' })).toEqual([]);
  });
});
