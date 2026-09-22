import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { useTheme } from '../../constants/Theme';
import type { MonthTotals } from '../../lib/finance';

export interface MonthBarsProps {
  months: MonthTotals[];
  /** Short month label for a `YYYY-MM` key (already localised). */
  labelFor: (monthKey: string) => string;
  /** Screen-reader sentence for one month (already localised, includes the amounts). */
  a11yFor: (m: MonthTotals) => string;
  /** Localised legend labels. */
  incomeLabel: string;
  expenseLabel: string;
  /** The month currently selected on the screen (drawn at full strength). */
  selectedMonth?: string;
}

const CHART_HEIGHT = 96;

/** Income vs expense bars for a run of months, drawn with plain Views (no SVG dependency). */
export function MonthBars({
  months,
  labelFor,
  a11yFor,
  incomeLabel,
  expenseLabel,
  selectedMonth,
}: MonthBarsProps) {
  const { colors, radius } = useTheme();
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const h = (v: number) => (v > 0 ? Math.max(3, Math.round((v / max) * CHART_HEIGHT)) : 0);

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <AppText variant="caption" tone="muted">
            {incomeLabel}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <AppText variant="caption" tone="muted">
            {expenseLabel}
          </AppText>
        </View>
      </View>
      <View style={styles.row}>
        {months.map((m) => {
          const selected = m.month === selectedMonth;
          return (
            <View
              key={m.month}
              accessible
              accessibilityLabel={a11yFor(m)}
              style={styles.col}
              testID={`month-bars-${m.month}`}
            >
              <View style={[styles.bars, { height: CHART_HEIGHT }]}>
                <View
                  style={{
                    width: 10,
                    height: h(m.income),
                    borderRadius: radius.xxs,
                    backgroundColor: colors.primary,
                    opacity: selected ? 1 : 0.5,
                  }}
                />
                <View
                  style={{
                    width: 10,
                    height: h(m.expense),
                    borderRadius: radius.xxs,
                    backgroundColor: colors.error,
                    opacity: selected ? 1 : 0.5,
                  }}
                />
              </View>
              <AppText
                variant={selected ? 'captionStrong' : 'caption'}
                tone={selected ? 'default' : 'muted'}
              >
                {labelFor(m.month)}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
});
