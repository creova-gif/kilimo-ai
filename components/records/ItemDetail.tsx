import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useItemMovements, type useInventory } from '../../hooks/useInventory';
import { useT } from '../../lib/i18n';
import {
  OPENING_STOCK_NOTE,
  expiryStatus,
  isLowStock,
  isOutOfStock,
  runningBalances,
  type Item,
  type Movement,
} from '../../lib/inventory';
import { formatQuantity, formatTzs, reasonOf } from '../../lib/recordsCommon';
import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  SkeletonBlock,
  SkeletonGroup,
} from '../ui';
import { FieldRow } from './FieldRow';
import { MovementForm } from './MovementForm';
import { daysLabel, failMessage, formatDate, unitLabel } from './format';

export interface ItemDetailProps {
  item: Item;
  inventory: ReturnType<typeof useInventory>;
  onEdit: () => void;
  onDeleted: () => void;
  onNotice: (message: string) => void;
}

/** One inventory item: stock, alerts, details, and its stock-change history with running balance. */
export function ItemDetail({ item, inventory, onEdit, onDeleted, onNotice }: ItemDetailProps) {
  const { t, lang } = useT();
  const { spacing } = useTheme();
  const history = useItemMovements(item, inventory.reload);
  const [recording, setRecording] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const unit = unitLabel(t, item.unit);
  const expiry = expiryStatus(item);
  const balances = runningBalances(item.quantity, history.movements);

  function confirmDelete() {
    Alert.alert(t('records.inventory.delete.title'), t('records.inventory.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('records.inventory.detail.delete'),
        style: 'destructive',
        onPress: async () => {
          setFailure(null);
          const r = await inventory.remove(item.id);
          if (r.ok) {
            onNotice(t('records.inventory.deleted'));
            onDeleted();
          } else {
            setFailure(failMessage(t, reasonOf(r), 'delete'));
          }
        },
      },
    ]);
  }

  if (recording) {
    return (
      <MovementForm
        item={item}
        offline={inventory.isOffline}
        onSubmit={history.record}
        onDone={() => {
          setRecording(false);
          onNotice(t('records.inventory.movement.saved'));
        }}
        onCancel={() => setRecording(false)}
      />
    );
  }

  return (
    <View>
      {failure ? (
        <AlertCard variant="danger" announce title={failure} style={{ marginBottom: spacing.lg }} />
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <AppText variant="caption" tone="muted">
          {t('records.inventory.detail.stock')}
        </AppText>
        <AppText variant="display" style={{ marginTop: spacing.xs }}>
          {`${formatQuantity(item.quantity)} ${unit}`}
        </AppText>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}
        >
          {isOutOfStock(item) ? (
            <Badge variant="error" label={t('records.inventory.badge.out')} />
          ) : isLowStock(item) ? (
            <Badge variant="warning" label={t('records.inventory.badge.low')} />
          ) : null}
          {expiry.state === 'expired' ? (
            <Badge variant="error" label={t('records.inventory.badge.expired')} />
          ) : null}
          {expiry.state === 'soon' ? (
            <Badge variant="warning" label={t('records.inventory.badge.expiring')} />
          ) : null}
        </View>
        <Button
          label={t('records.inventory.movement.title')}
          onPress={() => setRecording(true)}
          disabled={inventory.isOffline}
          style={{ marginTop: spacing.lg }}
        />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <FieldRow
          label={t('records.inventory.form.category')}
          value={t(`records.inventory.category.${item.category}` as const)}
        />
        <FieldRow
          label={t('records.inventory.form.threshold')}
          value={
            item.lowStockThreshold === null
              ? null
              : `${formatQuantity(item.lowStockThreshold)} ${unit}`
          }
        />
        <FieldRow
          label={t('records.inventory.form.cost')}
          value={item.unitCost === null ? null : formatTzs(item.unitCost)}
        />
        <FieldRow
          label={t('records.inventory.detail.value')}
          value={item.unitCost === null ? null : formatTzs(item.unitCost * item.quantity)}
          emphasis
        />
        <FieldRow label={t('records.inventory.form.location')} value={item.location} />
        <FieldRow
          label={t('records.inventory.form.expiry')}
          value={item.expiryDate ? formatDate(item.expiryDate, lang) : null}
        />
        <FieldRow label={t('records.inventory.form.notes')} value={item.notes} />
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
          <Button
            label={t('records.inventory.detail.edit')}
            variant="outline"
            onPress={onEdit}
            style={{ flex: 1 }}
          />
          <Button
            label={t('records.inventory.detail.delete')}
            variant="outline"
            onPress={confirmDelete}
            disabled={inventory.isOffline}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <AppText variant="h3" accessibilityRole="header" style={{ marginBottom: spacing.md }}>
        {t('records.inventory.history.title')}
      </AppText>
      {history.loading && !history.loaded ? (
        <SkeletonGroup label={t('state.loading')}>
          <SkeletonBlock height={56} radius={12} />
          <SkeletonBlock height={56} radius={12} />
        </SkeletonGroup>
      ) : history.error && !history.loaded ? (
        <ErrorState
          title={t('state.error.title')}
          description={t('state.error.body')}
          retryLabel={t('common.retry')}
          onRetry={history.reload}
        />
      ) : history.movements.length === 0 ? (
        <AppText tone="muted">{t('records.inventory.history.empty')}</AppText>
      ) : (
        history.movements.map((m, i) => (
          <MovementRow key={m.id} movement={m} balance={balances[i]} unit={unit} lang={lang} />
        ))
      )}
      {expiry.state === 'expired' || expiry.state === 'soon' ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {expiry.state === 'expired'
            ? t('records.inventory.alert.expiry.expired', {
                name: item.name,
                days: daysLabel(t, -(expiry.daysLeft ?? 0)),
              })
            : t('records.inventory.alert.expiry.soon', {
                name: item.name,
                days: daysLabel(t, expiry.daysLeft ?? 0),
              })}
        </AppText>
      ) : null}
    </View>
  );
}

function MovementRow({
  movement,
  balance,
  unit,
  lang,
}: {
  movement: Movement;
  balance: number | undefined;
  unit: string;
  lang: 'en' | 'sw';
}) {
  const { t } = useT();
  const { spacing } = useTheme();
  const label =
    movement.note === OPENING_STOCK_NOTE
      ? t('records.inventory.history.opening')
      : t(`records.inventory.reason.${movement.reason}` as const);
  const sign = movement.delta > 0 ? '+' : '−';
  const amount = `${sign}${formatQuantity(Math.abs(movement.delta))} ${unit}`;
  const note = movement.note && movement.note !== OPENING_STOCK_NOTE ? movement.note : null;
  return (
    <Card
      accessible
      accessibilityLabel={`${label}, ${amount}, ${formatDate(movement.movementDate, lang)}`}
      style={{ marginBottom: spacing.sm }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{label}</AppText>
          <AppText variant="caption" tone="muted">
            {formatDate(movement.movementDate, lang)}
            {note ? ` · ${note}` : ''}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="label">{amount}</AppText>
          {balance !== undefined ? (
            <AppText variant="caption" tone="muted">{`${formatQuantity(balance)} ${unit}`}</AppText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
