/**
 * Sankofa AI training — five short lessons on using the AI safely, each with
 * one check question. Progress is stored locally (store.completedModules).
 *
 * All copy lives in ai.* i18n keys (English + Swahili). Completing the lessons
 * is an in-app learning milestone, not an official certification, and the
 * screen says so.
 *
 * Removed: the unrelated "motion design principles" tab (squash & stretch /
 * anticipation demos) that had nothing to do with farming or the AI.
 */
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckCircle2, Circle } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  ListGroup,
  ListRow,
  ScreenHeader,
} from '../components/ui';
import { MIN_TOUCH_TARGET } from '../components/ui/a11y';
import { useTheme } from '../constants/Theme';
import { useT, type TranslationKey } from '../lib/i18n';
import { useKilimoStore } from '../store/useKilimoStore';

/** Module ids are persisted in the store — keep them stable. */
export const TRAINING_MODULES = [
  { id: 'intro', n: 1, correct: 1 },
  { id: 'prompting', n: 2, correct: 0 },
  { id: 'photos', n: 3, correct: 2 },
  { id: 'confidence', n: 4, correct: 1 },
  { id: 'escalation', n: 5, correct: 0 },
] as const;

const k = (n: number, part: string) => `ai.train.m${n}.${part}` as TranslationKey;

export default function AITrainingHubScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing, radius } = useTheme();
  const completed = useKilimoStore((s) => s.completedModules) ?? [];
  const completeModule = useKilimoStore((s) => s.completeModule);

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState<'correct' | 'wrong' | null>(null);

  const doneCount = TRAINING_MODULES.filter((m) => completed.includes(m.id)).length;
  const allDone = doneCount === TRAINING_MODULES.length;

  const open = (i: number | null) => {
    setOpenIdx(i);
    setChoice(null);
    setChecked(null);
  };
  const goBack = () => {
    if (openIdx !== null) return open(null);
    router.canGoBack() ? router.back() : router.replace('/');
  };

  const mod = openIdx !== null ? TRAINING_MODULES[openIdx] : null;

  const check = () => {
    if (!mod || choice === null) return;
    if (choice === mod.correct) {
      setChecked('correct');
      completeModule(mod.id);
    } else {
      setChecked('wrong');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={mod ? t(k(mod.n, 'title')) : t('ai.train.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
      >
        {!mod ? (
          <>
            <Card variant="tinted">
              <AppText variant="label">{t('ai.train.intro.title')}</AppText>
              <AppText tone="muted" style={{ marginTop: spacing.xs }}>
                {t('ai.train.intro.body')}
              </AppText>
              <AppText
                variant="smallStrong"
                style={{ marginTop: spacing.sm }}
                testID="train-progress"
              >
                {t('ai.train.progress', { done: doneCount, total: TRAINING_MODULES.length })}
              </AppText>
            </Card>
            {allDone ? (
              <AlertCard
                variant="success"
                title={t('ai.train.done.title')}
                body={t('ai.train.done.body')}
                testID="train-done"
              />
            ) : null}
            <ListGroup>
              {TRAINING_MODULES.map((m, i) => {
                const isDone = completed.includes(m.id);
                return (
                  <ListRow
                    key={m.id}
                    title={t(k(m.n, 'title'))}
                    subtitle={t(k(m.n, 'subtitle'))}
                    leading={
                      isDone ? (
                        <CheckCircle2 size={20} color={colors.primary} />
                      ) : (
                        <Circle size={20} color={colors.textMute} />
                      )
                    }
                    trailing={
                      isDone ? (
                        <Badge label={t('ai.train.completed')} variant="success" size="sm" />
                      ) : undefined
                    }
                    showChevron
                    onPress={() => open(i)}
                    accessibilityLabel={`${t(k(m.n, 'title'))}. ${isDone ? t('ai.train.completed') : t('ai.train.notStarted')}`}
                    divider={i < TRAINING_MODULES.length - 1}
                  />
                );
              })}
            </ListGroup>
          </>
        ) : (
          <>
            <Card variant="solid">
              <AppText variant="overline" tone="muted" uppercase>
                {t('ai.train.lesson')}
              </AppText>
              <AppText style={{ marginTop: spacing.xs }}>{t(k(mod.n, 'lesson'))}</AppText>
            </Card>
            <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
              <AppText variant="label" accessibilityRole="header">
                {t(k(mod.n, 'q'))}
              </AppText>
              {[0, 1, 2].map((i) => {
                const selected = choice === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setChoice(i);
                      setChecked(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: colors.card,
                      justifyContent: 'center',
                    }}
                    testID={`train-option-${i}`}
                  >
                    <AppText>{t(k(mod.n, `o${i + 1}`))}</AppText>
                  </Pressable>
                );
              })}
            </View>
            {checked === 'correct' ? (
              <AlertCard
                variant="success"
                title={t('ai.train.correct')}
                announce
                testID="train-correct"
              />
            ) : checked === 'wrong' ? (
              <AlertCard
                variant="warning"
                title={t('ai.train.wrong')}
                announce
                testID="train-wrong"
              />
            ) : null}
            {checked === 'correct' ? (
              <Button
                label={
                  openIdx! < TRAINING_MODULES.length - 1
                    ? t('ai.train.next')
                    : t('ai.train.backToList')
                }
                onPress={() => open(openIdx! < TRAINING_MODULES.length - 1 ? openIdx! + 1 : null)}
              />
            ) : (
              <Button
                label={t('ai.train.check')}
                onPress={check}
                disabled={choice === null}
                testID="train-check"
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
