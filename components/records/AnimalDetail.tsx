import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useAnimalEvents, type useLivestock } from '../../hooks/useLivestock';
import { useT } from '../../lib/i18n';
import {
  ANIMAL_STATUSES,
  type Animal,
  type AnimalEvent,
  type AnimalStatus,
  type EventKind,
} from '../../lib/livestock';
import { formatQuantity, reasonOf } from '../../lib/recordsCommon';
import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  SkeletonBlock,
  SkeletonGroup,
  type BadgeVariant,
} from '../ui';
import { ChoiceRow } from './ChoiceRow';
import { EventForm } from './EventForm';
import { FieldRow } from './FieldRow';
import { IconButton } from './IconButton';
import { ageLabel, failMessage, formatDate } from './format';

const KIND_VARIANT: Record<EventKind, BadgeVariant> = {
  vaccination: 'success',
  treatment: 'warning',
  breeding: 'info',
  weighing: 'neutral',
  note: 'neutral',
};

export interface AnimalDetailProps {
  animal: Animal;
  herd: ReturnType<typeof useLivestock>;
  onEdit: () => void;
  /** Called after the animal was deleted. */
  onDeleted: () => void;
  onNotice: (message: string) => void;
}

/** One animal: its details, quick status change, and health/breeding/weight history. */
export function AnimalDetail({ animal, herd, onEdit, onDeleted, onNotice }: AnimalDetailProps) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const events = useAnimalEvents(animal.id, herd.reload);
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const age = ageLabel(t, animal.birthDate);

  async function changeStatus(status: AnimalStatus) {
    if (status === animal.status) return;
    setFailure(null);
    const r = await herd.setStatus(animal, status);
    if (r.ok) onNotice(t('records.livestock.saved'));
    else setFailure(failMessage(t, reasonOf(r)));
  }

  function confirmDelete() {
    Alert.alert(t('records.livestock.delete.title'), t('records.livestock.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('records.livestock.detail.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setFailure(null);
          const r = await herd.remove(animal.id);
          setBusy(false);
          if (r.ok) {
            onNotice(t('records.livestock.deleted'));
            onDeleted();
          } else {
            setFailure(failMessage(t, reasonOf(r), 'delete'));
          }
        },
      },
    ]);
  }

  function confirmDeleteEvent(e: AnimalEvent) {
    Alert.alert(t('records.livestock.events.delete.title'), t('records.livestock.events.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('records.livestock.events.delete'),
        style: 'destructive',
        onPress: async () => {
          setFailure(null);
          const r = await events.remove(e.id);
          if (!r.ok) setFailure(failMessage(t, reasonOf(r), 'delete'));
        },
      },
    ]);
  }

  return (
    <View>
      {failure ? (
        <AlertCard variant="danger" announce title={failure} style={{ marginBottom: spacing.lg }} />
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <FieldRow label={t('records.livestock.form.species')} value={t(`records.livestock.species.${animal.species}` as const)} />
        <FieldRow
          label={t('records.livestock.form.sex')}
          value={animal.sex ? t(`records.livestock.sex.${animal.sex}` as const) : null}
        />
        <FieldRow
          label={t('records.livestock.form.birthDate')}
          value={animal.birthDate ? formatDate(animal.birthDate, lang) : null}
        />
        <FieldRow label={t('records.livestock.form.age')} value={age} />
        <FieldRow label={t('records.livestock.form.breed')} value={animal.breed} />
        <FieldRow
          label={t('records.livestock.form.weight')}
          value={animal.weightKg === null ? null : `${formatQuantity(animal.weightKg)} kg`}
        />
        <FieldRow label={t('records.livestock.form.notes')} value={animal.notes} />
      </Card>

      <ChoiceRow
        label={t('records.livestock.form.status')}
        options={ANIMAL_STATUSES.map((s) => ({
          value: s,
          label: t(`records.livestock.status.${s}` as const),
        }))}
        value={animal.status}
        onChange={changeStatus}
        disabled={herd.isOffline}
      />

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        <Button
          label={t('records.livestock.detail.edit')}
          variant="outline"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={onEdit}
        />
        <Button
          label={t('records.livestock.detail.delete')}
          variant="destructiveOutline"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={confirmDelete}
          loading={busy}
          disabled={herd.isOffline}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <AppText variant="h3" accessibilityRole="header">
          {t('records.livestock.events.title')}
        </AppText>
      </View>

      {adding ? (
        <Card variant="tinted" style={{ marginBottom: spacing.lg }}>
          <AppText variant="label" style={{ marginBottom: spacing.md }}>
            {t('records.livestock.events.form.title')}
          </AppText>
          <EventForm
            offline={herd.isOffline}
            onSubmit={(input) => events.add(input)}
            onDone={() => {
              setAdding(false);
              onNotice(t('records.livestock.events.saved'));
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      ) : (
        <Button
          label={t('records.livestock.events.add')}
          variant="secondary"
          size="md"
          icon={<Plus size={18} color={colors.primary} />}
          onPress={() => setAdding(true)}
          style={{ marginBottom: spacing.lg }}
        />
      )}

      {events.loading && !events.loaded ? (
        <SkeletonGroup label={t('state.loading')}>
          <SkeletonBlock height={56} radius={12} />
          <SkeletonBlock height={56} radius={12} />
        </SkeletonGroup>
      ) : events.error && !events.loaded ? (
        <ErrorState
          title={t('state.error.title')}
          description={t('state.error.body')}
          retryLabel={t('common.retry')}
          onRetry={events.reload}
          style={{ flex: 0 }}
        />
      ) : events.isOffline && !events.loaded ? (
        <AppText variant="body" tone="muted">
          {t('records.offline.loadBody')}
        </AppText>
      ) : events.events.length === 0 ? (
        <AppText variant="body" tone="muted">
          {t('records.livestock.events.empty')}
        </AppText>
      ) : (
        <View style={{ gap: spacing.md }}>
          {events.events.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              deleteDisabled={events.isOffline}
              onDelete={() => confirmDeleteEvent(e)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function EventRow({
  event,
  onDelete,
  deleteDisabled,
}: {
  event: AnimalEvent;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const kind = t(`records.livestock.kind.${event.kind}` as const);
  const date = formatDate(event.eventDate, lang);
  const lines = [
    event.weightKg !== null ? `${formatQuantity(event.weightKg)} kg` : null,
    event.detail,
    event.nextDueDate
      ? t('records.livestock.events.nextDue', { date: formatDate(event.nextDueDate, lang) })
      : null,
  ].filter(Boolean) as string[];

  return (
    <Card variant="outlined" padding={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          accessible
          accessibilityLabel={`${kind}, ${date}. ${lines.join('. ')}`}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Badge label={kind} variant={KIND_VARIANT[event.kind]} />
            <AppText variant="caption" tone="muted">
              {date}
            </AppText>
          </View>
          {lines.map((l, i) => (
            <AppText key={i} variant="small" style={{ marginTop: spacing.xs }}>
              {l}
            </AppText>
          ))}
        </View>
        <IconButton
          label={t('records.livestock.events.delete')}
          icon={<Trash2 size={18} color={colors.errorText} />}
          onPress={onDelete}
          disabled={deleteDisabled}
        />
      </View>
    </Card>
  );
}
