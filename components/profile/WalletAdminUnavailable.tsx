/**
 * Wallet admin (co-op / commercial admins). Gated to FULL `wallet_admin` access. There is no
 * wallet-admin backend yet, so admins see an honest "not available yet" state — never invented
 * balances, members or payouts.
 */
import React from 'react';
import { ShieldCheck, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { useHasFullAccess } from '../../lib/access';
import { useWalletAdminStore } from '../../store/useWalletAdminStore';
import { EmptyState } from '../ui';
import { ProfileScreenFrame } from './ProfileScreenFrame';

export function WalletAdminUnavailable() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const allowed = useHasFullAccess('wallet_admin');
  const backendAvailable = useWalletAdminStore((s) => s.backendAvailable);

  return (
    <ProfileScreenFrame title={t('profile.walletAdmin.title')}>
      {!allowed ? (
        <EmptyState
          icon={<ShieldCheck size={48} color={colors.primary} />}
          title={t('profile.walletAdmin.denied.title')}
          description={t('profile.walletAdmin.denied.body')}
          actionLabel={t('common.back')}
          onAction={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any)
          }
        />
      ) : !backendAvailable ? (
        <EmptyState
          icon={<Wallet size={48} color={colors.primary} />}
          title={t('profile.walletAdmin.unavailable.title')}
          description={t('profile.walletAdmin.unavailable.body')}
          caption={t('profile.walletAdmin.unavailable.caption')}
          actionLabel={t('profile.walletAdmin.unavailable.finance')}
          onAction={() => router.push('/finance' as any)}
        />
      ) : null}
    </ProfileScreenFrame>
  );
}
