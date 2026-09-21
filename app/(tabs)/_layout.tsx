/**
 * Bottom navigation — Figma "ai-first-bottom-nav" (24:2328 and every tabbed screen).
 *
 * Docked white bar, four labelled tabs around a raised centre AI button:
 *   Nyumbani (Home) · Shamba (Farm) · [AI] · Soko (Market) · Mimi (Me)
 * Replaces the legacy floating pill bar, whose centre "+" opened a Features hub.
 * Exactly these five routes live in (tabs); everything else is a root-level stack screen, so
 * screen readers announce "n of 5" (previously 3 hidden duplicate routes made it "n of 8").
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
    </Tabs>
  );
}
