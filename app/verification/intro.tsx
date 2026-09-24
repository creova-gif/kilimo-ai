import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import PageScaffold, { GlassCard } from '../../components/PageScaffold';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../constants/Theme';
import { useRouter as useExpoRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function VerificationIntro() {
  const { colors } = useTheme();
  const router = useExpoRouter();
  const [consent, setConsent] = useState(false);

  return (
    <PageScaffold title="Verify Identity" subtitle="Required for Wallet & Market">
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ShieldCheck size={48} color={colors.primary} />
        </View>
        <Text style={[styles.desc, { color: colors.text }]}>
          To unlock financial features like Kilimo Wallet and Smart Contracts, we must verify your
          identity in compliance with Tanzanian regulations.
        </Text>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>What you'll need:</Text>
          <Text style={[styles.bullet, { color: colors.textMute }]}>• NIDA ID or Passport</Text>
          <Text style={[styles.bullet, { color: colors.textMute }]}>
            • A clear photo of yourself
          </Text>
          <Text style={[styles.bullet, { color: colors.textMute }]}>
            • Farm or Business Registration (if applicable)
          </Text>
        </GlassCard>

        <View style={styles.consentRow}>
          <Switch
            value={consent}
            onValueChange={setConsent}
            trackColor={{ false: '#333', true: colors.primary }}
          />
          <Text style={[styles.consentText, { color: colors.textMute }]}>
            I consent to Kilimo AI processing my personal data for identity verification under the
            PDPA regulations. My data will be kept secure and deleted after 90 days if verification
            fails.
          </Text>
        </View>

        <Button
          label="Start Verification"
          icon={<ArrowRight size={18} color="#fff" />}
          disabled={!consent}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/verification/personal');
          }}
          style={{ marginTop: 32 }}
        />
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  iconWrap: { alignItems: 'center', marginBottom: 24 },
  desc: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  card: { padding: 20, marginBottom: 32 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', marginBottom: 12 },
  bullet: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 8, lineHeight: 22 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consentText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
