import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, User, Map, Leaf, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useCan } from '../../lib/access';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// Brand olive (DESIGN.md / Figma) for the active tab.
const ICON_ACTIVE = '#3C4A2A';

function TabIcon({
  focused,
  label,
  children,
}: {
  focused: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { colors, isDark } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [focused]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.06 }] as any,
  }));

  // Soft pill highlight behind the active tab — replaces the old
  // color-only active state, which had nothing to visually anchor the
  // selection at a glance.
  const pillAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + progress.value * 0.15 }] as any,
  }));

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View
        style={[
          styles.activePill,
          pillAnimStyle,
          { backgroundColor: isDark ? ICON_ACTIVE + '2A' : ICON_ACTIVE + '14' },
        ]}
      />
      <Animated.View style={iconAnimStyle}>{children}</Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          {
            fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium',
            color: focused ? ICON_ACTIVE : colors.textMute,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const sw = language === 'sw';
  const canMarket = useCan('marketplace');

  const tabBarBg = isDark ? '#111827' : '#ffffff';
  const iconInactive = isDark ? '#6B7280' : '#9CA3AF';
  const borderColor = isDark ? '#1F2937' : '#F3F4F6';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ICON_ACTIVE,
        tabBarInactiveTintColor: iconInactive,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          height: 80,
          borderRadius: 28,
          paddingBottom: 0,
          borderWidth: 1,
          borderColor: borderColor,
          backgroundColor: tabBarBg,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label={sw ? 'Nyumbani' : 'Home'}>
              <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label={sw ? 'Shamba' : 'Farm'}>
              <Map color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: ({ ...props }: any) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                router.push('/features');
              }}
              style={{
                position: 'relative',
                top: -26,
                width: 60,
                height: 60,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={sw ? 'Huduma zote' : 'All features'}
            >
              <View
                style={{
                  backgroundColor: colors.primary,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#3C4A2A',
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                  borderWidth: 3,
                  borderColor: tabBarBg,
                }}
              >
                <Leaf color="#ffffff" size={26} strokeWidth={2.25} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          href: canMarket ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label={sw ? 'Soko' : 'Market'}>
              <TrendingUp color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label={sw ? 'Mimi' : 'Me'}>
              <User color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      {/* AI is reached from the Home "Uliza Kilimo AI" field (Figma nav, decision C1). */}
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="video-hub" options={{ href: null }} />
      <Tabs.Screen name="ai-training-hub" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="features" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    gap: 4,
    paddingTop: 10,
  },
  activePill: {
    position: 'absolute',
    top: 2,
    width: 52,
    height: 34,
    borderRadius: 17,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
