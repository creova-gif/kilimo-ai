import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../../constants/Theme';
import { cropDisplay, plotLifecycle, type Plot } from '../../lib/farms';
import { useT } from '../../lib/i18n';
import { AppText, Badge } from '../ui';
import { areaLine, harvestLine, STAGE_BADGE, stageLabel } from './format';
import { ProgressBar } from './ProgressBar';

/** One plot row: crop, area, estimated stage and progress. Opens the plot detail. */
export function PlotCard({ plot, onPress }: { plot: Plot; onPress: () => void }) {
  const { t, lang } = useT();
  const { colors, spacing, radius, borderWidth } = useTheme();
  const lc = plotLifecycle(plot);
  const crop = cropDisplay(plot.crop, lang);
  const stage = stageLabel(t, lc.stage);
  const area = areaLine(t, plot.areaHa);
  const harvest = harvestLine(t, lc);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[crop ?? plot.name, crop ? plot.name : null, stage, area]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: spacing.md,
        borderRadius: radius.sm,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceMuted : colors.card,
        marginTop: spacing.sm,
      })}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <AppText variant="label" numberOfLines={1}>
            {crop ?? plot.name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {[crop ? plot.name : null, area].filter(Boolean).join('  ·  ')}
          </AppText>
        </View>
        <Badge label={stage} variant={STAGE_BADGE[lc.stage]} />
      </View>
      {lc.progressPct !== null && lc.stage !== 'planned' && lc.stage !== 'harvested' && (
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar
            pct={lc.progressPct}
            label={t('farms.progress.a11y', { pct: lc.progressPct })}
          />
        </View>
      )}
      {!!harvest && (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {harvest}
        </AppText>
      )}
    </Pressable>
  );
}
