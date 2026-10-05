import React from 'react';
import { View, StyleSheet, Appearance } from 'react-native';

export const PROVIDER_GOOGLE = 'google' as const;
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

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
          color: '#3C4A2A',
          fillColor: '#3C4A2A',
          fillOpacity: 0.25,
          radius: 180
        }).addTo(map);
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

export function Polygon(_props: any) {
  return null;
}
export function Marker({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
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
