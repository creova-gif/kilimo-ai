import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import {
  REASONS,
  emptyMovementInput,
  hasErrors,
  movementDelta,
  stockAfter,
  validateMovementInput,
  type Direction,
  type Item,
  type MovementInput,
} from '../../lib/inventory';
import { formatQuantity, parseDecimal, reasonOf, type Fail } from '../../lib/recordsCommon';
import { AlertCard, AppText, Button, TextField } from '../ui';
import { ChoiceRow } from './ChoiceRow';
import { DateField } from './DateField';
import { failMessage, unitLabel } from './format';
import { dateErrorMessage } from './AnimalForm';

export interface MovementFormProps {
  item: Item;
  offline: boolean;
  onSubmit: (input: MovementInput) => Promise<{ ok: true } | Fail>;
  onDone: () => void;
  onCancel: () => void;
}

/** Record a stock change. Shows the resulting stock before saving; never lets stock go below 0. */
export function MovementForm({ item, offline, onSubmit, onDone, onCancel }: MovementFormProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const [input, setInput] = useState<MovementInput>(() => emptyMovementInput());
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors = validateMovementInput(input, item.quantity);
  const show = submitted ? errors : {};
  const patch = (p: Partial<MovementInput>) => setInput((prev) => ({ ...prev, ...p }));
  const unit = unitLabel(t, item.unit);

  const amount = parseDecimal(input.amount);
  const preview =
    amount !== null && amount > 0
      ? stockAfter(item.quantity, movementDelta(input.reason, amount, input.direction))
      : null;

  async function save() {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure(null);
    const r = await onSubmit(input);
    setBusy(false);
    if (r.ok) {
      onDone();
      return;
    }
    const reason = reasonOf(r);
    setFailure(
      reason === 'insufficient_stock'
        ? t('records.inventory.movement.insufficient', { qty: formatQuantity(item.quantity), unit })
        : failMessage(t, reason)
    );
  }

  return (
    <View>
      {offline ? (
        <AlertCard
          variant="warning"
          title={t('records.offline.needsConnection')}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
      {failure ? (
        <AlertCard variant="danger" announce title={failure} style={{ marginBottom: spacing.lg }} />
      ) : null}

      <ChoiceRow
        label={t('records.inventory.movement.reason')}
        options={REASONS.map((r) => ({
          value: r,
          label: t(`records.inventory.reason.${r}` as const),
        }))}
        value={input.reason}
        onChange={(reason) => patch({ reason })}
      />

      {input.reason === 'adjustment' ? (
        <ChoiceRow<Direction>
          label={t('records.inventory.movement.direction')}
          options={[
            { value: 'in', label: t('records.inventory.movement.in') },
            { value: 'out', label: t('records.inventory.movement.out') },
          ]}
          value={input.direction}
          onChange={(direction) => patch({ direction })}
        />
      ) : null}

      <TextField
        label={`${t('records.inventory.movement.amount')} (${unit})`}
        value={input.amount}
        onChangeText={(v) => patch({ amount: v })}
        error={
          show.amount === 'insufficient'
            ? t('records.inventory.movement.insufficient', {
                qty: formatQuantity(item.quantity),
                unit,
              })
            : show.amount
              ? t('records.form.error.number')
              : undefined
        }
        keyboardType="decimal-pad"
      />

      {preview !== null ? (
        <AppText
          variant="label"
          accessibilityLiveRegion="polite"
          style={{ marginBottom: spacing.lg }}
        >
          {t('records.inventory.movement.preview', { qty: formatQuantity(preview), unit })}
        </AppText>
      ) : null}

      <DateField
        label={t('records.inventory.movement.date')}
        hint={t('records.form.dateHint')}
        value={input.movementDate}
        onChangeText={(movementDate) => patch({ movementDate })}
        error={dateErrorMessage(t, show.movementDate)}
      />

      <TextField
        label={t('records.inventory.movement.note')}
        hint={t('records.form.optional')}
        value={input.note}
        onChangeText={(note) => patch({ note })}
        maxLength={500}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <Button
          label={t('records.inventory.movement.submit')}
          onPress={save}
          loading={busy}
          disabled={offline}
        />
        <Button label={t('common.cancel')} variant="outline" onPress={onCancel} disabled={busy} />
      </View>
    </View>
  );
}
