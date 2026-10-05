import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { WifiOff, X } from 'lucide-react-native';
import { pingActivity } from '../hooks/useIdleTimeout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKilimoStore } from '../store/useKilimoStore';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initSentry, Sentry } from '../lib/sentry';

// Initialise crash reporting as early as possible (no-op without a DSN).
initSentry();

// ── Kilimo AI Global Services ─────────────────────────────────────────────
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useNotifications } from '../hooks/useNotifications';
import { useFarmVitals } from '../hooks/useFarmVitals';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { initializeOfflineManager } from '../lib/offline';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});

/**
 * useResumeRefresh — Task #14.
 * When the app returns to the foreground, invalidate staleable React Query
 * caches so weather, farm vitals, and market data re-fetch automatically.
 */
function useResumeRefresh() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        queryClient.invalidateQueries({ queryKey: ['weather'] });
        queryClient.invalidateQueries({ queryKey: ['farmVitals'] });
        queryClient.invalidateQueries({ queryKey: ['market'] });
      }
    });
    return () => sub.remove();
  }, []);
}

/**
 * useAuthOverlay — Task #15.
 * Returns true for 700 ms whenever isAuthenticated flips from true → false
 * while the app is live. This window covers the OnboardingGate redirect so
 * the old authenticated screen is never visible during the transition.
 */
function useAuthOverlay(): boolean {
  const isAuthenticated = useKilimoStore((s) => s.isAuthenticated);
  const prevAuth = useRef(isAuthenticated);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (prevAuth.current === true && !isAuthenticated) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 700);
      prevAuth.current = isAuthenticated;
      return () => clearTimeout(t);
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  return show;
}

/**
 * OfflineBanner — Task #14.
 * A slim, dismissible bar shown at the top of the screen when the device
 * has no internet connection. Auto-clears the dismissed flag when the
 * connection is restored so it can appear again on the next outage.
 */
function OfflineBanner() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const language = useKilimoStore((s) => s.language);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isOffline) setDismissed(false);
  }, [isOffline]);

  if (!isOffline || dismissed) return null;

  const msg =
    language === 'sw'
      ? 'Hakuna mtandao — data inaweza kuwa ya zamani'
      : 'No connection — data may be stale';

  return (
    <View style={styles.offlineBanner} pointerEvents="box-none">
      <WifiOff size={13} color="#fff" style={{ marginRight: 6 }} />
      <Text style={styles.offlineText} numberOfLines={1}>
        {msg}
      </Text>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8} style={{ marginLeft: 8 }}>
        <X size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#b91c1c',
  },
  offlineText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    backgroundColor: '#000',
  },
});

/**
 * AppServices — bootstraps all background hooks inside the providers.
 * Keeps RootLayout clean; all side effects live here.
 */
function AppServices() {
  useSyncEngine(); // 🔄 Offline queue drain
  useNotifications(); // 🔔 Push notification registration
  useFarmVitals(); // 🌱 Sensor telemetry polling
  useIdleTimeout(); // 🔒 AUTH-06 session inactivity gate
  useResumeRefresh(); // 🔁 Invalidate stale queries on foreground resume (#14)
  return null;
}

/**
 * OnboardingGate — hydration-aware redirect.
 * Zustand-persist rehydrates asynchronously from AsyncStorage, so the initial
 * route can race the persisted `onboardingComplete` value. We wait for
 * hydration and then replace the route imperatively. This also handles users
 * who reset their onboarding state mid-session.
 */
/**
 * Subscribe to Zustand-persist hydration completion. Returns true once safe.
 *
 * Also listens to AppState so that if the OS kills and relaunches the process
 * when the user returns from background (common on low-end Android), hydration
 * is re-validated before the Stack renders — preventing a blank-screen flicker.
 */
function usePersistHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useKilimoStore.persist.hasHydrated());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (hydrated) return;
    const unsub = useKilimoStore.persist.onFinishHydration(() => setHydrated(true));
    if (useKilimoStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      // When the app returns to the foreground from background/inactive, confirm
      // the store is still hydrated. On a process-kill + resume this will be
      // false, triggering the hydration wait again and suppressing render until
      // AsyncStorage has finished re-reading.
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active' &&
        !useKilimoStore.persist.hasHydrated()
      ) {
        setHydrated(false);
      }
    });
    return () => sub.remove();
  }, []);

  return hydrated;
}

function OnboardingGate({ hydrated }: { hydrated: boolean }) {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const onboardingComplete = useKilimoStore((s) => s.onboardingComplete);
  const isAuthenticated = useKilimoStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hydrated || !navState?.key) return; // wait for hydration + nav ready
    const inOnboarding = segments[0] === 'onboarding';
    // Force onboarding when either onboarding incomplete OR session cleared
    // (e.g. AUTH-06 idle timeout calls clearAgroId, which flips isAuthenticated).
    const needsOnboarding = !onboardingComplete || !isAuthenticated;
    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (!needsOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hydrated, onboardingComplete, isAuthenticated, segments, router, navState?.key]);

  return null;
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const themePreference = useKilimoStore((s) => s.themePreference);
  const hydrated = usePersistHydrated();
  const showAuthOverlay = useAuthOverlay();

  let isDark: boolean;
  if (themePreference === 'dark') {
    isDark = true;
  } else if (themePreference === 'light') {
    isDark = false;
  } else {
    isDark = colorScheme === 'dark';
  }

  const [loaded, error] = useFonts({
    Inter_400Regular: InstrumentSans_400Regular,
    Inter_500Medium: InstrumentSans_500Medium,
    Inter_600SemiBold: InstrumentSans_600SemiBold,
    Inter_700Bold: InstrumentSans_700Bold,
    Inter_800ExtraBold: InstrumentSans_700Bold,
    Inter_900Black: InstrumentSans_700Bold,
    InstrumentSerif_400Regular: InstrumentSerif_400Regular,
  });

  useEffect(() => {
    // Start offline manager when layout mounts
    const unsubscribe = initializeOfflineManager();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    if (hydrated) {
      SplashScreen.hideAsync();
      return;
    }
    // Fallback: if hydration hasn't signalled within 2 s (common on web),
    // dismiss the splash anyway so the app isn't permanently blank.
    const t = setTimeout(() => SplashScreen.hideAsync(), 2000);
    return () => clearTimeout(t);
  }, [loaded, hydrated]);

  // On native: block until both fonts AND hydration are ready — the splash
  // screen covers the wait, preventing any blank or wrong-state frame.
  // On web: expo-splash-screen has no real overlay, so only block on fonts;
  // the hydration event is unreliable on web and would cause a permanent
  // blank page if we gated here.
  if (!loaded || (Platform.OS !== 'web' && !hydrated)) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          {hydrated && <AppServices />}
          <OnboardingGate hydrated={hydrated} />
          <View style={{ flex: 1 }} onTouchStart={pingActivity}>
            <Stack>
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="forecast"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="scan"
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
              <Stack.Screen name="tasks" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen
                name="calendar"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="map" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen
                name="notifications"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="agro-id" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="contracts" options={{ headerShown: false }} />
              <Stack.Screen
                name="livestock"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="inventory"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="insurance"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="input-supply"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="peer-groups"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="consultations"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="edit-profile"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="crop-planning"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="farm-twin" options={{ headerShown: false }} />
              <Stack.Screen name="analytics" options={{ headerShown: false }} />
              <Stack.Screen name="wallet-admin" options={{ headerShown: false }} />
              <Stack.Screen
                name="upgrade"
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="otp-auth"
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="privacy"
                options={{ title: 'Privacy Policy', presentation: 'modal' }}
              />
              <Stack.Screen
                name="terms"
                options={{ title: 'Terms of Service', presentation: 'modal' }}
              />
              <Stack.Screen
                name="ai-voice"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="ai-admin"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="finance" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen
                name="mobile-money"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="offline-queue"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="soil-analysis"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="iot-systems"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="vra-setup"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="crop-library"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="ai-training-hub"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="video-hub"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="field/[id]"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="verification/intro"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="verification/personal"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="verification/business"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="verification/pending"
                options={{ headerShown: false, presentation: 'card' }}
              />
            </Stack>
          </View>
          {/* Task #15 — opaque overlay during auth-expire → onboarding redirect */}
          {showAuthOverlay && <View style={styles.authOverlay} pointerEvents="none" />}
          {/* Task #14 — offline banner sits above everything */}
          <OfflineBanner />
          <StatusBar style={themePreference === 'system' ? 'auto' : isDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Wrap the root so Sentry captures render errors / performance (no-op w/o DSN).
export default Sentry.wrap(RootLayout);
