/**
 * Global connectivity + sync status strip, mounted once in app/_layout.tsx above the navigator
 * (in normal layout flow, so it never covers a screen header or back button).
 *
 * It only ever says what is true:
 *   - failed items      -> always shown (never dismissible) with Retry and View (offline-queue) actions;
 *   - offline           -> "you are offline… saved on this phone" (+ how many are waiting), dismissible
 *                          until connectivity returns;
 *   - online + waiting  -> "Syncing: n" while a pass runs, "Waiting to sync: n" during backoff.
 * Nothing is shown when the queue is empty and the phone is online.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CloudUpload, WifiOff, X } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useT } from '../lib/i18n';
import { retryFailed } from '../lib/offline';
import { useQueueCounts } from '../hooks/useSyncEngine';
import { MIN_TOUCH_TARGET } from './ui/a11y';

export function SyncStatusBanner() {
  const { colors, typography } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const isSyncing = useKilimoStore((s) => s.isSyncing);
  const { pending, failed } = useQueueCounts();
  const [dismissed, setDismissed] = useState(false);

  // Re-arm the dismissed offline notice for the next outage.
  useEffect(() => {
    if (!isOffline) setDismissed(false);
  }, [isOffline]);

  let message: string | null = null;
  let tone: 'failed' | 'caution' = 'caution';
  let canDismiss = false;
  let Icon = CloudUpload;

  if (failed > 0) {
    message = t('offline.failed', { count: failed });
    tone = 'failed';
    Icon = AlertTriangle;
  } else if (isOffline) {
    if (dismissed) return null;
    message =
      pending > 0
        ? `${t('offline.banner')} ${t('offline.pending', { count: pending })}`
        : t('offline.banner');
    canDismiss = true;
    Icon = WifiOff;
  } else if (pending > 0) {
    message = isSyncing
      ? t('offline.syncing', { count: pending })
      : t('offline.pending', { count: pending });
  }

  if (!message) return null;

  const scheme =
    tone === 'failed'
      ? {
          bg: colors.alert.danger.bg,
          border: colors.alert.danger.border,
          text: colors.alert.danger.title,
        }
      : {
          bg: colors.banner.offline.bg,
          border: colors.banner.offline.border,
          text: colors.banner.offline.text,
        };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: scheme.bg }]}>
      <View style={[styles.row, { borderBottomColor: scheme.border }]}>
        <Icon size={16} color={scheme.text} strokeWidth={2} />
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[typography.small, styles.text, { color: scheme.text }]}
        >
          {message}
        </Text>
        {failed > 0 ? (
          <Pressable
            onPress={() => router.push('/offline-queue')}
            accessibilityRole="button"
            accessibilityLabel={t('offline.viewQueue')}
            style={styles.action}
          >
            <Text
              style={[
                typography.smallStrong,
                { color: scheme.text, textDecorationLine: 'underline' },
              ]}
            >
              {t('offline.viewQueue')}
            </Text>
          </Pressable>
        ) : null}
        {failed > 0 ? (
          <Pressable
            onPress={() => retryFailed()}
            accessibilityRole="button"
            accessibilityLabel={t('offline.retry')}
            style={styles.action}
          >
            <Text
              style={[
                typography.smallStrong,
                { color: scheme.text, textDecorationLine: 'underline' },
              ]}
            >
              {t('offline.retry')}
            </Text>
          </Pressable>
        ) : null}
        {canDismiss ? (
          <Pressable
            onPress={() => setDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel={t('offline.dismiss')}
            style={styles.action}
          >
            <X size={16} color={scheme.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  action: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    marginVertical: -8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
