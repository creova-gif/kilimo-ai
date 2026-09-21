import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Theme, useTheme } from '../../constants/Theme';

/**
 * Figma "ai-first-bottom-nav" (24:2328 and every tabbed screen): white bar, 1pt top border,
 * 4 labelled tabs (24pt icon + 11pt label, active = olive SemiBold, inactive = #6B6B70) around a
 * raised 56pt center AI button. Spread the result into expo-router `<Tabs screenOptions={...}>`.
 * Tab labels/icons are supplied by the caller (translated copy stays out of primitives).
 */
export function getTabBarScreenOptions(theme: Theme, opts: { bottomInset?: number } = {}) {
  const { colors, typography } = theme;
  const bottom = Math.max(8, opts.bottomInset ?? 0);
  return {
    tabBarActiveTintColor: colors.tabActive,
    tabBarInactiveTintColor: colors.tabInactive,
    tabBarStyle: {
      backgroundColor: colors.tabBar,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: bottom,
      height: 64 + bottom,
    } as ViewStyle,
    tabBarLabelStyle: { ...typography.micro, marginTop: 4 },
    tabBarItemStyle: { minWidth: 64, minHeight: 44 } as ViewStyle,
  };
}

export interface TabBarCenterButtonProps {
  /** 24pt icon (e.g. Leaf). */
  children: React.ReactNode;
  onPress?: () => void;
  /** Required — translated label, e.g. t('nav.askAi'). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/** Raised 56pt / r24 olive center action button with the Figma FAB shadow. */
export function TabBarCenterButton({
  children,
  onPress,
  accessibilityLabel,
  style,
}: TabBarCenterButtonProps) {
  const { colors, shadows, radius, sizes } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.center,
        shadows.premium,
        {
          width: sizes.centerTabButton,
          height: sizes.centerTabButton,
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
