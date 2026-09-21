import React from 'react';
import { View, Pressable, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../constants/Theme';

export type CardVariant = 'solid' | 'outlined' | 'tinted' | 'primary' | 'glass';

export interface CardProps extends ViewProps {
  /**
   * solid    — white, 1pt #E4EADF border, soft shadow (Figma default card)
   * outlined — same without shadow
   * tinted   — primary-soft fill (AI tip / troubleshooting cards)
   * primary  — olive fill (AI advice card 24:2328)
   * glass    — DEPRECATED alias of `solid` (Figma has no blur surfaces)
   */
  variant?: CardVariant;
  /** Inner padding; Figma cards use 16 (lists) or 20 (large cards). */
  padding?: number;
  /** Makes the whole card a button. */
  onPress?: () => void;
  /** Ignored — kept so legacy `<Card intensity tint>` call sites still type-check. */
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children?: React.ReactNode;
}

/** Figma card: r16, 1pt border, 16pt padding. */
export function Card({
  variant = 'solid',
  padding = 16,
  onPress,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
  intensity: _intensity,
  tint: _tint,
  ...rest
}: CardProps) {
  const { colors, radius, shadows, borderWidth } = useTheme();

  const surface = (() => {
    switch (variant) {
      case 'outlined':
        return { bg: colors.card, border: colors.border, shadow: shadows.none };
      case 'tinted':
        return { bg: colors.primarySoft, border: colors.border, shadow: shadows.none };
      case 'primary':
        return { bg: colors.primary, border: 'transparent', shadow: shadows.md };
      case 'glass':
      case 'solid':
      default:
        return { bg: colors.card, border: colors.border, shadow: shadows.sm };
    }
  })();

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      padding,
      borderRadius: radius.md,
      borderWidth: borderWidth.hairline,
      backgroundColor: surface.bg,
      borderColor: surface.border,
      ...surface.shadow,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        {...(rest as object)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  pressed: { opacity: 0.9 },
});
