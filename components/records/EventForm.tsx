import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import {
  EVENT_KINDS,
  emptyEventInput,
  hasErrors,
  validateEventInput,
  type EventInput,
} from '../../lib/livestock';
import { reasonOf, type Fail } from '../../lib/recordsCommon';
import { AlertCard, Button, TextField } from '../ui';
import { ChoiceRow } from './ChoiceRow';
import { DateField } from './DateField';
import { dateErrorMessage } from './AnimalForm';
import { failMessage } from './format';

export interface EventFormProps {
  offline: boolean;
  onSubmit: (input: EventInput) => Promise<{ ok: true } | Fail>;
  onDone: () => void;
  onCancel: () => void;
}

/** Inline form for one health/breeding/weight record on an animal. */
export function EventForm({ offline, onSubmit, onDone, onCancel }: EventFormProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const [input, setInput] = useState<EventInput>(() => emptyEventInput());
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors = validateEventInput(input);
  const show = submitted ? errors : {};
  const patch = (p: Partial<EventInput>) => setInput((prev) => ({ ...prev, ...p }));

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

      <ChoiceRow
        label={t('records.livestock.events.form.kind')}
        options={EVENT_KINDS.map((k) => ({ value: k, label: t(`records.livestock.kind.${k}` as const) }))}
        value={input.kind}
        onChange={(kind) => patch({ kind })}
      />

      <DateField
        label={t('records.livestock.events.form.date')}
        hint={t('records.form.dateHint')}
        value={input.eventDate}
        onChangeText={(eventDate) => patch({ eventDate })}
        error={dateErrorMessage(t, show.eventDate)}
      />

      {input.kind === 'weighing' ? (
        <TextField
          label={t('records.livestock.events.form.weight')}
          value={input.weightKg}
          onChangeText={(weightKg) => patch({ weightKg })}
          error={show.weightKg ? t('records.form.error.number') : undefined}
          keyboardType="decimal-pad"
        />
      ) : null}

      {input.kind === 'vaccination' ? (
        <DateField
          label={t('records.livestock.events.form.next')}
          hint={`${t('records.form.optional')} · ${t('records.form.dateHint')}`}
          value={input.nextDueDate}
          onChangeText={(nextDueDate) => patch({ nextDueDate })}
          error={
            show.nextDueDate === 'beforeEvent'
              ? t('records.form.error.date')
              : dateErrorMessage(t, show.nextDueDate)
          }
        />
      ) : null}

      <TextField
        label={t('records.livestock.events.form.detail')}
        hint={
          input.kind === 'treatment' || input.kind === 'note'
            ? t('records.livestock.events.form.detail.hint')
            : `${t('records.form.optional')} · ${t('records.livestock.events.form.detail.hint')}`
        }
        value={input.detail}
        onChangeText={(detail) => patch({ detail })}
        error={show.detail ? t('records.form.error.required') : undefined}
        multiline
        maxLength={2000}
        style={{ minHeight: 80 }}
      />

      <View style={{ gap: spacing.md }}>
        <Button
          label={t('records.livestock.events.form.submit')}
          onPress={save}
          loading={busy}
          disabled={offline}
          size="md"
        />
        <Button label={t('common.cancel')} variant="outline" size="md" onPress={onCancel} disabled={busy} />
      </View>
    </View>
  );
}
