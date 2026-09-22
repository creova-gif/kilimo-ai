/**
 * Training videos.
 *
 * There is no verified video catalogue behind this app yet (no table, no
 * curated source), so this screen shows an honest empty state and points to
 * what does exist: the Kilimo knowledge base (Ask AI) and the AI lessons.
 *
 * Removed (fabricated): a hard-coded catalogue of YouTube IDs attributed to
 * "TARI Tanzania" and others — the IDs were placeholders (one was a music
 * video) and none of the attributions were verified.
 */
import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Tv } from 'lucide-react-native';

import { AppText, EmptyState, ScreenHeader } from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useT } from '../lib/i18n';

export default function VideoHubScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('ai.video.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        <EmptyState
          icon={<Tv size={28} color={colors.textMute} />}
          title={t('ai.video.empty.title')}
          description={t('ai.video.empty.body')}
          actionLabel={t('ai.video.askKb')}
          onAction={() => router.push('/(tabs)/ai' as any)}
          secondaryActionLabel={t('ai.video.lessons')}
          onSecondaryAction={() => router.push('/ai-training-hub' as any)}
          testID="video-empty"
        />
        <AppText
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginTop: spacing.lg }}
        >
          {t('ai.video.note')}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
