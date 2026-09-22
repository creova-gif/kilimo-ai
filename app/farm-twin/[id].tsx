/**
 * Digital Farm Twin — scenario editor (KIL-003).
 *
 * A what-if simulator: the farmer sets the inputs and the deterministic model in
 * lib/farmtwin/model.ts recomputes on every change. Every result is an ESTIMATE from those inputs
 * only (no sensor, satellite or market data), and the screen says so. All copy is localised.
 */
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  MIN_TOUCH_TARGET,
  ScreenHeader,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { runTwinModel } from '../../lib/farmtwin/model';
import {
  CROP_LABEL_KEY,
  fmtTZS,
  SOIL_LABEL_KEY,
  TWIN_AREA_MAX,
  TWIN_AREA_MIN,
  TWIN_CROPS,
  TWIN_SOIL_TYPES,
  twinAdvice,
} from '../../lib/farmTwinPlots';
import { useT } from '../../lib/i18n';
import { useDigitalFarmTwinStore, type TwinInputs } from '../../store/useDigitalFarmTwinStore';

const fmtN = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  onChange,
  step,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const btn = (sign: -1 | 1) => {
    const disabled = sign < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(sign < 0 ? 'planning.twin.decrease' : 'planning.twin.increase', { label })}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(Math.min(max, Math.max(min, round1(value + sign * step))))}
        style={[
          styles.stepBtn,
          { borderColor: colors.border, backgroundColor: colors.card, opacity: disabled ? 0.4 : 1 },
        ]}
      >
        <AppText variant="h3">{sign < 0 ? '−' : '+'}</AppText>
      </Pressable>
    );
  };
  return (
    <View style={[styles.row, { paddingVertical: spacing.xs }]} accessible={false}>
      <View style={styles.flex}>
        <AppText variant="small" tone="muted">
          {label}
        </AppText>
        <AppText variant="label" accessibilityLiveRegion="polite">
          {value} {unit}
        </AppText>
      </View>
      <View style={[styles.row, { gap: spacing.sm }]}>
        {btn(-1)}
        {btn(1)}
      </View>
    </View>
  );
}

export default function ScenarioEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const scenario = useDigitalFarmTwinStore((s) => s.scenarios.find((sc) => sc.id === id));
  const updateInputs = useDigitalFarmTwinStore((s) => s.updateInputs);
  const [inputs, setInputs] = useState<TwinInputs | null>(scenario?.inputs ?? null);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/farm-twin' as any));

  if (!scenario || !inputs) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader showBack onBack={goBack} backLabel={t('common.back')} title={t('planning.twin.title')} />
        <EmptyState
          title={t('planning.twin.notFound.title')}
          description={t('planning.twin.notFound.body')}
          actionLabel={t('common.back')}
          onAction={goBack}
        />
      </SafeAreaView>
    );
  }

  const output = runTwinModel(inputs);
  const advice = twinAdvice(inputs, output);
  const patch = (p: Partial<TwinInputs>) => setInputs((prev) => ({ ...(prev as TwinInputs), ...p }));
  const dirty = JSON.stringify(inputs) !== JSON.stringify(scenario.inputs);
  const src = scenario.source;

  const save = () => {
    updateInputs(scenario.id, inputs);
    goBack();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
        title={scenario.name}
        subtitle={t('planning.twin.editor.subtitle')}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
        {!!src && (
          <AlertCard
            variant="info"
            title={t('planning.twin.fromPlotName', { plot: src.plotName })}
            body={[
              t('planning.twin.source.copied'),
              src.cropMatched === false ? t('planning.twin.source.cropUnmatched') : null,
              src.areaMissing ? t('planning.twin.source.areaMissing') : null,
              src.areaAdjusted
                ? t('planning.twin.source.areaAdjusted', { min: TWIN_AREA_MIN, max: TWIN_AREA_MAX })
                : null,
            ]
              .filter(Boolean)
              .join('\n')}
          />
        )}

        <AppText variant="h3" accessibilityRole="header">
          {t('planning.twin.inputs')}
        </AppText>
        <Card>
          <AppText variant="label">{t('planning.twin.crop')}</AppText>
          <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.xs }]}>
            {TWIN_CROPS.map((c) => (
              <Chip key={c} label={t(CROP_LABEL_KEY[c])} selected={inputs.crop === c} onPress={() => patch({ crop: c })} />
            ))}
          </View>
          <AppText variant="label" style={{ marginTop: spacing.md }}>
            {t('planning.twin.soilType')}
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.xs }]}>
            {TWIN_SOIL_TYPES.map((s) => (
              <Chip
                key={s}
                label={t(SOIL_LABEL_KEY[s])}
                selected={inputs.soilType === s}
                onPress={() => patch({ soilType: s })}
              />
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Stepper
              label={t('planning.twin.area')}
              value={inputs.areaHa}
              unit="ha"
              min={TWIN_AREA_MIN}
              max={TWIN_AREA_MAX}
              step={0.5}
              onChange={(v) => patch({ areaHa: v })}
            />
            <Stepper
              label={t('planning.twin.rain')}
              value={inputs.rainfallMm}
              unit="mm"
              min={100}
              max={2000}
              step={50}
              onChange={(v) => patch({ rainfallMm: v })}
            />
            <Stepper
              label={t('planning.twin.fert')}
              value={inputs.fertilizerKgHa}
              unit="kg/ha"
              min={0}
              max={400}
              step={20}
              onChange={(v) => patch({ fertilizerKgHa: v })}
            />
            <Stepper
              label={t('planning.twin.density')}
              value={inputs.plantingDensityPct}
              unit="%"
              min={50}
              max={150}
              step={10}
              onChange={(v) => patch({ plantingDensityPct: v })}
            />
            <Stepper
              label={t('planning.twin.soilHealth')}
              value={inputs.soilHealth}
              unit="/100"
              min={10}
              max={100}
              step={5}
              onChange={(v) => patch({ soilHealth: v })}
            />
            <AppText variant="caption" tone="muted">
              {t('planning.twin.soilHealth.note')}
            </AppText>
          </View>

          <View style={[styles.row, { marginTop: spacing.md, minHeight: MIN_TOUCH_TARGET }]}>
            <View style={styles.flex}>
              <AppText variant="label">{t('planning.twin.irrigation')}</AppText>
              <AppText variant="caption" tone="muted">
                {t(inputs.irrigated ? 'planning.twin.irrigation.on' : 'planning.twin.irrigation.off')}
              </AppText>
            </View>
            <Switch
              value={inputs.irrigated}
              onValueChange={(v) => patch({ irrigated: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel={t('planning.twin.irrigation')}
            />
          </View>
        </Card>

        <AppText variant="h3" accessibilityRole="header">
          {t('planning.twin.results')}
        </AppText>
        <AlertCard variant="warning" title={t('planning.twin.estimate.title')} body={t('planning.twin.results.note')} />
        <Card testID="twin-results">
          <Stat label={t('planning.twin.res.yield')} value={t('planning.twin.tonnes', { value: output.totalYieldTonnes })} />
          <Stat label={t('planning.twin.res.yieldHa')} value={t('planning.twin.tonnesHa', { value: output.yieldTonnesHa })} />
          <Stat label={t('planning.twin.res.revenue')} value={fmtTZS(output.revenuesTZS)} />
          <Stat label={t('planning.twin.res.cost')} value={fmtTZS(output.totalCostTZS)} />
          <Stat label={t('planning.twin.res.profit')} value={fmtTZS(output.netProfitTZS)} tone={output.netProfitTZS < 0 ? 'error' : 'default'} />
          <Stat label={t('planning.twin.res.roi')} value={`${output.roi}%`} />
          {inputs.irrigated && (
            <Stat label={t('planning.twin.res.water')} value={`${fmtN(output.waterUsageM3)} m³`} />
          )}
        </Card>

        <Card>
          <AppText variant="label">{t('planning.twin.costs')}</AppText>
          <Stat label={t('planning.twin.cost.seed')} value={fmtTZS(output.costBreakdown.seed)} />
          <Stat label={t('planning.twin.cost.fert')} value={fmtTZS(output.costBreakdown.fertilizer)} />
          <Stat label={t('planning.twin.cost.labor')} value={fmtTZS(output.costBreakdown.labor)} />
          {output.costBreakdown.irrigation > 0 && (
            <Stat label={t('planning.twin.cost.water')} value={fmtTZS(output.costBreakdown.irrigation)} />
          )}
          <Stat label={t('planning.twin.cost.other')} value={fmtTZS(output.costBreakdown.overhead)} />
        </Card>

        <Card>
          <AppText variant="label">{t('planning.twin.risk')}</AppText>
          <Stat label={t('planning.twin.risk.drought')} value={`${output.riskBreakdown.drought}/100`} />
          <Stat label={t('planning.twin.risk.pest')} value={`${output.riskBreakdown.pest}/100`} />
          <Stat label={t('planning.twin.risk.market')} value={`${output.riskBreakdown.market}/100`} />
          <Stat label={t('planning.twin.risk.overall')} value={`${output.riskScore}/100`} />
        </Card>

        <Card variant="tinted">
          <AppText variant="label">{t('planning.twin.advice')}</AppText>
          {advice.map((a) => (
            <View key={a.key} style={[styles.row, { gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' }]}>
              <Lightbulb size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <AppText variant="small" style={styles.flex}>
                {t(a.key, a.params)}
              </AppText>
            </View>
          ))}
        </Card>

        <Button label={t('common.save')} disabled={!dirty} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'error' }) {
  return (
    <View style={[styles.row, styles.stat]} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="small" tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="smallStrong" tone={tone}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { minHeight: 28, marginTop: 4 },
  stepBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
