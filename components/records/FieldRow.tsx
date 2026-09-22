import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { AppText } from '../ui';

/** A label / value line inside a detail card. Renders nothing when there is no value. */
export function FieldRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | null | undefined;
  emphasis?: boolean;
}) {
  const { spacing } = useTheme();
  if (!value) return null;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: spacing.xs2,
        gap: spacing.lg,
      }}
    >
      <AppText variant="small" tone="muted" style={{ flexShrink: 0 }}>
        {label}
      </AppText>
      <AppText
        variant={emphasis ? 'label' : 'small'}
        style={{ flex: 1, textAlign: 'right' }}
      >
        {value}
      </AppText>
    </View>
  );
}
