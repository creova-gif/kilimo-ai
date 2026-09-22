/**
 * Verification step 0 — what is collected, why, and consent. Nothing is sent from this screen.
 */
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { Button, Card } from '../../components/ui';
import { ProfileScreenFrame } from '../../components/profile/ProfileScreenFrame';

export default function VerificationIntro() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const [consent, setConsent] = useState(false);

  return (
    <ProfileScreenFrame title={t('profile.verify.intro.title')}>
      <View style={styles.center}>
        <ShieldCheck size={48} color={colors.primary} />
      </View>
      <Text style={[styles.lead, { color: colors.text }]}>{t('profile.verify.intro.body')}</Text>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {t('profile.verify.intro.needTitle')}
        </Text>
        <Text style={[styles.bullet, { color: colors.textMute }]}>
          {`• ${t('profile.verify.intro.needId')}`}
        </Text>
        <Text style={[styles.bullet, { color: colors.textMute }]}>
          {`• ${t('profile.verify.intro.needBusiness')}`}
        </Text>
        <Text style={[styles.bullet, { color: colors.textMute }]}>
          {`• ${t('profile.verify.intro.review')}`}
        </Text>
      </Card>

      <View style={styles.consentRow}>
        <Switch
          value={consent}
          onValueChange={setConsent}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          accessibilityRole="switch"
          accessibilityLabel={t('profile.verify.intro.consent')}
          accessibilityState={{ checked: consent }}
        />
        <Text style={[styles.consentText, { color: colors.textMute }]}>
          {t('profile.verify.intro.consent')}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/legal/privacy' as any)}
        accessibilityRole="link"
        style={styles.link}
      >
        <Text style={[styles.linkText, { color: colors.textLink }]}>
          {t('profile.verify.intro.privacyLink')}
        </Text>
      </Pressable>

      <Button
        label={t('profile.verify.intro.start')}
        disabled={!consent}
        onPress={() => router.push('/verification/personal' as any)}
      />
    </ProfileScreenFrame>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  lead: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24, textAlign: 'center' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  bullet: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  consentText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' },
});
