/**
 * Inventory — the farmer's real stock (KIL-004): items with opening stock, stock changes recorded as
 * movements (applied atomically by a database trigger), low-stock and expiry alerts. Backed by
 * `inventory_items` / `inventory_movements` (owner-only RLS); no seeded data.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Package, Plus, ShieldOff } from 'lucide-react-native';

import {
  IconButton,
  LoadStateView,
  RecordSheet,
  daysLabel,
  unitLabel,
  useNotice,
} from '../components/records';
import { ItemDetail } from '../components/records/ItemDetail';
import { ItemForm } from '../components/records/ItemForm';
import { ProgressBar } from '../components/farms/ProgressBar';
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
import { useInventory } from '../hooks/useInventory';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import {
  CATEGORIES,
  categoryCounts,
  emptyItemInput,
  expiryStatus,
  filterItems,
  isLowStock,
  isOutOfStock,
  itemToInput,
  stockFill,
  type Category,
  type Item,
} from '../lib/inventory';
import { formatQuantity, formatTzs, loadState } from '../lib/recordsCommon';

type Sheet = { type: 'add' } | { type: 'edit'; id: string } | { type: 'detail'; id: string } | null;

export default function InventoryScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const goBack = () => router.back();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Gate
        feature="inventory"
        fallback={
          <>
            <ScreenHeader
              title={t('records.inventory.title')}
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
        <InventoryContent onBack={goBack} />
      </Gate>
    </SafeAreaView>
  );
}

function InventoryContent({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const inv = useInventory();
  const { notice, show: showNotice } = useNotice();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sheet, setSheet] = useState<Sheet>(null);

  const state = loadState({ loaded: inv.loaded, isOffline: inv.isOffline, error: inv.error });
  const visible = useMemo(() => filterItems(inv.items, category), [inv.items, category]);
  const counts = useMemo(() => categoryCounts(inv.items), [inv.items]);
  const present = CATEGORIES.filter((c) => counts[c] > 0);
  const sheetItem =
    sheet && sheet.type !== 'add' ? (inv.items.find((i) => i.id === sheet.id) ?? null) : null;
  const closeSheet = () => setSheet(null);
  const { summary } = inv;

  const lowLines = summary.lowStock.map((i) =>
    t('records.inventory.alert.low.line', {
      name: i.name,
      qty: formatQuantity(i.quantity),
      unit: unitLabel(t, i.unit),
    })
  );
  const expiryLines = [
    ...summary.expired.map(({ item, daysLeft }) =>
      t('records.inventory.alert.expiry.expired', {
        name: item.name,
        days: daysLabel(t, -daysLeft),
      })
    ),
    ...summary.expiring.map(({ item, daysLeft }) =>
      daysLeft === 0
        ? t('records.inventory.alert.expiry.today', { name: item.name })
        : t('records.inventory.alert.expiry.soon', {
            name: item.name,
            days: daysLabel(t, daysLeft),
          })
    ),
  ];

  const header = (
    <View style={{ marginBottom: spacing.md }}>
      {notice ? (
        <AlertCard variant="success" announce title={notice} style={{ marginBottom: spacing.lg }} />
      ) : null}
      {inv.error && inv.loaded ? (
        <AlertCard
          variant="warning"
          title={t('state.stale')}
          actionLabel={t('common.retry')}
          onAction={inv.refresh}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <Stat
            label={t('records.inventory.summary.items')}
            value={formatQuantity(summary.itemCount)}
          />
          <Stat
            label={t('records.inventory.summary.low')}
            value={formatQuantity(summary.lowStock.length)}
          />
          <Stat
            label={t('records.inventory.summary.value')}
            value={formatTzs(summary.totalValue)}
          />
        </View>
        {summary.unvalued > 0 ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
            {t('records.inventory.summary.valueNote', { n: summary.unvalued })}
          </AppText>
        ) : null}
      </Card>

      {lowLines.length > 0 ? (
        <AlertCard
          variant="warning"
          title={t('records.inventory.alert.low.title')}
          body={lowLines.join('\n')}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
      {expiryLines.length > 0 ? (
        <AlertCard
          variant={summary.expired.length > 0 ? 'danger' : 'warning'}
          title={t('records.inventory.alert.expiry.title')}
          body={expiryLines.join('\n')}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      {present.length > 1 ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('records.inventory.form.category')}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {(['all', ...present] as const).map((c) => (
            <Chip
              key={c}
              selected={category === c}
              label={
                c === 'all'
                  ? `${t('records.inventory.filter.all')} ${inv.items.length}`
                  : `${t(`records.inventory.category.${c}` as const)} ${counts[c]}`
              }
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  const emptyView =
    inv.items.length === 0 ? (
      <EmptyState
        icon={<Package size={48} color={colors.primary} />}
        title={t('records.inventory.empty.title')}
        description={t('records.inventory.empty.body')}
        actionLabel={t('records.inventory.empty.cta')}
        onAction={() => setSheet({ type: 'add' })}
      />
    ) : (
      <EmptyState
        title={t('records.inventory.emptyFilter.title')}
        description={t('records.inventory.emptyFilter.body')}
        style={{ paddingVertical: spacing.xl }}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title={t('records.inventory.title')}
        showBack
        onBack={onBack}
        backLabel={t('common.back')}
        trailing={
          state === 'ready' ? (
            <IconButton
              variant="filled"
              label={t('records.inventory.add.a11y')}
              icon={<Plus size={22} color={colors.textOnPrimary} />}
              onPress={() => setSheet({ type: 'add' })}
            />
          ) : undefined
        }
      />
      <OfflineBanner visible={inv.isOffline} message={t('records.offline.banner')} />

      {state !== 'ready' ? (
        <LoadStateView state={state} onRetry={inv.refresh} />
      ) : (
        <FlatList
          data={inv.items.length === 0 ? [] : visible}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={inv.items.length === 0 ? null : header}
          ListEmptyComponent={emptyView}
          renderItem={({ item }) => (
            <ItemRow item={item} onPress={() => setSheet({ type: 'detail', id: item.id })} />
          )}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={inv.loading && inv.loaded} onRefresh={inv.refresh} />
          }
        />
      )}

      <RecordSheet
        visible={sheet !== null && (sheet.type === 'add' || sheetItem !== null)}
        title={
          sheet?.type === 'add'
            ? t('records.inventory.form.title.add')
            : sheet?.type === 'edit'
              ? t('records.inventory.form.title.edit')
              : (sheetItem?.name ?? '')
        }
        onClose={closeSheet}
        closeLabel={t('common.close')}
        banner={<OfflineBanner visible={inv.isOffline} message={t('records.offline.banner')} />}
      >
        {sheet?.type === 'add' ? (
          <ItemForm
            key="add"
            mode="add"
            initial={emptyItemInput()}
            offline={inv.isOffline}
            onSubmit={inv.add}
            onDone={() => {
              closeSheet();
              showNotice(t('records.inventory.saved'));
            }}
            onCancel={closeSheet}
          />
        ) : null}
        {sheet?.type === 'edit' && sheetItem ? (
          <ItemForm
            key={`edit-${sheetItem.id}`}
            mode="edit"
            initial={itemToInput(sheetItem)}
            offline={inv.isOffline}
            onSubmit={(input) => inv.update(sheetItem.id, input)}
            onDone={() => {
              setSheet({ type: 'detail', id: sheetItem.id });
              showNotice(t('records.inventory.saved'));
            }}
            onCancel={() => setSheet({ type: 'detail', id: sheetItem.id })}
          />
        ) : null}
        {sheet?.type === 'detail' && sheetItem ? (
          <ItemDetail
            key={sheetItem.id}
            item={sheetItem}
            inventory={inv}
            onEdit={() => setSheet({ type: 'edit', id: sheetItem.id })}
            onDeleted={closeSheet}
            onNotice={showNotice}
          />
        ) : null}
      </RecordSheet>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1 }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText
        variant="h3"
        style={{ marginTop: spacing.xs }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
    </View>
  );
}

function ItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const { t } = useT();
  const { spacing } = useTheme();
  const unit = unitLabel(t, item.unit);
  const expiry = expiryStatus(item);
  const qty = `${formatQuantity(item.quantity)} ${unit}`;
  const category = t(`records.inventory.category.${item.category}` as const);
  const badge = isOutOfStock(item)
    ? { variant: 'error' as const, label: t('records.inventory.badge.out') }
    : isLowStock(item)
      ? { variant: 'warning' as const, label: t('records.inventory.badge.low') }
      : expiry.state === 'expired'
        ? { variant: 'error' as const, label: t('records.inventory.badge.expired') }
        : expiry.state === 'soon'
          ? { variant: 'warning' as const, label: t('records.inventory.badge.expiring') }
          : null;

  return (
    <Card
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[item.name, category, qty, badge?.label].filter(Boolean).join('. ')}
      style={{ marginBottom: spacing.md }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="h3" numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {[category, item.location].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <AppText variant="label">{qty}</AppText>
          {badge ? <Badge variant={badge.variant} label={badge.label} /> : null}
        </View>
      </View>
      {item.lowStockThreshold !== null ? (
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar pct={stockFill(item) * 100} label={`${item.name}: ${qty}`} />
        </View>
      ) : null}
    </Card>
  );
}
