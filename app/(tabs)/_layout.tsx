/**
 * Bottom navigation — Figma "ai-first-bottom-nav" (24:2328 and every tabbed screen).
 *
 * Docked white bar, four labelled tabs around a raised centre AI button:
 *   Nyumbani (Home) · Shamba (Farm) · [AI] · Soko (Market) · Mimi (Me)
 * Replaces the legacy floating pill bar, whose centre "+" opened a Features hub.
 * Routes that are not tabs (features, video-hub, ai-training-hub, edit-profile, action)
 * stay registered but hidden so deep links keep working.
 */
import React from 'react';
import { Tabs, router } from 'expo-router';
import { Home, Sprout, Leaf, Store, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { getTabBarScreenOptions, TabBarCenterButton } from '../../components/ui';

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const base = getTabBarScreenOptions(theme, { bottomInset: insets.bottom });
  const icon =
    (Icon: any) =>
    ({ color }: { color: string }) => <Icon size={24} color={color} />;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarShowLabel: true, ...base }}>
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: icon(Home) }} />
      <Tabs.Screen name="fields" options={{ title: t('nav.farm'), tabBarIcon: icon(Sprout) }} />
      <Tabs.Screen
        name="ai"
        options={{
          title: t('nav.ai'),
          tabBarLabel: () => null,
          tabBarButton: () => (
            <TabBarCenterButton
              accessibilityLabel={t('nav.ai')}
              onPress={() => router.navigate('/(tabs)/ai' as any)}
            >
              <Leaf size={24} color={theme.colors.onPrimary ?? '#fff'} />
            </TabBarCenterButton>
          ),
        }}
      />
      <Tabs.Screen name="market" options={{ title: t('nav.market'), tabBarIcon: icon(Store) }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.me'), tabBarIcon: icon(User) }} />

      {/* Reachable by route, not part of the bar */}
      <Tabs.Screen name="action" options={{ href: null }} />
      <Tabs.Screen name="features" options={{ href: null }} />
      <Tabs.Screen name="video-hub" options={{ href: null }} />
      <Tabs.Screen name="ai-training-hub" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}
