import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';

import { CROPS, cropNames } from '../../constants/onboardingOptions';
import { useTheme } from '../../constants/Theme';
import {
  hasErrors,
  PLOT_STATUSES,
  todayIso,
  validatePlotInput,
  type AreaUnit,
  type MutationResult,
  type Plot,
  type PlotErrors,
  type PlotInput,
  type PlotStatus,
} from '../../lib/farms';
import { useT } from '../../lib/i18n';
import { AlertCard, AppText, Button, Chip, OfflineBanner, TextField } from '../ui';
import { failureMessage } from './format';

export interface PlotFormModalProps {
  farmName: string;
  /** Editing this plot; omit to create. */
  plot?: Plot;
  /** Crop labels from the onboarding profile, offered first. Suggestions only. */
  cropSuggestions?: string[];
  isOffline: boolean;
  onClose: () => void;
  onSubmit: (input: PlotInput) => Promise<MutationResult<Plot>>;
}

/** Add / edit a plot in a page-sheet modal. Mount it only while open so its state starts fresh. */
export function PlotFormModal({
  farmName,
  plot,
  cropSuggestions = [],
  isOffline,
  onClose,
  onSubmit,
}: PlotFormModalProps) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();

  const [name, setName] = useState(plot?.name ?? '');
  const [crop, setCrop] = useState(plot?.crop ?? '');
  const [unit, setUnit] = useState<AreaUnit>('ha');
  const [area, setArea] = useState(plot?.areaHa != null ? String(plot.areaHa) : '');
  const [planting, setPlanting] = useState(plot?.plantingDate ?? '');
  const [harvest, setHarvest] = useState(plot?.expectedHarvest ?? '');
  const [status, setStatus] = useState<PlotStatus>(plot?.status ?? 'planned');
  const [notes, setNotes] = useState(plot?.notes ?? '');
  const [errors, setErrors] = useState<PlotErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Profile crops first, then the rest of the known crops, without duplicates.
  const cropOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...cropSuggestions, ...CROPS].filter((c) => {
      const k = c.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [cropSuggestions]);
  const suggested = new Set(cropSuggestions.map((c) => c.toLowerCase()));

  const submit = async () => {
    const input: PlotInput = {
      name,
      crop,
      area,
      unit,
      plantingDate: planting,
      expectedHarvest: harvest,
      status,
      // The form does not edit the boundary; carry it through so saving never erases it.
      boundary: plot?.boundary ?? null,
      notes,
    };
    const e = validatePlotInput(input);
    setErrors(e);
    setFailure(null);
    if (hasErrors(e)) return;
    setBusy(true);
    const r = await onSubmit(input);
    setBusy(false);
    if (r.ok) onClose();
    else setFailure(failureMessage(t, r.reason, 'plot'));
  };

  const section = (text: string) => (
    <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {text}
    </AppText>
  );

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
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <AppText variant="h2" accessibilityRole="header">
              {t(plot ? 'farms.form.plot.editTitle' : 'farms.form.plot.addTitle')}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {farmName}
            </AppText>
          </View>
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

            <TextField
              label={t('farms.form.plot.name')}
              hint={t('farms.form.plot.name.hint')}
              value={name}
              onChangeText={setName}
              error={errors.name ? t('farms.err.name') : undefined}
              maxLength={120}
              testID="plot-name"
            />

            <TextField
              label={t('farms.form.crop')}
              value={crop}
              onChangeText={setCrop}
              maxLength={120}
              wrapperStyle={{ marginTop: spacing.lg }}
              testID="plot-crop"
            />
            {section(t('farms.form.crop.pick'))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {cropOptions.map((c) => {
                const n = cropNames(c);
                const label = lang === 'sw' ? n.sw : n.en;
                return (
                  <Chip
                    key={c}
                    label={suggested.has(c.toLowerCase()) ? `★ ${label}` : label}
                    accessibilityLabel={
                      suggested.has(c.toLowerCase())
                        ? `${label}, ${t('farms.form.crop.suggested')}`
                        : label
                    }
                    selected={crop.trim().toLowerCase() === c.toLowerCase()}
                    onPress={() => setCrop(c)}
                  />
                );
              })}
            </View>
            {cropSuggestions.length > 0 && (
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                {`★ ${t('farms.form.crop.suggested')}`}
              </AppText>
            )}

            <TextField
              label={t('farms.form.area')}
              value={area}
              onChangeText={(v) => setArea(v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              error={errors.area ? t('farms.err.area') : undefined}
              wrapperStyle={{ marginTop: spacing.lg }}
              testID="plot-area"
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

            {section(t('farms.form.status'))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLOT_STATUSES.map((s) => (
                <Chip
                  key={s}
                  label={t(`farms.stage.${s}`)}
                  selected={status === s}
                  onPress={() => setStatus(s)}
                />
              ))}
            </View>

            <TextField
              label={t('farms.form.plantingDate')}
              hint={t('farms.form.date.hint')}
              value={planting}
              onChangeText={setPlanting}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={10}
              error={errors.plantingDate ? t('farms.err.date') : undefined}
              wrapperStyle={{ marginTop: spacing.lg }}
              testID="plot-planting"
            />
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <Chip label={t('farms.form.date.today')} onPress={() => setPlanting(todayIso())} />
            </View>

            <TextField
              label={t('farms.form.expectedHarvest')}
              hint={t('farms.form.date.hint')}
              value={harvest}
              onChangeText={setHarvest}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={10}
              error={
                errors.expectedHarvest
                  ? t('farms.err.date')
                  : errors.dateOrder
                    ? t('farms.err.dateOrder')
                    : undefined
              }
              wrapperStyle={{ marginTop: spacing.lg }}
              testID="plot-harvest"
            />

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
              testID="plot-save"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
