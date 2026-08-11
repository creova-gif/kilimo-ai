import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useKilimoStore } from '../store/useKilimoStore';
import { Button } from './ui/Button';
import { GlassCard } from './PageScaffold';
import { useTheme } from '../constants/Theme';
import * as Haptics from 'expo-haptics';

export function RequireVerification({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const router = useRouter();
  const agroId = useKilimoStore((s) => s.agroId);
  const language = useKilimoStore((s) => s.language);
  const status = agroId?.verificationStatus || 'unverified';

  if (status === 'verified') {
    return <>{children}</>;
  }

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // 'pending' means a real KYC submission is already under backend review
    // (see supabase/functions/submit-verification + app/verification/pending.tsx)
    // — send the user to that status screen, not Home. Home's activation card
    // is a *different* flow (minting the Agro-ID itself via mintAgroId); its
    // retry button can round-trip successfully even while KYC is still under
    // review, which would let the client mark itself "verified" without the
    // backend's real verification_status agreeing. Only route to Home for the
    // genuinely-unverified case, where that activation flow is the correct
    // next step.
    if (status === 'pending') {
      router.replace('/verification/pending');
    } else {
      router.replace('/(tabs)');
    }
  };

  const title =
    language === 'sw'
      ? status === 'pending'
        ? 'Uhakiki Unasubiriwa'
        : 'Uhakiki Unahitajika'
      : status === 'pending'
        ? 'Verification Pending'
        : 'Verification Required';

  // Pending copy mirrors app/verification/pending.tsx (the actual KYC status
  // screen) so the two surfaces never disagree about what "pending" means or
  // how long it takes.
  const body =
    language === 'sw'
      ? status === 'pending'
        ? 'Hati zako za utambulisho zimewasilishwa na sasa zinakaguliwa. Kwa kawaida huchukua saa 24–48. Utaarifiwa mara zitakapothibitishwa.'
        : 'Ili kulinda jamii na kufuata kanuni za Kilimo AI, lazima uhakiki kitambulisho chako ili kupata huduma hii.'
      : status === 'pending'
        ? 'Your identity documents have been submitted and are currently under review. This usually takes 24-48 hours. You will be notified once approved.'
        : 'To protect the community and comply with Kilimo AI guidelines, you must verify your identity to access this feature.';

  const btnLabel =
    status === 'pending'
      ? language === 'sw'
        ? 'Angalia Hali ya Uhakiki'
        : 'Check Verification Status'
      : language === 'sw'
        ? 'Nenda Nyumbani Kuwezesha'
        : 'Go to Home to Activate';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassCard style={styles.card}>
        <View style={styles.iconWrap}>
          <ShieldAlert size={48} color={colors.warning} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textMute }]}>{body}</Text>

        <Button label={btnLabel} onPress={handleGoHome} style={{ marginTop: 24, width: '100%' }} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, alignItems: 'center', width: '100%', maxWidth: 340 },
  iconWrap: { marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 22 },
});
