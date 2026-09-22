/**
 * Plot detail — a real plot from `plots` (KIL-003), replacing the hard-coded ZONES demo.
 *
 * Shows the plot's own fields, an ESTIMATED lifecycle progress (from the planting and expected
 * harvest dates the farmer entered — not a measurement), edit / delete, and the farmer's tasks whose
 * `farm_block` equals the plot name (read-only, via useTasks). Nothing on this screen is sample data:
 * no NDVI/soil charts are shown because no sensor or satellite source exists yet.
 */
import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import {
  areaLine,
  failureMessage,
  harvestLine,
  STAGE_BADGE,
  stageLabel,
} from '../../components/farms/format';
import { PlotFormModal } from '../../components/farms/PlotFormModal';
import { ProgressBar } from '../../components/farms/ProgressBar';
import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListGroup,
  ListRow,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { useFarms } from '../../hooks/useFarms';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useTasks, type Task } from '../../hooks/useTasks';
import {
  cropDisplay,
  formatIsoDate,
  plotLifecycle,
  prefillFromProfile,
  tasksForPlot,
} from '../../lib/farms';
import { useT, type TranslationKey } from '../../lib/i18n';
import { useKilimoStore } from '../../store/useKilimoStore';

const TASK_BADGE: Record<Task['status'], 'success' | 'info' | 'neutral'> = {
  done: 'success',
  in_progress: 'info',
  pending: 'neutral',
  cancelled: 'neutral',
};

const byDue = (a: Task, b: Task) =>
  (a.dueDate ? Date.parse(a.dueDate) : Infinity) - (b.dueDate ? Date.parse(b.dueDate) : Infinity);

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const farmProfile = useKilimoStore((s) => s.farmProfile);

  const data = useFarms();
  const { farms, plots, loading, loaded, error, isOffline, refresh } = data;
  const tasks = useTasks();
  useRefreshOnFocus(tasks.refresh);

  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plot = plots.find((p) => p.id === String(id)) ?? null;
  const farm = plot ? (farms.find((f) => f.id === plot.farmId) ?? null) : null;
  const prefill = useMemo(() => prefillFromProfile(farmProfile), [farmProfile]);
  const linked = useMemo(
    () => (plot ? tasksForPlot(tasks.tasks, plot).sort(byDue) : []),
    [tasks.tasks, plot]
  );

  const back = () => router.back();
  const nav = (
    <ScreenHeader
      title={plot?.name ?? t('farms.detail.title')}
      showBack
      onBack={back}
      backLabel={t('common.back')}
    />
  );

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {nav}
      {children}
    </SafeAreaView>
  );

  // ── load / error / missing states ────────────────────────────────────────────
  if (error === 'not_configured') return frame(<EmptyState title={t('farms.unconfigured')} />);
  if (!loaded && isOffline) {
    return frame(
      <EmptyState title={t('farms.offline.title')} description={t('farms.offline.body')} />
    );
  }
  if (!loaded && loading) {
    return frame(
      <SkeletonGroup label={t('state.loading')} style={{ padding: spacing.lg }}>
        <SkeletonBlock height={96} radius={16} />
        <SkeletonBlock height={140} radius={16} style={{ marginTop: spacing.md }} />
        <SkeletonBlock height={120} radius={16} style={{ marginTop: spacing.md }} />
      </SkeletonGroup>
    );
  }
  if (!loaded && error) {
    return frame(
      <ErrorState
        title={t('farms.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    );
  }
  if (!plot) {
    return frame(
      <EmptyState
        title={t('farms.detail.missing.title')}
        description={t('farms.detail.missing.body')}
        actionLabel={t('common.back')}
        onAction={back}
      />
    );
  }

  // ── a real plot ──────────────────────────────────────────────────────────────
  const lc = plotLifecycle(plot);
  const crop = cropDisplay(plot.crop, lang);
  const harvest = harvestLine(t, lc);
  const hasEstimate = lc.progressPct !== null && lc.stage !== 'planned' && lc.stage !== 'harvested';
  const notSet = t('farms.detail.notSet');

  const confirmDelete = () => {
    Alert.alert(t('farms.delete.plot.title'), t('farms.delete.plot.body', { name: plot.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('farms.delete'),
        style: 'destructive',
        onPress: async () => {
          setActionError(null);
          setBusy(true);
          const r = await data.deletePlot(plot.id);
          setBusy(false);
          if (r.ok) back();
          else
            setActionError(
              r.reason === 'offline' || r.reason === 'not_found'
                ? failureMessage(t, r.reason, 'plot')
                : t('farms.delete.failed')
            );
        },
      },
    ]);
  };

  const markHarvested = async () => {
    setNotice(null);
    setActionError(null);
    setBusy(true);
    const r = await data.setPlotStatus(plot.id, 'harvested');
    setBusy(false);
    if (r.ok) setNotice('farms.notice.harvested');
    else setActionError(failureMessage(t, r.reason, 'plot'));
  };

  const row = (label: string, value: string, last = false) => (
    <View
      key={label}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.detailRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <AppText variant="caption" tone="muted" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );

  const details = [
    row(t('farms.detail.farm'), farm?.name ?? notSet),
    row(t('farms.detail.crop'), crop ?? notSet),
    row(t('farms.detail.area'), areaLine(t, plot.areaHa, { withAcres: true })),
    row(t('farms.detail.planted'), formatIsoDate(plot.plantingDate, lang) ?? notSet),
    row(t('farms.detail.harvest'), formatIsoDate(plot.expectedHarvest, lang) ?? notSet),
    row(
      t('farms.detail.boundary'),
      plot.boundary
        ? t('farms.detail.boundary.set', { n: plot.boundary.length })
        : t('farms.detail.boundary.none')
    ),
    row(t('farms.detail.notes'), plot.notes ?? notSet, true),
  ];

  return frame(
    <>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
        {isOffline && <OfflineBanner message={t('state.offline.banner')} style={styles.block} />}
        {!!notice && (
          <AlertCard variant="success" title={t(notice)} announce style={styles.block} />
        )}
        {!!actionError && (
          <AlertCard variant="danger" title={actionError} announce style={styles.block} />
        )}
        {!!error && (
          <AlertCard
            variant="warning"
            title={t('farms.error.title')}
            actionLabel={t('common.retry')}
            onAction={refresh}
            style={styles.block}
          />
        )}

        {/* Identity */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <AppText variant="h2" accessibilityRole="header">
                {crop ?? plot.name}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {[crop ? plot.name : null, farm?.name].filter(Boolean).join('  ·  ')}
              </AppText>
            </View>
            <Badge label={stageLabel(t, lc.stage)} variant={STAGE_BADGE[lc.stage]} />
          </View>
        </Card>

        {/* Lifecycle — an estimate from the entered dates */}
        <Card style={styles.block}>
          <AppText variant="h3">{t('farms.lifecycle.title')}</AppText>
          {hasEstimate ? (
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar
                pct={lc.progressPct as number}
                label={t('farms.progress.a11y', { pct: lc.progressPct as number })}
              />
              <AppText variant="label" style={{ marginTop: spacing.sm }}>
                {t('farms.progress.value', { pct: lc.progressPct as number })}
              </AppText>
              {!!harvest && (
                <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
                  {harvest}
                </AppText>
              )}
              {lc.daysSincePlanting !== null && (
                <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
                  {t('farms.detail.daysSincePlanting', { n: lc.daysSincePlanting })}
                </AppText>
              )}
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                {t('farms.progress.note')}
              </AppText>
            </View>
          ) : (
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.md }}>
              {plot.status === 'growing' ? t('farms.progress.needDates') : stageLabel(t, lc.stage)}
            </AppText>
          )}
          {plot.status === 'growing' && (
            <Button
              label={t('farms.detail.markHarvested')}
              variant="secondary"
              size="md"
              shape="rounded"
              loading={busy}
              disabled={isOffline}
              onPress={markHarvested}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>

        {/* Fields */}
        <Card style={styles.block}>{details}</Card>

        {/* Tasks linked by tasks.farm_block === plot name (read-only) */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <AppText variant="h3" style={{ flex: 1 }}>
              {t('farms.detail.tasks.title')}
            </AppText>
            <Button
              label={t('farms.detail.tasks.open')}
              variant="link"
              size="sm"
              fullWidth={false}
              onPress={() => router.push('/tasks' as any)}
            />
          </View>
          {tasks.loading && !tasks.loaded ? (
            <SkeletonGroup label={t('state.loading')} style={{ marginTop: spacing.md }}>
              <SkeletonBlock height={16} />
              <SkeletonBlock height={16} style={{ marginTop: 12 }} />
            </SkeletonGroup>
          ) : !tasks.loaded && isOffline ? (
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.md }}>
              {t('farms.detail.tasks.offline')}
            </AppText>
          ) : tasks.error && !tasks.loaded ? (
            <View style={{ marginTop: spacing.md }}>
              <AppText variant="body" tone="muted">
                {t('farms.detail.tasks.error')}
              </AppText>
              <Button
                label={t('common.retry')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => tasks.refresh()}
              />
            </View>
          ) : linked.length === 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <AppText variant="body">{t('farms.detail.tasks.empty')}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {t('farms.detail.tasks.hint', { name: plot.name })}
              </AppText>
            </View>
          ) : (
            <ListGroup style={{ marginTop: spacing.md }}>
              {linked.map((task) => (
                <ListRow
                  key={task.id}
                  title={lang === 'sw' && task.titleSw ? task.titleSw : task.title}
                  subtitle={
                    task.dueDate
                      ? t('farms.task.due', {
                          date: new Date(task.dueDate).toLocaleDateString(
                            lang === 'sw' ? 'sw-TZ' : 'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          ),
                        })
                      : t('farms.task.noDue')
                  }
                  trailing={
                    <Badge
                      label={t(`farms.task.status.${task.status}`)}
                      variant={TASK_BADGE[task.status]}
                    />
                  }
                />
              ))}
            </ListGroup>
          )}
        </Card>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            label={t('farms.edit')}
            variant="outline"
            size="md"
            shape="rounded"
            fullWidth={false}
            style={{ flex: 1 }}
            onPress={() => {
              setNotice(null);
              setActionError(null);
              setEditing(true);
            }}
          />
          <Button
            label={t('farms.delete')}
            variant="destructiveOutline"
            size="md"
            shape="rounded"
            fullWidth={false}
            style={{ flex: 1 }}
            loading={busy}
            onPress={confirmDelete}
          />
        </View>
      </ScrollView>

      {editing && (
        <PlotFormModal
          farmName={farm?.name ?? ''}
          plot={plot}
          cropSuggestions={prefill?.crops ?? []}
          isOffline={isOffline}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            const r = await data.updatePlot(plot.id, input);
            if (r.ok) setNotice('farms.notice.plotSaved');
            return r;
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { marginBottom: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailRow: { flexDirection: 'row', paddingVertical: 10, minHeight: 44, alignItems: 'flex-start' },
  detailLabel: { width: 104, paddingTop: 2 },
  detailValue: { flex: 1 },
});
