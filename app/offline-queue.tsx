/**
 * Nje ya Mtandao — Offline Queue Manager
 * Shows pending operations awaiting sync and local storage stats
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Camera,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  CheckCircle2,
  Clock,
  Trash2,
  CloudOff,
  Cloud,
  Zap,
  HardDrive,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { processSyncQueue } from '../lib/offline';

type QueueItem = {
  id: string;
  type: 'scan' | 'message' | 'order' | 'task' | 'price_check';
  label: string;
  sub: string;
  sizeKB: number;
  ts: number;
  retries: number;
};

// Removed INITIAL_QUEUE mock

const TYPE_META: Record<
  string,
  { icon: (c: string) => React.ReactNode; color: string; label: string }
> = {
  scan_result: { icon: (c) => <Camera size={16} color={c} />, color: '#8b5cf6', label: 'SKANI' },
  voice_note: {
    icon: (c) => <MessageSquare size={16} color={c} />,
    color: '#3b82f6',
    label: 'SAUTI',
  },
  market_order: {
    icon: (c) => <ShoppingCart size={16} color={c} />,
    color: '#f59e0b',
    label: 'AGIZO',
  },
  task_complete: {
    icon: (c) => <ClipboardList size={16} color={c} />,
    color: '#2E6F40',
    label: 'KAZI',
  },
  irrigation_log: { icon: (c) => <Zap size={16} color={c} />, color: '#06b6d4', label: 'MAJI' },
};

function fmtAge(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Sasa hivi';
  if (diff < 3600000) return `min ${Math.floor(diff / 60000)} zilizopita`;
  return `saa ${Math.floor(diff / 3600000)} zilizopita`;
}

function SyncSpinner({ syncing }: { syncing: boolean }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (syncing) {
      rot.value = withRepeat(withTiming(360, { duration: 800 }), -1, false);
    } else {
      rot.value = withTiming(0, { duration: 200 });
    }
  }, [syncing]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <RefreshCw size={18} color="#fff" />
    </Animated.View>
  );
}

export default function OfflineQueueScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const online = useKilimoStore((s) => s.isOnline);
  const queue = useKilimoStore((s) => s.syncQueue);
  const dequeueAction = useKilimoStore((s) => s.dequeueAction);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState<string[]>([]);

  // Estimate 1KB per payload
  const totalKB = queue.length * 1.5;

  const handleSync = async () => {
    if (!online) {
      Alert.alert(
        language === 'sw' ? 'Hakuna Mtandao' : 'No Connection',
        language === 'sw' ? 'Unganisha mtandao kwanza.' : 'Please connect to the internet first.'
      );
      return;
    }
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Calls the same real sync processor the app runs automatically when
    // connectivity returns (lib/offline.ts). Previously this button ran its
    // own separate fake timer loop that never called dequeueAction or wrote
    // anything to a backend — every item showed a success checkmark while
    // silently remaining un-synced (and reappearing as "pending" on next
    // visit, since the checkmark state was only ever local component state).
    const beforeIds = new Set(queue.map((q) => q.id));
    await processSyncQueue();
    const afterIds = new Set(useKilimoStore.getState().syncQueue.map((q) => q.id));
    const nowSynced = [...beforeIds].filter((id) => !afterIds.has(id));
    if (nowSynced.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSynced((prev) => [...prev, ...nowSynced]);
    }
    if (nowSynced.length < beforeIds.size) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setSyncing(false);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dequeueAction(id);
  };

  const toggleOnline = () => {
    Haptics.selectionAsync();
    useKilimoStore.getState().setOnlineStatus(!online);
    if (synced.length > 0) setSynced([]);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#04090a', '#060d0f', colors.background]
            : ['#f0f9ff', '#f8fafc', colors.background]
        }
        style={StyleSheet.absoluteFill}
        locations={[0, 0.25, 1]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.text }]}>
              {language === 'sw' ? 'Nje ya Mtandao' : 'Offline Queue'}
            </Text>
            <Text style={[s.sub, { color: colors.textMute }]}>
              {queue.length} {language === 'sw' ? 'zinasubiri' : 'pending'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleOnline}
            style={[
              s.onlineBtn,
              {
                backgroundColor: online ? '#2E6F4022' : '#ef444422',
                borderColor: online ? '#2E6F4055' : '#ef444455',
              },
            ]}
          >
            {online ? (
              <Wifi size={16} color={colors.primary} />
            ) : (
              <WifiOff size={16} color="#ef4444" />
            )}
            <Text style={[s.onlineTxt, { color: online ? colors.primary : '#ef4444' }]}>
              {online
                ? language === 'sw'
                  ? 'MTANDAO'
                  : 'ONLINE'
                : language === 'sw'
                  ? 'BILA MTANDAO'
                  : 'OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <Animated.View
          entering={FadeInUp.springify()}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          <LinearGradient
            colors={
              online ? ['#2E6F4018', '#2E6F4008'] : ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.04)']
            }
            style={[s.statusCard, { borderColor: online ? '#2E6F4030' : 'rgba(239,68,68,0.25)' }]}
          >
            <View style={[s.statusIcon, { backgroundColor: online ? '#2E6F4022' : '#ef444422' }]}>
              {online ? (
                <Cloud size={22} color={colors.primary} />
              ) : (
                <CloudOff size={22} color="#ef4444" />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.statusTitle, { color: colors.text }]}>
                {online
                  ? language === 'sw'
                    ? 'Umeunganishwa — tayari kusawazisha'
                    : 'Connected — ready to sync'
                  : language === 'sw'
                    ? 'Huna mtandao — mabadiliko yamehifadhiwa'
                    : 'No connection — changes saved locally'}
              </Text>
              <Text style={[s.statusMeta, { color: colors.textMute }]}>
                {(totalKB / 1024).toFixed(1)} MB{' '}
                {language === 'sw' ? 'inangojea kupakia' : 'waiting to upload'}
                {'  ·  '}
                {language === 'sw' ? 'Hifadhi' : 'Storage'}: 87%{' '}
                {language === 'sw' ? 'bado' : 'free'}
              </Text>
            </View>
            <View style={[s.storageBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.storageFill,
                  { width: '13%', backgroundColor: online ? colors.primary : '#ef4444' },
                ]}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Queue list */}
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {queue.length === 0 && (
            <Animated.View entering={FadeInUp} style={[s.empty, { borderColor: colors.border }]}>
              <CheckCircle2 size={32} color={colors.primary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Hakuna kinachongojea!' : 'Queue is clear!'}
              </Text>
              <Text style={[s.emptySub, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'Data yote imesawazishwa kikamilifu.'
                  : 'All data has been synced successfully.'}
              </Text>
            </Animated.View>
          )}
          {queue.map((item, i) => {
            const meta = TYPE_META[item.type] || {
              icon: (c: string) => <Info size={16} color={c} />,
              color: '#64748b',
              label: 'TUKIO',
            };
            const done = synced.includes(item.id);
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(i * 60).springify()}>
                <View
                  style={[
                    s.qCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: done ? '#2E6F4044' : colors.border,
                      opacity: done ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={[s.typeIcon, { backgroundColor: meta.color + '18' }]}>
                    {done ? (
                      <CheckCircle2 size={16} color={colors.primary} />
                    ) : (
                      meta.icon(meta.color)
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.qLabel, { color: colors.text }]} numberOfLines={1}>
                        {(item.payload as any)?.label || item.type}
                      </Text>
                      <View style={[s.typeBadge, { backgroundColor: meta.color + '18' }]}>
                        <Text style={[s.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={[s.qSub, { color: colors.textMute }]} numberOfLines={1}>
                      {(item.payload as any)?.sub || 'Tukio la nje ya mtandao'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={10} color={colors.textMute} />
                      <Text style={[s.qMeta, { color: colors.textMute }]}>
                        {fmtAge(new Date(item.createdAt).getTime())}
                      </Text>
                      <Text style={[s.qMeta, { color: colors.textMute }]}>·</Text>
                      <HardDrive size={10} color={colors.textMute} />
                      <Text style={[s.qMeta, { color: colors.textMute }]}>1.5 KB</Text>
                      {item.retries > 0 && (
                        <>
                          <Text style={[s.qMeta, { color: colors.textMute }]}>·</Text>
                          <AlertTriangle size={10} color="#f59e0b" />
                          <Text style={[s.qMeta, { color: '#f59e0b' }]}>
                            {item.retries}x {language === 'sw' ? 'jaribio' : 'retried'}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  {!done && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Delete queued item"
                      onPress={() => handleDelete(item.id)}
                      style={[s.deleteBtn, { backgroundColor: '#ef444418' }]}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  {done && <CheckCircle2 size={18} color={colors.primary} />}
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Sync Button */}
        <View
          style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={handleSync}
            activeOpacity={0.85}
            style={[
              s.syncBtn,
              {
                backgroundColor: online ? colors.primary : colors.card,
                borderColor: online ? colors.primary : colors.border,
              },
            ]}
          >
            <SyncSpinner syncing={syncing} />
            <Text style={[s.syncText, { color: online ? '#fff' : colors.textMute }]}>
              {syncing
                ? language === 'sw'
                  ? 'Inasawazisha...'
                  : 'Syncing...'
                : language === 'sw'
                  ? 'Sawazisha Sasa'
                  : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sub: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  onlineTxt: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  statusMeta: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  storageBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 3 },
  storageFill: { height: 3, borderRadius: 3 },
  qCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qLabel: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9 },
  qSub: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  qMeta: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 40,
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  emptySub: { fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  syncText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
