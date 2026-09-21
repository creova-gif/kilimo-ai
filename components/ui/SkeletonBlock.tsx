import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme, RADIUS } from '../../constants/Theme';
import { motionTokens } from '../../constants/MotionTokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius in points, or 'pill' / 'circle'. Figma uses r4 for text lines and r12 for media. */
  radius?: number | 'pill' | 'circle';
  /** base = #F2F5EF placeholder, strong = #E4EADF (titles / short lines). */
  tone?: 'base' | 'strong';
  style?: StyleProp<ViewStyle>;
}

/**
 * Figma State / App / Skeleton Loading (20:591) shimmer rectangle.
 * Pulses opacity; holds still when the OS "Reduce Motion" setting is on.
 * Decorative — hidden from screen readers (wrap in `SkeletonGroup` to announce loading once).
 */
export function SkeletonBlock({
  width = '100%',
  height = 16,
  radius = RADIUS.xxs,
  tone = 'base',
  style,
}: SkeletonBlockProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const half = (motionTokens.duration.crawl * 1000) / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: half, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: half, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);

  const borderRadius = radius === 'circle' ? height / 2 : radius === 'pill' ? RADIUS.full : radius;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="skeleton-block"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: tone === 'strong' ? colors.skeleton.strong : colors.skeleton.base,
          opacity,
        },
        style,
      ]}
    />
  );
}

export interface SkeletonGroupProps {
  /** Translated "loading" label announced once for the whole group. */
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Wraps a set of SkeletonBlocks so assistive tech announces a single busy region. */
export function SkeletonGroup({ label, children, style }: SkeletonGroupProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[styles.group, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
});
