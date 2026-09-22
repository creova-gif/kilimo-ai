/**
 * Renders a legal document (privacy policy / terms) from `profile.legal.*` i18n keys, so the
 * text follows the app language. Canonical routes: app/legal/privacy.tsx and app/legal/terms.tsx
 * (KIL-011); app/privacy.tsx and app/terms.tsx redirect to them.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import { AlertCard, ScreenHeader } from '../ui';

export type LegalDoc = 'privacy' | 'terms';

export const LEGAL_SECTION_COUNT: Record<LegalDoc, number> = { privacy: 15, terms: 17 };

/** The i18n keys a document is built from (exported for the i18n completeness test). */
export function legalKeys(doc: LegalDoc): TranslationKey[] {
  const keys: string[] = [`profile.legal.${doc}.title`, `profile.legal.${doc}.intro`];
  for (let i = 1; i <= LEGAL_SECTION_COUNT[doc]; i++) {
    keys.push(`profile.legal.${doc}.s${i}.title`, `profile.legal.${doc}.s${i}.body`);
  }
  return keys as TranslationKey[];
}

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { colors } = useTheme();
  const { t, lang } = useT();
  const router = useRouter();
  const k = (s: string) => s as TranslationKey;

  const sections = Array.from({ length: LEGAL_SECTION_COUNT[doc] }, (_, i) => i + 1);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t(k(`profile.legal.${doc}.title`))}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any))}
        backLabel={t('common.back')}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.updated, { color: colors.textMute }]}>{t('profile.legal.updated')}</Text>
        {lang === 'sw' ? (
          <AlertCard variant="info" title={t('profile.legal.translationNotice')} />
        ) : null}
        <Text style={[styles.body, { color: colors.text }]}>{t(k(`profile.legal.${doc}.intro`))}</Text>
        {sections.map((n) => (
          <View key={n} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
              {`${n}. ${t(k(`profile.legal.${doc}.s${n}.title`))}`}
            </Text>
            <Text style={[styles.body, { color: colors.textMute }]}>
              {t(k(`profile.legal.${doc}.s${n}.body`))}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 64, gap: 12 },
  updated: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  section: { marginTop: 12 },
  heading: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
});
