import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { cropDisplay, type Farm, type Plot } from '../../lib/farms';
import { useT } from '../../lib/i18n';
import { AppText, ListGroup, ListRow } from '../ui';
import { areaLine } from '../farms/format';

/** "Mahindi · 1.5 ha · Mpakani" — the farmer's own plot details. */
export function plotSubtitle(
  t: ReturnType<typeof useT>['t'],
  lang: 'sw' | 'en',
  plot: Plot,
  farm?: Farm | null
) {
  return [cropDisplay(plot.crop, lang) ?? t('planning.plot.noCrop'), areaLine(t, plot.areaHa), farm?.name]
    .filter(Boolean)
    .join(' · ');
}

/** Pick one of the farmer's real plots. */
export function PlotPicker({
  plots,
  farms,
  selectedId,
  onSelect,
  title,
}: {
  plots: Plot[];
  farms: Farm[];
  selectedId?: string | null;
  onSelect: (plot: Plot) => void;
  title?: string;
}) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const farmById = new Map(farms.map((f) => [f.id, f]));
  return (
    <View>
      {!!title && (
        <AppText variant="label" style={{ marginBottom: spacing.sm }}>
          {title}
        </AppText>
      )}
      <ListGroup>
        {plots.map((p) => (
          <ListRow
            key={p.id}
            title={p.name}
            subtitle={plotSubtitle(t, lang, p, farmById.get(p.farmId))}
            leading={<MapPin size={20} color={colors.primary} />}
            selected={selectedId === p.id}
            onPress={() => onSelect(p)}
            accessibilityLabel={`${p.name}, ${plotSubtitle(t, lang, p, farmById.get(p.farmId))}`}
            accessibilityHint={t('planning.plot.selectHint')}
          />
        ))}
      </ListGroup>
    </View>
  );
}
