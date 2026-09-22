/**
 * Shared frame for the profile-area stack screens (verification, wallet admin): safe area,
 * localized back button, optional offline banner and pull-to-refresh.
 */
import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useT } from '../../lib/i18n';
import { OfflineBanner, ScreenHeader } from '../ui';

export interface ProfileScreenFrameProps {
  title: string;
  subtitle?: string;
  /** Where "back" goes when there is no history (deep link). */
  fallbackRoute?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export function ProfileScreenFrame({
  title,
  subtitle,
  fallbackRoute = '/(tabs)/profile',
  refreshing,
  onRefresh,
  children,
}: ProfileScreenFrameProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const isOnline = useKilimoStore((s) => s.isOnline);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace(fallbackRoute as any))}
        backLabel={t('common.back')}
      />
      <OfflineBanner visible={!isOnline} message={t('state.offline.banner')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 64, gap: 16, flexGrow: 1 },
});
