/**
 * Renders one rag-chat result honestly: a grounded answer with its sources,
 * the knowledge-base passages themselves (no provider key), a clear "nothing
 * found", or an error with retry. Shared by the Ask AI tab and the voice screen.
 */
import React from 'react';
import { View } from 'react-native';
import { BookOpen } from 'lucide-react-native';

import { AlertCard, AppText, Badge, Card } from '../ui';
import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import { isKnownCategory, type RagErrorKind, type RagResult, type RagSource } from '../../lib/rag';

export function categoryLabel(t: (k: TranslationKey) => string, category: string): string {
  if (isKnownCategory(category)) return t(`ai.category.${category}` as TranslationKey);
  return category.replace(/_/g, ' ');
}

const ERROR_KEYS: Record<RagErrorKind, { title: TranslationKey; body: TranslationKey }> = {
  not_configured: { title: 'ai.err.notConfigured.title', body: 'ai.err.notConfigured.body' },
  unauthorized: { title: 'ai.err.unauthorized.title', body: 'ai.err.unauthorized.body' },
  unavailable: { title: 'ai.err.unavailable.title', body: 'ai.err.unavailable.body' },
  network: { title: 'ai.err.network.title', body: 'ai.err.network.body' },
  invalid: { title: 'ai.err.invalid.title', body: 'ai.err.invalid.body' },
  server: { title: 'ai.err.server.title', body: 'ai.err.server.body' },
};

export function SourceCard({
  source,
  index,
  full,
}: {
  source: RagSource;
  index: number;
  /** Show the whole passage (knowledge-base mode) instead of the excerpt. */
  full?: boolean;
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const cat = categoryLabel(t, source.category);
  return (
    <Card
      variant="outlined"
      padding={spacing.md}
      accessible
      accessibilityLabel={t('ai.source.a11y', { n: index + 1, title: source.title, category: cat })}
      testID={`rag-source-${index}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <BookOpen size={16} color={colors.primary} />
        <AppText variant="label" style={{ flex: 1 }}>
          {`[${index + 1}] ${source.title}`}
        </AppText>
      </View>
      <Badge label={cat} variant="neutral" size="sm" style={{ marginTop: spacing.xs }} />
      <AppText variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
        {full ? source.content : source.excerpt}
      </AppText>
    </Card>
  );
}

export function RagAnswerView({ result, onRetry }: { result: RagResult; onRetry?: () => void }) {
  const { t } = useT();
  const { spacing } = useTheme();

  if (result.ok === false) {
    const kind = (result as { ok: false; error: RagErrorKind }).error;
    const keys = ERROR_KEYS[kind] ?? ERROR_KEYS.server;
    const retryable = kind === 'network' || kind === 'server' || kind === 'unavailable';
    return (
      <AlertCard
        variant={kind === 'unauthorized' || kind === 'invalid' ? 'warning' : 'danger'}
        title={t(keys.title)}
        body={t(keys.body)}
        actionLabel={retryable && onRetry ? t('common.retry') : undefined}
        onAction={retryable ? onRetry : undefined}
        testID="rag-error"
      />
    );
  }

  const data = (result as { ok: true; data: import('../../lib/rag').RagAnswer }).data;

  if (data.mode === 'no_match') {
    return (
      <AlertCard
        variant="info"
        title={t('ai.answer.noMatch.title')}
        body={t('ai.answer.noMatch.body')}
        testID="rag-no-match"
      />
    );
  }

  const generated = data.mode === 'generated';
  return (
    <View style={{ gap: spacing.sm }} testID={generated ? 'rag-generated' : 'rag-kb'}>
      {generated ? (
        <>
          <AppText variant="body">{data.answer}</AppText>
          <AppText variant="caption" tone="muted">
            {t('ai.answer.generatedNote')}
          </AppText>
        </>
      ) : (
        <>
          <AppText variant="body">{t('ai.answer.kbIntro')}</AppText>
          <AppText variant="caption" tone="muted">
            {data.llmError ? t('ai.answer.llmFailed') : t('ai.answer.kbNoLlm')}
          </AppText>
        </>
      )}
      <AppText variant="smallStrong" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
        {t('ai.answer.sources', { count: data.sources.length })}
      </AppText>
      {data.sources.map((s, i) => (
        <SourceCard key={`${s.id ?? s.title}-${i}`} source={s} index={i} full={!generated} />
      ))}
      <AppText variant="caption" tone="muted">
        {t('ai.answer.disclaimer')}
      </AppText>
    </View>
  );
}
