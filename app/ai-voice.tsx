/**
 * Voice questions — speak (or tap a starter question) and get an answer from
 * the Kilimo knowledge base.
 *
 * Speech-to-text needs the server's provider key (openai-proxy "transcribe").
 * When it is not configured the screen says so plainly and the starter
 * questions still work, because answers come from rag-chat (lib/rag.ts),
 * which retrieves real knowledge_base passages without any key.
 *
 * Removed (fabricated): the "demo" canned answers labelled only by a trailing
 * "(Demo Mode)", and starter questions (today's weather, current market
 * prices) the knowledge base cannot truthfully answer.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Mic, Square } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  OfflineBanner,
  ScreenHeader,
} from '../components/ui';
import { RagAnswerView } from '../components/ai/RagAnswerView';
import { SUGGESTION_KEYS } from '../components/ai/suggestions';
import { useTheme } from '../constants/Theme';
import { AIError, transcribeAudio } from '../lib/ai';
import { useT, type TranslationKey } from '../lib/i18n';
import { askKnowledgeBase, type RagResult } from '../lib/rag';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'answering';
type Exchange = { id: string; question: string; result: RagResult };

const MAX_AUDIO_BYTES = 5_000_000;

export default function AiVoiceScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const backendReady = !!getSupabase();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [state, setState] = useState<VoiceState>('idle');
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const opRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(
    () => () => {
      opRef.current++;
      recorder.stop().catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const busy = state !== 'idle' && state !== 'listening';
  const blocked = isOffline || !backendReady;

  const answer = async (question: string, op: number) => {
    setState('answering');
    const result = await askKnowledgeBase(question, lang === 'sw' ? 'sw' : 'en');
    if (opRef.current !== op) return;
    setExchanges((prev) => [...prev, { id: `${Date.now()}_${prev.length}`, question, result }]);
    setState('idle');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const askText = (question: string) => {
    if (busy || blocked) return;
    setNotice(null);
    answer(question, ++opRef.current);
  };

  const startRecording = async () => {
    setNotice(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setNotice('ai.voice.err.permission');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
    } catch {
      setNotice('ai.voice.err.mic');
      setState('idle');
    }
  };

  const stopAndAsk = async () => {
    const op = ++opRef.current;
    setState('transcribing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new AIError('no recording', 'validation');
      const info = await FileSystem.getInfoAsync(uri);
      if (
        info.exists &&
        typeof (info as any).size === 'number' &&
        (info as any).size > MAX_AUDIO_BYTES
      ) {
        throw new AIError('too long', 'validation');
      }
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (opRef.current !== op) return;
      const mimeType = uri.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/m4a';
      const transcript = (await transcribeAudio(base64, { mimeType, language: lang })).trim();
      if (opRef.current !== op) return;
      if (!transcript) {
        setNotice('ai.voice.err.empty');
        setState('idle');
        return;
      }
      await answer(transcript, op);
    } catch (err) {
      if (opRef.current !== op) return;
      const kind = err instanceof AIError ? err.kind : 'server';
      setNotice(
        kind === 'not_configured'
          ? 'ai.voice.err.sttUnavailable'
          : kind === 'validation'
            ? 'ai.voice.err.tooLong'
            : kind === 'network'
              ? 'ai.voice.err.network'
              : kind === 'unauthorized'
                ? 'ai.voice.err.signIn'
                : 'ai.voice.err.server'
      );
      setState('idle');
    }
  };

  const micLabel =
    state === 'listening'
      ? t('ai.voice.stop')
      : state === 'idle'
        ? t('ai.voice.start')
        : t('ai.voice.wait');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('ai.voice.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
      <OfflineBanner message={t('ai.chat.offline')} visible={isOffline} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
      >
        {!backendReady ? (
          <AlertCard
            variant="warning"
            title={t('ai.err.notConfigured.title')}
            body={t('ai.err.notConfigured.body')}
          />
        ) : null}
        <Card variant="tinted">
          <AppText variant="label">{t('ai.voice.intro.title')}</AppText>
          <AppText tone="muted" style={{ marginTop: spacing.xs }}>
            {t('ai.voice.intro.body')}
          </AppText>
        </Card>

        <Button
          label={micLabel}
          size="lg"
          variant={state === 'listening' ? 'destructive' : 'primary'}
          icon={
            state === 'listening' ? (
              <Square size={18} color={colors.onPrimary} />
            ) : (
              <Mic size={18} color={colors.onPrimary} />
            )
          }
          onPress={state === 'listening' ? stopAndAsk : startRecording}
          disabled={busy || blocked}
          accessibilityHint={t('ai.voice.micHint')}
          testID="voice-mic"
        />

        {state === 'listening' || busy ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            accessibilityLiveRegion="polite"
          >
            {busy ? <ActivityIndicator color={colors.primary} /> : null}
            <AppText tone="muted">
              {state === 'listening'
                ? t('ai.voice.listening')
                : state === 'transcribing'
                  ? t('ai.voice.transcribing')
                  : t('ai.chat.searching')}
            </AppText>
          </View>
        ) : null}

        {notice ? <AlertCard variant="warning" title={t(notice)} testID="voice-notice" /> : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="smallStrong" accessibilityRole="header">
            {t('ai.voice.quick')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SUGGESTION_KEYS.map((k) => (
              <Chip key={k} label={t(k)} onPress={() => askText(t(k))} disabled={busy || blocked} />
            ))}
          </View>
        </View>

        {exchanges.map((ex) => (
          <View key={ex.id} style={{ gap: spacing.sm }}>
            <AppText variant="smallStrong">{t('ai.voice.youAsked', { text: ex.question })}</AppText>
            <Card variant="solid">
              <RagAnswerView result={ex.result} onRetry={() => askText(ex.question)} />
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
