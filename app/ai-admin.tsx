/**
 * AI admin — real status of the Kilimo knowledge base behind Sankofa AI.
 *
 * Admin roles only (lib/access.tsx → normalizeRole === 'commercial_admin').
 * NOTE: that role comes from the client-side Agro ID, so this gate is UX, not
 * authorization. It is safe because the screen is read-only: it shows what
 * rag-chat reports (article titles/categories, how many rows have embeddings,
 * whether a provider key is configured) and how to change it server-side.
 *
 * Removed (fabricated): the invented farmer feedback, the fake "retraining
 * pipeline" with progress logs, the hard-coded "95.8% accuracy", the local-only
 * "seeded documents" list and the system-prompt editor (the server always
 * enforces its own prompt, so edits there never reached the model).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';

import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListGroup,
  ListRow,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { categoryLabel } from '../components/ai/RagAnswerView';
import { useTheme } from '../constants/Theme';
import { normalizeRole } from '../lib/access';
import { useT, type TranslationKey } from '../lib/i18n';
import { getKnowledgeStatus, type RagErrorKind, type StatusResult } from '../lib/rag';
import { useKilimoStore } from '../store/useKilimoStore';

/** Pure: the retrieval mode rag-chat will actually use, given its status. Exported for tests. */
export function effectiveRetrieval(s: {
  llmConfigured: boolean;
  embedded: number;
  fullTextReady: boolean;
}): 'vector' | 'fulltext' | 'keyword' {
  if (s.llmConfigured && s.embedded > 0) return 'vector';
  return s.fullTextReady ? 'fulltext' : 'keyword';
}

const ERR: Record<RagErrorKind, TranslationKey> = {
  not_configured: 'ai.err.notConfigured.body',
  unauthorized: 'ai.err.unauthorized.body',
  unavailable: 'ai.err.unavailable.body',
  network: 'ai.err.network.body',
  invalid: 'ai.err.server.body',
  server: 'ai.err.server.body',
};

export default function AIAdminScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const role = useKilimoStore((s) => s.agroId?.role);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const isAdmin = normalizeRole(role) === 'commercial_admin';

  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getKnowledgeStatus();
    setStatus(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('ai.admin.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
    </>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <EmptyState
          icon={<Lock size={28} color={colors.textMute} />}
          title={t('ai.admin.denied.title')}
          description={t('ai.admin.denied.body')}
          actionLabel={t('common.back')}
          onAction={goBack}
          testID="ai-admin-denied"
        />
      </SafeAreaView>
    );
  }

  const content = (() => {
    if (!status || (loading && !status)) {
      return (
        <SkeletonGroup label={t('state.loading')}>
          <SkeletonBlock height={96} />
          <SkeletonBlock height={200} />
        </SkeletonGroup>
      );
    }
    if (status.ok === false) {
      const kind = (status as { ok: false; error: RagErrorKind }).error;
      return (
        <ErrorState
          title={t('ai.admin.error.title')}
          description={t(ERR[kind] ?? 'ai.err.server.body')}
          retryLabel={t('common.retry')}
          onRetry={load}
          testID="ai-admin-error"
        />
      );
    }
    const s = (status as Extract<StatusResult, { ok: true }>).data;
    const mode = effectiveRetrieval(s);
    return (
      <View style={{ gap: spacing.lg }} testID="ai-admin-status">
        <Card variant="solid">
          <AppText variant="smallStrong" accessibilityRole="header">
            {t('ai.admin.status.title')}
          </AppText>
          <ListGroup style={{ marginTop: spacing.sm }}>
            <ListRow title={t('ai.admin.status.documents')} value={String(s.documents)} />
            <ListRow
              title={t('ai.admin.status.embedded')}
              value={t('ai.admin.status.embeddedValue', { n: s.embedded, total: s.documents })}
            />
            <ListRow
              title={t('ai.admin.status.llm')}
              value={s.llmConfigured ? t('ai.admin.yes') : t('ai.admin.no')}
            />
            <ListRow
              title={t('ai.admin.status.retrieval')}
              value={t(`ai.admin.retrieval.${mode}` as TranslationKey)}
              divider={false}
            />
          </ListGroup>
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            {s.llmConfigured ? t('ai.admin.answers.generated') : t('ai.admin.answers.passages')}
          </AppText>
        </Card>

        {!s.llmConfigured || s.embedded < s.documents ? (
          <Card variant="tinted">
            <AppText variant="smallStrong" accessibilityRole="header">
              {t('ai.admin.howto.title')}
            </AppText>
            {!s.llmConfigured ? (
              <AppText style={{ marginTop: spacing.xs }}>{t('ai.admin.howto.key')}</AppText>
            ) : null}
            {s.embedded < s.documents ? (
              <AppText style={{ marginTop: spacing.xs }}>{t('ai.admin.howto.embed')}</AppText>
            ) : null}
            {!s.fullTextReady ? (
              <AppText style={{ marginTop: spacing.xs }}>{t('ai.admin.howto.migration')}</AppText>
            ) : null}
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="smallStrong" accessibilityRole="header">
            {t('ai.admin.articles', { count: s.articles.length })}
          </AppText>
          {s.articles.length === 0 ? (
            <EmptyState title={t('ai.admin.articles.empty')} />
          ) : (
            <ListGroup>
              {s.articles.map((a, i) => (
                <ListRow
                  key={a.id ?? a.title}
                  title={a.title}
                  trailing={
                    <Badge label={categoryLabel(t, a.category)} variant="neutral" size="sm" />
                  }
                  divider={i < s.articles.length - 1}
                />
              ))}
            </ListGroup>
          )}
          <AppText variant="caption" tone="muted">
            {t('ai.admin.howto.add')}
          </AppText>
        </View>
      </View>
    );
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <OfflineBanner message={t('ai.chat.offline')} visible={isOffline} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading && !!status} onRefresh={load} />}
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}
