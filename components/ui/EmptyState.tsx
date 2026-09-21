import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { Button } from './Button';

export interface EmptyStateProps extends ViewProps {
  /** 48pt icon rendered inside the 120pt tinted circle (Figma "Circle BG"). */
  icon?: React.ReactNode;
  /** neutral = olive-tint circle (Empty / Permission), danger = red-tint circle (Error). */
  tone?: 'neutral' | 'danger';
  /** Pass translated copy — the primitive never embeds text. */
  title: string;
  description?: string;
  /** Small mono-ish footnote such as an error code line. */
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Announce title + description to screen readers as a live alert (used by ErrorState). */
  announce?: boolean;
  /** Extra content between description and actions (benefit lists, queue cards…). */
  children?: React.ReactNode;
}

/** Figma State / Empty / *  (53:1229, 53:1444): centered 120pt circle, title, description, CTA stack. */
export function EmptyState({
  icon,
  tone = 'neutral',
  title,
  description,
  caption,
  announce,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  style,
  ...rest
}: EmptyStateProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, style]} {...rest}>
      {icon ? (
        <View
          style={[
            styles.circle,
            { backgroundColor: tone === 'danger' ? colors.errorSurface : colors.primarySoft },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <View
        accessible={announce ? true : undefined}
        accessibilityRole={announce ? 'alert' : undefined}
        accessibilityLiveRegion={announce ? 'polite' : undefined}
        style={styles.textGroup}
      >
        <Text
          accessibilityRole="header"
          style={[typography.title, styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
        {description ? (
          <Text style={[typography.body, styles.description, { color: colors.textMute }]}>
            {description}
          </Text>
        ) : null}
        {caption ? (
          <Text style={[typography.captionStrong, styles.caption, { color: colors.textMute }]}>
            {caption}
          </Text>
        ) : null}
      </View>
      {children}
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <Button label={actionLabel} onPress={onAction} size="md" shape="rounded" />
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="secondary"
              size="md"
              shape="rounded"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textGroup: { alignItems: 'center', alignSelf: 'stretch' },
  title: { textAlign: 'center', marginBottom: 8 },
  description: { textAlign: 'center', marginBottom: 8 },
  caption: { textAlign: 'center', marginBottom: 8 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 16 },
});
