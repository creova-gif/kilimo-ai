import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';

import { REGIONS } from '../../constants/onboardingOptions';
import { useTheme } from '../../constants/Theme';
import {
  hasErrors,
  validateFarmInput,
  type AreaUnit,
  type Farm,
  type FarmErrors,
  type FarmInput,
  type FarmPrefill,
  type MutationResult,
} from '../../lib/farms';
import { useT } from '../../lib/i18n';
import { AlertCard, AppText, Button, Chip, OfflineBanner, TextField } from '../ui';
import { failureMessage } from './format';

export interface FarmFormModalProps {
  /** Editing this farm; omit to create. */
  farm?: Farm;
  /** Suggestions from the onboarding profile — pre-fills the fields, never saves by itself. */
  prefill?: FarmPrefill | null;
  isOffline: boolean;
  onClose: () => void;
  onSubmit: (input: FarmInput) => Promise<MutationResult<Farm>>;
}

/** Add / edit a farm in a page-sheet modal. Mount it only while open so its state starts fresh. */
export function FarmFormModal({ farm, prefill, isOffline, onClose, onSubmit }: FarmFormModalProps) {
  const { t } = useT();
  const { colors, spacing } = useTheme();

  const prefilled = !farm && !!prefill;
  const [name, setName] = useState(farm?.name ?? '');
  const [region, setRegion] = useState(farm?.region ?? prefill?.region ?? '');
  const [unit, setUnit] = useState<AreaUnit>(prefilled && prefill?.areaAcres ? 'acres' : 'ha');
  const [area, setArea] = useState(
    farm?.areaHa != null ? String(farm.areaHa) : prefill?.areaAcres ? String(prefill.areaAcres) : ''
  );
  const [notes, setNotes] = useState(farm?.notes ?? '');
  const [errors, setErrors] = useState<FarmErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    const input: FarmInput = { name, region, area, unit, notes };
    const e = validateFarmInput(input);
    setErrors(e);
    setFailure(null);
    if (hasErrors(e)) return;
    setBusy(true);
    const r = await onSubmit(input);
    setBusy(false);
    if (r.ok) onClose();
    else setFailure(failureMessage(t, r.reason, 'farm'));
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.lg,
            paddingBottom: spacing.sm,
          }}
        >
          <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
            {t(farm ? 'farms.form.farm.editTitle' : 'farms.form.farm.addTitle')}
          </AppText>
          <Button
            label={t('common.cancel')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={onClose}
          />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {isOffline && (
              <OfflineBanner
                message={t('farms.offline.write')}
                style={{ marginBottom: spacing.md }}
              />
            )}
            {prefilled && (
              <AlertCard
                variant="info"
                title={t('farms.form.prefilled')}
                style={{ marginBottom: spacing.md }}
              />
            )}

            <TextField
              label={t('farms.form.farm.name')}
              placeholder={t('farms.form.farm.name.ph')}
              value={name}
              onChangeText={setName}
              error={errors.name ? t('farms.err.name') : undefined}
              maxLength={120}
              testID="farm-name"
            />

            <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
              {t('farms.form.region')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {REGIONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={region === r}
                  onPress={() => setRegion(region === r ? '' : r)}
                />
              ))}
            </View>

            <TextField
              label={t('farms.form.area')}
              value={area}
              onChangeText={(v) => setArea(v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              error={errors.area ? t('farms.err.area') : undefined}
              wrapperStyle={{ marginTop: spacing.lg }}
              testID="farm-area"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
              <Chip
                label={t('farms.form.unit.ha')}
                selected={unit === 'ha'}
                onPress={() => setUnit('ha')}
              />
              <Chip
                label={t('farms.form.unit.acres')}
                selected={unit === 'acres'}
                onPress={() => setUnit('acres')}
              />
            </View>

            <TextField
              label={t('farms.form.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={2000}
              wrapperStyle={{ marginTop: spacing.lg }}
            />

            {!!failure && (
              <AlertCard
                variant="danger"
                title={failure}
                announce
                style={{ marginTop: spacing.lg }}
              />
            )}
          </ScrollView>
          <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Button
              label={t('common.save')}
              onPress={submit}
              loading={busy}
              disabled={isOffline}
              size="lg"
              fullWidth
              testID="farm-save"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
