/**
 * Offline queue — the changes saved on this phone that have not reached the server yet.
 *
 * Built on the one outbox (lib/offline.ts): the list is the persisted `syncQueue`, "Sync now"
 * calls drainQueue({ force: true }), "Retry failed" calls retryFailed(), and discarding an item
 * (after a confirmation) calls discardQueueItem(). Nothing here fakes progress: an item leaves the
 * list only when the server accepted it or the person chose to throw it away.
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, CloudOff, Trash2 } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { discardQueueItem, drainQueue, MAX_ATTEMPTS, type SyncQueueItem } from '../lib/offline';
import { useT } from '../lib/i18n';
import { timeAgoKey } from '../lib/timeAgo';
import { queueOpKey, queueReasonKey, queueTableKey } from '../components/profile/queueDisplay';
import {
  AlertCard,
  Badge,
  Button,
  EmptyState,
  OfflineBanner,
  ScreenHeader,
  MIN_TOUCH_TARGET,
} from '../components/ui';

/** Confirm before an irreversible discard. Web: window.confirm; if blocked, do nothing. */
function confirmDiscard(title: string, body: string, cancel: string, confirm: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    try {
      if (window.confirm(`${title}\n\n${body}`)) onYes();
    } catch {
      /* dialog blocked: never discard without consent */
    }
    return;
  }
  Alert.alert(title, body, [
    { text: cancel, style: 'cancel' },
    { text: confirm, style: 'destructive', onPress: onYes },
  ]);
}

function QueueRow({ item, onDiscard }: { item: SyncQueueItem; onDiscard: (i: SyncQueueItem) => void }) {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const failed = item.status === 'failed';
  const reasonKey = queueReasonKey(item.lastError);
  const ago = timeAgoKey(item.createdAt);
  const title = `${t(queueOpKey(item))}: ${t(queueTableKey(item))}`;
  const attempts = t('profile.queue.attempts', { count: item.retries, max: MAX_ATTEMPTS });

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: failed ? colors.error : colors.border,
          borderRadius: radius.md,
        },
      ]}
      testID={`queue-item-${item.id}`}
    >
      <View
        style={styles.flex}
        accessible
        accessibilityLabel={[
          title,
          failed ? t('profile.queue.status.failed') : t('profile.queue.status.pending'),
          reasonKey ? t(reasonKey) : null,
          attempts,
          t(ago.key, ago.params),
        ]
          .filter(Boolean)
          .join(', ')}
      >
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
          <Badge
            label={failed ? t('profile.queue.status.failed') : t('profile.queue.status.pending')}
            variant={failed ? 'error' : 'warning'}
          />
        </View>
        {reasonKey ? (
          <Text style={[styles.reason, { color: failed ? colors.errorText : colors.textMute }]}>
            {t(reasonKey)}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textMute }]}>
          {t('profile.queue.saved', { time: t(ago.key, ago.params) })} · {attempts}
        </Text>
      </View>
      <Pressable
        onPress={() => onDiscard(item)}
        accessibilityRole="button"
        accessibilityLabel={t('profile.queue.discard.a11y', { item: title })}
        style={styles.discard}
      >
        <Trash2 size={18} color={colors.errorText} />
      </Pressable>
    </View>
  );
}

export default function OfflineQueueScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const queue = useKilimoStore((s) => s.syncQueue);
  const { isOnline, isSyncing, lastSyncedAt, pendingCount, failedCount, retryFailed } =
    useSyncEngine();
  const [message, setMessage] = useState<{ kind: 'success' | 'warning' | 'info'; text: string } | null>(
    null
  );

  const pendingItems = queue.filter((i) => i.status !== 'failed');
  const failedItems = queue.filter((i) => i.status === 'failed');

  const syncNow = async () => {
    setMessage(null);
    if (!isOnline) {
      setMessage({ kind: 'warning', text: t('profile.queue.msg.offline') });
      return;
    }
    const res = await drainQueue({ force: true });
    if (res.skipped === 'no_session') setMessage({ kind: 'warning', text: t('profile.queue.msg.noSession') });
    else if (res.skipped === 'no_backend') setMessage({ kind: 'warning', text: t('profile.queue.msg.noBackend') });
    else if (res.skipped === 'offline') setMessage({ kind: 'warning', text: t('profile.queue.msg.offline') });
    else if (res.synced > 0 && res.failed === 0 && !res.retryAt)
      setMessage({ kind: 'success', text: t('profile.queue.msg.synced', { count: res.synced }) });
    else if (res.synced > 0 || res.failed > 0 || res.retryAt)
      setMessage({
        kind: 'warning',
        text: t('profile.queue.msg.partial', {
          synced: res.synced,
          left: useKilimoStore.getState().syncQueue.length,
        }),
      });
  };

  const onRetryFailed = () => {
    setMessage(null);
    const n = retryFailed();
    if (n > 0) setMessage({ kind: 'info', text: t('profile.queue.msg.retrying', { count: n }) });
  };

  const onDiscard = (item: SyncQueueItem) => {
    confirmDiscard(
      t('profile.queue.discard.title'),
      t('profile.queue.discard.body'),
      t('common.cancel'),
      t('profile.queue.discard.confirm'),
      () => {
        discardQueueItem(item.id);
        setMessage({ kind: 'info', text: t('profile.queue.msg.discarded') });
      }
    );
  };

  const lastSynced = lastSyncedAt ? timeAgoKey(lastSyncedAt) : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('profile.queue.title')}
        subtitle={t('profile.queue.subtitle', { pending: pendingCount, failed: failedCount })}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any))}
        backLabel={t('common.back')}
      />
      <OfflineBanner visible={!isOnline} message={t('profile.queue.offlineBanner')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.meta, { color: colors.textMute }]}>
          {lastSynced
            ? t('profile.queue.lastSynced', { time: t(lastSynced.key, lastSynced.params) })
            : t('profile.queue.neverSynced')}
        </Text>

        {message ? (
          <AlertCard
            variant={message.kind === 'success' ? 'success' : message.kind === 'info' ? 'info' : 'warning'}
            title={message.text}
            announce
          />
        ) : null}

        {queue.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={48} color={colors.primary} />}
            title={t('profile.queue.empty.title')}
            description={t('profile.queue.empty.body')}
          />
        ) : (
          <>
            <View style={styles.actions}>
              <Button
                label={isSyncing ? t('profile.queue.syncing') : t('profile.queue.syncNow')}
                onPress={syncNow}
                loading={isSyncing}
                disabled={pendingItems.length === 0}
                icon={isOnline ? undefined : <CloudOff size={18} color={colors.onPrimary} />}
                size="md"
              />
              {failedItems.length > 0 ? (
                <Button
                  label={t('profile.queue.retryFailed', { count: failedItems.length })}
                  onPress={onRetryFailed}
                  variant="secondary"
                  size="md"
                />
              ) : null}
            </View>

            {failedItems.length > 0 ? (
              <>
                <Text accessibilityRole="header" style={[styles.section, { color: colors.errorText }]}>
                  {t('profile.queue.section.failed')}
                </Text>
                <Text style={[styles.help, { color: colors.textMute }]}>
                  {t('profile.queue.failedHelp')}
                </Text>
                {failedItems.map((i) => (
                  <QueueRow key={i.id} item={i} onDiscard={onDiscard} />
                ))}
              </>
            ) : null}

            {pendingItems.length > 0 ? (
              <>
                <Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>
                  {t('profile.queue.section.pending')}
                </Text>
                {pendingItems.map((i) => (
                  <QueueRow key={i.id} item={i} onDiscard={onDiscard} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 48, flexGrow: 1 },
  actions: { gap: 12 },
  section: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 8 },
  help: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingLeft: 16, paddingVertical: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  reason: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 4, lineHeight: 18 },
  meta: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
  discard: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
