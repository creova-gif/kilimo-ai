/**
 * Ask an agronomist — real consultation REQUESTS (KIL-004).
 *
 * Backed by `consultation_requests` (migration 20260921130000). The farmer describes a problem; it
 * is stored against their account with status "submitted". An agronomist answers when one is
 * available — through the backend, never through this client (RLS forbids the client from setting
 * status/answer). So this screen states plainly what it is and is not:
 *   - it stores requests and shows the status the server holds;
 *   - it never shows an invented expert, rating, price, availability, chat or video call;
 *   - it never claims a request was assigned, seen or answered unless the server says so.
 *
 * Submitting is online-only; offline says so and keeps the farmer's text.
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, Info, MessageSquare } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
  TextField,
  type BadgeVariant,
} from '../components/ui';
import { CROPS } from '../constants/onboardingOptions';
import { useTheme } from '../constants/Theme';
import { useConsultations } from '../hooks/useConsultations';
import { useSessionUserId } from '../hooks/usePeerGroups';
import {
  CONSULT_DESCRIPTION_MAX,
  CONSULT_TOPIC_MAX,
  consultationStatusKey,
  cropLabel,
  hasAnswer,
  hasErrors,
  listPhase,
  validateConsultationInput,
  type ConsultationErrors,
  type ConsultationLanguage,
  type ConsultationRequest,
  type ConsultationStatus,
} from '../lib/community';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import { timeAgoKey } from '../lib/timeAgo';

const STATUS_VARIANT: Record<ConsultationStatus, BadgeVariant> = {
  submitted: 'warning',
  in_review: 'info',
  answered: 'success',
  closed: 'neutral',
};

export default function ConsultationsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Gate
      feature="expert_consultations"
      fallback={
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack.Screen options={{ headerShown: false }} />
          <EmptyState
            icon={<AlertTriangle size={48} color={colors.warningText} />}
            title={t('community.access.title')}
            description={t('community.access.consult')}
          />
        </SafeAreaView>
      }
    >
      <ConsultationsBody />
    </Gate>
  );
}

function ConsultationsBody() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const { userId, resolved } = useSessionUserId();
  const cons = useConsultations(userId);

  const [topic, setTopic] = useState('');
  const [crop, setCrop] = useState('');
  const [description, setDescription] = useState('');
  // Default the reply language to the one the farmer is already using in the app (their choice, editable).
  const [replyLang, setReplyLang] = useState<ConsultationLanguage>(lang === 'en' ? 'en' : 'sw');
  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const input = { topic, description, crop, preferredLanguage: replyLang };
    const e = validateConsultationInput(input);
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    const r = await cons.submit(input);
    setBusy(false);
    if (r.ok) {
      setTopic('');
      setCrop('');
      setDescription('');
      setErrors({});
      // Truthful: stored + Submitted + not answered. Nothing is said about who will answer or when.
      Alert.alert(t('community.consult.success.title'), t('community.consult.success.body'));
    } else {
      // The text stays in the form so nothing the farmer wrote is lost.
      Alert.alert(
        t('state.error.title'),
        r.reason === 'offline' ? t('community.offline.write') : t('community.consult.failed')
      );
    }
  };

  const phase = listPhase({
    sessionResolved: resolved,
    userId,
    isOffline: cons.isOffline,
    loaded: cons.loaded,
    error: cons.error,
    count: cons.requests.length,
  });

  const label = (text: string) => (
    <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {text}
    </AppText>
  );

  let listBody: React.ReactNode;
  if (phase === 'ready') {
    listBody = (
      <View style={{ gap: spacing.md }}>
        {cons.requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </View>
    );
  } else if (phase === 'loading') {
    listBody = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={96} radius={16} />
        <SkeletonBlock height={96} radius={16} />
      </SkeletonGroup>
    );
  } else if (phase === 'offline' || phase === 'error') {
    listBody = (
      <ErrorState
        title={t('community.consult.error.title')}
        description={phase === 'offline' ? t('community.offline.banner') : t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={cons.refresh}
      />
    );
  } else if (phase === 'unavailable') {
    listBody = (
      <ErrorState title={t('state.unavailable.title')} description={t('state.unavailable.body')} />
    );
  } else if (phase === 'signed_out') {
    listBody = (
      <EmptyState
        icon={<MessageSquare size={48} color={colors.primary} />}
        title={t('community.signedOut.title')}
        description={t('community.signedOut.body')}
      />
    );
  } else {
    listBody = (
      <EmptyState
        icon={<MessageSquare size={48} color={colors.primary} />}
        title={t('community.consult.empty.title')}
        description={t('community.consult.empty.body')}
        style={{ flex: 0 }}
      />
    );
  }

  // The form needs a signed-in user; when the state is unavailable/signed-out the list body already says why.
  const canCompose = phase !== 'unavailable' && phase !== 'signed_out';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('community.consult.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <OfflineBanner message={t('community.offline.banner')} visible={cons.isOffline} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={cons.loading && cons.loaded} onRefresh={cons.refresh} />
          }
        >
          <AlertCard
            variant="info"
            title={t('community.consult.info.title')}
            body={t('community.consult.info.body')}
            icon={<Info size={24} color={colors.infoText} />}
          />

          {canCompose ? (
            <>
              <AppText variant="h3" style={{ marginTop: spacing.xl }}>
                {t('community.consult.form.title')}
              </AppText>

              <TextField
                label={t('community.consult.topic')}
                value={topic}
                onChangeText={setTopic}
                placeholder={t('community.consult.topic.placeholder')}
                maxLength={CONSULT_TOPIC_MAX}
                error={errors.topic ? t('community.consult.topic.error') : undefined}
                testID="consult-topic"
                wrapperStyle={{ marginTop: spacing.md }}
              />

              {label(t('community.consult.crop'))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CROPS.map((c) => (
                  <Chip
                    key={c}
                    label={cropLabel(c, lang)}
                    selected={crop === c}
                    onPress={() => setCrop(crop === c ? '' : c)}
                  />
                ))}
              </View>

              <TextField
                label={t('community.consult.description')}
                hint={t('community.consult.description.hint')}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={CONSULT_DESCRIPTION_MAX}
                error={errors.description ? t('community.consult.description.error') : undefined}
                testID="consult-description"
                wrapperStyle={{ marginTop: spacing.lg }}
              />

              {label(t('community.consult.language'))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip
                  label={t('community.consult.lang.sw')}
                  selected={replyLang === 'sw'}
                  onPress={() => setReplyLang('sw')}
                />
                <Chip
                  label={t('community.consult.lang.en')}
                  selected={replyLang === 'en'}
                  onPress={() => setReplyLang('en')}
                />
              </View>

              <Button
                label={t('community.consult.submit')}
                onPress={submit}
                loading={busy}
                disabled={cons.isOffline}
                size="lg"
                fullWidth
                style={{ marginTop: spacing.xl }}
              />
            </>
          ) : null}

          <AppText variant="h3" style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
            {t('community.consult.list.title')}
          </AppText>
          {listBody}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── one request ──────────────────────────────────────────────────────────────────────────── */
function RequestCard({ request }: { request: ConsultationRequest }) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const sent = timeAgoKey(request.createdAt);
  const answeredAgo = request.answeredAt ? timeAgoKey(request.answeredAt) : null;
  const crop = cropLabel(request.crop, lang);

  return (
    <Card padding={spacing.lg}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" numberOfLines={2}>
            {request.topic}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {[
              crop,
              t('community.consult.sent', { time: t(sent.key, sent.params) }),
              t('community.consult.replyIn', {
                lang: t(
                  request.preferredLanguage === 'en'
                    ? 'community.consult.lang.en'
                    : 'community.consult.lang.sw'
                ),
              }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
        <Badge
          label={t(consultationStatusKey(request.status))}
          variant={STATUS_VARIANT[request.status]}
        />
      </View>

      <AppText variant="body" style={{ marginTop: spacing.md }}>
        {request.description}
      </AppText>

      {hasAnswer(request) ? (
        <View
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: 12,
            backgroundColor: colors.primarySoft,
          }}
          accessible
          accessibilityLabel={`${t('community.consult.answer')}. ${request.answer}`}
        >
          <AppText variant="label" tone="primary">
            {t('community.consult.answer')}
            {answeredAgo
              ? ` · ${t('community.consult.answeredAt', { time: t(answeredAgo.key, answeredAgo.params) })}`
              : ''}
          </AppText>
          <AppText variant="body" style={{ marginTop: spacing.xs }}>
            {request.answer}
          </AppText>
        </View>
      ) : request.status !== 'answered' ? (
        // No answer yet: say exactly that, per the status the server holds. (An "answered" row with
        // no stored text gets no extra claim from us — the badge is the server's word, nothing more.)
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {t(`community.consult.statusNote.${request.status}` as const)}
        </AppText>
      ) : null}
    </Card>
  );
}
