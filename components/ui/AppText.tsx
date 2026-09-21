import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme, TypeRoleName } from '../../constants/Theme';

export type TextTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'onPrimary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info';

export interface AppTextProps extends TextProps {
  /** Figma type role (see TYPE in constants/Theme.ts). Default `body`. */
  variant?: TypeRoleName;
  tone?: TextTone;
  /** Uppercase transform (Figma overlines / eyebrow labels). */
  uppercase?: boolean;
}

/** Typography primitive: `<AppText variant="h1">…</AppText>` applies family/size/line-height/color tokens. */
export function AppText({
  variant = 'body',
  tone = 'default',
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMute,
    primary: colors.primary,
    onPrimary: colors.textOnPrimary,
    error: colors.errorText,
    success: colors.successText,
    warning: colors.warningText,
    info: colors.infoText,
  }[tone];

  return (
    <Text
      style={[typography[variant], { color }, uppercase && { textTransform: 'uppercase' }, style]}
      {...rest}
    />
  );
}
