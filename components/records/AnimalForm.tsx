import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import {
  ANIMAL_STATUSES,
  SPECIES,
  hasErrors,
  validateAnimalInput,
  type AnimalErrors,
  type AnimalInput,
  type Sex,
} from '../../lib/livestock';
import { reasonOf, type Fail } from '../../lib/recordsCommon';
import { AlertCard, Button, TextField } from '../ui';
import { ChoiceRow } from './ChoiceRow';
import { DateField } from './DateField';
import { failMessage, type TFn } from './format';

export function dateErrorMessage(t: TFn, code: 'invalid' | 'future' | 'beforeEvent' | undefined) {
  if (code === 'future') return t('records.form.error.dateFuture');
  if (code === 'invalid') return t('records.form.error.date');
  return undefined;
}

export interface AnimalFormProps {
  mode: 'add' | 'edit';
  initial: AnimalInput;
  offline: boolean;
  onSubmit: (input: AnimalInput) => Promise<{ ok: true } | Fail>;
  onDone: () => void;
  onCancel: () => void;
}

/** Add / edit an animal. Validation errors show after the first save attempt, then update live. */
export function AnimalForm({ mode, initial, offline, onSubmit, onDone, onCancel }: AnimalFormProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const [input, setInput] = useState<AnimalInput>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors: AnimalErrors = validateAnimalInput(input);
  const show = submitted ? errors : {};
  const patch = (p: Partial<AnimalInput>) => setInput((prev) => ({ ...prev, ...p }));
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
        <AlertCard
          variant="danger"
          announce
          title={failure}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      <ChoiceRow
        label={t('records.livestock.form.species')}
        options={SPECIES.map((s) => ({ value: s, label: t(`records.livestock.species.${s}` as const) }))}
        value={input.species}
        onChange={(species) => patch({ species })}
      />

      <TextField
        label={t('records.livestock.form.tag')}
        hint={t('records.livestock.form.tag.hint')}
        value={input.tagOrName}
        onChangeText={(tagOrName) => patch({ tagOrName })}
        error={show.tagOrName ? t('records.form.error.required') : undefined}
        maxLength={100}
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      <ChoiceRow<Sex | 'unknown'>
        label={t('records.livestock.form.sex')}
        options={[
          { value: 'female', label: t('records.livestock.sex.female') },
          { value: 'male', label: t('records.livestock.sex.male') },
          { value: 'unknown', label: t('records.livestock.sex.unknown') },
        ]}
        value={input.sex ?? 'unknown'}
        onChange={(v) => patch({ sex: v === 'unknown' ? null : v })}
      />

      <DateField
        label={t('records.livestock.form.birthDate')}
        hint={`${optional} · ${t('records.form.dateHint')}`}
        value={input.birthDate}
        onChangeText={(birthDate) => patch({ birthDate })}
        error={dateErrorMessage(t, show.birthDate)}
      />

      <TextField
        label={t('records.livestock.form.breed')}
        hint={optional}
        value={input.breed}
        onChangeText={(breed) => patch({ breed })}
        maxLength={100}
        autoCapitalize="words"
      />

      <TextField
        label={t('records.livestock.form.weight')}
        hint={optional}
        value={input.weightKg}
        onChangeText={(weightKg) => patch({ weightKg })}
        error={show.weightKg ? t('records.form.error.number') : undefined}
        keyboardType="decimal-pad"
      />

      {mode === 'edit' ? (
        <ChoiceRow
          label={t('records.livestock.form.status')}
          options={ANIMAL_STATUSES.map((s) => ({
            value: s,
            label: t(`records.livestock.status.${s}` as const),
          }))}
          value={input.status}
          onChange={(status) => patch({ status })}
        />
      ) : null}

      <TextField
        label={t('records.livestock.form.notes')}
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
            mode === 'add' ? 'records.livestock.form.submit.add' : 'records.livestock.form.submit.edit'
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
