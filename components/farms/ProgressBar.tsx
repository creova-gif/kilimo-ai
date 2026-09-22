import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';

/** Accessible determinate progress bar (0-100). `label` is the translated screen-reader text. */
export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const { colors, radius } = useTheme();
  const now = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now }}
      style={{
        height: 8,
        borderRadius: radius.xxs,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${now}%`,
          height: '100%',
          borderRadius: radius.xxs,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}
