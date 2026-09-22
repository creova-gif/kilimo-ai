import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Chip, TextField } from '../ui';
import { FormSheet } from './FormSheet';
import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import {
  FINANCE_CATEGORIES,
  addDays,
  todayString,
  validateEntryInput,
  type EntryErrors,
  type EntryInput,
  type EntryKind,
  type FinanceCategory,
  type FinanceEntry,
} from '../../lib/finance';
import type { WriteFailure } from '../../hooks/useFinance';

export interface EntryFormSheetProps {
  visible: boolean;
  /** The entry being edited, or null/undefined to add a new one. */
  entry?: FinanceEntry | null;
  /** Pre-selected date for a new entry (`YYYY-MM-DD`); defaults to today. */
  defaultDate?: string;
  busy: boolean;
  offline: boolean;
  onSubmit: (input: EntryInput) => Promise<{ ok: true } | WriteFailure>;
  onDelete?: () => void;
  onClose: () => void;
}

/** Add / edit form for one ledger entry. Validation is field-level; copy is localised. */
export function EntryFormSheet({
  visible,
  entry,
  defaultDate,
  busy,
  offline,
  onSubmit,
  onDelete,
  onClose,
}: EntryFormSheetProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const [kind, setKind] = useState<EntryKind>('income');
  const [category, setCategory] = useState<FinanceCategory>('crops');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayString());
  const [errors, setErrors] = useState<EntryErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset the fields every time the sheet opens (or switches between add and a different entry).
  useEffect(() => {
    if (!visible) return;
    setErrors({});
    setSubmitError(null);
    if (entry) {
      setKind(entry.kind);
      setCategory(entry.category);
      setAmount(String(entry.amountTzs));
      setDescription(entry.description);
      setDate(entry.entryDate);
    } else {
      setKind('income');
      setCategory('crops');
      setAmount('');
      setDescription('');
      setDate(defaultDate ?? todayString());
    }
  }, [visible, entry, defaultDate]);

  const today = todayString();
  const editing = Boolean(entry);

  const submit = async () => {
    const input: EntryInput = { kind, category, amount, description, entryDate: date.trim() };
    const found = validateEntryInput(input);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setSubmitError(null);
    const r = await onSubmit(input);
    if (r.ok === true) return; // the parent closes the sheet
    setSubmitError(
      r.reason === 'signed_out'
        ? t('money.error.signedOut')
        : r.reason === 'offline'
          ? t('money.offline.needsConnection')
          : t('money.error.saveFailed')
    );
  };

  const dateError = errors.date
    ? t('money.error.date')
    : errors.dateFuture
      ? t('money.error.dateFuture')
      : undefined;

  return (
    <FormSheet
      visible={visible}
      title={t(editing ? 'money.form.title.edit' : 'money.form.title.add')}
      closeLabel={t('money.form.close')}
      onClose={onClose}
    >
      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {t('money.form.kind')}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {(['income', 'expense'] as const).map((k) => (
          <Chip
            key={k}
            label={t(`money.kind.${k}` as const)}
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </View>

      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {t('money.form.category')}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {FINANCE_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={t(`money.category.${c}` as TranslationKey)}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>

      <TextField
        label={t('money.form.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder={t('money.form.amount.placeholder')}
        error={errors.amount ? t('money.error.amount') : undefined}
        testID="entry-amount"
      />
      <TextField
        label={t('money.form.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('money.form.description.placeholder')}
        maxLength={200}
        error={errors.description ? t('money.error.description') : undefined}
        testID="entry-description"
      />
      <TextField
        label={t('money.form.date')}
        value={date}
        onChangeText={setDate}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={dateError}
        wrapperStyle={{ marginBottom: spacing.sm }}
        testID="entry-date"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Chip label={t('money.form.today')} selected={date === today} onPress={() => setDate(today)} />
        <Chip
          label={t('money.form.yesterday')}
          selected={date === addDays(today, -1)}
          onPress={() => setDate(addDays(today, -1))}
        />
      </View>

      {submitError ? (
        <AppText
          variant="small"
          tone="error"
          accessibilityRole="alert"
          style={{ marginBottom: spacing.md }}
        >
          {submitError}
        </AppText>
      ) : null}

      <Button
        label={busy ? t('money.form.saving') : t('common.save')}
        onPress={submit}
        loading={busy}
        disabled={offline}
        accessibilityHint={offline ? t('money.offline.needsConnection') : undefined}
        testID="entry-save"
      />
      {offline ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {t('money.offline.needsConnection')}
        </AppText>
      ) : null}
      {editing && onDelete ? (
        <Button
          label={t('money.form.delete')}
          variant="destructiveOutline"
          onPress={onDelete}
          disabled={offline || busy}
          style={{ marginTop: spacing.md }}
          testID="entry-delete"
        />
      ) : null}
    </FormSheet>
  );
}
