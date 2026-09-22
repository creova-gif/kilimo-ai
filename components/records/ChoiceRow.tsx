import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { AppText, Chip } from '../ui';

export interface ChoiceOption<T extends string> {
  value: T;
  /** Translated label. */
  label: string;
}

export interface ChoiceRowProps<T extends string> {
  /** Translated group label. */
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Single-choice group rendered as wrapping chips (each chip pads itself to a 48pt touch target). */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: ChoiceRowProps<T>) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={o.value === value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
