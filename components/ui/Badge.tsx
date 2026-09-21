import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { useTheme, FONT } from '../../constants/Theme';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'default'
  | 'solid'
  | 'live';

export interface BadgeProps extends ViewProps {
  /** Pass translated copy; the primitive never supplies text. */
  label: string;
  /**
   * success/warning/error/info/neutral = Figma StatusBadge fills (32:108).
   * solid = olive fill / white text. live = bright green fill (AI "LIVE" pill, 24:2328).
   * `default` is a legacy alias of `neutral`.
   */
  variant?: BadgeVariant;
  /** md = 11pt Medium, r12 (StatusBadge). sm = 10pt Bold caps, r4 ("VERIFIED"). */
  size?: 'md' | 'sm';
  /** Corner style. Default: rounded (r12) for md, square (r4) for sm. */
  shape?: 'rounded' | 'pill' | 'square';
  uppercase?: boolean;
  icon?: React.ReactNode;
}

/** Figma StatusBadge (32:108) + VERIFIED tag (14:2835) + risk/live pills. */
export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  shape,
  uppercase,
  icon,
  style,
  accessibilityLabel,
  ...rest
}: BadgeProps) {
  const { colors, radius, typography } = useTheme();

  const scheme = (() => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSoft, fg: colors.successText };
      case 'warning':
        return { bg: colors.warningSoft, fg: colors.warningText };
      case 'error':
        return { bg: colors.errorSoft, fg: colors.errorText };
      case 'info':
        return { bg: colors.infoSoft, fg: colors.infoText };
      case 'solid':
        return { bg: colors.primary, fg: colors.textOnPrimary };
      case 'live':
        return { bg: colors.success, fg: colors.onSuccess };
      case 'neutral':
      case 'default':
      default:
        return { bg: colors.surfaceMuted, fg: colors.textMute };
    }
  })();

  const resolvedShape = shape ?? (size === 'sm' ? 'square' : 'rounded');
  const borderRadius =
    resolvedShape === 'pill' ? radius.full : resolvedShape === 'square' ? radius.xxs : radius.sm;
  const caps = uppercase ?? size === 'sm';
  // StatusBadge text is 11pt Medium (32:108); the small tag is 10pt Bold caps.
  const font =
    size === 'sm' ? typography.overline : { ...typography.micro, fontFamily: FONT.medium };

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: scheme.bg, borderRadius },
        style,
      ]}
      {...rest}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={[font, { color: scheme.fg }, caps && { textTransform: 'uppercase' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  sm: { paddingHorizontal: 6, paddingVertical: 2 },
  iconWrap: { marginRight: 4 },
});
