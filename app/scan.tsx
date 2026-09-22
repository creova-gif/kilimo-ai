/**
 * Crop photo check (KIL-006, AI part).
 *
 * Sends the photo to the `openai-proxy` vision action (lib/ai.ts). This screen
 * NEVER fabricates a diagnosis: when no image model / provider key is
 * configured (no backend, or the proxy answers 503) it says diagnosis is
 * unavailable and points to the knowledge base and an extension officer.
 * Unusable photos and missing results are reported as such, and confidence is
 * shown exactly as the model reported it (low / medium / high) — never as an
 * invented percentage.
 *
 * Removed (fabricated): the random "demo" diagnoses, the stock-photo camera
 * background, the fake progress %/"quantum analysis" text, the fake offline
 * toggle, and the automatic task + SMS on "critical" (now a user-initiated
 * follow-up task, since the result is an unverified AI suggestion).
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Image as ImageIcon, ShieldAlert } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { AIError, aiConfigured, diagnoseCropPhoto, type VisionDiagnosis } from '../lib/ai';
import { translate, useT, type TranslationKey } from '../lib/i18n';
import { useTasks } from '../hooks/useTasks';
import { useKilimoStore } from '../store/useKilimoStore';

type Phase =
  | { kind: 'idle' }
  | { kind: 'analyzing'; uri: string }
  | { kind: 'result'; uri: string; diagnosis: VisionDiagnosis }
  | { kind: 'unavailable' }
  | { kind: 'error'; uri?: string; message: TranslationKey; retry?: 'camera' | 'library' };

const MAX_PHOTO_BYTES = 5_000_000;

/** Pure: what the result screen should say about a diagnosis. Exported for tests. */
export function assessDiagnosis(d: VisionDiagnosis): 'unusable' | 'incomplete' | 'ok' {
  if (d.imageQuality === 'unusable') return 'unusable';
  if (!d.disease || !String(d.disease).trim()) return 'incomplete';
  return 'ok';
}

const SEVERITY_VARIANT = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
} as const;

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const { createTask } = useTasks();
  const [phase, setPhase] = useState<Phase>(() =>
    aiConfigured() ? { kind: 'idle' } : { kind: 'unavailable' }
  );
  const [taskState, setTaskState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const scanSeq = useRef(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const reset = () => {
    scanSeq.current++;
    setTaskState('idle');
    setPhase(aiConfigured() ? { kind: 'idle' } : { kind: 'unavailable' });
  };

  const readBase64 = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.uri.startsWith('data:')) {
      const m = asset.uri.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) throw new AIError('bad data uri', 'validation');
      return { base64: m[2], mimeType: m[1] };
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (
      info.exists &&
      typeof (info as any).size === 'number' &&
      (info as any).size > MAX_PHOTO_BYTES
    ) {
      throw new AIError('photo too large', 'validation');
    }
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      base64,
      mimeType: asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
    };
  };

  const run = async (source: 'camera' | 'library') => {
    if (isOffline) {
      setPhase({ kind: 'error', message: 'ai.scan.err.offline', retry: source });
      return;
    }
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhase({ kind: 'error', message: 'ai.scan.err.permission', retry: source });
      return;
    }
    const opts = {
      quality: 0.5,
      base64: false,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    } as const;
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];

    const seq = ++scanSeq.current;
    setTaskState('idle');
    setPhase({ kind: 'analyzing', uri: asset.uri });
    try {
      const { base64, mimeType } = await readBase64(asset);
      const diagnosis = await diagnoseCropPhoto(base64, { mimeType });
      if (scanSeq.current !== seq) return;
      setPhase({ kind: 'result', uri: asset.uri, diagnosis });
    } catch (err) {
      if (scanSeq.current !== seq) return;
      const kind = err instanceof AIError ? err.kind : 'server';
      if (kind === 'not_configured') {
        setPhase({ kind: 'unavailable' });
        return;
      }
      const message: TranslationKey =
        kind === 'validation'
          ? 'ai.scan.err.photo'
          : kind === 'unauthorized'
            ? 'ai.scan.err.signIn'
            : kind === 'network'
              ? 'ai.scan.err.network'
              : 'ai.scan.err.server';
      setPhase({ kind: 'error', uri: asset.uri, message, retry: source });
    }
  };

  const addFollowUp = async (d: VisionDiagnosis) => {
    setTaskState('saving');
    try {
      const disease = String(d.disease);
      await createTask({
        title: translate('en', 'ai.scan.task.title', { disease }),
        titleSw: translate('sw', 'ai.scan.task.title', { disease }),
        description: (d.actions ?? []).join(' • ') || undefined,
        category: 'scouting' as any,
        priority: (d.severity === 'critical' || d.severity === 'high' ? 'high' : 'medium') as any,
        status: 'pending' as any,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        xpReward: 0,
      });
      setTaskState('saved');
    } catch {
      setTaskState('failed');
    }
  };

  const photo = (uri: string) => (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: colors.border }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
      accessible
      accessibilityLabel={t('ai.scan.photoA11y')}
    />
  );

  const body = (() => {
    switch (phase.kind) {
      case 'unavailable':
        return (
          <EmptyState
            icon={<ShieldAlert size={28} color={colors.textMute} />}
            title={t('ai.scan.unavailable.title')}
            description={t('ai.scan.unavailable.body')}
            actionLabel={t('ai.scan.askKb')}
            onAction={() => router.push('/(tabs)/ai' as any)}
            secondaryActionLabel={t('common.back')}
            onSecondaryAction={goBack}
            announce
            testID="scan-unavailable"
          />
        );
      case 'analyzing':
        return (
          <View style={{ gap: spacing.lg }}>
            {photo(phase.uri)}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              accessibilityLiveRegion="polite"
            >
              <ActivityIndicator color={colors.primary} />
              <AppText tone="muted">{t('ai.scan.analyzing')}</AppText>
            </View>
            <Button label={t('common.cancel')} variant="outline" onPress={reset} />
          </View>
        );
      case 'error':
        return (
          <View style={{ gap: spacing.lg }}>
            {phase.uri ? photo(phase.uri) : null}
            <ErrorState
              title={t('ai.scan.err.title')}
              description={t(phase.message)}
              retryLabel={phase.retry ? t('common.retry') : undefined}
              onRetry={phase.retry ? () => run(phase.retry!) : undefined}
              secondaryLabel={t('ai.scan.again')}
              onSecondary={reset}
            />
          </View>
        );
      case 'result': {
        const d = phase.diagnosis;
        const verdict = assessDiagnosis(d);
        return (
          <View style={{ gap: spacing.lg }} testID="scan-result">
            {photo(phase.uri)}
            {verdict === 'unusable' ? (
              <AlertCard variant="warning" title={t('ai.blurry')} testID="scan-unusable" />
            ) : verdict === 'incomplete' ? (
              <AlertCard
                variant="warning"
                title={t('ai.scan.incomplete.title')}
                body={t('ai.scan.incomplete.body')}
                testID="scan-incomplete"
              />
            ) : (
              <Card variant="solid">
                <AppText variant="overline" tone="muted" uppercase>
                  {t('ai.scan.result.overline')}
                </AppText>
                <AppText variant="h3" style={{ marginTop: spacing.xs }}>
                  {d.disease}
                </AppText>
                {d.crop ? (
                  <AppText tone="muted" style={{ marginTop: 2 }}>
                    {t('ai.scan.result.crop', { crop: d.crop })}
                  </AppText>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                    marginTop: spacing.md,
                  }}
                >
                  {d.severity ? (
                    <Badge
                      label={t(`ai.scan.severity.${d.severity}` as TranslationKey)}
                      variant={SEVERITY_VARIANT[d.severity]}
                    />
                  ) : null}
                  {d.confidence ? (
                    <Badge
                      label={t(`ai.scan.confidence.${d.confidence}` as TranslationKey)}
                      variant={d.confidence === 'low' ? 'warning' : 'neutral'}
                    />
                  ) : null}
                </View>
                {d.actions?.length ? (
                  <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                    <AppText variant="smallStrong" accessibilityRole="header">
                      {t('ai.scan.result.actions')}
                    </AppText>
                    {d.actions.map((a, i) => (
                      <AppText key={i} variant="body">{`${i + 1}. ${a}`}</AppText>
                    ))}
                  </View>
                ) : null}
              </Card>
            )}
            {verdict === 'ok' && d.imageQuality === 'poor' ? (
              <AlertCard variant="info" title={t('ai.scan.poorPhoto')} />
            ) : null}
            {verdict === 'ok' && d.confidence === 'low' ? (
              <AlertCard variant="warning" title={t('ai.lowConfidence')} />
            ) : null}
            {verdict === 'ok' && d.consultExpert ? (
              <AlertCard
                variant="danger"
                title={t('ai.scan.expert.title')}
                body={t('ai.scan.expert.body')}
                testID="scan-expert"
              />
            ) : null}
            <AppText variant="caption" tone="muted">
              {t('ai.scan.disclaimer')}
            </AppText>
            {verdict === 'ok' ? (
              <Button
                label={
                  taskState === 'saved'
                    ? t('ai.scan.task.saved')
                    : taskState === 'failed'
                      ? t('ai.scan.task.failed')
                      : t('ai.scan.task.add')
                }
                variant="secondary"
                loading={taskState === 'saving'}
                disabled={taskState === 'saving' || taskState === 'saved'}
                onPress={() => addFollowUp(d)}
              />
            ) : null}
            <Button
              label={t('ai.scan.askKb')}
              variant="outline"
              onPress={() => router.push('/(tabs)/ai' as any)}
            />
            <Button label={t('ai.scan.again')} variant="ghost" onPress={reset} />
          </View>
        );
      }
      case 'idle':
      default:
        return (
          <View style={{ gap: spacing.lg }}>
            <Card variant="tinted">
              <AppText variant="label">{t('ai.scan.intro.title')}</AppText>
              <AppText tone="muted" style={{ marginTop: spacing.xs }}>
                {t('ai.scan.intro.body')}
              </AppText>
            </Card>
            <Card variant="outlined">
              <AppText variant="smallStrong" accessibilityRole="header">
                {t('ai.scan.tips.title')}
              </AppText>
              {(['ai.scan.tips.1', 'ai.scan.tips.2', 'ai.scan.tips.3'] as TranslationKey[]).map(
                (k, i) => (
                  <AppText key={k} style={{ marginTop: spacing.xs }}>{`${i + 1}. ${t(k)}`}</AppText>
                )
              )}
            </Card>
            <Button
              label={t('ai.scan.takePhoto')}
              icon={<Camera size={18} color={colors.onPrimary} />}
              onPress={() => run('camera')}
              disabled={isOffline}
              testID="scan-camera"
            />
            <Button
              label={t('ai.scan.gallery')}
              variant="outline"
              icon={<ImageIcon size={18} color={colors.text} />}
              onPress={() => run('library')}
              disabled={isOffline}
            />
          </View>
        );
    }
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('ai.scan.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
      <OfflineBanner message={t('ai.scan.offline')} visible={isOffline} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
      >
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}
