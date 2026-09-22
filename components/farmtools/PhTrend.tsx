import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../../constants/Theme';

/**
 * pH readings the farmer recorded, oldest → newest. Draws only real points; a dashed band marks
 * the general 6.0–7.0 optimum. Needs at least two readings to be shown by the caller.
 */
export function PhTrend({
  series,
  labels,
  accessibilityLabel,
}: {
  series: { testedOn: string; ph: number }[];
  /** Short date label per point (localised by the caller). */
  labels: string[];
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const h = 120;
  const pad = 20;
  const vals = series.map((s) => s.ph);
  const min = Math.min(4.5, ...vals) - 0.2;
  const max = Math.max(8, ...vals) + 0.2;
  const x = (i: number) => (series.length === 1 ? w / 2 : pad + (i / (series.length - 1)) * (w - pad * 2));
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
  const points = series.map((s, i) => `${x(i)},${y(s.ph)}`).join(' ');

  return (
    <View
      style={{ height: h }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {w > 0 && (
        <Svg width={w} height={h}>
          {[6, 7].map((v) => (
            <Line
              key={v}
              x1={pad}
              x2={w - pad}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.primary}
              strokeDasharray="4,4"
              strokeWidth={1}
            />
          ))}
          <Polyline points={points} fill="none" stroke={colors.text} strokeWidth={2} />
          {series.map((s, i) => (
            <React.Fragment key={`${s.testedOn}-${i}`}>
              <Circle cx={x(i)} cy={y(s.ph)} r={4} fill={colors.primary} />
              <SvgText x={x(i)} y={y(s.ph) - 8} fontSize={10} fill={colors.text} textAnchor="middle">
                {String(s.ph)}
              </SvgText>
              <SvgText x={x(i)} y={h - 4} fontSize={9} fill={colors.textMute} textAnchor="middle">
                {labels[i] ?? ''}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      )}
    </View>
  );
}
