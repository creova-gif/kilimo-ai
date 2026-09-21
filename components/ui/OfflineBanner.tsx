import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

export interface OfflineBannerProps {
  /** Pass translated copy, e.g. "You are offline — using offline mode". */
  message: string;
  /** Optional inline action (e.g. "Retry", "View queue"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Render nothing when false, so callers can drive it from a connectivity hook. */
  visible?: boolean;
  /** Override the default alert-triangle icon. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Figma State / Offline / Banner (50:2945): 36pt amber strip, 1pt bottom border, 13pt text. */
export function OfflineBanner({
  message,
  actionLabel,
  onAction,
  visible = true,
  icon,
  style,
}: OfflineBannerProps) {
  const { colors, typography, borderWidth } = useTheme();
  if (!visible) return null;
  const scheme = colors.banner.offline;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: scheme.bg,
          borderBottomColor: scheme.border,
          borderBottomWidth: borderWidth.hairline,
        },
        style,
      ]}
    >
      {icon ?? <AlertTriangle size={16} color={scheme.icon} strokeWidth={2} />}
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[typography.small, styles.text, { color: scheme.text }]}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <Text
            style={[
              typography.smallStrong,
              { color: scheme.text, textDecorationLine: 'underline' },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  text: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, marginVertical: -10 },
});
