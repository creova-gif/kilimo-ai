import {
  createDevice,
  createReading,
  deleteDevice,
  deleteReading,
  deviceHealth,
  failed,
  fetchDevices,
  fetchReadings,
  formatValue,
  latestReadingByDevice,
  latestReadingsForDevice,
  mapDeviceRow,
  mapReadingRow,
  parseDecimal,
  readingsForMetric,
  sparkPoints,
  summarizeWindow,
  validateDeviceInput,
  validateReadingInput,
  FRESH_MS,
  OFFLINE_MS,
  type IotReading,
} from '../lib/iot';

/** Chainable, thenable fake of the PostgREST builder that records every call. */
function fakeClient(result: { data?: any; error?: { message: string } | null } = { data: [], error: null }) {
  const calls: [string, any[]][] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (res: any) => Promise.resolve(result).then(res);
        return (...args: any[]) => {
          calls.push([prop, args]);
          return builder;
        };
      },
    }
  );
  return { client: { from: jest.fn((t: string) => (calls.push(['from', [t]]), builder)) }, calls };
}
const callsOf = (calls: [string, any[]][], name: string) => calls.filter(([n]) => n === name);

const NOW = Date.parse('2026-09-21T12:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const reading = (over: Partial<IotReading> & { ago?: number } = {}): IotReading => {
  const { ago = 0, ...rest } = over;
  return {
    id: `r${Math.random()}`,
    deviceId: 'd1',
    metric: 'soil_moisture',
    value: 30,
    unit: '%',
    recordedAt: new Date(NOW - ago).toISOString(),
    source: 'manual',
    ...rest,
  };
};

describe('row mapping', () => {
  it('maps a device row, defaulting unknown kinds to other', () => {
    expect(
      mapDeviceRow({
        id: 'd1',
        name: 'North probe',
        kind: 'soil_moisture',
        plot_id: null,
        location: 'Plot 2',
        status: 'registered',
        last_seen_at: null,
        created_at: '2026-09-01T00:00:00Z',
      })
    ).toEqual({
      id: 'd1',
      name: 'North probe',
      kind: 'soil_moisture',
      plotId: null,
      location: 'Plot 2',
      status: 'registered',
      lastSeenAt: null,
      createdAt: '2026-09-01T00:00:00Z',
    });
    expect(mapDeviceRow({ id: 'x', name: 'n', kind: 'drone' }).kind).toBe('other');
  });

  it('maps a reading row with numeric strings', () => {
    expect(
      mapReadingRow({
        id: 'r1',
        device_id: 'd1',
        metric: 'temperature',
        value: '24.5',
        unit: '°C',
        recorded_at: '2026-09-21T10:00:00Z',
        source: 'manual',
      })
    ).toMatchObject({ deviceId: 'd1', value: 24.5, unit: '°C', source: 'manual' });
  });
});

describe('parseDecimal', () => {
  it('accepts dots and decimal commas, rejects junk', () => {
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 12,5 ')).toBe(12.5);
    expect(parseDecimal('-3')).toBe(-3);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
    expect(parseDecimal('12%')).toBeNull();
  });
});

describe('validation', () => {
  it('requires a device name and a real kind', () => {
    expect(validateDeviceInput({ name: 'Probe', kind: 'soil_moisture' })).toEqual({});
    expect(validateDeviceInput({ name: '   ', kind: 'soil_moisture' })).toEqual({ name: true });
    expect(validateDeviceInput({ name: 'x', kind: '' })).toEqual({ kind: true });
    expect(validateDeviceInput({ name: 'x'.repeat(81), kind: 'other' })).toEqual({ name: true });
  });

  it('rejects readings outside the metric’s physical range (slipped decimal point)', () => {
    expect(validateReadingInput({ deviceId: 'd', metric: 'soil_moisture', value: '42' })).toEqual({});
    expect(validateReadingInput({ deviceId: 'd', metric: 'soil_moisture', value: '420' })).toEqual({ value: true });
    expect(validateReadingInput({ deviceId: 'd', metric: 'soil_moisture', value: '-1' })).toEqual({ value: true });
    expect(validateReadingInput({ deviceId: 'd', metric: 'temperature', value: '-5' })).toEqual({});
    expect(validateReadingInput({ deviceId: 'd', metric: 'soil_moisture', value: '' })).toEqual({ value: true });
    expect(validateReadingInput({ deviceId: 'd', metric: 'gravity', value: '1' })).toEqual({ metric: true });
  });
});

describe('fetch', () => {
  it('reports not_configured with no client', async () => {
    expect(await fetchDevices(null)).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(await fetchReadings(undefined)).toMatchObject({ ok: false, reason: 'not_configured' });
  });

  it('an empty table is an empty list, never seeded', async () => {
    const { client } = fakeClient({ data: [], error: null });
    expect(await fetchDevices(client)).toEqual({ ok: true, devices: [] });
    expect(await fetchReadings(client)).toEqual({ ok: true, readings: [] });
  });

  it('scopes readings by device and date and orders newest first', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await fetchReadings(client, { deviceId: 'd1', sinceIso: '2026-08-22T00:00:00Z', limit: 50 });
    expect(callsOf(calls, 'eq')[0][1]).toEqual(['device_id', 'd1']);
    expect(callsOf(calls, 'gte')[0][1]).toEqual(['recorded_at', '2026-08-22T00:00:00Z']);
    expect(callsOf(calls, 'order')[0][1]).toEqual(['recorded_at', { ascending: false }]);
    expect(callsOf(calls, 'limit')[0][1]).toEqual([50]);
  });

  it('surfaces a backend error instead of an empty list', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } });
    const r = await fetchDevices(client);
    expect(r).toMatchObject({ ok: false, reason: 'error', message: 'permission denied' });
    expect(failed(r)).toBe(true);
  });
});

describe('writes', () => {
  it('createDevice inserts only client-owned fields (no user_id) and returns the mapped row', async () => {
    const { client, calls } = fakeClient({
      data: { id: 'd9', name: 'Probe', kind: 'soil_moisture', location: null, status: 'registered', created_at: 'now' },
      error: null,
    });
    const r = await createDevice(client, { name: '  Probe ', kind: 'soil_moisture', location: '' });
    expect(r.ok).toBe(true);
    const payload = callsOf(calls, 'insert')[0][1][0];
    expect(payload).toEqual({ name: 'Probe', kind: 'soil_moisture', location: null });
    expect(payload).not.toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('status'); // stays at the DB default ('registered')
    expect(payload).not.toHaveProperty('last_seen_at'); // only a server-side ingestor may set this
  });

  it('createDevice refuses invalid input without touching the network', async () => {
    const { client } = fakeClient();
    expect(await createDevice(client, { name: '', kind: 'other' })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('createReading always writes source=manual with the metric’s unit', async () => {
    const { client, calls } = fakeClient({
      data: { id: 'r1', device_id: 'd1', metric: 'soil_moisture', value: 41.5, unit: '%', recorded_at: 'now', source: 'manual' },
      error: null,
    });
    const r = await createReading(client, { deviceId: 'd1', metric: 'soil_moisture', value: '41,5' });
    expect(r.ok).toBe(true);
    expect(callsOf(calls, 'insert')[0][1][0]).toEqual({
      device_id: 'd1',
      metric: 'soil_moisture',
      value: 41.5,
      unit: '%',
      source: 'manual',
    });
  });

  it('createReading rejects an out-of-range value locally', async () => {
    const { client } = fakeClient();
    expect(await createReading(client, { deviceId: 'd1', metric: 'soil_moisture', value: '999' })).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('deletes by id and reports errors', async () => {
    const good = fakeClient({ error: null });
    expect(await deleteDevice(good.client, 'd1')).toEqual({ ok: true });
    expect(callsOf(good.calls, 'eq')[0][1]).toEqual(['id', 'd1']);
    expect(await deleteReading(good.client, 'r1')).toEqual({ ok: true });
    const bad = fakeClient({ error: { message: 'nope' } });
    expect(await deleteReading(bad.client, 'r1')).toMatchObject({ ok: false, reason: 'error' });
    expect(await deleteDevice(null, 'd1')).toMatchObject({ ok: false, reason: 'not_configured' });
  });
});

describe('latest readings', () => {
  it('finds the latest reading per device regardless of input order', () => {
    const rs = [
      reading({ id: 'a', deviceId: 'd1', ago: 5 * HOUR, value: 1 }),
      reading({ id: 'b', deviceId: 'd1', ago: 1 * HOUR, value: 2 }),
      reading({ id: 'c', deviceId: 'd2', ago: 3 * HOUR, value: 3 }),
    ];
    const latest = latestReadingByDevice(rs);
    expect(latest.d1.id).toBe('b');
    expect(latest.d2.id).toBe('c');
    expect(latest.d3).toBeUndefined(); // a device with no readings is absent, not invented
  });

  it('gives the latest per metric for one device in canonical metric order', () => {
    const rs = [
      reading({ id: 'a', metric: 'temperature', ago: 2 * HOUR, value: 20 }),
      reading({ id: 'b', metric: 'temperature', ago: 1 * HOUR, value: 22 }),
      reading({ id: 'c', metric: 'soil_moisture', ago: 4 * HOUR, value: 35 }),
      reading({ id: 'x', deviceId: 'other', metric: 'humidity', ago: 1 * HOUR }),
    ];
    const out = latestReadingsForDevice(rs, 'd1');
    expect(out.map((r) => r.id)).toEqual(['c', 'b']); // soil_moisture before temperature
  });

  it('returns one metric oldest → newest for charting', () => {
    const rs = [
      reading({ id: 'new', ago: 1 * HOUR }),
      reading({ id: 'old', ago: 9 * HOUR }),
      reading({ id: 'mid', ago: 4 * HOUR }),
      reading({ id: 'skip', metric: 'temperature', ago: 2 * HOUR }),
    ];
    expect(readingsForMetric(rs, 'd1', 'soil_moisture').map((r) => r.id)).toEqual(['old', 'mid', 'new']);
  });
});

describe('summarizeWindow', () => {
  it('reports nothing (not zeros) for an empty window', () => {
    expect(summarizeWindow([], { windowMs: 7 * DAY, now: NOW })).toEqual({
      count: 0,
      min: null,
      max: null,
      avg: null,
      first: null,
      last: null,
      delta: null,
      trend: 'insufficient',
    });
  });

  it('computes min / max / avg over only the readings inside the window', () => {
    const rs = [
      reading({ ago: 10 * DAY, value: 99 }), // outside a 7-day window
      reading({ ago: 6 * DAY, value: 20 }),
      reading({ ago: 3 * DAY, value: 40 }),
      reading({ ago: 1 * DAY, value: 30 }),
    ];
    const s = summarizeWindow(rs, { windowMs: 7 * DAY, now: NOW });
    expect(s).toMatchObject({ count: 3, min: 20, max: 40, avg: 30, first: 20, last: 30, delta: 10 });
  });

  it('a single reading gives no trend', () => {
    expect(summarizeWindow([reading({ ago: HOUR })], { windowMs: DAY, now: NOW }).trend).toBe('insufficient');
  });

  it('calls a clear rise / fall, and treats small wobble as steady', () => {
    const rising = [reading({ ago: 3 * DAY, value: 20 }), reading({ ago: 2 * DAY, value: 30 }), reading({ ago: 1 * DAY, value: 45 })];
    expect(summarizeWindow(rising, { windowMs: 7 * DAY, now: NOW }).trend).toBe('rising');
    const falling = [reading({ ago: 3 * DAY, value: 45 }), reading({ ago: 1 * DAY, value: 20 })];
    expect(summarizeWindow(falling, { windowMs: 7 * DAY, now: NOW }).trend).toBe('falling');
    const wobble = [reading({ ago: 3 * DAY, value: 30 }), reading({ ago: 2 * DAY, value: 45 }), reading({ ago: 1 * DAY, value: 30.5 })];
    expect(summarizeWindow(wobble, { windowMs: 7 * DAY, now: NOW }).trend).toBe('steady');
    const flat = [reading({ ago: 2 * DAY, value: 30 }), reading({ ago: 1 * DAY, value: 30 })];
    expect(summarizeWindow(flat, { windowMs: 7 * DAY, now: NOW }).trend).toBe('steady');
  });

  it('ignores readings stamped in the future', () => {
    const s = summarizeWindow([reading({ ago: -HOUR, value: 1000 }), reading({ ago: HOUR, value: 10 })], {
      windowMs: DAY,
      now: NOW,
    });
    expect(s.count).toBe(1);
    expect(s.max).toBe(10);
  });
});

describe('deviceHealth (from last_seen_at only)', () => {
  const at = (ago: number) => ({ lastSeenAt: new Date(NOW - ago).toISOString() });

  it('a device the server has never heard from is never_reported — manual readings do not change that', () => {
    expect(deviceHealth({ lastSeenAt: null }, NOW)).toBe('never_reported');
    expect(deviceHealth({ lastSeenAt: 'garbage' }, NOW)).toBe('never_reported');
  });

  it('fresh → stale → offline by age', () => {
    expect(deviceHealth(at(10 * 60_000), NOW)).toBe('fresh');
    expect(deviceHealth(at(FRESH_MS), NOW)).toBe('fresh');
    expect(deviceHealth(at(FRESH_MS + 1), NOW)).toBe('stale');
    expect(deviceHealth(at(OFFLINE_MS), NOW)).toBe('stale');
    expect(deviceHealth(at(OFFLINE_MS + 1), NOW)).toBe('offline');
  });

  it('supports custom thresholds and clock skew (last seen in the future)', () => {
    expect(deviceHealth(at(2 * HOUR), NOW, { freshMs: HOUR, offlineMs: 4 * HOUR })).toBe('stale');
    expect(deviceHealth(at(-5 * HOUR), NOW)).toBe('fresh');
  });
});

describe('sparkPoints', () => {
  it('returns nothing for no data', () => {
    expect(sparkPoints([], 100, 40)).toEqual([]);
  });

  it('places a lone point mid-chart', () => {
    expect(sparkPoints([{ recordedAt: new Date(NOW).toISOString(), value: 5 }], 100, 40)).toEqual([{ x: 50, y: 20 }]);
  });

  it('spaces x by real time and inverts y (higher value = higher on screen = smaller y)', () => {
    const pts = sparkPoints(
      [
        { recordedAt: new Date(NOW - 10 * DAY).toISOString(), value: 10 },
        { recordedAt: new Date(NOW - 9 * DAY).toISOString(), value: 20 },
        { recordedAt: new Date(NOW).toISOString(), value: 30 },
      ],
      104,
      44,
      2
    );
    expect(pts[0]).toEqual({ x: 2, y: 42 });
    expect(pts[2]).toEqual({ x: 102, y: 2 });
    expect(pts[1].x).toBeCloseTo(2 + 100 * 0.1, 5); // one day of ten, not one third
    expect(pts[1].y).toBeCloseTo(22, 5);
  });

  it('draws a flat series as a level line', () => {
    const pts = sparkPoints(
      [
        { recordedAt: new Date(NOW - DAY).toISOString(), value: 7 },
        { recordedAt: new Date(NOW).toISOString(), value: 7 },
      ],
      100,
      40
    );
    expect(pts.map((p) => p.y)).toEqual([20, 20]);
  });
});

describe('formatValue', () => {
  it('trims noise', () => {
    expect(formatValue(41.5)).toBe('41.5');
    expect(formatValue(30)).toBe('30');
    expect(formatValue(1 / 3)).toBe('0.33');
  });
});
