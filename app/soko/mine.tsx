/** Soko — "Matangazo yangu": the signed-in seller's own listings (any status), mark as sold. */
import React from 'react';
import { Alert, FlatList, RefreshControl, SafeAreaView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { ListingCard } from '../../components/soko/ListingCard';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { useListings, useMyUserId } from '../../hooks/useListings';
import { useT } from '../../lib/i18n';
import { markListingSold } from '../../lib/listings';
import { getSupabase } from '../../lib/supabase';

export default function MyListings() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const me = useMyUserId();
  const { listings, loading, loaded, error, refresh } = useListings({ sellerId: me ?? undefined });

  const sold = async (id: string) => {
    const r = await markListingSold(getSupabase(), id);
    if (r.ok) refresh();
    else Alert.alert(t('state.error.title'), t('state.error.body'));
  };

  let empty: React.ReactElement | null = null;
  if (!me || (loading && !loaded)) {
    empty = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={96} radius={16} />
      </SkeletonGroup>
    );
  } else if (error && !loaded) {
    empty = (
      <ErrorState
        title={t('soko.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    );
  } else if (listings.length === 0) {
    empty = (
      <EmptyState
        title={t('soko.mine.empty.title')}
        description={t('soko.mine.empty.body')}
        actionLabel={t('soko.create')}
        onAction={() => router.push('/soko/create' as any)}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('soko.mine.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <FlatList
        data={empty ? [] : listings}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <View>
            <ListingCard listing={item} onPress={() => router.push(`/soko/${item.id}` as any)} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: -spacing.xs,
                marginBottom: spacing.lg,
              }}
            >
              <Badge
                label={t(`soko.status.${item.status}` as const)}
                variant={item.status === 'active' ? 'success' : 'neutral'}
              />
              {item.status === 'active' && (
                <Button
                  label={t('soko.detail.markSold')}
                  variant="link"
                  size="sm"
                  onPress={() => sold(item.id)}
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={empty}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={refresh} />}
      />
    </SafeAreaView>
  );
}
