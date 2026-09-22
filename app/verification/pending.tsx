/**
 * Verification status — reads the person's latest verification_requests row (the real review
 * state) instead of assuming one. Shows pending / verified / rejected (with the reviewer's note),
 * "no request yet", and loading / error+retry / signed-out / not-configured states.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { useKilimoStore } from '../../store/useKilimoStore';
import { getSupabase } from '../../lib/supabase';
import { timeAgoKey } from '../../lib/timeAgo';
import { Button, Card, EmptyState, ErrorState, SkeletonBlock, SkeletonGroup } from '../../components/ui';
import { ProfileScreenFrame } from '../../components/profile/ProfileScreenFrame';
import { fetchLatestRequest, type StatusResult } from '../../components/profile/verification';

export default function VerificationStatusScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchLatestRequest(getSupabase());
    setResult(res);
    if (res.ok === true) {
      const latest = (res as { latest: any }).latest;
      // Keep the locally cached status in line with the server's review decision.
      if (latest) updateAgroId({ verificationStatus: latest.status as any });
    }
  }, [updateAgroId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  let body: React.ReactNode;
  if (!result) {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={160} />
      </SkeletonGroup>
    );
  } else if (result.ok === false) {
    const reason = (result as { reason: string }).reason;
    body =
      reason === 'not_configured' ? (
        <EmptyState
          title={t('profile.verify.status.unavailable.title')}
          description={t('profile.verify.error.notConfigured')}
        />
      ) : reason === 'not_signed_in' ? (
        <EmptyState
          title={t('profile.verify.status.signedOut.title')}
          description={t('profile.verify.error.signedOut')}
        />
      ) : (
        <ErrorState
          title={t('profile.verify.status.error.title')}
          description={t('state.error.body')}
          retryLabel={t('common.retry')}
          onRetry={() => {
            setResult(null);
            void load();
          }}
        />
      );
  } else {
    const latest = (result as { latest: any }).latest;
    if (!latest) {
      body = (
        <EmptyState
          icon={<ShieldCheck size={48} color={colors.primary} />}
          title={t('profile.verify.status.none.title')}
          description={t('profile.verify.status.none.body')}
          actionLabel={t('profile.verify.intro.start')}
          onAction={() => router.replace('/verification/intro' as any)}
        />
      );
    } else {
      const ago = timeAgoKey(latest.created_at);
      const cfg =
        latest.status === 'verified'
          ? { Icon: CheckCircle2, color: colors.successText, title: 'profile.verify.status.verified.title', text: 'profile.verify.status.verified.body' }
          : latest.status === 'rejected'
            ? { Icon: XCircle, color: colors.errorText, title: 'profile.verify.status.rejected.title', text: 'profile.verify.status.rejected.body' }
            : { Icon: Clock, color: colors.warningText, title: 'profile.verify.status.pending.title', text: 'profile.verify.status.pending.body' };
      const Icon = cfg.Icon;
      body = (
        <>
          <Card>
            <View style={styles.center} accessible accessibilityRole="summary">
              <Icon size={56} color={cfg.color} />
              <Text style={[styles.title, { color: colors.text }]}>{t(cfg.title as any)}</Text>
              <Text style={[styles.body, { color: colors.textMute }]}>{t(cfg.text as any)}</Text>
              <Text style={[styles.meta, { color: colors.textMute }]}>
                {t('profile.verify.status.submitted', { time: t(ago.key, ago.params) })}
                {' · '}
                {latest.verification_type === 'business'
                  ? t('profile.verify.status.typeBusiness')
                  : t('profile.verify.status.typePersonal')}
              </Text>
            </View>
            {latest.status === 'rejected' && latest.reviewer_note ? (
              <Text style={[styles.note, { color: colors.text, borderColor: colors.border }]}>
                {t('profile.verify.status.reviewerNote', { note: latest.reviewer_note })}
              </Text>
            ) : null}
          </Card>
          {latest.status === 'rejected' ? (
            <Button
              label={t('profile.verify.status.resubmit')}
              onPress={() => router.replace('/verification/intro' as any)}
            />
          ) : null}
        </>
      );
    }
  }

  return (
    <ProfileScreenFrame
      title={t('profile.verify.status.title')}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {body}
    </ProfileScreenFrame>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 8 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  meta: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  note: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, fontSize: 14, lineHeight: 20 },
});
