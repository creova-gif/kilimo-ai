import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

export interface ListRowProps {
  /** Pass translated copy. */
  title: string;
  subtitle?: string;
  /** Right-aligned value text (e.g. current language). */
  value?: string;
  /** Leading slot — 56/40pt avatar, 20pt icon, checkbox… */
  leading?: React.ReactNode;
  /** Custom trailing slot (switch, badge…). Suppresses the default chevron. */
  trailing?: React.ReactNode;
  /** Show the chevron. Defaults to true when the row is pressable and has no `trailing`. */
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Red label (Figma "Ondoka kwenye Akaunti" row). */
  destructive?: boolean;
  /** Selected/checked row (Figma checkbox-row: tinted fill + olive border). */
  selected?: boolean;
  /** Bottom hairline. `ListGroup` sets this for every row but the last. */
  divider?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Figma Settings / Farm list row (14:4785). Min height 48pt; pressable rows expose role=button. */
export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  showChevron,
  onPress,
  disabled,
  destructive,
  selected,
  divider,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) {
  const { colors, radius, typography, borderWidth } = useTheme();
  const pressable = Boolean(onPress);
  const chevron = showChevron ?? (pressable && !trailing);

  const content = (
    <View
      style={[
        styles.row,
        selected && {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.accent,
          borderWidth: borderWidth.hairline,
          borderRadius: radius.sm,
        },
        divider && { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border },
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text
          numberOfLines={2}
          style={[typography.label, { color: destructive ? colors.errorText : colors.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[typography.caption, styles.subtitle, { color: colors.textMute }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={[typography.body, { color: colors.textMute }]}>{value}</Text> : null}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? (
        <View style={styles.trailing}>
          <ChevronRight size={20} color={colors.textMute} />
        </View>
      ) : null}
    </View>
  );

  if (!pressable) {
    return (
      <View
        accessible
        accessibilityLabel={
          accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')
        }
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export interface ListGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White bordered r12 container that draws dividers between its `ListRow`s (Figma `Taarifa Binafsi` group). */
export function ListGroup({ children, style }: ListGroupProps) {
  const { colors, radius, borderWidth } = useTheme();
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: borderWidth.hairline,
          borderRadius: radius.sm,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {rows.map((child, i) =>
        React.cloneElement(child as React.ReactElement<{ divider?: boolean }>, {
          divider: i < rows.length - 1,
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  leading: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  subtitle: { marginTop: 2 },
  trailing: { alignItems: 'center', justifyContent: 'center' },
});
