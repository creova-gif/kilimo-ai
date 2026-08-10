import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, User, Bot, Tractor, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// Brand forest green (DESIGN.md) — replaces the generic emerald so the nav
// matches the rest of the product.
const ICON_ACTIVE = '#2E6F40';

function TabIcon({
  focused,
  label,
  children,
}: {
  focused: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const iconScale = useSharedValue(focused ? 1 : 1);

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.08 : 1, { damping: 14, stiffness: 200 });
  }, [focused]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }] as any,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 64, gap: 3, paddingTop: 8 }}>
      <Animated.View style={iconAnimStyle}>{children}</Animated.View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium',
          fontSize: 10.5,
          letterSpacing: 0.1,
          color: focused ? ICON_ACTIVE : colors.textMute,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

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
          height: 76,
          borderRadius: 24,
          paddingBottom: 0,
          borderTopWidth: 1,
          borderColor: borderColor,
          backgroundColor: tabBarBg,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label="Mwanzo">
              <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label="Mashamba">
              <Tractor color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
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
                top: -24,
                width: 60,
                height: 60,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <LinearGradient
                colors={['#3A8D52', '#2E6F40']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#2E6F40',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                  borderWidth: 4,
                  borderColor: tabBarBg,
                }}
              >
                <Plus color="#ffffff" size={28} strokeWidth={3} />
              </LinearGradient>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label="Sankofa">
              <Bot color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} label="Profaili">
              <User color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen name="market" options={{ href: null }} />
      <Tabs.Screen name="video-hub" options={{ href: null }} />
      <Tabs.Screen name="ai-training-hub" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="features" options={{ href: null }} />
    </Tabs>
  );
}
