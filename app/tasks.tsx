/**
 * Farm tasks — rebuilt on the design system (components/ui), replacing the legacy 1,565-line screen.
 *
 * Data: the `tasks` table via hooks/useTasks. Every write (create / complete / cancel) goes through
 * the offline outbox, so a task added offline is kept on this phone and shown with a
 * "Waiting to sync" badge read from the real queue until the server has it.
 * Removed from the legacy screen: the "Simulate IoT alarm" buttons, which created fabricated tasks
 * (sick cow, pump failure, pH drop) that had not come from any sensor. The month grid moved to the
 * Calendar screen (linked from here).
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
import { Plus, ClipboardList, CloudOff, Calendar as CalendarIcon } from 'lucide-react-native';

import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useTasks, type Task, type AssignedRole } from '../hooks/useTasks';
import { useT, type TranslationKey } from '../lib/i18n';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { TaskFormSheet, type NewTaskInput } from '../components/schedule/TaskFormSheet';
import { TaskRow } from '../components/schedule/TaskRow';
import { taskSyncStates } from '../lib/scheduleFormat';

type StatusFilter = 'all' | 'pending' | 'done';
type RoleFilter = 'all' | AssignedRole;
type Notice = { key: TranslationKey; variant: 'success' | 'info' } | null;

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'done'];
const ROLE_FILTERS: RoleFilter[] = ['all', 'employee', 'vet', 'mechanic'];

const byDue = (a: Task, b: Task) =>
  (a.dueDate ? Date.parse(a.dueDate) : Infinity) - (b.dueDate ? Date.parse(b.dueDate) : Infinity);

export default function TasksScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { t } = useT();

  const isOffline = useKilimoStore((s) => s.isOffline);
  const syncQueue = useKilimoStore((s) => s.syncQueue);
  const {
    tasks,
    pendingTasks,
    completedTasks,
    totalXP,
    loading,
    loaded,
    error,
    completeTask,
    createTask,
    cancelTask,
    refresh,
  } = useTasks();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [refreshing, setRefreshing] = useState(false);

  const syncStates = useMemo(() => taskSyncStates(syncQueue), [syncQueue]);
  const visible = useMemo(() => tasks.filter((x) => x.status !== 'cancelled'), [tasks]);
  const waitingCount = useMemo(
    () => visible.filter((x) => syncStates[x.id]).length,
    [visible, syncStates]
  );

  const shown = useMemo(() => {
    let base =
      statusFilter === 'pending'
        ? pendingTasks
        : statusFilter === 'done'
          ? completedTasks
          : visible;
    if (roleFilter !== 'all') base = base.filter((x) => x.assignedRole === roleFilter);
    const open = base.filter((x) => x.status !== 'done').sort(byDue);
    const done = base.filter((x) => x.status === 'done');
    return [...open, ...done];
  }, [statusFilter, roleFilter, pendingTasks, completedTasks, visible]);

  const total = visible.length;
  const progress = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleCreate = useCallback(
    (input: NewTaskInput) => {
      createTask(input);
      setShowCreate(false);
      setNotice({
        key: isOffline ? 'schedule.notice.savedOffline' : 'schedule.notice.saved',
        variant: isOffline ? 'info' : 'success',
      });
    },
    [createTask, isOffline]
  );

  const handleComplete = useCallback(
    (task: Task) => {
      completeTask(task.id);
      setNotice({ key: 'schedule.notice.completed', variant: 'success' });
    },
    [completeTask]
  );

  const handleCancel = useCallback(
    (task: Task) => {
      Alert.alert(t('schedule.tasks.cancel.title'), t('schedule.tasks.cancel.body'), [
        { text: t('schedule.tasks.cancel.keep'), style: 'cancel' },
        {
          text: t('schedule.tasks.cancel.confirm'),
          style: 'destructive',
          onPress: () => {
            cancelTask(task.id);
            setNotice({ key: 'schedule.notice.cancelled', variant: 'info' });
          },
        },
      ]);
    },
    [cancelTask, t]
  );

  const styles = useMemo(() => makeStyles(spacing), [spacing]);

  const addButton = (
    <Pressable
      onPress={() => setShowCreate(true)}
      accessibilityRole="button"
      accessibilityLabel={t('schedule.tasks.add')}
      style={[styles.addBtn, { backgroundColor: colors.primarySoft, borderRadius: radius.md }]}
      testID="tasks-add"
    >
      <Plus size={22} color={colors.primary} />
    </Pressable>
  );

  // ── Body by state ──────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (loading && !loaded && visible.length === 0) {
    body = (
      <SkeletonGroup label={t('state.loading')} style={styles.block}>
        <SkeletonBlock height={72} />
        <SkeletonBlock height={72} />
        <SkeletonBlock height={72} />
      </SkeletonGroup>
    );
  } else if (error && visible.length === 0) {
    body = (
      <ErrorState
        title={t('schedule.tasks.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={() => refresh()}
      />
    );
  } else if (visible.length === 0) {
    body =
      isOffline && !loaded ? (
        <EmptyState
          icon={<CloudOff size={48} color={colors.primary} />}
          title={t('schedule.tasks.offlineEmpty.title')}
          description={t('schedule.tasks.offlineEmpty.body')}
          actionLabel={t('schedule.tasks.add')}
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <EmptyState
          icon={<ClipboardList size={48} color={colors.primary} />}
          title={t('schedule.tasks.empty.title')}
          description={t('schedule.tasks.empty.body')}
          actionLabel={t('schedule.tasks.add')}
          onAction={() => setShowCreate(true)}
        />
      );
  } else {
    body = (
      <>
        {/* Progress summary — computed from the real list */}
        <Card style={styles.block}>
          <AppText variant="h3">{t('schedule.tasks.summary')}</AppText>
          <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
            <AppText variant="body" tone="muted">
              {t('schedule.tasks.progress', { done: completedTasks.length, total })}
            </AppText>
            <AppText variant="label" tone="primary">{`${progress}%`}</AppText>
          </View>
          <View
            style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            accessibilityLabel={t('schedule.tasks.summary')}
          >
            <View
              style={[styles.fill, { width: `${progress}%` as any, backgroundColor: colors.primary }]}
            />
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            {[
              t('schedule.tasks.xp', { xp: totalXP }),
              waitingCount > 0 ? t('schedule.tasks.waiting', { count: waitingCount }) : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </AppText>
        </Card>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f}
              label={t(`schedule.filter.${f}` as TranslationKey)}
              selected={statusFilter === f}
              onPress={() => setStatusFilter(f)}
              style={styles.chip}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {ROLE_FILTERS.map((r) => (
            <Chip
              key={r}
              size="sm"
              label={t(`schedule.role.${r}` as TranslationKey)}
              selected={roleFilter === r}
              onPress={() => setRoleFilter(r)}
              style={styles.chip}
            />
          ))}
        </ScrollView>

        {error ? (
          <AlertCard
            variant="warning"
            title={t('schedule.tasks.error.title')}
            body={t('state.stale')}
            actionLabel={t('common.retry')}
            onAction={() => refresh()}
            style={styles.block}
          />
        ) : null}

        {shown.length === 0 ? (
          <AppText variant="body" tone="muted" style={styles.block}>
            {t('schedule.tasks.filteredEmpty')}
          </AppText>
        ) : (
          <Card padding={0} style={styles.block}>
            {shown.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                syncState={syncStates[task.id]}
                onComplete={handleComplete}
                onCancel={handleCancel}
                divider={i < shown.length - 1}
              />
            ))}
          </Card>
        )}

        <Button
          label={t('schedule.tasks.openCalendar')}
          variant="outline"
          icon={<CalendarIcon size={18} color={colors.text} />}
          onPress={() => router.push('/calendar' as any)}
          style={styles.block}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={t('schedule.tasks.title')}
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
        {notice ? (
          <AlertCard
            variant={notice.variant}
            title={t(notice.key)}
            announce
            actionLabel={t('common.close')}
            onAction={() => setNotice(null)}
            style={styles.block}
            testID="tasks-notice"
          />
        ) : null}
        {body}
      </ScrollView>

      <TaskFormSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        isOffline={isOffline}
      />
    </SafeAreaView>
  );
}

const makeStyles = (spacing: any) =>
  StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 120, flexGrow: 1 },
    block: { marginBottom: spacing.lg },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    track: { height: 8, borderRadius: 4, marginTop: spacing.sm, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4 },
    chips: { marginBottom: spacing.md, flexGrow: 0 },
    chip: { marginRight: spacing.sm },
    addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  });
