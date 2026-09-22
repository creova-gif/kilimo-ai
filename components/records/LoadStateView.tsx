import React from 'react';
import { View } from 'react-native';
import { CloudOff, LockKeyhole } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import type { LoadState } from '../../lib/recordsCommon';
import { ErrorState, SkeletonBlock, SkeletonGroup } from '../ui';

/** The non-`ready` full-screen states shared by the livestock and inventory screens. */
export function LoadStateView({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  const { t } = useT();
  const { colors, spacing } = useTheme();

  switch (state) {
    case 'loading':
      return (
        <SkeletonGroup label={t('state.loading')} style={{ padding: spacing.lg }}>
          <SkeletonBlock height={88} radius={16} />
          <SkeletonBlock height={72} radius={16} />
          <SkeletonBlock height={72} radius={16} />
        </SkeletonGroup>
      );
    case 'offline':
      return (
        <View style={{ flex: 1 }}>
          <ErrorState
            icon={<CloudOff size={48} color={colors.errorText} />}
            title={t('records.offline.title')}
            description={t('records.offline.loadBody')}
            retryLabel={t('common.retry')}
            onRetry={onRetry}
          />
        </View>
      );
    case 'unavailable':
      return (
        <View style={{ flex: 1 }}>
          <ErrorState
            title={t('state.unavailable.title')}
            description={t('state.unavailable.body')}
          />
        </View>
      );
    case 'auth':
      return (
        <View style={{ flex: 1 }}>
          <ErrorState
            icon={<LockKeyhole size={48} color={colors.errorText} />}
            title={t('records.auth.title')}
            description={t('records.auth.body')}
            retryLabel={t('common.retry')}
            onRetry={onRetry}
          />
        </View>
      );
    default:
      return (
        <View style={{ flex: 1 }}>
          <ErrorState
            title={t('state.error.title')}
            description={t('state.error.body')}
            retryLabel={t('common.retry')}
            onRetry={onRetry}
          />
        </View>
      );
  }
}
