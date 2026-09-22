import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { MIN_TOUCH_TARGET } from '../ui';

export interface IconButtonProps {
  /** Translated accessibility label (an icon has no visible text). */
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** filled = primary circle (main action), plain = borderless (close, delete). */
  variant?: 'filled' | 'plain';
  testID?: string;
}

/** Round icon-only control with a full-size touch target and a required accessibility label. */
export function IconButton({
  label,
  icon,
  onPress,
  disabled,
  variant = 'plain',
  testID,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.root,
        variant === 'filled' && { backgroundColor: colors.primary },
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <View pointerEvents="none">{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
