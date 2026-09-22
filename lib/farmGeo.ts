/**
 * Map helpers for the farmer's real plots (KIL-003): turning `plots.boundary` polygons into map
 * regions, centroids and an approximate drawn area, and saving a boundary the farmer drew.
 *
 * Plots only have a location when the farmer has drawn a boundary — there is no other coordinate
 * on a plot — so a plot without one is never placed on the map at a guessed position.
 */
import { parseBoundary, mapPlotRow, type LatLng, type MutationResult, type Plot } from './farms';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Whole-country view of Tanzania: the neutral starting view when no plot has a boundary yet. */
export const COUNTRY_REGION: MapRegion = {
  latitude: -6.37,
  longitude: 34.89,
  latitudeDelta: 11,
  longitudeDelta: 11,
};

/** A boundary may have at most this many vertices (keeps the jsonb small and taps deliberate). */
export const MAX_BOUNDARY_POINTS = 60;

export const toMapCoords = (pts: LatLng[]) =>
  pts.map((p) => ({ latitude: p.lat, longitude: p.lng }));

/** Vertex average — good enough to place a label/marker inside a small field polygon. */
export function centroid(pts: LatLng[] | null | undefined): LatLng | null {
  if (!pts || pts.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const p of pts) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / pts.length, lng: lng / pts.length };
}

/** Region that fits every given polygon (with padding), or null when there are none. */
export function regionForBoundaries(
  boundaries: (LatLng[] | null | undefined)[],
  opts: { pad?: number; minDelta?: number } = {}
): MapRegion | null {
  const pad = opts.pad ?? 1.5;
  const minDelta = opts.minDelta ?? 0.003;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let any = false;
  for (const b of boundaries) {
    if (!b) continue;
    for (const p of b) {
      any = true;
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
  }
  if (!any) return null;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * pad),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * pad),
  };
}

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Approximate area (hectares) enclosed by a polygon, using a local equirectangular projection
 * and the shoelace formula. Accurate to well under 1% for field-sized polygons. It is the area of
 * the shape the farmer DREW, not a survey — screens label it as approximate.
 */
export function polygonAreaHa(pts: LatLng[] | null | undefined): number | null {
  if (!pts || pts.length < 3) return null;
  const lat0 = rad(pts.reduce((s, p) => s + p.lat, 0) / pts.length);
  const xy = pts.map((p) => ({
    x: EARTH_RADIUS_M * rad(p.lng) * Math.cos(lat0),
    y: EARTH_RADIUS_M * rad(p.lat),
  }));
  let twice = 0;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i];
    const b = xy[(i + 1) % xy.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.round((Math.abs(twice) / 2 / 10_000) * 10_000) / 10_000;
}

/** Plots that can be drawn on the map (well-formed boundary). */
export const plotsWithBoundary = (plots: Plot[]) => plots.filter((p) => !!p.boundary);

/**
 * Save (or, with `null`, remove) a plot's boundary. Updates ONLY the boundary column, so the
 * farmer's other plot fields are never rewritten from a stale copy. Reports `not_found` when RLS
 * matched no row, so a caller is never told "saved" when nothing changed.
 */
export async function setPlotBoundary(
  client: any | null | undefined,
  id: string,
  boundary: LatLng[] | null
): Promise<MutationResult<Plot>> {
  if (!client) return { ok: false, reason: 'not_configured' };
  if (boundary !== null) {
    const parsed = parseBoundary(boundary);
    if (!parsed || parsed.length > MAX_BOUNDARY_POINTS) return { ok: false, reason: 'invalid' };
    boundary = parsed;
  }
  try {
    const { data, error } = await client
      .from('plots')
      .update({ boundary })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return { ok: false, reason: 'error', message: error.message };
    if (!data) return { ok: false, reason: 'not_found' };
    return { ok: true, data: mapPlotRow(data) };
  } catch (e: any) {
    return { ok: false, reason: 'error', message: e?.message ?? String(e) };
  }
}
