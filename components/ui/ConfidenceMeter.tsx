import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme, FONT } from '../../constants/Theme';

export interface ConfidenceMeterProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  /** Row label, e.g. "AI confidence". Pass translated copy. */
  label?: string;
  /** Override the formatted value text (default: `${round(value)}%`). Use for localized number formats. */
  valueText?: string;
  /**
   * Render the "low confidence" treatment (red-tinted value pill instead of olive text).
   * Pass explicitly, or set `lowThreshold` to derive it. No default threshold is baked in —
   * that is a product decision (see Figma State / AI / Low Confidence 50:2247).
   */
  low?: boolean;
  lowThreshold?: number;
  /** Full spoken value for screen readers, e.g. "87 percent confident". Defaults to valueText. */
  accessibilityValueText?: string;
  style?: StyleProp<ViewStyle>;
}

/** Figma AI Confidence (20:342): label + % value over an 8pt olive-on-tint progress track. */
export function ConfidenceMeter({
  value,
  label,
  valueText,
  low,
  lowThreshold,
  accessibilityValueText,
  style,
}: ConfidenceMeterProps) {
  const { colors, radius, typography } = useTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const isLow = low ?? (lowThreshold !== undefined ? pct < lowThreshold : false);
  const text = valueText ?? `${Math.round(pct)}%`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(pct),
        text: accessibilityValueText ?? text,
      }}
      style={[styles.root, style]}
    >
      <View style={styles.row}>
        {label ? (
          <Text style={[typography.smallStrong, { color: colors.text, fontFamily: FONT.bold }]}>
            {label}
          </Text>
        ) : (
          <View />
        )}
        {isLow ? (
          <View
            style={[
              styles.lowPill,
              { backgroundColor: colors.confidence.lowBg, borderRadius: radius.sm },
            ]}
          >
            <Text
              style={[
                typography.smallStrong,
                { color: colors.confidence.lowText, fontFamily: FONT.bold },
              ]}
            >
              {text}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              typography.label,
              { color: colors.confidence.value, fontFamily: FONT.extrabold },
            ]}
          >
            {text}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.confidence.track, borderRadius: radius.xxs },
        ]}
      >
        <View
          testID="confidence-fill"
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radius.xxs,
            backgroundColor: isLow ? colors.error : colors.confidence.fill,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lowPill: { paddingHorizontal: 10, paddingVertical: 4 },
  track: { height: 8, overflow: 'hidden' },
});
