/**
 * Shamba — the farmer's real farms and plots (KIL-003).
 *
 * Replaces the hard-coded "Zone 42 - Cornfield" ZONES map. Data comes only from `farms` / `plots`
 * (owner-only RLS); an empty account shows an honest empty state with a way to add the first farm.
 * Onboarding profile details (region, size, crops) can PRE-FILL the add-farm form, but no record is
 * ever created without the farmer pressing Save. Lifecycle progress is an estimate from the dates
 * the farmer entered. Writes are online-only for now and say so when offline.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Sprout } from 'lucide-react-native';

import { FarmCard } from '../../components/farms/FarmCard';
import { FarmFormModal } from '../../components/farms/FarmFormModal';
import { areaLine, failureMessage } from '../../components/farms/format';
import { PlotFormModal } from '../../components/farms/PlotFormModal';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  OfflineBanner,
  SkeletonBlock,
  SkeletonGroup,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { useFarms } from '../../hooks/useFarms';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { prefillFromProfile, totalPlotAreaHa, type Farm, type Plot } from '../../lib/farms';
import { useT, type TranslationKey } from '../../lib/i18n';
import { useKilimoStore } from '../../store/useKilimoStore';

type FarmForm = { farm?: Farm; prefill?: boolean } | null;
type PlotForm = { farm: Farm; plot?: Plot } | null;

export default function FarmsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const data = useFarms();
  const { farms, plots, loading, loaded, error, isOffline, refresh } = data;

  const [farmForm, setFarmForm] = useState<FarmForm>(null);
  const [plotForm, setPlotForm] = useState<PlotForm>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useRefreshOnFocus(refresh);

  const prefill = useMemo(() => prefillFromProfile(farmProfile), [farmProfile]);
  const plotsByFarm = useMemo(() => {
    const m = new Map<string, Plot[]>();
    for (const p of plots) m.set(p.farmId, [...(m.get(p.farmId) ?? []), p]);
    return m;
  }, [plots]);
  const totals = useMemo(() => totalPlotAreaHa(plots), [plots]);

  const confirmDeleteFarm = useCallback(
    (farm: Farm) => {
      Alert.alert(t('farms.delete.farm.title'), t('farms.delete.farm.body', { name: farm.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('farms.delete'),
          style: 'destructive',
          onPress: async () => {
            setNotice(null);
            setDeleteError(null);
            const r = await data.deleteFarm(farm.id);
            if (r.ok) setNotice('farms.notice.farmDeleted');
            else
              setDeleteError(
                r.reason === 'offline'
                  ? t('farms.offline.write')
                  : failureMessage(t, r.reason, 'farm')
              );
          },
        },
      ]);
    },
    [data, t]
  );

  const header = (
    <View>
      <View style={styles.titleRow}>
        <AppText variant="h1" accessibilityRole="header" style={{ flex: 1 }}>
          {t('farms.title')}
        </AppText>
        {loaded && farms.length > 0 && (
          <Button
            label={t('farms.add.farm')}
            variant="outline"
            size="sm"
            fullWidth={false}
            icon={<Plus size={18} color={colors.text} />}
            onPress={() => {
              setNotice(null);
              setFarmForm({});
            }}
          />
        )}
      </View>

      {isOffline && (
        <OfflineBanner message={t('state.offline.banner')} style={{ marginTop: spacing.md }} />
      )}
      {!!notice && (
        <AlertCard variant="success" title={t(notice)} announce style={{ marginTop: spacing.md }} />
      )}
      {!!deleteError && (
        <AlertCard
          variant="danger"
          title={deleteError}
          announce
          style={{ marginTop: spacing.md }}
        />
      )}
      {!!error && loaded && (
        <AlertCard
          variant="warning"
          title={t('farms.error.title')}
          actionLabel={t('common.retry')}
          onAction={refresh}
          style={{ marginTop: spacing.md }}
        />
      )}

      {loaded && farms.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.statsRow}>
            <Stat label={t('farms.stat.farms')} value={String(farms.length)} />
            <Stat label={t('farms.stat.plots')} value={String(plots.length)} />
            <Stat
              label={t('farms.stat.area')}
              value={totals.totalHa > 0 ? areaLine(t, totals.totalHa) : t('farms.stat.areaUnknown')}
            />
          </View>
        </Card>
      )}
      <View style={{ height: spacing.lg }} />
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (error === 'not_configured') {
    empty = <EmptyState title={t('farms.unconfigured')} />;
  } else if (!loaded && isOffline) {
    empty = <EmptyState title={t('farms.offline.title')} description={t('farms.offline.body')} />;
  } else if (loading && !loaded) {
    empty = (
      <SkeletonGroup label={t('state.loading')}>
        {[0, 1].map((i) => (
          <SkeletonBlock key={i} height={140} radius={16} style={{ marginBottom: spacing.md }} />
        ))}
      </SkeletonGroup>
    );
  } else if (error && !loaded) {
    empty = (
      <ErrorState
        title={t('farms.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    );
  } else if (loaded && farms.length === 0) {
    empty = (
      <EmptyState
        icon={<Sprout size={48} color={colors.primary} />}
        title={t('farms.empty.title')}
        description={t('farms.empty.body')}
        actionLabel={t('farms.empty.cta')}
        onAction={() => setFarmForm({})}
        secondaryActionLabel={prefill ? t('farms.empty.profile') : undefined}
        onSecondaryAction={prefill ? () => setFarmForm({ prefill: true }) : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={empty ? [] : farms}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FarmCard
            farm={item}
            plots={plotsByFarm.get(item.id) ?? []}
            onEdit={() => {
              setNotice(null);
              setFarmForm({ farm: item });
            }}
            onDelete={() => confirmDeleteFarm(item)}
            onAddPlot={() => {
              setNotice(null);
              setPlotForm({ farm: item });
            }}
            onOpenPlot={(p) => router.push(`/field/${p.id}` as any)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={refresh} />}
      />

      {farmForm && (
        <FarmFormModal
          farm={farmForm.farm}
          prefill={farmForm.prefill ? prefill : null}
          isOffline={isOffline}
          onClose={() => setFarmForm(null)}
          onSubmit={async (input) => {
            const r = farmForm.farm
              ? await data.updateFarm(farmForm.farm.id, input)
              : await data.createFarm(input);
            if (r.ok) setNotice('farms.notice.farmSaved');
            return r;
          }}
        />
      )}
      {plotForm && (
        <PlotFormModal
          farmName={plotForm.farm.name}
          plot={plotForm.plot}
          cropSuggestions={prefill?.crops ?? []}
          isOffline={isOffline}
          onClose={() => setPlotForm(null)}
          onSubmit={async (input) => {
            const r = plotForm.plot
              ? await data.updatePlot(plotForm.plot.id, input)
              : await data.createPlot(plotForm.farm.id, input);
            if (r.ok) setNotice('farms.notice.plotSaved');
            return r;
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 2, textAlign: 'center' }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
