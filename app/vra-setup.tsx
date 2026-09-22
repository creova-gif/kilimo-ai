/**
 * Input application planner for ONE real plot (KIL-003). Route: `/vra-setup?plotId=<plot uuid>`.
 *
 * Replaces a screen that looked up a hard-coded ZONES entry by `zoneId` and painted a "prescription
 * map" of Math.random() colours. A real variable-rate prescription needs per-zone measurements the
 * app does not have, so this plans an honest uniform rate: the farmer's chosen rate × the plot's
 * recorded area. The plot's drawn boundary (if any) is shown as-is. Nothing is sent to equipment —
 * no equipment integration exists — and the screen says so.
 */
import React, { useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Droplets, ShieldAlert, Target } from 'lucide-react-native';

import MapView, { Polygon } from '../components/MapViewWrapper';
import { FarmDataState } from '../components/farmtools/FarmDataState';
import { PlotPicker, plotSubtitle } from '../components/farmtools/PlotPicker';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  OfflineBanner,
  ScreenHeader,
  TextField,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useFarms } from '../hooks/useFarms';
import { useTasks } from '../hooks/useTasks';
import { regionForBoundaries, toMapCoords } from '../lib/farmGeo';
import { formatHa } from '../lib/farms';
import { translate, useT, type TranslationKey } from '../lib/i18n';
import { applicationPlan, INPUT_KINDS, parseRate, RATE_UNIT, type InputKind } from '../lib/vraCalc';

const KIND_LABEL: Record<InputKind, TranslationKey> = {
  fertilizer: 'planning.vra.kind.fertilizer',
  water: 'planning.vra.kind.water',
  pesticide: 'planning.vra.kind.pesticide',
};
const KIND_TASK: Record<InputKind, TranslationKey> = {
  fertilizer: 'planning.vra.task.fertilizer',
  water: 'planning.vra.task.water',
  pesticide: 'planning.vra.task.pesticide',
};
const KIND_ICON: Record<InputKind, any> = {
  fertilizer: Target,
  water: Droplets,
  pesticide: ShieldAlert,
};

export default function VRASetupScreen() {
  const params = useLocalSearchParams<{ plotId?: string }>();
  const paramId = typeof params.plotId === 'string' && params.plotId ? params.plotId : null;
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const data = useFarms();
  const { farms, plots, loaded, isOffline } = data;
  const { createTask } = useTasks();

  const [chosenId, setChosenId] = useState<string | null>(paramId);
  const [kind, setKind] = useState<InputKind>('fertilizer');
  const [rateText, setRateText] = useState('');
  const [added, setAdded] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const plot = chosenId ? (plots.find((p) => p.id === chosenId) ?? null) : null;
  const unknown = loaded && !!chosenId && !plot;
  const farm = plot ? farms.find((f) => f.id === plot.farmId) : null;

  const rate = parseRate(rateText, kind);
  const rateInvalid = Number.isNaN(rate);
  const plan = plot ? applicationPlan(rateText, kind, plot.areaHa) : null;
  const unit = RATE_UNIT[kind];
  const unitLabel = t(unit === 'kg' ? 'planning.vra.unit.kgHa' : 'planning.vra.unit.lHa');

  const addTask = () => {
    if (!plot || !plan) return;
    const p = {
      plot: plot.name,
      rate: plan.ratePerHa,
      unit,
      total: plan.total === null ? '—' : plan.total,
    };
    createTask({
      title: translate('en', KIND_TASK[kind], p),
      titleSw: translate('sw', KIND_TASK[kind], p),
      description: translate(lang, 'planning.vra.task.desc', p),
      category: kind === 'water' ? 'irrigation' : 'general',
      priority: 'medium',
      status: 'pending',
      xpReward: 10,
      farmBlock: plot.name,
    });
    setAdded(true);
  };

  const blocking = (
    <FarmDataState data={data} onAddPlot={() => router.push('/(tabs)/fields' as any)} />
  );
  const blocked = !(loaded && plots.length > 0);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
        title={t('planning.vra.title')}
        subtitle={plot?.name}
      />
      {isOffline && <OfflineBanner message={t('state.offline.banner')} />}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {blocked ? (
          blocking
        ) : !plot ? (
          <>
            {unknown && (
              <AlertCard
                variant="danger"
                title={t('planning.vra.notFound.title')}
                body={t('planning.vra.notFound.body')}
                announce
              />
            )}
            <PlotPicker
              plots={plots}
              farms={farms}
              title={t('planning.vra.pick')}
              selectedId={chosenId}
              onSelect={(p) => {
                setChosenId(p.id);
                setAdded(false);
              }}
            />
          </>
        ) : (
          <>
            <Card>
              <AppText variant="h3">{plot.name}</AppText>
              <AppText variant="small" tone="muted" style={{ marginTop: 2 }}>
                {plotSubtitle(t, lang, plot, farm)}
              </AppText>
              <Button
                label={t('planning.vra.change')}
                variant="link"
                fullWidth={false}
                style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                onPress={() => {
                  setChosenId(null);
                  setAdded(false);
                }}
              />
            </Card>

            {Platform.OS !== 'web' && plot.boundary && (
              <View style={styles.mapBox}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={regionForBoundaries([plot.boundary]) as any}
                  mapType="hybrid"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  accessibilityLabel={t('planning.vra.mapA11y', { name: plot.name })}
                >
                  <Polygon
                    coordinates={toMapCoords(plot.boundary)}
                    strokeColor="#FFFFFF"
                    strokeWidth={2}
                    fillColor="rgba(46,111,64,0.35)"
                  />
                </MapView>
              </View>
            )}

            <AlertCard variant="info" title={t('planning.vra.uniform.title')} body={t('planning.vra.uniform.body')} />

            <AppText variant="label">{t('planning.vra.kind')}</AppText>
            <View style={[styles.row, { gap: spacing.sm, flexWrap: 'wrap' }]}>
              {INPUT_KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <Chip
                    key={k}
                    label={t(KIND_LABEL[k])}
                    selected={kind === k}
                    leading={<Icon size={16} color={kind === k ? '#fff' : colors.text} />}
                    onPress={() => {
                      setKind(k);
                      setAdded(false);
                    }}
                  />
                );
              })}
            </View>

            <TextField
              label={t('planning.vra.rate', { unit: unitLabel })}
              value={rateText}
              onChangeText={(v) => {
                setRateText(v);
                setAdded(false);
              }}
              keyboardType="decimal-pad"
              placeholder={t('planning.vra.rate.placeholder')}
              error={rateInvalid ? t('planning.vra.rate.invalid') : undefined}
              hint={t('planning.vra.rate.hint')}
            />

            {plan && (
              <Card testID="vra-plan">
                <AppText variant="label">{t('planning.vra.result')}</AppText>
                {plan.total !== null ? (
                  <AppText variant="h2" style={{ marginTop: spacing.xs }}>
                    {t('planning.vra.total', { total: plan.total, unit })}
                  </AppText>
                ) : (
                  <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
                    {t('planning.vra.noArea')}
                  </AppText>
                )}
                <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                  {plot.areaHa !== null
                    ? t('planning.vra.basis', {
                        rate: plan.ratePerHa,
                        unit: unitLabel,
                        area: formatHa(plot.areaHa) ?? '—',
                      })
                    : t('planning.vra.basisNoArea')}
                </AppText>
                {plot.areaHa === null && (
                  <Button
                    label={t('planning.vra.setArea')}
                    variant="link"
                    fullWidth={false}
                    style={{ alignSelf: 'flex-start' }}
                    onPress={() => router.push(`/field/${plot.id}` as any)}
                  />
                )}
                <Button
                  label={t(added ? 'planning.vra.taskAdded' : 'planning.vra.addTask')}
                  style={{ marginTop: spacing.md }}
                  disabled={added}
                  onPress={addTask}
                />
                {added && (
                  <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }} accessibilityLiveRegion="polite">
                    {t(isOffline ? 'planning.task.queuedOffline' : 'planning.task.queued')}
                  </AppText>
                )}
              </Card>
            )}

            <AlertCard variant="warning" title={t('planning.vra.noEquipment')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mapBox: { height: 220, borderRadius: 16, overflow: 'hidden' },
});
