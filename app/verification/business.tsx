/**
 * Verification step 2 — optional business details, then submit to the submit-verification edge
 * function. Only on the server's success does the local status become 'pending'. On any failure
 * the person sees why and nothing is marked as submitted.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { useKilimoStore } from '../../store/useKilimoStore';
import { getSupabase } from '../../lib/supabase';
import { AlertCard, Button, TextField } from '../../components/ui';
import { ProfileScreenFrame } from '../../components/profile/ProfileScreenFrame';
import {
  SUBMIT_ERROR_KEYS,
  clearDraft,
  getDraft,
  isValidNationalId,
  isValidTin,
  submitVerification,
} from '../../components/profile/verification';

export default function BusinessVerification() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const isOnline = useKilimoStore((s) => s.isOnline);
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const initial = getDraft();
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [tin, setTin] = useState(initial.tin);
  const [regNumber, setRegNumber] = useState(initial.regNumber);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ key: string; detail?: string } | null>(null);

  const hasId = isValidNationalId(initial.nationalId);
  const tinValid = isValidTin(tin);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const res = await submitVerification(
      getSupabase(),
      { ...getDraft(), businessName, tin, regNumber },
      isOnline
    );
    setSubmitting(false);
    if (res.ok === true) {
      clearDraft();
      updateAgroId({ verificationStatus: 'pending' });
      router.replace('/verification/pending' as any);
      return;
    }
    const fail = res as { reason: string; detail?: string };
    setError({ key: SUBMIT_ERROR_KEYS[fail.reason] ?? SUBMIT_ERROR_KEYS.server, detail: fail.detail });
  };

  return (
    <ProfileScreenFrame
      title={t('profile.verify.business.title')}
      subtitle={t('profile.verify.step', { step: 2, total: 2 })}
      fallbackRoute="/verification/personal"
    >
      {!hasId ? (
        <AlertCard
          variant="warning"
          title={t('profile.verify.business.missingId')}
          actionLabel={t('profile.verify.business.goBack')}
          onAction={() => router.replace('/verification/personal' as any)}
        />
      ) : null}
      <Text style={[styles.lead, { color: colors.textMute }]}>
        {t('profile.verify.business.body')}
      </Text>
      <TextField
        label={t('profile.verify.business.nameLabel')}
        value={businessName}
        onChangeText={setBusinessName}
        accessibilityLabel={t('profile.verify.business.nameLabel')}
      />
      <TextField
        label={t('profile.verify.business.tinLabel')}
        hint={t('profile.verify.business.tinHint')}
        error={!tinValid ? t('profile.verify.business.tinError') : undefined}
        value={tin}
        onChangeText={setTin}
        keyboardType="number-pad"
        accessibilityLabel={t('profile.verify.business.tinLabel')}
      />
      <TextField
        label={t('profile.verify.business.regLabel')}
        value={regNumber}
        onChangeText={setRegNumber}
        autoCapitalize="characters"
        accessibilityLabel={t('profile.verify.business.regLabel')}
      />
      {error ? (
        <AlertCard
          variant="danger"
          title={t(error.key as any)}
          body={error.detail || undefined}
          announce
        />
      ) : null}
      <Button
        label={submitting ? t('profile.verify.business.submitting') : t('profile.verify.business.submit')}
        onPress={submit}
        loading={submitting}
        disabled={!hasId || !tinValid || submitting}
      />
    </ProfileScreenFrame>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
});
