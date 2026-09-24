import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress(e);
  };

  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  // Variants follow the Figma "Button" component set (node 32:97):
  // primary = solid brand, secondary = white with brand outline,
  // ghost = soft brand tint, destructive = solid red. `outline` is not in
  // Figma; it stays a neutral bordered button.
  const textColor = isPrimary || isDestructive ? '#fff' : isOutline ? colors.text : colors.primary;

  const btnContent = (
    <View style={[styles.inner, size === 'sm' && styles.innerSm, size === 'lg' && styles.innerLg]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text
            style={[
              styles.text,
              { color: textColor },
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              isPrimary && styles.textPrimary,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel || label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      style={[
        styles.root,
        isPrimary && { backgroundColor: colors.primary },
        isDestructive && { backgroundColor: colors.error },
        isSecondary && { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary },
        isOutline && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        isGhost && { backgroundColor: colors.primaryLight },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {btnContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 999, // Figma: pill (26 on a 52-high button)
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 52, // Figma height; also above the 44/48 touch-target minimum
  },
  innerSm: { paddingHorizontal: 16, minHeight: 44 },
  innerLg: { paddingHorizontal: 28, minHeight: 56 },
  text: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  textSm: { fontSize: 14 },
  textLg: { fontSize: 17 },
  textPrimary: { fontFamily: 'Inter_600SemiBold' },
  disabled: { opacity: 0.5 },
  iconWrap: { marginRight: 8 },
});
