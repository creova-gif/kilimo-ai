import React from 'react';
import { Sprout } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonGroup } from '../ui';

interface FarmsLike {
  plots: unknown[];
  loading: boolean;
  loaded: boolean;
  error: 'not_configured' | 'error' | null;
  isOffline: boolean;
  refresh: () => void;
}

/**
 * The blocking state for a farm tool that needs the farmer's plots: loading, unconfigured,
 * offline with nothing loaded, error, or "no plots yet" (with a way to the Shamba tab).
 * Returns null when plots are loaded and at least one exists.
 */
export function FarmDataState({
  data,
  onAddPlot,
  emptyBody,
}: {
  data: FarmsLike;
  onAddPlot: () => void;
  emptyBody?: string;
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  if (data.error === 'not_configured') {
    return (
      <EmptyState title={t('state.unavailable.title')} description={t('planning.unconfigured')} />
    );
  }
  if (!data.loaded && data.isOffline) {
    return <EmptyState title={t('planning.offline.title')} description={t('planning.offline.body')} />;
  }
  if (data.loading && !data.loaded) {
    return (
      <SkeletonGroup label={t('state.loading')}>
        {[0, 1].map((i) => (
          <SkeletonBlock key={i} height={96} radius={16} style={{ marginBottom: spacing.md }} />
        ))}
      </SkeletonGroup>
    );
  }
  if (data.error && !data.loaded) {
    return (
      <ErrorState
        title={t('planning.error.plots')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={data.refresh}
      />
    );
  }
  if (data.loaded && data.plots.length === 0) {
    return (
      <EmptyState
        icon={<Sprout size={48} color={colors.primary} />}
        title={t('planning.noPlots.title')}
        description={emptyBody ?? t('planning.noPlots.body')}
        actionLabel={t('planning.noPlots.cta')}
        onAction={onAddPlot}
      />
    );
  }
  return null;
}
