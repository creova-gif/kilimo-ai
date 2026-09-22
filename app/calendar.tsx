/**
 * Farm calendar — rebuilt on the design system, replacing the legacy 1,676-line screen.
 *
 * Shows ONLY real, dated records:
 *   - tasks by due date (hooks/useTasks → `tasks` table, offline outbox for writes)
 *   - plot planting and expected-harvest dates the farmer entered (hooks/useFarms → `plots`)
 * Nothing is generated or suggested. Removed from the legacy screen: the "Sankofa AI" assistant
 * panel, whose offline replies were canned text presented as an AI answer and whose "move all"
 * command rewrote tasks by cancelling and re-creating them; and the "AI" filter.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Sprout, Wheat, CalendarDays } from 'lucide-react-native';

import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useTasks, type Task } from '../hooks/useTasks';
import { useFarms } from '../hooks/useFarms';
import { useT } from '../lib/i18n';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  EmptyState,
  ListRow,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { TaskFormSheet, type NewTaskInput } from '../components/schedule/TaskFormSheet';
import { TaskRow } from '../components/schedule/TaskRow';
import {
  dayKey,
  formatDayMonth,
  monthName,
  parseLocalIsoDate,
  pickLocalized,
  taskSyncStates,
  weekdayShort,
} from '../lib/scheduleFormat';
import { cropNames } from '../constants/onboardingOptions';

type PlotEvent = { id: string; kind: 'planting' | 'harvest'; plot: string; crop: string | null };

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function monthGrid(year: number, month: number): (number | null)[] {
  const cells: (number | null)[] = Array(new Date(year, month, 1).getDay()).fill(null);
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { t, lang } = useT();

  const isOffline = useKilimoStore((s) => s.isOffline);
  const syncQueue = useKilimoStore((s) => s.syncQueue);
  const tasks = useTasks();
  const farms = useFarms();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const syncStates = useMemo(() => taskSyncStates(syncQueue), [syncQueue]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks.tasks) {
      if (task.status === 'cancelled' || !task.dueDate) continue;
      const d = new Date(task.dueDate);
      if (Number.isNaN(d.getTime())) continue;
      (map[dayKey(d)] ??= []).push(task);
    }
    return map;
  }, [tasks.tasks]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, PlotEvent[]> = {};
    for (const p of farms.plots) {
      const crop = p.crop ? pickLocalized(lang, cropNames(p.crop)) : null;
      const planting = parseLocalIsoDate(p.plantingDate);
      const harvest = parseLocalIsoDate(p.expectedHarvest);
      if (planting)
        (map[dayKey(planting)] ??= []).push({
          id: `${p.id}-plant`,
          kind: 'planting',
          plot: p.name,
          crop,
        });
      if (harvest)
        (map[dayKey(harvest)] ??= []).push({
          id: `${p.id}-harvest`,
          kind: 'harvest',
          plot: p.name,
          crop,
        });
    }
    return map;
  }, [farms.plots, lang]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const monthHasItems = useMemo(
    () =>
      grid.some((d) => {
        if (!d) return false;
        const k = dayKey(new Date(year, month, d));
        return (tasksByDay[k]?.length ?? 0) + (eventsByDay[k]?.length ?? 0) > 0;
      }),
    [grid, year, month, tasksByDay, eventsByDay]
  );

  const selKey = dayKey(selected);
  const dayTasks = tasksByDay[selKey] ?? [];
  const dayEvents = eventsByDay[selKey] ?? [];

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([tasks.refresh(), farms.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }, [tasks, farms]);

  const handleCreate = useCallback(
    (input: NewTaskInput) => {
      tasks.createTask(input);
      setShowCreate(false);
    },
    [tasks]
  );

  const handleCancel = useCallback(
    (task: Task) => {
      Alert.alert(t('schedule.tasks.cancel.title'), t('schedule.tasks.cancel.body'), [
        { text: t('schedule.tasks.cancel.keep'), style: 'cancel' },
        {
          text: t('schedule.tasks.cancel.confirm'),
          style: 'destructive',
          onPress: () => tasks.cancelTask(task.id),
        },
      ]);
    },
    [tasks, t]
  );

  const styles = useMemo(() => makeStyles(spacing), [spacing]);
  const initialLoading =
    (tasks.loading && !tasks.loaded && tasks.tasks.length === 0) ||
    (farms.loading && !farms.loaded && farms.plots.length === 0);

  const addButton = (
    <Pressable
      onPress={() => setShowCreate(true)}
      accessibilityRole="button"
      accessibilityLabel={t('schedule.calendar.addForDay')}
      style={[styles.iconBtn, { backgroundColor: colors.primarySoft, borderRadius: radius.md }]}
      testID="calendar-add"
    >
      <Plus size={22} color={colors.primary} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={t('schedule.calendar.title')}
        showBack
        onBack={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
        backLabel={t('common.back')}
        trailing={addButton}
      />
      <OfflineBanner visible={isOffline} message={t('offline.banner')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tasks.error ? (
          <AlertCard
            variant="warning"
            title={t('schedule.calendar.errorTitle')}
            body={t('schedule.calendar.tasksError')}
            actionLabel={t('common.retry')}
            onAction={() => tasks.refresh()}
            style={styles.block}
            testID="calendar-tasks-error"
          />
        ) : null}
        {farms.error === 'error' ? (
          <AlertCard
            variant="warning"
            title={t('schedule.calendar.errorTitle')}
            body={t('schedule.calendar.plotsError')}
            actionLabel={t('common.retry')}
            onAction={() => farms.refresh()}
            style={styles.block}
            testID="calendar-plots-error"
          />
        ) : null}

        {/* Month grid */}
        <Card style={styles.block} padding={spacing.md}>
          <View style={styles.monthNav}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel={t('schedule.calendar.prev')}
              style={styles.iconBtn}
              testID="calendar-prev"
            >
              <ChevronLeft size={22} color={colors.text} />
            </Pressable>
            <AppText variant="h3" accessibilityRole="header" testID="calendar-month">
              {t('schedule.monthYear', { month: monthName(t, month), year })}
            </AppText>
            <Pressable
              onPress={() => shiftMonth(1)}
              accessibilityRole="button"
              accessibilityLabel={t('schedule.calendar.next')}
              style={styles.iconBtn}
              testID="calendar-next"
            >
              <ChevronRight size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.week}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <AppText
                key={d}
                variant="micro"
                tone="muted"
                style={styles.weekday}
                importantForAccessibility="no"
              >
                {weekdayShort(t, d)}
              </AppText>
            ))}
          </View>

          {initialLoading ? (
            <SkeletonGroup label={t('state.loading')}>
              <SkeletonBlock height={220} />
            </SkeletonGroup>
          ) : (
            <View style={styles.grid}>
              {grid.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={styles.cell} />;
                const date = new Date(year, month, day);
                const k = dayKey(date);
                const nTasks = (tasksByDay[k] ?? []).filter((x) => x.status !== 'done').length;
                const evs = eventsByDay[k] ?? [];
                const count = (tasksByDay[k]?.length ?? 0) + evs.length;
                const isSel = sameDay(date, selected);
                const isToday = sameDay(date, today);
                const label = formatDayMonth(t, date);
                return (
                  <Pressable
                    key={k}
                    onPress={() => setSelected(date)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    accessibilityLabel={
                      count > 0
                        ? t('schedule.calendar.cell', { date: label, count })
                        : t('schedule.calendar.cellEmpty', { date: label })
                    }
                    style={styles.cell}
                    testID={`calendar-day-${day}`}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                        isSel && { backgroundColor: colors.primary },
                      ]}
                    >
                      <AppText
                        variant="label"
                        tone={isSel ? 'onPrimary' : isToday ? 'primary' : 'default'}
                      >
                        {String(day)}
                      </AppText>
                    </View>
                    <View style={styles.dots}>
                      {nTasks > 0 ? (
                        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                      ) : null}
                      {evs.some((e) => e.kind === 'planting') ? (
                        <View style={[styles.dot, { backgroundColor: colors.success }]} />
                      ) : null}
                      {evs.some((e) => e.kind === 'harvest') ? (
                        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.legend}>
            {(
              [
                ['schedule.calendar.legend.task', colors.primary],
                ['schedule.calendar.legend.planting', colors.success],
                ['schedule.calendar.legend.harvest', colors.warning],
              ] as const
            ).map(([key, c]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: c }]} />
                <AppText variant="caption" tone="muted">
                  {t(key)}
                </AppText>
              </View>
            ))}
          </View>
          {!initialLoading && !monthHasItems ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('schedule.calendar.monthEmpty')}
            </AppText>
          ) : null}
        </Card>

        {/* Selected day agenda */}
        <View style={[styles.rowBetween, styles.blockSm]}>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" accessibilityRole="header" testID="calendar-selected">
              {formatDayMonth(t, selected)}
              {sameDay(selected, today) ? ` · ${t('schedule.calendar.today')}` : ''}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('schedule.calendar.dayCount', {
                tasks: dayTasks.length,
                events: dayEvents.length,
              })}
            </AppText>
          </View>
        </View>

        {dayTasks.length === 0 && dayEvents.length === 0 ? (
          <Card style={styles.block}>
            <EmptyState
              icon={<CalendarDays size={48} color={colors.primary} />}
              title={t('schedule.calendar.day.empty.title')}
              description={t('schedule.calendar.day.empty.body')}
              actionLabel={t('schedule.calendar.addForDay')}
              onAction={() => setShowCreate(true)}
              style={{ paddingVertical: spacing.md }}
            />
          </Card>
        ) : (
          <>
            {dayEvents.length > 0 ? (
              <Card padding={0} style={styles.block}>
                {dayEvents.map((e, i) => (
                  <ListRow
                    key={e.id}
                    title={t(
                      e.kind === 'planting'
                        ? 'schedule.calendar.planting'
                        : 'schedule.calendar.harvest',
                      { plot: e.plot }
                    )}
                    subtitle={
                      e.crop
                        ? t('schedule.calendar.plotSource', { crop: e.crop })
                        : t('schedule.calendar.plotSourceNoCrop')
                    }
                    leading={
                      e.kind === 'planting' ? (
                        <Sprout size={20} color={colors.successText} />
                      ) : (
                        <Wheat size={20} color={colors.warningText} />
                      )
                    }
                    divider={i < dayEvents.length - 1}
                  />
                ))}
              </Card>
            ) : null}
            {dayTasks.length > 0 ? (
              <Card padding={0} style={styles.block}>
                {dayTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    syncState={syncStates[task.id]}
                    onComplete={(x) => tasks.completeTask(x.id)}
                    onCancel={handleCancel}
                    divider={i < dayTasks.length - 1}
                  />
                ))}
              </Card>
            ) : null}
            <Button
              label={t('schedule.calendar.addForDay')}
              variant="outline"
              icon={<Plus size={18} color={colors.text} />}
              onPress={() => setShowCreate(true)}
              style={styles.block}
            />
          </>
        )}
      </ScrollView>

      <TaskFormSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        fixedDate={selected}
        isOffline={isOffline}
      />
    </SafeAreaView>
  );
}

const makeStyles = (spacing: any) =>
  StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 120 },
    block: { marginBottom: spacing.lg },
    blockSm: { marginBottom: spacing.md },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    week: { flexDirection: 'row', marginTop: spacing.sm },
    weekday: { width: `${100 / 7}%` as any, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
    cell: {
      width: `${100 / 7}%` as any,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  });
