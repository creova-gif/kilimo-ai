/**
 * Ask AI — questions answered from the Kilimo knowledge base (KIL-009).
 *
 * Every question goes to the `rag-chat` edge function (lib/rag.ts), which
 * retrieves the most relevant knowledge_base passages and, only when a
 * provider key is configured on the server, writes a short answer grounded in
 * them. Every answer shows its sources. Without a key the passages themselves
 * are shown ("Here is what the Kilimo knowledge base says…"); when nothing
 * relevant exists, the screen says so.
 *
 * Removed (they were fabricated): the canned "demo" chat answers with invented
 * market prices / forecasts, the fake spreadsheet "trend analysis", the
 * "Neural Link Active" status and the tap-to-toggle fake offline switch.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Mic, Send } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  OfflineBanner,
  ScreenHeader,
  TextField,
} from '../../components/ui';
import { RagAnswerView } from '../../components/ai/RagAnswerView';
import { SUGGESTION_KEYS } from '../../components/ai/suggestions';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { askKnowledgeBase, MAX_QUESTION_LENGTH, type RagResult } from '../../lib/rag';
import { getSupabase } from '../../lib/supabase';
import { useKilimoStore } from '../../store/useKilimoStore';

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; question: string; result: RagResult | null };

let seq = 0;
const nextId = () => `m${Date.now()}_${++seq}`;

export default function AskAiScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const backendReady = !!getSupabase();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatItem>>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  useEffect(() => {
    if (items.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [items]);

  const runQuery = useCallback(
    async (assistantId: string, question: string) => {
      setPending(true);
      const result = await askKnowledgeBase(question, lang === 'sw' ? 'sw' : 'en');
      if (!mounted.current) return;
      setItems((prev) =>
        prev.map((it) =>
          it.id === assistantId && it.role === 'assistant' ? { ...it, result } : it
        )
      );
      setPending(false);
    },
    [lang]
  );

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || pending || isOffline || !backendReady) return;
      const assistantId = nextId();
      setItems((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: question },
        { id: assistantId, role: 'assistant', question, result: null },
      ]);
      setInput('');
      runQuery(assistantId, question);
    },
    [pending, isOffline, backendReady, runQuery]
  );

  const retry = (item: Extract<ChatItem, { role: 'assistant' }>) => {
    if (pending || isOffline) return;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...item, result: null } : it)));
    runQuery(item.id, item.question);
  };

  const canSend = !!input.trim() && !pending && !isOffline && backendReady;
  const tooLong = input.length > MAX_QUESTION_LENGTH;

  const header = (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      {!backendReady ? (
        <AlertCard
          variant="warning"
          title={t('ai.err.notConfigured.title')}
          body={t('ai.err.notConfigured.body')}
          testID="ai-not-configured"
        />
      ) : null}
      <Card variant="tinted">
        <AppText variant="label">{t('ai.chat.intro.title')}</AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
          {t('ai.chat.intro.body')}
        </AppText>
      </Card>
      {items.length === 0 ? (
        <>
          <AppText variant="smallStrong" accessibilityRole="header">
            {t('ai.chat.suggest.title')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SUGGESTION_KEYS.map((k) => (
              <Chip
                key={k}
                label={t(k)}
                onPress={() => ask(t(k))}
                disabled={pending || isOffline || !backendReady}
                accessibilityHint={t('ai.chat.suggest.hint')}
              />
            ))}
          </View>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={t('ai.chat.scan')}
          variant="outline"
          size="md"
          icon={<Camera size={16} color={colors.text} />}
          onPress={() => router.push('/scan' as any)}
          style={{ flex: 1 }}
        />
        <Button
          label={t('ai.chat.voice')}
          variant="outline"
          size="md"
          icon={<Mic size={16} color={colors.text} />}
          onPress={() => router.push('/ai-voice' as any)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: ChatItem }) => {
    if (item.role === 'user') {
      return (
        <View
          style={{
            alignSelf: 'flex-end',
            maxWidth: '85%',
            backgroundColor: colors.primary,
            borderRadius: 16,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
          accessible
          accessibilityLabel={t('ai.chat.youAsked', { text: item.text })}
        >
          <AppText tone="onPrimary">{item.text}</AppText>
        </View>
      );
    }
    return (
      <Card variant="solid" testID="ai-answer">
        {item.result ? (
          <RagAnswerView result={item.result} onRetry={() => retry(item)} />
        ) : (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            accessibilityLiveRegion="polite"
            testID="ai-searching"
          >
            <ActivityIndicator color={colors.primary} />
            <AppText tone="muted">{t('ai.chat.searching')}</AppText>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader variant="large" title={t('ai.chat.title')} subtitle={t('ai.chat.subtitle')} />
        <OfflineBanner message={t('ai.chat.offline')} visible={isOffline} />
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <TextField
            value={input}
            onChangeText={setInput}
            placeholder={t('ai.chat.placeholder')}
            accessibilityLabel={t('ai.chat.placeholder')}
            multiline
            maxLength={MAX_QUESTION_LENGTH + 1}
            editable={!isOffline && backendReady}
            error={tooLong ? t('ai.chat.tooLong') : undefined}
            wrapperStyle={{ flex: 1, marginBottom: 0 }}
            onSubmitEditing={() => ask(input)}
            testID="ai-input"
          />
          <Button
            label={t('ai.chat.send')}
            size="md"
            icon={<Send size={16} color={colors.onPrimary} />}
            onPress={() => ask(input)}
            disabled={!canSend || tooLong}
            loading={pending}
            testID="ai-send"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
