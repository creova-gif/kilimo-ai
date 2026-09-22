import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, View } from 'react-native';

import { useTheme } from '../../constants/Theme';
import { todayIso } from '../../lib/farms';
import { useT, type TranslationKey } from '../../lib/i18n';
import {
  hasSoilErrors,
  SOIL_TEST_SOURCES,
  validateSoilTestInput,
  type SoilTestErrors,
  type SoilTestInput,
  type SoilTestSource,
} from '../../lib/soilTests';
import { AlertCard, AppText, Button, Chip, TextField } from '../ui';

export const SOURCE_KEY: Record<SoilTestSource, TranslationKey> = {
  lab: 'planning.soil.source.lab',
  kit: 'planning.soil.source.kit',
  other: 'planning.soil.source.other',
};

type NumField = 'ph' | 'nitrogenPct' | 'phosphorusPpm' | 'potassiumPpm' | 'organicMatterPct';
const NUM_FIELDS: { key: NumField; label: TranslationKey }[] = [
  { key: 'ph', label: 'planning.soil.field.ph' },
  { key: 'nitrogenPct', label: 'planning.soil.field.n' },
  { key: 'phosphorusPpm', label: 'planning.soil.field.p' },
  { key: 'potassiumPpm', label: 'planning.soil.field.k' },
  { key: 'organicMatterPct', label: 'planning.soil.field.om' },
];

/** Record a soil test the farmer has results for. Mount only while open. */
export function SoilTestForm({
  plotId,
  plotName,
  onClose,
  onSubmit,
}: {
  plotId: string;
  plotName: string;
  onClose: () => void;
  /** Returns ok when the test was queued. */
  onSubmit: (input: SoilTestInput) => { ok: boolean };
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const [input, setInput] = useState<SoilTestInput>({
    plotId,
    testedOn: todayIso(),
    source: 'lab',
  });
  const [errors, setErrors] = useState<SoilTestErrors>({});
  const [failed, setFailed] = useState(false);
  const set = (patch: Partial<SoilTestInput>) => setInput((p) => ({ ...p, ...patch }));

  const submit = () => {
    const e = validateSoilTestInput(input);
    setErrors(e);
    setFailed(false);
    if (hasSoilErrors(e)) return;
    const r = onSubmit(input);
    if (r.ok) onClose();
    else setFailed(true);
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm }}>
          <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
            {t('planning.soil.form.title')}
          </AppText>
          <Button label={t('common.cancel')} variant="ghost" size="sm" fullWidth={false} onPress={onClose} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="small" tone="muted">
              {t('planning.soil.form.help', { plot: plotName })}
            </AppText>
            {errors.empty && <AlertCard variant="warning" title={t('planning.soil.err.empty')} announce />}
            {failed && <AlertCard variant="danger" title={t('planning.soil.err.generic')} announce />}

            <TextField
              label={t('planning.soil.field.date')}
              value={input.testedOn}
              onChangeText={(v) => set({ testedOn: v })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              hint={t('planning.date.hint')}
              error={
                errors.testedOn
                  ? t('planning.date.invalid')
                  : errors.future
                    ? t('planning.soil.err.future')
                    : undefined
              }
            />

            <AppText variant="label">{t('planning.soil.field.source')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {SOIL_TEST_SOURCES.map((s) => (
                <Chip
                  key={s}
                  label={t(SOURCE_KEY[s])}
                  selected={input.source === s}
                  onPress={() => set({ source: s })}
                />
              ))}
            </View>

            {NUM_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={t(f.label)}
                value={input[f.key] ?? ''}
                onChangeText={(v) => set({ [f.key]: v } as Partial<SoilTestInput>)}
                keyboardType="decimal-pad"
                placeholder={t('planning.soil.field.blank')}
                error={errors[f.key] ? t('planning.soil.err.range') : undefined}
              />
            ))}

            <TextField
              label={t('planning.soil.field.notes')}
              value={input.notes ?? ''}
              onChangeText={(v) => set({ notes: v })}
              multiline
            />

            <Button label={t('common.save')} onPress={submit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
