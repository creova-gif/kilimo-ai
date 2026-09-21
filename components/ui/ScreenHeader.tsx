import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

type BackProps =
  | { showBack?: false; onBack?: undefined; backLabel?: undefined }
  | {
      /** Render the back button. Requires an accessible label and a handler (no router coupling). */
      showBack: true;
      onBack: () => void;
      /** Translated accessibility label for the back button, e.g. t('common.back'). */
      backLabel: string;
    };

export type ScreenHeaderProps = ViewProps &
  BackProps & {
    /** Pass translated copy. */
    title: string;
    subtitle?: string;
    /** Small uppercase line above the title (Figma "Habari, Amara" on 24:2328). `large` variant only. */
    overline?: string;
    /**
     * nav   — centered title between a back button and a trailing slot (Figma NavBar, state screens).
     * large — left-aligned 24pt title with optional overline (Figma dashboard/today-header).
     */
    variant?: 'nav' | 'large';
    trailing?: React.ReactNode;
  };

const SLOT = 44; // touch target; visual circle is 36

/** Figma NavBar / today-header. Back button is a 36pt bordered circle inside a 44pt hit area. */
export function ScreenHeader(props: ScreenHeaderProps) {
  const {
    title,
    subtitle,
    overline,
    variant = 'nav',
    trailing,
    style,
    showBack,
    onBack,
    backLabel,
    ...rest
  } = props;
  const { colors, radius, typography, borderWidth } = useTheme();

  const back = showBack ? (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
      style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.backCircle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: borderWidth.hairline,
            borderRadius: radius.md,
          },
        ]}
      >
        <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
      </View>
    </Pressable>
  ) : null;

  if (variant === 'large') {
    return (
      <View style={[styles.large, style]} {...rest}>
        <View style={styles.flex}>
          {overline ? (
            <Text
              numberOfLines={1}
              style={[
                typography.captionStrong,
                {
                  color: colors.textMute,
                  textTransform: 'uppercase',
                  fontSize: 14,
                  lineHeight: 17,
                },
              ]}
            >
              {overline}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={[typography.h1, { color: colors.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={2}
              style={[typography.caption, { color: colors.textMute, marginTop: 2 }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.nav, style]} {...rest}>
      <View style={styles.side}>{back}</View>
      <View style={styles.center}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[typography.h3, { color: colors.text, textAlign: 'center' }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[typography.microStrong, { color: colors.textMute, textTransform: 'uppercase' }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideEnd]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12 },
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  flex: { flex: 1, gap: 4 },
  center: { flex: 1, alignItems: 'center' },
  side: { minWidth: SLOT, minHeight: SLOT, justifyContent: 'center' },
  sideEnd: { alignItems: 'flex-end' },
  slot: { width: SLOT, height: SLOT, alignItems: 'center', justifyContent: 'center' },
  backCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'center', justifyContent: 'center' },
});
