/**
 * Verification step 1 — national ID (NIDA) or passport number. Held in memory only
 * (components/profile/verification.ts); submitted on the next step.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { Button, TextField } from '../../components/ui';
import { ProfileScreenFrame } from '../../components/profile/ProfileScreenFrame';
import { getDraft, isValidNationalId, updateDraft } from '../../components/profile/verification';

export default function PersonalVerification() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const [nationalId, setNationalId] = useState(getDraft().nationalId);
  const [touched, setTouched] = useState(false);
  const valid = isValidNationalId(nationalId);

  return (
    <ProfileScreenFrame
      title={t('profile.verify.personal.title')}
      subtitle={t('profile.verify.step', { step: 1, total: 2 })}
      fallbackRoute="/verification/intro"
    >
      <Text style={[styles.lead, { color: colors.textMute }]}>
        {t('profile.verify.personal.body')}
      </Text>
      <TextField
        label={t('profile.verify.personal.idLabel')}
        hint={t('profile.verify.personal.idHint')}
        error={touched && !valid ? t('profile.verify.personal.idError') : undefined}
        value={nationalId}
        onChangeText={(v) => setNationalId(v)}
        onBlur={() => setTouched(true)}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel={t('profile.verify.personal.idLabel')}
      />
      <Button
        label={t('profile.verify.personal.continue')}
        disabled={!valid}
        onPress={() => {
          updateDraft({ nationalId });
          router.push('/verification/business' as any);
        }}
      />
    </ProfileScreenFrame>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
});
