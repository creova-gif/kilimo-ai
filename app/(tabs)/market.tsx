/**
 * Soko (Market) — phase 1: discover real produce listings.
 * Figma `Mobile / Soko / Search` (53:528) + Marketplace Browse, reconciled in
 * docs/kilimo-v2/04_RECONCILIATION/market_soko_contracts.md.
 *
 * Data: `market_listings` only (real, seller-owned). No seed listings, no prices we made up,
 * no escrow claims. Empty table = a real empty marketplace with a clear way to add a listing.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';

import { ListingCard } from '../../components/soko/ListingCard';
import {
  AppText,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  SkeletonBlock,
  SkeletonGroup,
  TextField,
} from '../../components/ui';
import { CROPS, cropNames } from '../../constants/onboardingOptions';
import { useTheme } from '../../constants/Theme';
import { useListings } from '../../hooks/useListings';
import { useT } from '../../lib/i18n';

export default function SokoScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [crop, setCrop] = useState<string | null>(null);
  const { listings, loading, loaded, error, isOffline, refresh } = useListings({
    search: search.trim(),
    crop: crop ?? undefined,
  });

  const crops = useMemo(() => CROPS.map((label) => ({ ...cropNames(label), label })), []);
  const filtering = !!search.trim() || !!crop;

  const header = (
    <View>
      <View style={styles.titleRow}>
        <AppText variant="h1" accessibilityRole="header" style={{ flex: 1 }}>
          {t('soko.title')}
        </AppText>
        <Button
          label={t('soko.myActivity')}
          variant="outline"
          size="sm"
          onPress={() => router.push('/soko/mine' as any)}
        />
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder={t('soko.search.ph')}
        accessibilityLabel={t('soko.search.ph')}
        returnKeyType="search"
        autoCorrect={false}
        shape="search"
        leftIcon={<Search size={18} color={colors.textMute} />}
        wrapperStyle={{ marginTop: spacing.md }}
        testID="soko-search"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: spacing.md }}
      >
        <Chip
          label={t('soko.filter.all')}
          selected={!crop}
          onPress={() => setCrop(null)}
          style={styles.chip}
        />
        {crops.map((c) => (
          <Chip
            key={c.en}
            label={lang === 'sw' ? c.sw : c.en}
            selected={crop === c.en}
            onPress={() => setCrop(crop === c.en ? null : c.en)}
            style={styles.chip}
          />
        ))}
      </ScrollView>

      {isOffline && (
        <OfflineBanner message={t('state.offline.banner')} style={{ marginBottom: spacing.md }} />
      )}
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (loading && !loaded) {
    empty = (
      <SkeletonGroup label={t('state.loading')}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} height={96} radius={16} style={{ marginBottom: spacing.md }} />
        ))}
      </SkeletonGroup>
    );
  } else if (error === 'not_configured') {
    empty = <EmptyState title={t('soko.unconfigured')} />;
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
        title={t(filtering ? 'soko.empty.search' : 'soko.empty.title')}
        description={filtering ? undefined : t('soko.empty.body')}
        actionLabel={filtering ? undefined : t('soko.create')}
        onAction={filtering ? undefined : () => router.push('/soko/create' as any)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={empty ? [] : listings}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/soko/${item.id}` as any)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={refresh} />}
      />
      <View style={styles.fab} pointerEvents="box-none">
        <Button
          label={t('soko.create')}
          icon={<Plus size={20} color="#fff" />}
          onPress={() => router.push('/soko/create' as any)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { marginRight: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
