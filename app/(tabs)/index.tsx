/**
 * Home / "Today" — Figma `Mobile / Dashboard / Today` (24:2328), rebuilt from the design system.
 *
 * Replaces the 5,672-line legacy dashboard. Every value shown here comes from a real source:
 *   greeting/name  -> saved Agro-ID (server-minted, persisted)      tasks   -> `tasks` table (own rows)
 *   weather        -> OpenWeather, only when configured             farm    -> the farm profile from onboarding
 * Where a source is missing the screen shows an honest empty / unavailable state — never sample data.
 * (The Figma frame's sample alerts, task names and "TARI, 2024" attribution are design placeholders.)
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  Calendar,
  ClipboardList,
  Store,
  Wallet,
  Microscope,
  BarChart3,
  CloudSun,
  Sparkles,
  Check,
} from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useTasks, type Task } from '../../hooks/useTasks';
import { useWeather } from '../../hooks/useWeather';
import { useT, type TranslationKey } from '../../lib/i18n';
import { taskTitle } from '../../lib/scheduleFormat';
import {
  AppText,
  Card,
  AlertCard,
  Button,
  EmptyState,
  ListGroup,
  ListRow,
  OfflineBanner,
  SkeletonBlock,
  SkeletonGroup,
} from '../../components/ui';

const QUICK_ACTIONS: { key: TranslationKey; route: string; Icon: any }[] = [
  { key: 'dash.quick.scan', route: '/scan', Icon: Camera },
  { key: 'dash.quick.calendar', route: '/calendar', Icon: Calendar },
  { key: 'dash.quick.tasks', route: '/tasks', Icon: ClipboardList },
  { key: 'dash.quick.market', route: '/(tabs)/market', Icon: Store },
  { key: 'dash.quick.finance', route: '/finance', Icon: Wallet },
  { key: 'dash.quick.soil', route: '/soil-analysis', Icon: Microscope },
  { key: 'dash.quick.analytics', route: '/analytics', Icon: BarChart3 },
  { key: 'dash.quick.weather', route: '/forecast', Icon: CloudSun },
];

const byDue = (a: Task, b: Task) =>
  (a.dueDate ? Date.parse(a.dueDate) : Infinity) - (b.dueDate ? Date.parse(b.dueDate) : Infinity);

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { t, lang } = useT();
  const go = useCallback((path: string) => router.push(path as any), [router]);

  const agroId = useKilimoStore((s) => s.agroId);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const notifications = useKilimoStore((s) => s.notifications);

  const tasks = useTasks();
  const weather = useWeather();
  const [refreshing, setRefreshing] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const firstName = (agroId?.name ?? '').trim().split(/\s+/)[0] ?? '';
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(t('schedule.dateLocale'), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [lang]
  );
  const todayTasks = useMemo(
    () => [...tasks.pendingTasks].sort(byDue).slice(0, 4),
    [tasks.pendingTasks]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        tasks.refresh(),
        weather.configured ? weather.refetch() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [tasks, weather]);

  const styles = useMemo(() => makeStyles(spacing, radius), [spacing, radius]);
  const status = agroId?.verificationStatus;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" tone="muted" uppercase>
              {t('dash.greeting', { name: firstName || '—' })}
            </AppText>
            <AppText variant="h1" style={{ marginTop: 4 }} accessibilityRole="header">
              {dateLabel}
            </AppText>
          </View>
          <Pressable
            onPress={() => go('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? t('dash.notifications.unread', { count: unread })
                : t('dash.notifications')
            }
            style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.border }]}
            hitSlop={8}
          >
            <Bell size={22} color={colors.text} />
            {unread > 0 && <View style={[styles.dot, { backgroundColor: colors.error }]} />}
          </Pressable>
        </View>

        {isOffline && <OfflineBanner message={t('state.offline.banner')} style={styles.block} />}

        {/* Verification: prompt only while the Agro-ID is genuinely unverified */}
        {status === 'unverified' && (
          <AlertCard
            variant="info"
            title={t('dash.verify.title')}
            body={t('dash.verify.body')}
            actionLabel={t('dash.verify.action')}
            onAction={() => go('/verification/intro')}
            style={styles.block}
          />
        )}
        {status === 'pending' && (
          <AlertCard
            variant="info"
            title={t('dash.verify.pending.title')}
            body={t('dash.verify.pending.body')}
            style={styles.block}
          />
        )}

        {/* Weather — real data or an honest unavailable state */}
        <Card style={styles.block}>
          <AppText variant="h3">{t('dash.weather.title')}</AppText>
          {!weather.configured ? (
            <AppText variant="body" tone="muted" style={styles.gap}>
              {t('dash.weather.unconfigured')}
            </AppText>
          ) : weather.loading ? (
            <SkeletonGroup label={t('state.loading')} style={styles.gap}>
              <SkeletonBlock width={120} height={32} />
              <SkeletonBlock width={200} height={14} style={{ marginTop: 8 }} />
            </SkeletonGroup>
          ) : weather.error || !weather.current ? (
            <View style={styles.gap}>
              <AppText variant="body" tone="muted">
                {t('dash.weather.error')}
              </AppText>
              <Button
                label={t('common.retry')}
                variant="ghost"
                size="sm"
                onPress={() => weather.refetch()}
              />
            </View>
          ) : (
            <View style={styles.gap}>
              <AppText variant="hero">{`${Math.round(weather.current.temp)}°`}</AppText>
              <AppText variant="body">{weather.current.conditionLabel}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {[
                  t('dash.weather.feelsLike', { value: Math.round(weather.current.feelsLike) }),
                  t('dash.weather.humidity', { value: Math.round(weather.current.humidity) }),
                  t('dash.weather.wind', { value: Math.round(weather.current.windKph) }),
                ].join('  ·  ')}
              </AppText>
            </View>
          )}
        </Card>

        {/* Today's tasks — from the tasks table */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">{t('dash.tasks.title')}</AppText>
            <Button
              label={t('common.seeAll')}
              variant="link"
              size="sm"
              onPress={() => go('/tasks')}
            />
          </View>
          {tasks.loading && !tasks.loaded ? (
            <SkeletonGroup label={t('state.loading')} style={styles.gap}>
              <SkeletonBlock height={16} />
              <SkeletonBlock height={16} style={{ marginTop: 12 }} />
            </SkeletonGroup>
          ) : tasks.error && todayTasks.length === 0 ? (
            <AppText variant="body" tone="muted" style={styles.gap}>
              {t('dash.tasks.error')}
            </AppText>
          ) : todayTasks.length === 0 ? (
            <EmptyState
              title={t('dash.tasks.empty.title')}
              description={t('dash.tasks.empty.body')}
              actionLabel={t('dash.tasks.add')}
              onAction={() => go('/tasks')}
            />
          ) : (
            <ListGroup style={styles.gap}>
              {todayTasks.map((task, i) => {
                const title = taskTitle(task, lang);
                return (
                  <ListRow
                    key={task.id}
                    title={title}
                    subtitle={task.farmBlock}
                    divider={i < todayTasks.length - 1}
                    leading={
                      <Pressable
                        onPress={() => tasks.completeTask(task.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: false }}
                        accessibilityLabel={t('dash.tasks.markDone', { title })}
                        hitSlop={10}
                        style={[styles.check, { borderColor: colors.primary }]}
                      >
                        <Check size={14} color={colors.primary} style={{ opacity: 0 }} />
                      </Pressable>
                    }
                  />
                );
              })}
            </ListGroup>
          )}
        </Card>

        {/* Farm — what the farmer told us at onboarding */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">{t('dash.farm.title')}</AppText>
            {farmProfile && (
              <Button
                label={t('dash.farm.edit')}
                variant="link"
                size="sm"
                onPress={() => go('/edit-profile')}
              />
            )}
          </View>
          {farmProfile ? (
            <View style={styles.gap}>
              <AppText variant="label">
                {[
                  farmProfile.region,
                  t('dash.farm.size', { acres: farmProfile.farmSizeAcres }),
                ].join('  ·  ')}
              </AppText>
              {farmProfile.primaryCrops.length > 0 && (
                <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
                  {farmProfile.primaryCrops.join(' · ')}
                </AppText>
              )}
            </View>
          ) : (
            <EmptyState
              title={t('dash.farm.empty.title')}
              description={t('dash.farm.empty.body')}
              actionLabel={t('dash.farm.edit')}
              onAction={() => go('/edit-profile')}
            />
          )}
        </Card>

        {/* Quick actions */}
        <AppText variant="h3" style={[styles.sectionTitle]}>
          {t('dash.quick.title')}
        </AppText>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map(({ key, route, Icon }) => (
            <Pressable
              key={key}
              onPress={() => go(route)}
              accessibilityRole="button"
              accessibilityLabel={t(key)}
              style={styles.tile}
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.primarySoft }]}>
                <Icon size={22} color={colors.primary} />
              </View>
              <AppText
                variant="micro"
                style={{ textAlign: 'center', marginTop: 6 }}
                numberOfLines={2}
              >
                {t(key)}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Ask AI */}
        <Card variant="primary" style={styles.block}>
          <View style={styles.rowBetween}>
            <Sparkles size={20} color={colors.onPrimary ?? '#fff'} />
          </View>
          <AppText variant="h3" tone="onPrimary" style={{ marginTop: 8 }}>
            {t('dash.ai.title')}
          </AppText>
          <AppText variant="body" tone="onPrimary" style={{ marginTop: 4, opacity: 0.85 }}>
            {t('dash.ai.body')}
          </AppText>
          <Button
            label={t('dash.ai.action')}
            variant="secondary"
            style={{ marginTop: 12 }}
            onPress={() => go('/(tabs)/ai')}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (spacing: any, radius: any) =>
  StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 120 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    bell: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5 },
    block: { marginBottom: spacing.lg },
    gap: { marginTop: spacing.md },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
    tile: { width: '25%', alignItems: 'center', paddingVertical: spacing.sm, minHeight: 44 },
    tileIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
