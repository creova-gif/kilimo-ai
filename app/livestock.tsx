/**
 * Livestock — the farmer's real herd (KIL-004): list, add / edit / delete, per-animal health history,
 * vaccination reminders. Backed by `livestock` / `livestock_events` (owner-only RLS); no seeded data.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Beef, Plus, ShieldOff, Syringe } from 'lucide-react-native';

import {
  IconButton,
  LoadStateView,
  RecordSheet,
  ageLabel,
  daysLabel,
  useNotice,
} from '../components/records';
import { AnimalDetail } from '../components/records/AnimalDetail';
import { AnimalForm } from '../components/records/AnimalForm';
import {
  AlertCard,
  AppText,
  Badge,
  Card,
  Chip,
  EmptyState,
  OfflineBanner,
  ScreenHeader,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useLivestock } from '../hooks/useLivestock';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import {
  ANIMAL_STATUSES,
  SPECIES,
  animalToInput,
  emptyAnimalInput,
  filterAnimals,
  type Animal,
  type AnimalStatus,
  type Species,
  type UpcomingVaccination,
} from '../lib/livestock';
import { formatQuantity, loadState } from '../lib/recordsCommon';

type Sheet = { type: 'add' } | { type: 'edit'; id: string } | { type: 'detail'; id: string } | null;

export default function LivestockScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const goBack = () => router.back();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Gate
        feature="livestock"
        fallback={
          <>
            <ScreenHeader
              title={t('records.livestock.title')}
              showBack
              onBack={goBack}
              backLabel={t('common.back')}
            />
            <EmptyState
              icon={<ShieldOff size={48} color={colors.primary} />}
              title={t('records.noAccess.title')}
              description={t('records.noAccess.body')}
            />
          </>
        }
      >
        <LivestockContent onBack={goBack} />
      </Gate>
    </SafeAreaView>
  );
}

function LivestockContent({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const herd = useLivestock();
  const { notice, show: showNotice } = useNotice();
  const [statusFilter, setStatusFilter] = useState<AnimalStatus | 'all'>('active');
  const [speciesFilter, setSpeciesFilter] = useState<Species | 'all'>('all');
  const [sheet, setSheet] = useState<Sheet>(null);

  const state = loadState({ loaded: herd.loaded, isOffline: herd.isOffline, error: herd.error });
  const visible = useMemo(
    () => filterAnimals(herd.animals, { status: statusFilter, species: speciesFilter }),
    [herd.animals, statusFilter, speciesFilter]
  );
  const vaccByAnimal = useMemo(
    () => new Map(herd.vaccinations.map((v) => [v.animal.id, v])),
    [herd.vaccinations]
  );

  const speciesPresent = SPECIES.filter((s) => herd.animals.some((a) => a.species === s));
  const statusesPresent = ANIMAL_STATUSES.filter((s) => herd.summary.byStatus[s] > 0);
  const sheetAnimal =
    sheet && sheet.type !== 'add' ? (herd.animals.find((a) => a.id === sheet.id) ?? null) : null;

  const closeSheet = () => setSheet(null);

  const vaccLine = (v: UpcomingVaccination) =>
    v.daysUntil < 0
      ? t('records.livestock.vacc.overdue', { tag: v.animal.tagOrName, days: daysLabel(t, -v.daysUntil) })
      : v.daysUntil === 0
        ? t('records.livestock.vacc.today', { tag: v.animal.tagOrName })
        : t('records.livestock.vacc.soon', { tag: v.animal.tagOrName, days: daysLabel(t, v.daysUntil) });

  const header = (
    <View style={{ marginBottom: spacing.md }}>
      {notice ? (
        <AlertCard
          variant="success"
          announce
          title={notice}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      {herd.error && herd.loaded ? (
        <AlertCard
          variant="warning"
          title={t('state.stale')}
          actionLabel={t('common.retry')}
          onAction={herd.refresh}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <AppText variant="caption" tone="muted">
          {t('records.livestock.summary.activeLabel')}
        </AppText>
        <AppText variant="display" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
          {formatQuantity(herd.summary.active)}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {SPECIES.filter((s) => herd.summary.bySpecies[s] > 0).map((s) => (
            <Badge
              key={s}
              variant="neutral"
              label={`${t(`records.livestock.species.${s}` as const)} ${herd.summary.bySpecies[s]}`}
            />
          ))}
        </View>
      </Card>

      {herd.vaccinations.length > 0 ? (
        <AlertCard
          variant={herd.vaccinations.some((v) => v.overdue) ? 'danger' : 'warning'}
          icon={<Syringe size={22} color={colors.text} />}
          title={t('records.livestock.vacc.title')}
          body={herd.vaccinations.map(vaccLine).join('\n')}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
      {herd.remindersFailed ? (
        <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.lg }}>
          {t('records.livestock.vacc.remindersFailed')}
        </AppText>
      ) : null}

      {statusesPresent.some((s) => s !== 'active') ? (
        <FilterRow label={t('records.livestock.filter.status')}>
          {(['all', ...ANIMAL_STATUSES] as const).map((s) => (
            <Chip
              key={s}
              selected={statusFilter === s}
              label={
                s === 'all'
                  ? `${t('records.livestock.filter.all')} ${herd.summary.total}`
                  : `${t(`records.livestock.status.${s}` as const)} ${herd.summary.byStatus[s]}`
              }
              onPress={() => setStatusFilter(s)}
            />
          ))}
        </FilterRow>
      ) : null}
      {speciesPresent.length > 1 ? (
        <FilterRow label={t('records.livestock.filter.species')}>
          {(['all', ...speciesPresent] as const).map((s) => (
            <Chip
              key={s}
              selected={speciesFilter === s}
              label={
                s === 'all' ? t('records.livestock.filter.all') : t(`records.livestock.species.${s}` as const)
              }
              onPress={() => setSpeciesFilter(s)}
            />
          ))}
        </FilterRow>
      ) : null}
    </View>
  );

  const emptyView =
    herd.animals.length === 0 ? (
      <EmptyState
        icon={<Beef size={48} color={colors.primary} />}
        title={t('records.livestock.empty.title')}
        description={t('records.livestock.empty.body')}
        actionLabel={t('records.livestock.empty.cta')}
        onAction={() => setSheet({ type: 'add' })}
      />
    ) : (
      <EmptyState
        title={t('records.livestock.emptyFilter.title')}
        description={t('records.livestock.emptyFilter.body')}
        style={{ paddingVertical: spacing.xl }}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title={t('records.livestock.title')}
        showBack
        onBack={onBack}
        backLabel={t('common.back')}
        trailing={
          state === 'ready' ? (
            <IconButton
              variant="filled"
              label={t('records.livestock.add.a11y')}
              icon={<Plus size={22} color={colors.textOnPrimary} />}
              onPress={() => setSheet({ type: 'add' })}
            />
          ) : undefined
        }
      />
      <OfflineBanner visible={herd.isOffline} message={t('records.offline.banner')} />

      {state !== 'ready' ? (
        <LoadStateView state={state} onRetry={herd.refresh} />
      ) : (
        <FlatList
          data={herd.animals.length === 0 ? [] : visible}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={herd.animals.length === 0 ? null : header}
          ListEmptyComponent={emptyView}
          renderItem={({ item }) => (
            <AnimalRow
              animal={item}
              vaccination={vaccByAnimal.get(item.id)}
              onPress={() => setSheet({ type: 'detail', id: item.id })}
            />
          )}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={herd.loading && herd.loaded} onRefresh={herd.refresh} />}
        />
      )}

      <RecordSheet
        visible={sheet !== null && (sheet.type === 'add' || sheetAnimal !== null)}
        title={
          sheet?.type === 'add'
            ? t('records.livestock.form.title.add')
            : sheet?.type === 'edit'
              ? t('records.livestock.form.title.edit')
              : (sheetAnimal?.tagOrName ?? '')
        }
        onClose={closeSheet}
        closeLabel={t('common.close')}
        banner={<OfflineBanner visible={herd.isOffline} message={t('records.offline.banner')} />}
      >
        {sheet?.type === 'add' ? (
          <AnimalForm
            key="add"
            mode="add"
            initial={emptyAnimalInput()}
            offline={herd.isOffline}
            onSubmit={herd.add}
            onDone={() => {
              closeSheet();
              showNotice(t('records.livestock.saved'));
            }}
            onCancel={closeSheet}
          />
        ) : null}
        {sheet?.type === 'edit' && sheetAnimal ? (
          <AnimalForm
            key={`edit-${sheetAnimal.id}`}
            mode="edit"
            initial={animalToInput(sheetAnimal)}
            offline={herd.isOffline}
            onSubmit={(input) => herd.update(sheetAnimal.id, input)}
            onDone={() => {
              setSheet({ type: 'detail', id: sheetAnimal.id });
              showNotice(t('records.livestock.saved'));
            }}
            onCancel={() => setSheet({ type: 'detail', id: sheetAnimal.id })}
          />
        ) : null}
        {sheet?.type === 'detail' && sheetAnimal ? (
          <AnimalDetail
            key={sheetAnimal.id}
            animal={sheetAnimal}
            herd={herd}
            onEdit={() => setSheet({ type: 'edit', id: sheetAnimal.id })}
            onDeleted={closeSheet}
            onNotice={showNotice}
          />
        ) : null}
      </RecordSheet>
    </View>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText variant="overline" tone="muted" uppercase style={{ marginBottom: spacing.xs2 }}>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {children}
      </View>
    </View>
  );
}

function AnimalRow({
  animal,
  vaccination,
  onPress,
}: {
  animal: Animal;
  vaccination?: UpcomingVaccination;
  onPress: () => void;
}) {
  const { t } = useT();
  const { spacing } = useTheme();
  const species = t(`records.livestock.species.${animal.species}` as const);
  const status = t(`records.livestock.status.${animal.status}` as const);
  const age = ageLabel(t, animal.birthDate);
  const meta = [
    species,
    animal.sex ? t(`records.livestock.sex.${animal.sex}` as const) : null,
    age,
    animal.weightKg !== null ? `${formatQuantity(animal.weightKg)} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${animal.tagOrName}. ${meta}. ${status}`}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" numberOfLines={1}>
            {animal.tagOrName}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {meta}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          {animal.status !== 'active' ? (
            <Badge label={status} variant="neutral" />
          ) : vaccination ? (
            <Badge
              label={t('records.livestock.kind.vaccination')}
              variant={vaccination.overdue ? 'error' : 'warning'}
              icon={undefined}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}
