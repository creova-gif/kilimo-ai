/**
 * Shared frame for onboarding steps (Figma "Onboarding v2": 106:1045, 106:2059, 108:1002, 14:4109).
 *
 * The primary button lives INSIDE the KeyboardAvoidingView, so it rides above the software
 * keyboard — previously it was outside and the keyboard covered it (gap G-018). Scrolling the
 * form dismisses the keyboard, and taps on controls are not swallowed (`handled`).
 */
import React from 'react';
import {
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { AppText, Button } from '../ui';

export interface OnboardingScaffoldProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  onBack?: () => void;
  cta: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  children: React.ReactNode;
}

export function OnboardingScaffold({
  step,
  total,
  title,
  subtitle,
  image,
  onBack,
  cta,
  children,
}: OnboardingScaffoldProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useT();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {image && (
            <Image
              source={image}
              accessibilityIgnoresInvertColors
              style={[styles.hero, { borderRadius: radius.lg }]}
            />
          )}

          <View style={[styles.topRow, { marginTop: image ? spacing.lg : 0 }]}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                hitSlop={12}
                style={styles.back}
              >
                <ArrowLeft size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.back} />
            )}
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
              {Array.from({ length: total }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < step ? colors.primary : colors.border },
                    i === step - 1 && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <AppText variant="caption" tone="muted" style={styles.stepText}>
              {t('onb.step', { current: step, total })}
            </AppText>
          </View>

          <AppText variant="h1" accessibilityRole="header" style={{ marginTop: spacing.lg }}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
              {subtitle}
            </AppText>
          )}

          <View style={{ marginTop: spacing.xl }}>{children}</View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Button
            label={cta.label}
            onPress={cta.onPress}
            disabled={cta.disabled}
            loading={cta.loading}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { width: '100%', height: 150 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  dots: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22 },
  stepText: { minWidth: 96, textAlign: 'right' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
