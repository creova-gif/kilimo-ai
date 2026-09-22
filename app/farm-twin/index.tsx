/**
 * Digital Farm Twin — the farmer's own what-if scenarios (KIL-003).
 *
 * Removed: two seeded demo scenarios and a "2D twin" with invented pasture moisture (42%), a soil
 * temperature of 24°C and gate/pump toggles wired to nothing. Kept: the user-created simulator.
 * Its numbers are ESTIMATES computed only from the inputs the farmer sets, and every figure is
 * labelled that way. A scenario can start from one of the farmer's real plots (crop + area
 * prefilled); nothing is ever created without the farmer asking.
 */
import React, { useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Copy, FlaskConical, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';

import { FarmDataState } from '../../components/farmtools/FarmDataState';
import { PlotPicker } from '../../components/farmtools/PlotPicker';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  EmptyState,
  MIN_TOUCH_TARGET,
  ScreenHeader,
  TextField,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { useFarms } from '../../hooks/useFarms';
import { Gate } from '../../lib/access';
import { formatHa, type Plot } from '../../lib/farms';
import { CROP_LABEL_KEY, fmtTZS, prefillFromPlot } from '../../lib/farmTwinPlots';
import { useT } from '../../lib/i18n';
import {
  MAX_SCENARIOS,
  useDigitalFarmTwinStore,
  type Scenario,
} from '../../store/useDigitalFarmTwinStore';

export default function FarmTwinList() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const scenarios = useDigitalFarmTwinStore((s) => s.scenarios);
  const createScenario = useDigitalFarmTwinStore((s) => s.createScenario);
  const duplicateScenario = useDigitalFarmTwinStore((s) => s.duplicateScenario);
  const deleteScenario = useDigitalFarmTwinStore((s) => s.deleteScenario);
  const farms = useFarms();

  const [nameModal, setNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [pickPlot, setPickPlot] = useState(false);
  const atLimit = scenarios.length >= MAX_SCENARIOS;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const open = (id: string) => id && router.push(`/farm-twin/${id}` as any);

  const createBlank = () => {
    const name = newName.trim() || t('planning.twin.defaultName', { n: scenarios.length + 1 });
    const id = createScenario(name);
    setNewName('');
    setNameModal(false);
    open(id);
  };

  const createFromPlot = (plot: Plot) => {
    const pre = prefillFromPlot(plot);
    const id = createScenario(plot.name, pre.inputs, {
      plotId: plot.id,
      plotName: plot.name,
      cropMatched: pre.crop !== null,
      areaMissing: pre.areaHa === null,
      areaAdjusted: pre.areaAdjusted,
    });
    setPickPlot(false);
    open(id);
  };

  const confirmDelete = (sc: Scenario) => {
    Alert.alert(t('planning.twin.delete.title'), t('planning.twin.delete.body', { name: sc.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('planning.twin.delete.cta'), style: 'destructive', onPress: () => deleteScenario(sc.id) },
    ]);
  };

  const fallback = (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader showBack onBack={goBack} backLabel={t('common.back')} title={t('planning.twin.title')} />
      <EmptyState
        icon={<ShieldCheck size={48} color={colors.textMute} />}
        title={t('planning.twin.locked.title')}
        description={t('planning.twin.locked.body')}
      />
    </SafeAreaView>
  );

  return (
    <Gate feature="digital_farm_twin" fallback={fallback}>
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          showBack
          onBack={goBack}
          backLabel={t('common.back')}
          title={t('planning.twin.title')}
          subtitle={t('planning.twin.count', { n: scenarios.length, max: MAX_SCENARIOS })}
        />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
          <AlertCard variant="info" title={t('planning.twin.estimate.title')} body={t('planning.twin.estimate.body')} />

          {atLimit ? (
            <AlertCard variant="warning" title={t('planning.twin.limit', { max: MAX_SCENARIOS })} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t('planning.twin.fromPlot')}
                icon={<Plus size={18} color={colors.onPrimary ?? '#fff'} />}
                onPress={() => setPickPlot((v) => !v)}
                accessibilityState={{ expanded: pickPlot }}
              />
              <Button label={t('planning.twin.blank')} variant="outline" onPress={() => setNameModal(true)} />
            </View>
          )}

          {pickPlot && !atLimit && (
            <View testID="twin-plot-picker">
              {farms.loaded && farms.plots.length > 0 ? (
                <PlotPicker
                  plots={farms.plots}
                  farms={farms.farms}
                  title={t('planning.twin.pickPlot')}
                  onSelect={createFromPlot}
                />
              ) : (
                <FarmDataState
                  data={farms}
                  onAddPlot={() => router.push('/(tabs)/fields' as any)}
                  emptyBody={t('planning.twin.noPlots')}
                />
              )}
            </View>
          )}

          {scenarios.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={48} color={colors.primary} />}
              title={t('planning.twin.empty.title')}
              description={t('planning.twin.empty.body')}
            />
          ) : (
            <>
              <AppText variant="h3" accessibilityRole="header">
                {t('planning.twin.list')}
              </AppText>
              {scenarios.map((sc) => (
                <ScenarioCard
                  key={sc.id}
                  sc={sc}
                  canCopy={!atLimit}
                  onOpen={() => open(sc.id)}
                  onCopy={() =>
                    open(duplicateScenario(sc.id, t('planning.twin.copyName', { name: sc.name })))
                  }
                  onDelete={() => confirmDelete(sc)}
                />
              ))}
            </>
          )}
        </ScrollView>

        <Modal visible={nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(false)}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppText variant="h3" accessibilityRole="header">
                {t('planning.twin.new')}
              </AppText>
              <TextField
                label={t('planning.twin.name')}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('planning.twin.name.ph')}
                autoFocus
              />
              <View style={[styles.row, { gap: spacing.sm }]}>
                <Button
                  label={t('common.cancel')}
                  variant="outline"
                  fullWidth={false}
                  style={styles.flex}
                  onPress={() => {
                    setNameModal(false);
                    setNewName('');
                  }}
                />
                <Button label={t('planning.twin.create')} fullWidth={false} style={styles.flex} onPress={createBlank} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Gate>
  );
}

function ScenarioCard({
  sc,
  canCopy,
  onOpen,
  onCopy,
  onDelete,
}: {
  sc: Scenario;
  canCopy: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const o = sc.output;
  const sub = [
    t(CROP_LABEL_KEY[sc.inputs.crop] ?? 'planning.twin.crop.maize'),
    t('planning.twin.areaValue', { value: formatHa(sc.inputs.areaHa) ?? String(sc.inputs.areaHa) }),
    t(sc.inputs.irrigated ? 'planning.twin.irrigated' : 'planning.twin.rainfed'),
  ].join(' · ');
  return (
    <Card onPress={onOpen} accessibilityLabel={`${sc.name}, ${sub}`} testID={`scenario-${sc.id}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="h3">{sc.name}</AppText>
          <AppText variant="small" tone="muted">
            {sub}
          </AppText>
          {!!sc.source && (
            <AppText variant="caption" tone="muted">
              {t('planning.twin.fromPlotName', { plot: sc.source.plotName })}
            </AppText>
          )}
        </View>
        {canCopy && (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={t('planning.twin.copy.a11y', { name: sc.name })}
            style={styles.iconBtn}
          >
            <Copy size={18} color={colors.textMute} />
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('planning.twin.delete.a11y', { name: sc.name })}
          style={styles.iconBtn}
        >
          <Trash2 size={18} color={colors.error ?? '#B42318'} />
        </Pressable>
      </View>
      <View style={{ marginTop: spacing.sm, gap: 2 }}>
        <AppText variant="small">
          {t('planning.twin.estYield', { value: o.totalYieldTonnes })}
        </AppText>
        <AppText variant="small" tone={o.netProfitTZS >= 0 ? 'default' : 'error'}>
          {t('planning.twin.estProfit', { value: fmtTZS(o.netProfitTZS) })}
        </AppText>
        <AppText variant="small">{t('planning.twin.estRisk', { value: o.riskScore })}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 },
  modal: { padding: 20, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
});
