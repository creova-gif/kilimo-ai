import React from 'react';
import { View } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { farmAreaSummary, formatHa, type Farm, type Plot } from '../../lib/farms';
import { useT } from '../../lib/i18n';
import { AppText, Button, Card } from '../ui';
import { areaLine } from './format';
import { PlotCard } from './PlotCard';

export interface FarmCardProps {
  farm: Farm;
  plots: Plot[];
  onEdit: () => void;
  onDelete: () => void;
  onAddPlot: () => void;
  onOpenPlot: (plot: Plot) => void;
}

/** A farm with its plots: size, how much is allocated to plots, and the plot rows. */
export function FarmCard({ farm, plots, onEdit, onDelete, onAddPlot, onOpenPlot }: FarmCardProps) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const summary = farmAreaSummary(farm, plots);
  const meta = [farm.region, areaLine(t, farm.areaHa, { withAcres: true })]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <AppText variant="h3" accessibilityRole="header">
            {farm.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            {!!farm.region && <MapPin size={14} color={colors.textMute} />}
            <AppText
              variant="caption"
              tone="muted"
              style={{ marginLeft: farm.region ? 4 : 0, flexShrink: 1 }}
            >
              {meta}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {t(plots.length === 1 ? 'farms.count.plot.one' : 'farms.count.plot.other', {
              n: plots.length,
            })}
          </AppText>
          {farm.areaHa !== null && plots.length > 0 && !summary.overAllocated && (
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {t('farms.farm.allocated', {
                used: formatHa(summary.allocatedHa) ?? '0',
                total: formatHa(farm.areaHa) ?? '0',
              })}
            </AppText>
          )}
          {summary.overAllocated && (
            <AppText variant="caption" tone="warning" style={{ marginTop: 2 }}>
              {t('farms.farm.overAllocated')}
            </AppText>
          )}
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('farms.edit')}
            accessibilityLabel={`${t('farms.edit')}: ${farm.name}`}
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={onEdit}
          />
          <Button
            label={t('farms.delete')}
            accessibilityLabel={`${t('farms.delete')}: ${farm.name}`}
            variant="destructiveOutline"
            size="sm"
            fullWidth={false}
            onPress={onDelete}
          />
        </View>
      </View>

      {plots.length === 0 ? (
        <AppText variant="body" tone="muted" style={{ marginTop: spacing.md }}>
          {t('farms.farm.noPlots')}
        </AppText>
      ) : (
        plots.map((p) => <PlotCard key={p.id} plot={p} onPress={() => onOpenPlot(p)} />)
      )}

      <Button
        label={t('farms.add.plot')}
        accessibilityLabel={`${t('farms.add.plot')}: ${farm.name}`}
        variant="secondary"
        size="sm"
        fullWidth
        icon={<Plus size={18} color={colors.primary} />}
        onPress={onAddPlot}
        style={{ marginTop: spacing.md }}
      />
    </Card>
  );
}
