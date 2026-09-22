/**
 * Kilimo AI — Notifications Hook (mounted once, in app/_layout.tsx)
 *
 * Handles:
 * - Expo push permission + token registration (saved to user_notification_preferences so the
 *   process-notifications function can reach this device)
 * - Foreground push display and tap-to-route
 * - Keeping the in-app feed (lib/notificationsFeed.ts) in sync with `user_notifications`:
 *   Realtime on the BASE TABLE filtered by user_id, with polling + refresh-on-foreground whenever
 *   Realtime is unavailable (KIL-007)
 * - Mirroring the server rows into the global store so the Home bell badge is truthful
 */

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useKilimoStore, type Notification } from '../store/useKilimoStore';
import { getSupabase } from '../lib/supabase';
import {
  refreshNotifications,
  resetNotificationsFeed,
  startNotificationsSync,
  type RemoteNotification,
} from '../lib/notificationsFeed';

// Display notifications in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Types written by supabase/functions/process-notifications (also sent as push `data.type`). */
const SERVER_TYPES = new Set(['insight', 'weather_alert', 'task_reminder', 'market_alert']);
/** Store ids of mirrored server rows. Anything else in the store is a local, on-device notice. */
export const REMOTE_ID_PREFIX = 'remote:';

function storeType(serverType: string): Notification['type'] {
  if (serverType === 'weather_alert') return 'alert';
  if (serverType === 'market_alert') return 'warning';
  return 'info';
}

/**
 * Replace the mirrored server rows in the global store with `rows`, leaving local notices (sync
 * complete, profile saved…) untouched. Idempotent: calling it twice with the same rows is a no-op.
 */
export function mirrorRemoteNotifications(rows: RemoteNotification[]) {
  useKilimoStore.setState((state) => {
    const local = state.notifications.filter((n) => !n.id.startsWith(REMOTE_ID_PREFIX));
    const remote: Notification[] = rows.map((r) => ({
      id: `${REMOTE_ID_PREFIX}${r.id}`,
      title: r.title,
      body: r.body,
      type: storeType(r.type),
      read: r.status === 'read',
      timestamp: r.created_at,
    }));
    const notifications = [...local, ...remote]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
      .slice(0, 50);
    return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
  });
}

/** Drop mirrored server rows (sign-out / another user). */
function clearRemoteMirror() {
  useKilimoStore.setState((state) => {
    const notifications = state.notifications.filter((n) => !n.id.startsWith(REMOTE_ID_PREFIX));
    return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
  });
}

async function savePushToken(token: string) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    // Own-row insert/update policies: 20260920000300_notifications_compat_and_prefs.sql.
    const { error } = await sb
      .from('user_notification_preferences')
      .upsert({ user_id: userId, push_token: token }, { onConflict: 'user_id' });
    if (error && __DEV__) console.warn('[Notifications] push token not saved:', error.message);
  } catch (err) {
    if (__DEV__) console.warn('[Notifications] push token not saved:', err);
  }
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('kilimo-alerts', {
      name: 'Kilimo AI Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A3B14',
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (__DEV__) console.log('[Notifications] Push token:', token);
    await savePushToken(token);
    return token;
  } catch (err) {
    console.warn('[Notifications] Failed to get push token:', err);
    return null;
  }
}

/** Keep the server feed following whoever is signed in. Returns a stop function. */
export function followSignedInUser(): () => void {
  const client = getSupabase();
  if (!client) {
    resetNotificationsFeed('unavailable');
    return () => {};
  }
  let cancelled = false;
  let currentUser: string | null | undefined;
  let stop: (() => void) | null = null;

  const follow = (userId: string | null) => {
    if (cancelled || userId === currentUser) return;
    const hadUser = !!currentUser;
    currentUser = userId;
    stop?.();
    stop = null;
    if (hadUser) clearRemoteMirror();
    if (!userId) {
      resetNotificationsFeed('signedOut');
      return;
    }
    stop = startNotificationsSync({ client, userId, onRows: mirrorRemoteNotifications });
  };

  Promise.resolve(client.auth?.getSession?.())
    .then((res: any) => follow(res?.data?.session?.user?.id ?? null))
    .catch(() => follow(null));

  const sub = client.auth?.onAuthStateChange?.((_event: string, session: any) =>
    follow(session?.user?.id ?? null)
  );

  return () => {
    cancelled = true;
    stop?.();
    try {
      sub?.data?.subscription?.unsubscribe?.();
    } catch {
      /* ignore */
    }
  };
}

// The runtime (push listeners + feed sync) is shared: the root layout and screens such as
// app/scan.tsx both call useNotifications(), but only one set of listeners/syncs may run.
let runtimeRefs = 0;
let releaseRuntime: (() => void) | null = null;
let routeTo: ((route: string) => void) | null = null;

function acquireRuntime(): () => void {
  runtimeRefs++;
  if (runtimeRefs === 1) {
    registerForPushNotifications().catch(() => {});

    // Foreground push: server notifications are already rows in user_notifications, so refresh the
    // feed instead of inventing a second local copy. Local reminders (scheduleReminder) are added.
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const type = (data as Record<string, unknown> | undefined)?.type;
      if (typeof type === 'string' && SERVER_TYPES.has(type)) {
        void refreshNotifications();
        return;
      }
      if (title && body) useKilimoStore.getState().addNotification({ title, body, type: 'info' });
    });

    // Tap on a notification → route to the relevant screen.
    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as Record<string, string>;
      if (data?.route) routeTo?.(data.route);
    });

    const stopFeed = followSignedInUser();
    releaseRuntime = () => {
      received?.remove?.();
      response?.remove?.();
      stopFeed();
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    runtimeRefs = Math.max(0, runtimeRefs - 1);
    if (runtimeRefs === 0) {
      releaseRuntime?.();
      releaseRuntime = null;
    }
  };
}

export function useNotifications() {
  const router = useRouter();
  const markAllRead = useKilimoStore((s) => s.markAllRead);
  const unreadCount = useKilimoStore((s) => s.unreadCount);

  useEffect(() => {
    routeTo = (route) => router.push(route as any);
    return acquireRuntime();
  }, []);

  /**
   * Schedule a local notification (e.g., irrigation reminder)
   */
  async function scheduleReminder(
    title: string,
    body: string,
    secondsFromNow: number,
    route?: string
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: route ? { route } : {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
        repeats: false,
      },
    });
  }

  return {
    unreadCount,
    markAllRead,
    scheduleReminder,
  };
}
