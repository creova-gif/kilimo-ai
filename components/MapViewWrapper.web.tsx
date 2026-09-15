import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

export const PROVIDER_GOOGLE = 'google' as const;
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface PolygonProps {
  coordinates: { latitude: number; longitude: number }[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  tappable?: boolean;
  onPress?: () => void;
}

// Declarative marker for a native map overlay, mirroring react-native-maps:
// on native this never renders its own DOM/view — the map itself draws the
// shape from these props. MapView below reads props straight off Polygon
// children (React.Children.toArray + type check) to build the Leaflet
// overlay; Polygon itself must keep returning null.
export function Polygon(_props: PolygonProps) {
  return null;
}
export function Marker({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

// '#RRGGBBAA' (used throughout this app for fillColor, e.g. `${hex}80`) —
// split into a plain '#RRGGBB' Leaflet can render everywhere plus a
// separate 0–1 fillOpacity, rather than relying on 8-digit hex support.
function splitAlphaHex(color: string | undefined, fallbackOpacity: number) {
  if (color && /^#[0-9a-fA-F]{8}$/.test(color)) {
    const base = color.slice(0, 7);
    const alpha = parseInt(color.slice(7, 9), 16) / 255;
    return { color: base, opacity: alpha };
  }
  return { color: color ?? '#2E6F40', opacity: fallbackOpacity };
}

let nextMapId = 0;

export function MapView({
  style,
  children,
  region,
}: {
  style?: any;
  children?: React.ReactNode;
  mapType?: string;
  region?: Region;
}) {
  // Default coordinates to Tanzania farm center if not provided
  const lat = region?.latitude ?? -6.828;
  const lng = region?.longitude ?? 37.6695;
  const zoom = 14;

  const mapId = useMemo(() => `kilimo-map-${nextMapId++}`, []);

  const polygons = useMemo(
    () =>
      React.Children.toArray(children)
        .filter(
          (child): child is React.ReactElement<PolygonProps> =>
            React.isValidElement(child) && child.type === Polygon
        )
        .map((child, i) => ({ id: i, ...child.props })),
    [children]
  );

  // Polygon onPress can't cross into the sandboxed iframe directly, so the
  // injected Leaflet script postMessages a {mapId, polyId} pair on click
  // and this listener dispatches back to the matching React callback.
  const onPressRef = useRef<Record<number, (() => void) | undefined>>({});
  onPressRef.current = Object.fromEntries(polygons.map((p) => [p.id, p.onPress]));

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e?.data;
      if (data?.type === 'kilimo-polygon-press' && data?.mapId === mapId) {
        onPressRef.current[data.polyId]?.();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mapId]);

  const polygonScript = polygons
    .map((p) => {
      const coords = JSON.stringify((p.coordinates ?? []).map((c) => [c.latitude, c.longitude]));
      const fill = splitAlphaHex(p.fillColor, 0.35);
      const stroke = splitAlphaHex(p.strokeColor, 1).color;
      const weight = p.strokeWidth ?? 1;
      const clickable = p.tappable && p.onPress;
      return `
        (function () {
          var poly = L.polygon(${coords}, {
            color: ${JSON.stringify(stroke)},
            weight: ${weight},
            fillColor: ${JSON.stringify(fill.color)},
            fillOpacity: ${fill.opacity}
          }).addTo(map);
          ${
            clickable
              ? `poly.on('click', function () {
                   window.parent.postMessage({ type: 'kilimo-polygon-press', mapId: ${JSON.stringify(mapId)}, polyId: ${p.id} }, '*');
                 });
                 poly.getElement && poly.on('add', function () {
                   var el = poly.getElement();
                   if (el) el.style.cursor = 'pointer';
                 });`
              : ''
          }
        })();
      `;
    })
    .join('\n');

  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: #0A0D0A;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${lat}, ${lng}], ${zoom});

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        }).addTo(map);

        L.circle([${lat}, ${lng}], {
          color: '#2E6F40',
          fillColor: '#2E6F40',
          fillOpacity: 0.25,
          radius: 180
        }).addTo(map);

        ${polygonScript}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.stub, style]}>
      <iframe
        srcDoc={srcDoc}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Satellite Map Tiles"
      />
      {children}
    </View>
  );
}

export default MapView;

const styles = StyleSheet.create({
  stub: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
