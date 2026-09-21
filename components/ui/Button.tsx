import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  PressableProps,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'destructiveOutline'
  | 'outline'
  | 'link';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Visible label — pass translated copy; the primitive never supplies text. */
  label: string;
  variant?: ButtonVariant;
  /** sm = 44pt, md = 48pt, lg = 52pt (Figma control heights). */
  size?: 'sm' | 'md' | 'lg';
  /** pill = Figma auth/primary CTA (r100); rounded = state-screen CTA (r16). */
  shape?: 'pill' | 'rounded';
  loading?: boolean;
  icon?: React.ReactNode;
  /** Stretch to the parent width (Figma CTAs are full-width). Default true. */
  fullWidth?: boolean;
  /** Fire a light haptic on press (default true). */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { sm: 44, md: 48, lg: 52 } as const;

/**
 * Figma Button (32:97) — Primary / Secondary / Ghost / Destructive, plus the
 * outline/link/destructive-outline patterns that appear across state + IoT screens.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  shape = 'pill',
  loading,
  icon,
  disabled,
  fullWidth,
  haptics = true,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: ButtonProps) {
  const { colors, radius, typography, borderWidth } = useTheme();
  const isDisabled = Boolean(disabled || loading);

  const scheme = (() => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.card,
          fg: colors.primary,
          border: colors.primary,
          bw: borderWidth.emphasis,
        };
      case 'outline':
        return {
          bg: 'transparent',
          fg: colors.text,
          border: colors.border,
          bw: borderWidth.hairline,
        };
      case 'ghost':
        return { bg: colors.primarySoft, fg: colors.primary, border: 'transparent', bw: 0 };
      case 'destructive':
        return { bg: colors.error, fg: colors.onError, border: 'transparent', bw: 0 };
      case 'destructiveOutline':
        return {
          bg: 'transparent',
          fg: colors.errorText,
          border: colors.error,
          bw: borderWidth.strong,
        };
      case 'link':
        return { bg: 'transparent', fg: colors.primary, border: 'transparent', bw: 0 };
      case 'primary':
      default:
        return { bg: colors.primary, fg: colors.textOnPrimary, border: 'transparent', bw: 0 };
    }
  })();

  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptics) {
      try {
        Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
      } catch {
        /* haptics unavailable (web / simulator) */
      }
    }
    onPress?.(e);
  };

  const labelStyle = size === 'sm' ? typography.buttonSm : typography.button;
  const stretch = fullWidth ?? true;
  const pressedBg =
    variant === 'primary'
      ? colors.primaryPressed
      : variant === 'ghost'
        ? colors.primaryLight
        : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        {
          minHeight: HEIGHT[size],
          borderRadius: shape === 'pill' ? radius.full : radius.md,
          backgroundColor: pressed && pressedBg ? pressedBg : scheme.bg,
          borderColor: scheme.border,
          borderWidth: scheme.bw,
          opacity: isDisabled ? 0.5 : pressed && !pressedBg ? 0.85 : 1,
        },
        stretch && styles.stretch,
        variant === 'link' && styles.link,
        style,
      ]}
      {...rest}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={scheme.fg} />
        ) : (
          <>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text
              numberOfLines={1}
              style={[labelStyle, { color: scheme.fg }, variant === 'link' && styles.linkText]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  stretch: { alignSelf: 'stretch' },
  link: { paddingHorizontal: 8 },
  linkText: { textDecorationLine: 'underline' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  iconWrap: { marginRight: 8 },
});
