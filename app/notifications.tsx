/**
 * Notifications inbox — renders the shared feed from lib/notificationsFeed.ts (rows of
 * `user_notifications`, kept fresh by Realtime or, when Realtime is unavailable, polling).
 * Mark-read / mark-all-read / delete are optimistic and revert (with a message) if the server
 * rejects them.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BellRing,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Trash2,
  CloudOff,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useT, type TranslationKey } from '../lib/i18n';
import { timeAgoKey } from '../lib/timeAgo';
import {
  deleteNotification,
  isUnread,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  useNotificationsFeed,
  type RemoteNotification,
} from '../lib/notificationsFeed';
import {
  AlertCard,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
  MIN_TOUCH_TARGET,
} from '../components/ui';

// Keyed on user_notifications.type as written by process-notifications.
const TYPE_CONFIG: Record<string, { icon: any; color: string; labelKey: TranslationKey }> = {
  weather_alert: { icon: AlertTriangle, color: '#C27D13', labelKey: 'profile.notif.type.weather' },
  market_alert: { icon: TrendingUp, color: '#457B9D', labelKey: 'profile.notif.type.market' },
  task_reminder: { icon: CheckCircle2, color: '#4A5D23', labelKey: 'profile.notif.type.task' },
  insight: { icon: Sparkles, color: '#6D4AA8', labelKey: 'profile.notif.type.insight' },
};
const DEFAULT_TYPE = { icon: Info, color: '#457B9D', labelKey: 'profile.notif.type.other' as TranslationKey };

function NotificationRow({
  item,
  onRead,
  onDelete,
}: {
  item: RemoteNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_TYPE;
  const Icon = cfg.icon;
  const unread = isUnread(item);
  const ago = timeAgoKey(item.created_at);
  const when = t(ago.key, ago.params);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: unread ? cfg.color : colors.border,
          borderRadius: radius.md,
        },
      ]}
    >
      <Pressable
        onPress={() => unread && onRead(item.id)}
        accessibilityRole="button"
        accessibilityLabel={[
          unread ? t('profile.notif.a11y.unread') : null,
          t(cfg.labelKey),
          item.title,
          item.body,
          when,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={unread ? t('profile.notif.a11y.markReadHint') : undefined}
        style={styles.rowMain}
      >
        <View style={[styles.iconBg, { backgroundColor: cfg.color + '1F' }]}>
          <Icon size={20} color={cfg.color} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.body, { color: colors.textMute }]}>{item.body}</Text>
          <Text style={[styles.time, { color: colors.textMute }]}>
            {t(cfg.labelKey)} · {when}
          </Text>
        </View>
        {unread ? (
          <View
            style={[styles.dot, { backgroundColor: cfg.color }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => onDelete(item.id)}
        accessibilityRole="button"
        accessibilityLabel={t('profile.notif.a11y.delete', { title: item.title })}
        style={styles.deleteBtn}
      >
        <Trash2 size={18} color={colors.textMute} />
      </Pressable>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const isOnline = useKilimoStore((s) => s.isOnline);
  const { status, rows, stale, mode } = useNotificationsFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState(false);

  useEffect(() => {
    void refreshNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const guard = (p: Promise<boolean>) => {
    setActionError(false);
    p.then((ok) => {
      if (!ok) setActionError(true);
    });
  };

  const unreadCount = rows.filter(isUnread).length;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/' as any));

  let content: React.ReactNode;
  if (status === 'idle' || (status === 'loading' && rows.length === 0)) {
    content = (
      <SkeletonGroup label={t('state.loading')} style={styles.list}>
        <SkeletonBlock height={84} />
        <SkeletonBlock height={84} />
        <SkeletonBlock height={84} />
      </SkeletonGroup>
    );
  } else if (status === 'unavailable') {
    content = (
      <EmptyState
        icon={<CloudOff size={48} color={colors.primary} />}
        title={t('profile.notif.unavailable.title')}
        description={t('profile.notif.unavailable.body')}
      />
    );
  } else if (status === 'signedOut') {
    content = (
      <EmptyState
        icon={<BellRing size={48} color={colors.primary} />}
        title={t('profile.notif.signedOut.title')}
        description={t('profile.notif.signedOut.body')}
      />
    );
  } else if (status === 'error' && rows.length === 0) {
    content = (
      <ErrorState
        title={t('profile.notif.error.title')}
        description={t('profile.notif.error.body')}
        retryLabel={t('common.retry')}
        onRetry={() => void refreshNotifications()}
      />
    );
  } else if (rows.length === 0) {
    content = (
      <EmptyState
        icon={<BellRing size={48} color={colors.primary} />}
        title={t('profile.notif.empty.title')}
        description={t('profile.notif.empty.body')}
      />
    );
  } else {
    content = (
      <View style={styles.list}>
        {rows.map((n) => (
          <NotificationRow
            key={n.id}
            item={n}
            onRead={(id) => guard(markNotificationRead(id))}
            onDelete={(id) => guard(deleteNotification(id))}
          />
        ))}
        <Text style={[styles.footnote, { color: colors.textMute }]}>
          {mode === 'realtime' ? t('profile.notif.mode.realtime') : t('profile.notif.mode.polling')}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('profile.notif.title')}
        subtitle={unreadCount > 0 ? t('profile.notif.unreadCount', { count: unreadCount }) : undefined}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
        trailing={
          <Pressable
            onPress={() => guard(markAllNotificationsRead())}
            disabled={unreadCount === 0}
            accessibilityRole="button"
            accessibilityLabel={t('profile.notif.markAll')}
            accessibilityState={{ disabled: unreadCount === 0 }}
            style={styles.headerBtn}
          >
            <CheckCheck size={22} color={unreadCount === 0 ? colors.textMute : colors.primary} />
          </Pressable>
        }
      />
      <OfflineBanner visible={!isOnline} message={t('profile.notif.offline')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {stale && rows.length > 0 ? (
          <AlertCard variant="warning" title={t('profile.notif.stale')} />
        ) : null}
        {actionError ? (
          <AlertCard variant="danger" title={t('profile.notif.actionFailed')} announce />
        ) : null}
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
  list: { gap: 12 },
  headerBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, overflow: 'hidden' },
  rowMain: { flex: 1, flexDirection: 'row', gap: 12, padding: 16, minHeight: MIN_TOUCH_TARGET },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20, marginTop: 2 },
  time: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  deleteBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
