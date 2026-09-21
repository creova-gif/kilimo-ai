import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../constants/Theme';

/**
 * Severity variants. `weather` and `pest` are aliases for the two alert cards in
 * Figma 24:2328 (weather = danger red, pest = warning amber) so call sites can name
 * the content type; the style is decided by severity.
 */
export type AlertVariant = 'danger' | 'warning' | 'info' | 'success' | 'weather' | 'pest';

const ALIAS: Record<AlertVariant, 'danger' | 'warning' | 'info' | 'success'> = {
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  success: 'success',
  weather: 'danger',
  pest: 'warning',
};

export interface AlertCardProps {
  variant?: AlertVariant;
  /** Pass translated copy — the primitive never embeds alert text. */
  title: string;
  body?: string;
  /** Text link at the bottom (Figma "alert-action"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Make the whole card tappable. */
  onPress?: () => void;
  /** Leading icon node (24pt). */
  icon?: React.ReactNode;
  /** Announce as a live alert to screen readers (use for newly-arrived alerts). */
  announce?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Figma alert-weather / alert-pest / alert-card (24:2328, 102:1002): r16, 1pt tinted border, 16 padding. */
export function AlertCard({
  variant = 'info',
  title,
  body,
  actionLabel,
  onAction,
  onPress,
  icon,
  announce,
  accessibilityLabel,
  testID,
  style,
}: AlertCardProps) {
  const { colors, radius, typography, borderWidth } = useTheme();
  const scheme = colors.alert[ALIAS[variant]];

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          borderRadius: radius.md,
          borderWidth: borderWidth.hairline,
        },
        style,
      ]}
    >
      <View style={styles.titleRow}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[typography.h3, styles.title, { color: scheme.title }]}>{title}</Text>
      </View>
      {body ? <Text style={[typography.body, { color: colors.text }]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <Text style={[typography.smallStrong, { color: scheme.action }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const label = accessibilityLabel ?? [title, body].filter(Boolean).join('. ');

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible={!actionLabel}
      accessibilityRole={announce ? 'alert' : undefined}
      accessibilityLiveRegion={announce ? 'polite' : undefined}
      accessibilityLabel={actionLabel ? undefined : label}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  title: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
