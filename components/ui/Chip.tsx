import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  PressableProps,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
import { useTheme, FONT } from '../../constants/Theme';
import { touchSlop } from './a11y';

export interface ChipProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Pass translated copy. */
  label: string;
  /** Active filter pill (Figma "pill-active": olive fill, white text). */
  selected?: boolean;
  /** md = filter pill (13pt, 16/8 padding). sm = suggestion chip (12pt, 12/9 padding). */
  size?: 'md' | 'sm';
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Visual heights measured from Figma padding + line box: md = 8+16+8 = 32, sm = 9+15+9 = 33.
const VISUAL_HEIGHT = { md: 32, sm: 33 } as const;

/**
 * Figma filter pill / suggestion chip (14:2835 FilterPills, 24:2328 suggested-chips).
 * Visual height is ~32pt, so a hitSlop pads the touch target up to 44pt.
 */
export function Chip({
  label,
  selected = false,
  size = 'md',
  leading,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  ...rest
}: ChipProps) {
  const { colors, radius, typography, borderWidth } = useTheme();
  const interactive = Boolean(onPress);

  const text =
    size === 'md'
      ? { ...typography.smallStrong, fontFamily: selected ? FONT.semibold : FONT.medium }
      : typography.captionStrong;

  const body = (
    <View
      style={[
        styles.chip,
        size === 'md' ? styles.md : styles.sm,
        {
          borderRadius: radius.full,
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: borderWidth.hairline,
          opacity: disabled ? 0.5 : 1,
        },
        !interactive && style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <Text
        style={[text, { color: selected ? colors.textOnPrimary : colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!interactive) return body;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={touchSlop(VISUAL_HEIGHT[size])}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      style={[styles.pressable, style]}
      {...rest}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { alignSelf: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  md: { paddingHorizontal: 16, paddingVertical: 8 },
  sm: { paddingHorizontal: 12, paddingVertical: 9 },
  leading: { marginRight: 6 },
});
