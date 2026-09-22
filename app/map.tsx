/**
 * Farm map — the farmer's REAL plots (KIL-003).
 *
 * Replaces a hard-coded FIELDS_LIST ("Corn field · 12 ha"), a constant "+16°C" weather card, fake
 * NDVI/moisture layers and a voice line claiming "pH 6.4". Now:
 *  - plots come from `plots` (owner-only RLS) via useFarms; only plots with a drawn boundary are
 *    placed on the map — a plot has no other coordinates, so nothing is placed at a guessed spot;
 *  - the farmer can draw a boundary by tapping corners on the map and save it to plots.boundary
 *    (online-only; native maps only — the web build has no interactive map);
 *  - weather is OpenWeather's current conditions for the farm's region, or no card at all.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Cloud, CloudLightning, CloudRain, MapPin, PenLine, Snowflake, Sun } from 'lucide-react-native';

import MapView, { Marker, Polygon } from '../components/MapViewWrapper';
import { FarmDataState } from '../components/farmtools/FarmDataState';
import { plotSubtitle } from '../components/farmtools/PlotPicker';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  ListGroup,
  ListRow,
  OfflineBanner,
  ScreenHeader,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useFarms } from '../hooks/useFarms';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import {
  centroid,
  COUNTRY_REGION,
  MAX_BOUNDARY_POINTS,
  plotsWithBoundary,
  polygonAreaHa,
  regionForBoundaries,
  setPlotBoundary,
  toMapCoords,
} from '../lib/farmGeo';
import { formatHa, type LatLng, type Plot } from '../lib/farms';
import { useT, type TranslationKey } from '../lib/i18n';
import { getSupabase } from '../lib/supabase';
import { fetchCurrent, weatherConfigured, type CurrentWeather } from '../lib/weather';
import { useKilimoStore } from '../store/useKilimoStore';

const MAP_AVAILABLE = Platform.OS !== 'web';

type Notice = { variant: 'success' | 'warning' | 'danger'; text: string } | null;

const CONDITION_KEY: Record<CurrentWeather['condition'], TranslationKey> = {
  sun: 'planning.weather.cond.sun',
  cloud: 'planning.weather.cond.cloud',
  rain: 'planning.weather.cond.rain',
  storm: 'planning.weather.cond.storm',
  snow: 'planning.weather.cond.snow',
};

/** Current weather for a place name, or null (not configured / offline / failed). Never a constant. */
function useCurrentWeather(location: string | null, isOffline: boolean) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  useEffect(() => {
    let alive = true;
    if (!location || isOffline || !weatherConfigured()) {
      setWeather(null);
      return;
    }
    fetchCurrent(location)
      .then((w) => alive && setWeather(w))
      .catch(() => alive && setWeather(null));
    return () => {
      alive = false;
    };
  }, [location, isOffline]);
  return weather;
}

export default function MapScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const data = useFarms();
  const { farms, plots, loaded, error, isOffline, refresh } = data;
  useRefreshOnFocus(refresh);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Non-null while drawing a boundary for the selected plot. */
  const [draft, setDraft] = useState<LatLng[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const mapRef = useRef<any>(null);

  const farmById = useMemo(() => new Map(farms.map((f) => [f.id, f])), [farms]);
  const mapped = useMemo(() => plotsWithBoundary(plots), [plots]);
  const selected = plots.find((p) => p.id === selectedId) ?? null;
  const allRegion = useMemo(() => regionForBoundaries(mapped.map((p) => p.boundary)), [mapped]);

  const weatherPlace =
    (selected && farmById.get(selected.farmId)?.region) ||
    farms.find((f) => f.region)?.region ||
    farmProfile?.region ||
    null;
  const weather = useCurrentWeather(weatherPlace, isOffline);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goShamba = () => router.push('/(tabs)/fields' as any);

  const focus = useCallback((region: any) => {
    if (region) mapRef.current?.animateToRegion?.(region, 400);
  }, []);

  // When plots first load (or a boundary is added), frame all mapped plots.
  useEffect(() => {
    if (!draft && !selectedId) focus(allRegion);
  }, [allRegion, focus, draft, selectedId]);

  const selectPlot = (p: Plot) => {
    setNotice(null);
    setDraft(null);
    setSelectedId(p.id === selectedId ? null : p.id);
    if (p.boundary) focus(regionForBoundaries([p.boundary]));
  };

  const failureText = (reason?: string) =>
    reason === 'offline'
      ? t('planning.map.offlineWrite')
      : reason === 'not_found'
        ? t('planning.map.err.notFound')
        : reason === 'invalid'
          ? t('planning.map.err.invalid')
          : t('planning.map.err.generic');

  const saveBoundary = async (pts: LatLng[] | null) => {
    if (!selected) return;
    if (isOffline) {
      setNotice({ variant: 'warning', text: failureText('offline') });
      return;
    }
    setSaving(true);
    const r = await setPlotBoundary(getSupabase(), selected.id, pts);
    setSaving(false);
    if (r.ok) {
      setDraft(null);
      setNotice({
        variant: 'success',
        text: t(pts ? 'planning.map.saved' : 'planning.map.removed', { name: selected.name }),
      });
      refresh();
    } else {
      setNotice({ variant: 'danger', text: failureText(r.reason) });
    }
  };

  const confirmRemove = () => {
    if (!selected) return;
    Alert.alert(t('planning.map.remove.title'), t('planning.map.remove.body', { name: selected.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('planning.map.remove.cta'), style: 'destructive', onPress: () => saveBoundary(null) },
    ]);
  };

  const onMapPress = (e: any) => {
    if (!draft) return;
    const c = e?.nativeEvent?.coordinate;
    if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;
    if (draft.length >= MAX_BOUNDARY_POINTS) return;
    setDraft([...draft, { lat: c.latitude, lng: c.longitude }]);
  };

  const blocking = <FarmDataState data={data} onAddPlot={goShamba} emptyBody={t('planning.map.empty.body')} />;
  const blocked = !(loaded && plots.length > 0);
  const draftArea = draft && draft.length >= 3 ? formatHa(polygonAreaHa(draft)) : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
        title={t('planning.map.title')}
        subtitle={
          loaded && plots.length > 0
            ? t('planning.map.subtitle', { mapped: mapped.length, total: plots.length })
            : undefined
        }
      />
      {isOffline && <OfflineBanner message={t('state.offline.banner')} />}

      {MAP_AVAILABLE && !blocked && (
        <View style={styles.mapBox} testID="farm-map">
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={allRegion ?? COUNTRY_REGION}
            mapType="hybrid"
            onPress={onMapPress}
            accessibilityLabel={t('planning.map.a11y', { n: mapped.length })}
          >
            {mapped.map((p) => {
              const c = centroid(p.boundary);
              const isSel = p.id === selectedId;
              return (
                <React.Fragment key={p.id}>
                  <Polygon
                    coordinates={toMapCoords(p.boundary as LatLng[])}
                    strokeColor={isSel ? colors.accent ?? colors.primary : '#FFFFFF'}
                    strokeWidth={isSel ? 3 : 2}
                    fillColor={isSel ? 'rgba(46,111,64,0.35)' : 'rgba(46,111,64,0.18)'}
                    tappable={!draft}
                    onPress={() => !draft && selectPlot(p)}
                  />
                  {c && (
                    <Marker
                      coordinate={{ latitude: c.lat, longitude: c.lng }}
                      title={p.name}
                      description={plotSubtitle(t, lang, p, farmById.get(p.farmId))}
                      pinColor={isSel ? 'orange' : 'green'}
                      onPress={() => !draft && selectPlot(p)}
                    />
                  )}
                </React.Fragment>
              );
            })}
            {draft && draft.length >= 3 && (
              <Polygon
                coordinates={toMapCoords(draft)}
                strokeColor="#F59E0B"
                strokeWidth={3}
                fillColor="rgba(245,158,11,0.25)"
              />
            )}
            {draft?.map((pt, i) => (
              <Marker
                key={`v${i}`}
                coordinate={{ latitude: pt.lat, longitude: pt.lng }}
                pinColor="yellow"
                title={t('planning.map.draw.point', { n: i + 1 })}
              />
            ))}
          </MapView>
          {!allRegion && !draft && (
            <View style={styles.mapHint} pointerEvents="none">
              <AppText variant="caption" style={{ color: '#fff', textAlign: 'center' }}>
                {t('planning.map.noBoundaries')}
              </AppText>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {!!notice && <AlertCard variant={notice.variant} title={notice.text} announce />}
        {!!error && loaded && (
          <AlertCard
            variant="warning"
            title={t('planning.error.plots')}
            actionLabel={t('common.retry')}
            onAction={refresh}
          />
        )}

        {blocked ? (
          blocking
        ) : (
          <>
            {!MAP_AVAILABLE && (
              <AlertCard variant="info" title={t('planning.map.webOnly')} />
            )}

            {weather && !draft && (
              <Card accessibilityLabel={weatherLabel(t, weather)} accessible>
                <View style={styles.row}>
                  <WeatherIcon condition={weather.condition} color={colors.primary} />
                  <View style={styles.flex}>
                    <AppText variant="label">
                      {t('planning.weather.now', { place: weather.location })}
                    </AppText>
                    <AppText variant="small" tone="muted">
                      {t('planning.weather.line', {
                        temp: weather.temp,
                        cond: t(CONDITION_KEY[weather.condition]),
                        humidity: weather.humidity,
                        wind: weather.windKph,
                      })}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                  {t('planning.weather.source')}
                </AppText>
              </Card>
            )}

            {draft && selected ? (
              <Card>
                <AppText variant="h3" accessibilityRole="header">
                  {t('planning.map.draw.title', { name: selected.name })}
                </AppText>
                <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
                  {t('planning.map.draw.help')}
                </AppText>
                <AppText variant="label" style={{ marginTop: spacing.sm }} accessibilityLiveRegion="polite">
                  {t('planning.map.draw.count', { n: draft.length })}
                  {draftArea ? `  ·  ${t('planning.map.draw.area', { value: draftArea })}` : ''}
                </AppText>
                <View style={[styles.row, { marginTop: spacing.md, gap: spacing.sm }]}>
                  <Button
                    label={t('planning.map.draw.undo')}
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    disabled={draft.length === 0 || saving}
                    onPress={() => setDraft(draft.slice(0, -1))}
                  />
                  <Button
                    label={t('planning.map.draw.clear')}
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    disabled={draft.length === 0 || saving}
                    onPress={() => setDraft([])}
                  />
                </View>
                <Button
                  label={t('planning.map.draw.save')}
                  style={{ marginTop: spacing.md }}
                  disabled={draft.length < 3 || saving || isOffline}
                  loading={saving}
                  onPress={() => saveBoundary(draft)}
                  accessibilityHint={draft.length < 3 ? t('planning.map.draw.need3') : undefined}
                />
                {isOffline && (
                  <AppText variant="caption" tone="warning" style={{ marginTop: spacing.xs }}>
                    {t('planning.map.offlineWrite')}
                  </AppText>
                )}
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  style={{ marginTop: spacing.xs }}
                  disabled={saving}
                  onPress={() => setDraft(null)}
                />
              </Card>
            ) : (
              <>
                <AppText variant="h3" accessibilityRole="header">
                  {t('planning.map.plots')}
                </AppText>
                <ListGroup>
                  {plots.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.name}
                      subtitle={`${plotSubtitle(t, lang, p, farmById.get(p.farmId))} · ${t(
                        p.boundary ? 'planning.map.hasBoundary' : 'planning.map.noBoundary'
                      )}`}
                      leading={<MapPin size={20} color={p.boundary ? colors.primary : colors.textMute} />}
                      selected={p.id === selectedId}
                      onPress={() => selectPlot(p)}
                    />
                  ))}
                </ListGroup>

                {selected && (
                  <Card testID="selected-plot">
                    <AppText variant="h3">{selected.name}</AppText>
                    <AppText variant="small" tone="muted" style={{ marginTop: 2 }}>
                      {plotSubtitle(t, lang, selected, farmById.get(selected.farmId))}
                    </AppText>
                    {selected.boundary && (
                      <AppText variant="small" tone="muted" style={{ marginTop: 2 }}>
                        {t('planning.map.drawnArea', {
                          value: formatHa(polygonAreaHa(selected.boundary)) ?? '—',
                        })}
                      </AppText>
                    )}
                    <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                      {MAP_AVAILABLE && (
                        <Button
                          label={t(selected.boundary ? 'planning.map.redraw' : 'planning.map.draw')}
                          icon={<PenLine size={18} color={colors.onPrimary ?? '#fff'} />}
                          disabled={isOffline}
                          onPress={() => {
                            setNotice(null);
                            setDraft([]);
                          }}
                        />
                      )}
                      <Button
                        label={t('planning.map.planInputs')}
                        variant="outline"
                        onPress={() =>
                          router.push({ pathname: '/vra-setup', params: { plotId: selected.id } } as any)
                        }
                      />
                      <Button
                        label={t('planning.map.openPlot')}
                        variant="outline"
                        onPress={() => router.push(`/field/${selected.id}` as any)}
                      />
                      {selected.boundary && (
                        <Button
                          label={t('planning.map.remove.cta')}
                          variant="destructiveOutline"
                          disabled={isOffline || saving}
                          onPress={confirmRemove}
                        />
                      )}
                    </View>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function weatherLabel(t: ReturnType<typeof useT>['t'], w: CurrentWeather) {
  return `${t('planning.weather.now', { place: w.location })}. ${t('planning.weather.line', {
    temp: w.temp,
    cond: t(CONDITION_KEY[w.condition]),
    humidity: w.humidity,
    wind: w.windKph,
  })}`;
}

function WeatherIcon({ condition, color }: { condition: CurrentWeather['condition']; color: string }) {
  const Icon =
    condition === 'rain'
      ? CloudRain
      : condition === 'storm'
        ? CloudLightning
        : condition === 'snow'
          ? Snowflake
          : condition === 'cloud'
            ? Cloud
            : Sun;
  return <Icon size={28} color={color} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBox: { height: 300, overflow: 'hidden' },
  mapHint: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
