/**
 * IoT sensors — a farmer's own device register and hand-logged readings.
 *
 * This screen used to be a hardware SIMULATION (fake drones, fake sensors, fake "connected" states).
 * It is now honest: you register a device, log readings by hand, and see the latest value, a trend and
 * a small chart for what YOU logged. Automatic ingestion from hardware is not connected, and the screen
 * says so. `last_seen_at` is only ever set by a future server-side service, so until then every device
 * truthfully reads "no data received from this device".
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ArrowDownRight, ArrowUpRight, Cpu, Minus, Plus, Trash2 } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
  TextField,
} from '../components/ui';
import { MIN_TOUCH_TARGET } from '../components/ui/a11y';
import { useTheme } from '../constants/Theme';
import { useIot } from '../hooks/useIot';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import type { TranslationKey } from '../lib/i18n/en';
import {
  DEVICE_KINDS,
  KIND_METRICS,
  METRICS,
  deviceHealth,
  failed,
  formatValue,
  hasErrors,
  isMetricId,
  kindKey,
  latestReadingsForDevice,
  metricKey,
  parseDecimal,
  readingsForMetric,
  sparkPoints,
  summarizeWindow,
  validateDeviceInput,
  validateReadingInput,
  type DeviceErrors,
  type DeviceHealth,
  type DeviceKind,
  type IotDevice,
  type IotReading,
  type ReadingErrors,
  type Trend,
} from '../lib/iot';
import { timeAgoKey } from '../lib/timeAgo';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;
type FormState = null | { type: 'device' } | { type: 'reading'; deviceId: string };

const DAY_MS = 86_400_000;
const HEALTH_BADGE: Record<DeviceHealth, 'success' | 'warning' | 'error' | 'neutral'> = {
  fresh: 'success',
  stale: 'warning',
  offline: 'error',
  never_reported: 'neutral',
};

export default function IotSystemsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();

  const denied = (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('iot.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <EmptyState title={t('iot.gate.title')} description={t('iot.gate.body')} />
    </SafeAreaView>
  );

  return (
    <Gate feature="iot_systems" fallback={denied}>
      <IotScreen />
    </Gate>
  );
}

function IotScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const iot = useIot();
  const { devices, readings, loading, loaded, error, isOffline } = iot;

  const [form, setForm] = useState<FormState>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(id);
  }, [flash]);

  const writeError = (reason: string) =>
    reason === 'offline' ? t('iot.write.offline') : t('iot.write.failed');

  const confirmDeleteDevice = (d: IotDevice) =>
    Alert.alert(t('iot.delete.device.confirmTitle', { name: d.name }), t('iot.delete.device.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('iot.delete.device'),
        style: 'destructive',
        onPress: async () => {
          const r = await iot.removeDevice(d.id);
          if (failed(r)) Alert.alert(t('state.error.title'), writeError(r.reason));
        },
      },
    ]);

  const confirmDeleteReading = (r: IotReading) =>
    Alert.alert(t('iot.reading.delete.confirmTitle'), t('iot.reading.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('iot.reading.delete.action'),
        style: 'destructive',
        onPress: async () => {
          const res = await iot.removeReading(r.id);
          if (failed(res)) Alert.alert(t('state.error.title'), writeError(res.reason));
        },
      },
    ]);

  // ── body ────────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (loading && !loaded) {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        {[0, 1].map((i) => (
          <SkeletonBlock key={i} height={160} radius={16} style={{ marginBottom: spacing.md }} />
        ))}
      </SkeletonGroup>
    );
  } else if (error === 'not_configured') {
    body = <EmptyState title={t('iot.unconfigured')} />;
  } else if (!loaded) {
    // Either the first load failed, or we are offline and have never loaded anything.
    body = (
      <ErrorState
        title={t('iot.error.title')}
        description={isOffline ? t('iot.offline.banner') : t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={iot.refresh}
      />
    );
  } else {
    body = (
      <>
        {error ? (
          <AlertCard
            variant="warning"
            title={t('iot.error.title')}
            actionLabel={t('common.retry')}
            onAction={iot.refresh}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {flash ? (
          <AlertCard variant="success" title={flash} announce style={{ marginBottom: spacing.md }} />
        ) : null}

        {form?.type === 'device' ? (
          <DeviceForm
            t={t}
            onCancel={() => setForm(null)}
            onSave={async (input) => {
              const r = await iot.addDevice(input);
              if (failed(r)) return writeError(r.reason);
              setForm(null);
              setFlash(t('iot.device.saved'));
              return null;
            }}
          />
        ) : devices.length > 0 ? (
          <Button
            label={t('iot.add')}
            icon={<Plus size={20} color={colors.textOnPrimary} />}
            onPress={() => setForm({ type: 'device' })}
            size="md"
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {devices.length === 0 && form?.type !== 'device' ? (
          <EmptyState
            title={t('iot.empty.title')}
            description={t('iot.empty.body')}
            icon={<Cpu size={48} color={colors.primary} />}
            actionLabel={t('iot.add')}
            onAction={() => setForm({ type: 'device' })}
            style={{ flex: 0 }}
          />
        ) : null}

        {devices.map((d) => {
          const own = readings.filter((r) => r.deviceId === d.id);
          return (
            <View key={d.id} style={{ marginBottom: spacing.md }}>
              <DeviceCard
                t={t}
                device={d}
                readings={own}
                onLog={() => setForm({ type: 'reading', deviceId: d.id })}
                onDelete={() => confirmDeleteDevice(d)}
                onDeleteReading={confirmDeleteReading}
              />
              {form?.type === 'reading' && form.deviceId === d.id ? (
                <ReadingForm
                  t={t}
                  device={d}
                  onCancel={() => setForm(null)}
                  onSave={async (metric, value) => {
                    const r = await iot.addReading({ deviceId: d.id, metric, value });
                    if (failed(r)) return writeError(r.reason);
                    setForm(null);
                    setFlash(t('iot.reading.saved'));
                    return null;
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('iot.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={loading && loaded} onRefresh={iot.refresh} />
          }
        >
          {isOffline ? (
            <OfflineBanner message={t('iot.offline.banner')} style={{ marginBottom: spacing.md }} />
          ) : null}
          <AlertCard
            variant="info"
            title={t('iot.notice.title')}
            body={t('iot.notice.body')}
            style={{ marginBottom: spacing.lg }}
          />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── device card ─────────────────────────────────────────────────────────────────────────── */
function agoText(t: Translate, iso: string, now: number) {
  const { key, params } = timeAgoKey(iso, now);
  return t(key, params);
}

function DeviceCard({
  t,
  device,
  readings,
  onLog,
  onDelete,
  onDeleteReading,
}: {
  t: Translate;
  device: IotDevice;
  readings: IotReading[];
  onLog: () => void;
  onDelete: () => void;
  onDeleteReading: (r: IotReading) => void;
}) {
  const { colors, spacing } = useTheme();
  const now = Date.now();
  const [picked, setPicked] = useState<string | null>(null);

  const latest = useMemo(() => latestReadingsForDevice(readings, device.id), [readings, device.id]);
  const active = latest.find((r) => r.metric === picked)?.metric ?? latest[0]?.metric ?? null;
  const series = useMemo(
    () => (active ? readingsForMetric(readings, device.id, active) : []),
    [readings, device.id, active]
  );
  const stats = summarizeWindow(series, { windowMs: 7 * DAY_MS, now });
  const health = deviceHealth(device, now);
  const activeLatest = latest.find((r) => r.metric === active) ?? null;
  const unit = activeLatest?.unit ?? '';
  const metricName = (m: string) => t(metricKey(m));

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{device.name}</AppText>
          <AppText variant="small" tone="muted">
            {[t(kindKey(device.kind)), device.location].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <Badge
          label={t(`iot.health.${health === 'never_reported' ? 'never' : health}` as TranslationKey)}
          variant={HEALTH_BADGE[health]}
        />
      </View>
      {device.lastSeenAt ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {t('iot.health.lastSeen', { ago: agoText(t, device.lastSeenAt, now) })}
        </AppText>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        {latest.length === 0 ? (
          <AppText variant="body" tone="muted">
            {t('iot.reading.none')}
          </AppText>
        ) : (
          <>
            {latest.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
                {latest.map((r) => (
                  <Chip
                    key={r.metric}
                    label={metricName(r.metric)}
                    selected={r.metric === active}
                    onPress={() => setPicked(r.metric)}
                  />
                ))}
              </View>
            ) : null}

            {activeLatest ? (
              <>
                <AppText variant="caption" tone="muted" uppercase>
                  {t('iot.reading.latest')} · {metricName(activeLatest.metric)}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs2 }}>
                  <AppText variant="display" accessibilityLabel={`${formatValue(activeLatest.value)} ${unit}`}>
                    {formatValue(activeLatest.value)}
                  </AppText>
                  <AppText variant="h3" tone="muted">
                    {unit}
                  </AppText>
                </View>
                <AppText variant="caption" tone="muted">
                  {t('iot.reading.typedBy', { ago: agoText(t, activeLatest.recordedAt, now) })}
                </AppText>
              </>
            ) : null}

            <TrendRow t={t} trend={stats.trend} />
            <Sparkline
              readings={series}
              label={t('iot.chart.label', { metric: active ? metricName(active) : '', count: series.length })}
            />
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
              {stats.count > 0 && stats.min !== null && stats.max !== null && stats.avg !== null
                ? `${t('iot.stats.window')}: ${t('iot.stats.minmax', {
                    min: formatValue(stats.min),
                    max: formatValue(stats.max),
                    avg: formatValue(stats.avg),
                  })} ${unit}`
                : t('iot.stats.none')}
            </AppText>

            <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
              {t('iot.reading.recent')}
            </AppText>
            {[...series].reverse().slice(0, 5).map((r) => {
              const ago = agoText(t, r.recordedAt, now);
              return (
                <View
                  key={r.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: MIN_TOUCH_TARGET,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <AppText variant="body" style={{ flex: 1 }}>
                    {formatValue(r.value)} {r.unit ?? ''} · {ago}
                  </AppText>
                  <Pressable
                    onPress={() => onDeleteReading(r)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('iot.reading.delete', { value: `${formatValue(r.value)} ${r.unit ?? ''}`.trim(), ago })}
                    style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={18} color={colors.errorText} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button
          label={t('iot.reading.log')}
          onPress={onLog}
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
        />
        <Button
          label={t('iot.delete.device')}
          variant="destructiveOutline"
          onPress={onDelete}
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

function TrendRow({ t, trend }: { t: Translate; trend: Trend }) {
  const { colors, spacing } = useTheme();
  const Icon = trend === 'rising' ? ArrowUpRight : trend === 'falling' ? ArrowDownRight : Minus;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, marginTop: spacing.sm }}>
      {trend !== 'insufficient' ? <Icon size={16} color={colors.textMute} /> : null}
      <AppText variant="smallStrong" tone="muted">
        {t(`iot.trend.${trend}` as TranslationKey)}
      </AppText>
    </View>
  );
}

/** Tiny time-based line chart of what the farmer logged. Decorative-plus-label: the numbers are listed below it. */
function Sparkline({ readings, label }: { readings: IotReading[]; label: string }) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(280);
  const height = 64;
  const pts = sparkPoints(readings, width, height);
  if (pts.length === 0) return null;
  const last = pts[pts.length - 1];
  return (
    <View
      onLayout={(e) => setWidth(Math.max(80, Math.round(e.nativeEvent.layout.width)))}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ marginTop: spacing.sm, height }}
    >
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.border} strokeWidth={1} />
        {pts.length > 1 ? (
          <Polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={last.x} cy={last.y} r={4} fill={colors.primary} />
      </Svg>
    </View>
  );
}

/* ── forms ───────────────────────────────────────────────────────────────────────────────── */
function DeviceForm({
  t,
  onSave,
  onCancel,
}: {
  t: Translate;
  onSave: (input: { name: string; kind: DeviceKind; location: string }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { spacing } = useTheme();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeviceKind | ''>('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<DeviceErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e = validateDeviceInput({ name, kind, location });
    setErrors(e);
    if (hasErrors(e) || kind === '') {
      setFailure(t('iot.form.invalid'));
      return;
    }
    setBusy(true);
    setFailure(null);
    const msg = await onSave({ name, kind, location });
    setBusy(false);
    if (msg) setFailure(msg);
  };

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <AppText variant="h3" accessibilityRole="header">
        {t('iot.form.device.title')}
      </AppText>
      <TextField
        label={t('iot.form.name')}
        placeholder={t('iot.form.name.ph')}
        value={name}
        onChangeText={setName}
        maxLength={80}
        error={errors.name ? t('iot.form.invalid') : undefined}
        wrapperStyle={{ marginTop: spacing.md }}
        testID="iot-device-name"
      />
      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {t('iot.form.kind')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {DEVICE_KINDS.map((k) => (
          <Chip key={k} label={t(kindKey(k))} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      {errors.kind ? (
        <AppText variant="caption" tone="error" style={{ marginTop: spacing.xs }}>
          {t('iot.form.invalid')}
        </AppText>
      ) : null}
      <TextField
        label={t('iot.form.location')}
        placeholder={t('iot.form.location.ph')}
        value={location}
        onChangeText={setLocation}
        maxLength={120}
        wrapperStyle={{ marginTop: spacing.lg }}
        testID="iot-device-location"
      />
      {failure ? (
        <AppText variant="small" tone="error" accessibilityLiveRegion="polite" style={{ marginBottom: spacing.sm }}>
          {failure}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button label={t('iot.form.save')} onPress={submit} loading={busy} size="md" />
        <Button label={t('common.cancel')} onPress={onCancel} variant="ghost" size="md" disabled={busy} />
      </View>
    </Card>
  );
}

function ReadingForm({
  t,
  device,
  onSave,
  onCancel,
}: {
  t: Translate;
  device: IotDevice;
  onSave: (metric: string, value: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { spacing } = useTheme();
  const options = KIND_METRICS[device.kind];
  const [metric, setMetric] = useState<string>(options[0]);
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<ReadingErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const spec = isMetricId(metric) ? METRICS[metric] : null;

  const submit = async () => {
    const e = validateReadingInput({ deviceId: device.id, metric, value });
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    setFailure(null);
    const msg = await onSave(metric, String(parseDecimal(value)));
    setBusy(false);
    if (msg) setFailure(msg);
  };

  return (
    <Card variant="tinted" style={{ marginTop: spacing.sm }}>
      <AppText variant="h3" accessibilityRole="header">
        {t('iot.reading.form.title', { name: device.name })}
      </AppText>
      <AppText variant="label" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
        {t('iot.reading.metric')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((m) => (
          <Chip
            key={m}
            label={t(metricKey(m))}
            selected={metric === m}
            onPress={() => {
              setMetric(m);
              setErrors({});
            }}
          />
        ))}
      </View>
      <TextField
        label={t('iot.reading.value', { unit: spec?.unit ?? '' })}
        value={value}
        onChangeText={(v) => setValue(v.replace(/[^0-9.,-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        error={
          errors.value && spec
            ? t('iot.reading.invalid', { min: spec.min, max: spec.max, unit: spec.unit })
            : undefined
        }
        wrapperStyle={{ marginTop: spacing.lg }}
        testID="iot-reading-value"
      />
      {failure ? (
        <AppText variant="small" tone="error" accessibilityLiveRegion="polite" style={{ marginBottom: spacing.sm }}>
          {failure}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button label={t('iot.reading.save')} onPress={submit} loading={busy} size="md" />
        <Button label={t('common.cancel')} onPress={onCancel} variant="ghost" size="md" disabled={busy} />
      </View>
    </Card>
  );
}
