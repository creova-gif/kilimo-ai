import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ChevronLeft,
  BellRing,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Trash2,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../constants/Theme';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

// Keyed on user_notifications.type exactly as written by process-notifications
// (supabase/migrations/20260527000000_ai_rag_notifications.sql's check
// constraint: 'insight' | 'weather_alert' | 'task_reminder' | 'market_alert').
// Previously this was guessed from keywords in the notification's title text
// ("hatari"/"alert"/"okoa"), which never matched the real column at all —
// every notification silently fell through to the same generic "info" look
// regardless of its actual type.
const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  weather_alert: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  market_alert: { icon: TrendingUp, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  task_reminder: { icon: CheckCircle2, color: '#2E6F40', bg: 'rgba(46, 111, 64, 0.12)' },
  insight: { icon: Sparkles, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
};
const DEFAULT_TYPE_CONFIG = { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Sasa hivi';
  if (mins < 60) return `${mins}m iliyopita`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h iliyopita`;
  return `${Math.floor(hrs / 24)}d iliyopita`;
}

function NotificationItem({
  item,
  onRead,
  onDelete,
  colors,
}: {
  item: any;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  colors: any;
}) {
  const language = useKilimoStore((s) => s.language);
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_TYPE_CONFIG;
  const Icon = cfg.icon;
  const isRead = item.status === 'read';

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.notifWrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRead(item.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          isRead
            ? item.title
            : language === 'sw'
              ? `Soma bado haijasomwa: ${item.title}`
              : `Unread: ${item.title}`
        }
      >
        <View
          style={[
            styles.notifCard,
            {
              backgroundColor: colors.card,
              borderColor: isRead ? colors.border : cfg.color + '40',
              borderWidth: isRead ? 1 : 1.5,
            },
          ]}
        >
          {!isRead && (
            <LinearGradient
              colors={[cfg.bg, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          <View style={styles.notifRow}>
            <View style={[styles.notifIconBg, { backgroundColor: cfg.bg }]}>
              <Icon size={20} color={cfg.color} />
            </View>

            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, { color: colors.text, opacity: isRead ? 0.6 : 1 }]}>
                {item.title}
              </Text>
              <Text style={[styles.notifBody, { color: colors.textMute }]}>{item.body}</Text>
              <Text style={[styles.notifTime, { color: colors.textMute }]}>
                {timeAgo(item.created_at)}
              </Text>
            </View>

            {!isRead && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete(item.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Futa arifa' : 'Delete notification'}
            >
              <Trash2 size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);

  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (isRefresh = false) => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setFetchError(false);
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    // No real session: previously this fell back to a hardcoded test-user
    // UUID, which — if it were ever a real row owner — would have leaked
    // that user's notifications into whoever hit this screen unauthenticated.
    // RLS ("own rows: select") would still block it in practice, but the
    // right behavior is to never construct a query against a fake identity
    // in the first place. Treat "no session" as "no notifications to show."
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await sb
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[Notifications] fetch failed:', error.message);
      if (!isRefresh) setFetchError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setDbNotifications(data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    fetchNotifications(true);
  };

  const markNotificationRead = async (id: string) => {
    const sb = getSupabase();
    const prevSnapshot = dbNotifications;
    setDbNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n)));
    if (sb) {
      const { error } = await sb.from('user_notifications').update({ status: 'read' }).eq('id', id);
      if (error) {
        console.warn('[Notifications] mark-read failed, reverting:', error.message);
        setDbNotifications(prevSnapshot);
      }
    }
  };

  const removeNotification = async (id: string) => {
    const sb = getSupabase();
    const prevSnapshot = dbNotifications;
    setDbNotifications((prev) => prev.filter((n) => n.id !== id));
    if (sb) {
      const { error } = await sb.from('user_notifications').delete().eq('id', id);
      if (error) {
        console.warn('[Notifications] delete failed, reverting:', error.message);
        setDbNotifications(prevSnapshot);
      }
    }
  };

  const markAllRead = async () => {
    const sb = getSupabase();
    const prevSnapshot = dbNotifications;
    setDbNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    if (sb) {
      const { data: sessionData } = await sb.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      const { error } = await sb
        .from('user_notifications')
        .update({ status: 'read' })
        .eq('user_id', userId);
      if (error) {
        console.warn('[Notifications] mark-all-read failed, reverting:', error.message);
        setDbNotifications(prevSnapshot);
      }
    }
  };

  const unreadCount = dbNotifications.filter((n) => n.status !== 'read').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? language === 'sw'
                  ? 'Rudi nyuma, arifa'
                  : 'Go back, notifications'
                : language === 'sw'
                  ? 'Rudi nyuma'
                  : 'Go back'
            }
          >
            <ChevronLeft size={28} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === 'sw' ? 'Arifa' : 'Notifications'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={markAllRead}
            disabled={unreadCount === 0}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityState={{ disabled: unreadCount === 0 }}
            accessibilityLabel={language === 'sw' ? 'Soma zote' : 'Mark all as read'}
          >
            <CheckCheck size={20} color={unreadCount === 0 ? colors.textMute : colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : fetchError ? (
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: '#ef444415' }]}>
                <AlertTriangle size={36} color="#ef4444" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Imeshindwa Kupakia' : 'Failed to Load'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'Hakikisha una mtandao kisha jaribu tena.'
                  : 'Check your connection and try again.'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setLoading(true);
                  fetchNotifications();
                }}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Jaribu tena' : 'Retry'}
              >
                <RefreshCw size={16} color={isDark ? '#000' : '#fff'} />
                <Text style={[styles.retryBtnText, { color: isDark ? '#000' : '#fff' }]}>
                  {language === 'sw' ? 'Jaribu Tena' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : dbNotifications.length === 0 ? (
            <Animated.View entering={FadeInDown} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
                <BellRing size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Hakuna Arifa</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMute }]}>
                Sankofa AI itakutumia taarifa na tahadhari zote muhimu hapa.
              </Text>
            </Animated.View>
          ) : (
            dbNotifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                item={notif}
                onRead={markNotificationRead}
                onDelete={removeNotification}
                colors={colors}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollContent: { padding: 16, gap: 12 },
  notifWrapper: { marginBottom: 0 },
  notifCard: { borderRadius: 16, overflow: 'hidden' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  notifIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  notifBody: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  notifTime: { fontSize: 12, fontFamily: 'Inter_600SemiBold', opacity: 0.6, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  deleteBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
  },
  retryBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
