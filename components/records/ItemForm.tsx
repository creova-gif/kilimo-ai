import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import {
  CATEGORIES,
  UNITS,
  hasErrors,
  validateItemInput,
  type ItemErrors,
  type ItemInput,
} from '../../lib/inventory';
import { reasonOf, type Fail } from '../../lib/recordsCommon';
import { AlertCard, Button, TextField } from '../ui';
import { ChoiceRow } from './ChoiceRow';
import { DateField } from './DateField';
import { failMessage } from './format';
import { dateErrorMessage } from './AnimalForm';

export interface ItemFormProps {
  mode: 'add' | 'edit';
  initial: ItemInput;
  offline: boolean;
  onSubmit: (input: ItemInput) => Promise<{ ok: true } | Fail>;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Add / edit an inventory item. Opening stock is only asked for when adding: afterwards stock
 * changes only through recorded movements (the database rejects direct quantity edits).
 */
export function ItemForm({ mode, initial, offline, onSubmit, onDone, onCancel }: ItemFormProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const [input, setInput] = useState<ItemInput>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const creating = mode === 'add';
  const errors: ItemErrors = validateItemInput(input, creating);
  const show = submitted ? errors : {};
  const patch = (p: Partial<ItemInput>) => setInput((prev) => ({ ...prev, ...p }));
  const optional = t('records.form.optional');

  async function save() {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure(null);
    const r = await onSubmit(input);
    setBusy(false);
    if (r.ok) onDone();
    else setFailure(failMessage(t, reasonOf(r)));
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

      <TextField
        label={t('records.inventory.form.name')}
        value={input.name}
        onChangeText={(name) => patch({ name })}
        error={show.name ? t('records.form.error.required') : undefined}
        maxLength={120}
        autoCapitalize="sentences"
      />

      <ChoiceRow
        label={t('records.inventory.form.category')}
        options={CATEGORIES.map((c) => ({
          value: c,
          label: t(`records.inventory.category.${c}` as const),
        }))}
        value={input.category}
        onChange={(category) => patch({ category })}
      />

      <ChoiceRow
        label={t('records.inventory.form.unit')}
        options={UNITS.map((u) => ({ value: u, label: t(`records.inventory.unit.${u}` as const) }))}
        value={
          (UNITS as readonly string[]).includes(input.unit)
            ? (input.unit as (typeof UNITS)[number])
            : null
        }
        onChange={(unit) => patch({ unit })}
      />
      {show.unit ? (
        <AlertCard
          variant="danger"
          title={t('records.form.error.required')}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      {creating ? (
        <TextField
          label={t('records.inventory.form.quantity')}
          hint={t('records.inventory.form.quantity.hint')}
          value={input.quantity}
          onChangeText={(quantity) => patch({ quantity })}
          error={show.quantity ? t('records.form.error.numberNonNeg') : undefined}
          keyboardType="decimal-pad"
        />
      ) : null}

      <TextField
        label={t('records.inventory.form.threshold')}
        hint={`${optional} · ${t('records.inventory.form.threshold.hint')}`}
        value={input.lowStockThreshold}
        onChangeText={(lowStockThreshold) => patch({ lowStockThreshold })}
        error={show.lowStockThreshold ? t('records.form.error.numberNonNeg') : undefined}
        keyboardType="decimal-pad"
      />

      <TextField
        label={t('records.inventory.form.cost')}
        hint={optional}
        value={input.unitCost}
        onChangeText={(unitCost) => patch({ unitCost })}
        error={show.unitCost ? t('records.form.error.numberNonNeg') : undefined}
        keyboardType="decimal-pad"
      />

      <TextField
        label={t('records.inventory.form.location')}
        hint={optional}
        value={input.location}
        onChangeText={(location) => patch({ location })}
        maxLength={120}
      />

      <DateField
        label={t('records.inventory.form.expiry')}
        hint={`${optional} · ${t('records.form.dateHint')}`}
        value={input.expiryDate}
        onChangeText={(expiryDate) => patch({ expiryDate })}
        error={dateErrorMessage(t, show.expiryDate)}
      />

      <TextField
        label={t('records.inventory.form.notes')}
        hint={optional}
        value={input.notes}
        onChangeText={(notes) => patch({ notes })}
        multiline
        maxLength={2000}
        style={{ minHeight: 96 }}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <Button
          label={t(
            creating ? 'records.inventory.form.submit.add' : 'records.inventory.form.submit.edit'
          )}
          onPress={save}
          loading={busy}
          disabled={offline}
        />
        <Button label={t('common.cancel')} variant="outline" onPress={onCancel} disabled={busy} />
      </View>
    </View>
  );
}
