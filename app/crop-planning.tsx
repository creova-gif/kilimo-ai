/**
 * Crop planning — general seasonal guidance plus a real "add to my schedule" action (KIL-003).
 *
 * The old screen showed invented yields ("2.5 t/eka"), prices ("TSh 85,000/mfuko") and risk
 * ratings as if they applied to the farmer, all in Swahili only. Those numbers are gone. What
 * stays is general, localised reference (season, typical days to maturity, water need, common
 * practice tips), clearly labelled as general. Planning a crop creates three schedule tasks from
 * the planting date the FARMER picks, optionally linked to one of their real plots, through the
 * offline task outbox.
 */
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CalendarPlus, ChevronDown, ChevronUp, Leaf } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
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
import {
  buildPlanTasks,
  CROP_GUIDES,
  SEASON_KEYS,
  SEASONS,
  seasonForMonth,
  WATER_KEY,
  type CropGuide,
  type PlannedTask,
  type Season,
} from '../lib/cropPlan';
import { formatIsoDate, todayIso } from '../lib/farms';
import { translate, useT, type TranslationKey } from '../lib/i18n';

const TASK_KEY: Record<PlannedTask['kind'], TranslationKey> = {
  plant: 'planning.plan.task.plant',
  scout: 'planning.plan.task.scout',
  harvest: 'planning.plan.task.harvest',
};

export default function CropPlanningScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const { createTask } = useTasks();
  const farms = useFarms();

  const [season, setSeason] = useState<Season>(() => seasonForMonth(new Date().getMonth() + 1));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [planning, setPlanning] = useState<string | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  const [plantingDate, setPlantingDate] = useState(todayIso());
  const [planned, setPlanned] = useState<Record<string, boolean>>({});

  const crops = CROP_GUIDES[season];
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const openPlanner = (guide: CropGuide) => {
    setPlanning(planning === guide.id ? null : guide.id);
    setPlantingDate(todayIso());
    setPlotId(null);
  };

  const addPlan = (guide: CropGuide, tasks: PlannedTask[]) => {
    const plot = farms.plots.find((p) => p.id === plotId);
    for (const task of tasks) {
      const params = (l: 'en' | 'sw') => ({ crop: translate(l, guide.nameKey) });
      createTask({
        title: translate('en', TASK_KEY[task.kind], params('en')),
        titleSw: translate('sw', TASK_KEY[task.kind], params('sw')),
        category: task.category,
        priority: task.priority,
        status: 'pending',
        xpReward: task.kind === 'harvest' ? 40 : task.kind === 'plant' ? 25 : 15,
        dueDate: task.dueDate,
        farmBlock: plot?.name,
      });
    }
    setPlanned((p) => ({ ...p, [`${season}:${guide.id}`]: true }));
    setPlanning(null);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
        title={t('planning.plan.title')}
        subtitle={t('planning.plan.subtitle')}
      />
      {farms.isOffline && <OfflineBanner message={t('state.offline.banner')} />}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.row, { gap: spacing.sm, flexWrap: 'wrap' }]} accessibilityRole="tablist">
          {SEASONS.map((s) => (
            <Chip
              key={s}
              label={`${t(SEASON_KEYS[s].name)} · ${t(SEASON_KEYS[s].months)}`}
              selected={season === s}
              accessibilityRole="tab"
              accessibilityState={{ selected: season === s }}
              onPress={() => {
                setSeason(s);
                setExpanded(null);
                setPlanning(null);
              }}
            />
          ))}
        </View>

        <AlertCard variant="info" title={t('planning.plan.general.title')} body={t('planning.plan.general.body')} />

        {crops.map((guide) => {
          const open = expanded === guide.id;
          const isPlanning = planning === guide.id;
          const done = !!planned[`${season}:${guide.id}`];
          const name = t(guide.nameKey);
          return (
            <Card key={guide.id} testID={`crop-${guide.id}`}>
              <View style={styles.row}>
                <Leaf size={22} color={colors.primary} />
                <View style={[styles.flex, { marginLeft: spacing.sm }]}>
                  <AppText variant="h3">{name}</AppText>
                  <AppText variant="small" tone="muted">
                    {t('planning.plan.typical', { days: guide.typicalDays })} ·{' '}
                    {t('planning.plan.water', { level: t(WATER_KEY[guide.water]) })}
                  </AppText>
                </View>
                {done && <Badge label={t('planning.plan.added')} variant="success" />}
              </View>

              <Button
                label={t(open ? 'planning.plan.hideTips' : 'planning.plan.showTips')}
                variant="link"
                fullWidth={false}
                style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                icon={open ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : guide.id)}
              />
              {open && (
                <View style={{ gap: spacing.xs }}>
                  {guide.tipKeys.map((k) => (
                    <AppText key={k} variant="small">
                      • {t(k)}
                    </AppText>
                  ))}
                </View>
              )}

              {isPlanning ? (
                <Planner
                  guide={guide}
                  plantingDate={plantingDate}
                  setPlantingDate={setPlantingDate}
                  plotId={plotId}
                  setPlotId={setPlotId}
                  plots={farms.plots}
                  lang={lang}
                  onCancel={() => setPlanning(null)}
                  onConfirm={(tasks) => addPlan(guide, tasks)}
                />
              ) : (
                <Button
                  label={t('planning.plan.cta', { crop: name })}
                  variant={done ? 'outline' : 'primary'}
                  icon={<CalendarPlus size={18} color={done ? colors.text : colors.onPrimary ?? '#fff'} />}
                  style={{ marginTop: spacing.md }}
                  onPress={() => openPlanner(guide)}
                />
              )}
            </Card>
          );
        })}

        {Object.values(planned).some(Boolean) && (
          <AlertCard
            variant="success"
            title={t('planning.plan.done')}
            body={t(farms.isOffline ? 'planning.task.queuedOffline' : 'planning.task.queued')}
            actionLabel={t('planning.plan.openTasks')}
            onAction={() => router.push('/tasks' as any)}
            announce
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Planner({
  guide,
  plantingDate,
  setPlantingDate,
  plotId,
  setPlotId,
  plots,
  lang,
  onCancel,
  onConfirm,
}: {
  guide: CropGuide;
  plantingDate: string;
  setPlantingDate: (v: string) => void;
  plotId: string | null;
  setPlotId: (v: string | null) => void;
  plots: { id: string; name: string }[];
  lang: 'sw' | 'en';
  onCancel: () => void;
  onConfirm: (tasks: PlannedTask[]) => void;
}) {
  const { t } = useT();
  const { spacing } = useTheme();
  const tasks = useMemo(() => buildPlanTasks(guide, plantingDate), [guide, plantingDate]);
  const name = t(guide.nameKey);
  return (
    <View style={{ marginTop: spacing.md, gap: spacing.sm }} testID="planner">
      <TextField
        label={t('planning.plan.date')}
        value={plantingDate}
        onChangeText={setPlantingDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        hint={t('planning.date.hint')}
        error={tasks ? undefined : t('planning.date.invalid')}
      />
      <AppText variant="label">{t('planning.plan.plot')}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label={t('planning.plan.noPlot')} selected={plotId === null} onPress={() => setPlotId(null)} />
        {plots.map((p) => (
          <Chip key={p.id} label={p.name} selected={plotId === p.id} onPress={() => setPlotId(p.id)} />
        ))}
      </View>
      {plots.length === 0 && (
        <AppText variant="caption" tone="muted">
          {t('planning.plan.noPlotsYet')}
        </AppText>
      )}
      {tasks && (
        <View style={{ gap: 2 }} accessible accessibilityLabel={t('planning.plan.preview')}>
          <AppText variant="label">{t('planning.plan.preview')}</AppText>
          {tasks.map((task) => (
            <AppText key={task.kind} variant="small" tone="muted">
              • {t(TASK_KEY[task.kind], { crop: name })} — {formatIsoDate(task.dueDate.slice(0, 10), lang)}
            </AppText>
          ))}
          <AppText variant="caption" tone="muted">
            {t('planning.plan.harvestNote', { days: guide.typicalDays })}
          </AppText>
        </View>
      )}
      <Button label={t('planning.plan.confirm')} disabled={!tasks} onPress={() => tasks && onConfirm(tasks)} />
      <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
