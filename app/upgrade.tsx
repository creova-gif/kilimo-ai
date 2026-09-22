/**
 * Plans — an honest comparison, not a checkout.
 *
 * No billing or payment provider is integrated, so there is no purchase or upgrade flow here: no
 * "confirm plan" button, no simulated charge, and this screen never changes the user's plan or
 * privileges (the previous version wrote a local tier). The paid plans are labelled "Planned", their
 * prices "planned, not final", and a permanent notice says billing is not enabled and plan limits are
 * not applied yet. Only the Free plan is described as available now.
 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';

import { AlertCard, AppText, Badge, Card, ScreenHeader } from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useT, type TranslationKey } from '../lib/i18n';
import { formatTzs } from '../lib/finance';

interface Plan {
  id: 'free' | 'premium' | 'cooperative';
  /** Planned monthly price in TZS; null = free. Not final — the UI says so. */
  plannedPriceTzs: number | null;
  available: boolean;
  featureKeys: TranslationKey[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    plannedPriceTzs: null,
    available: true,
    featureKeys: [
      'money.upgrade.free.f1',
      'money.upgrade.free.f2',
      'money.upgrade.free.f3',
      'money.upgrade.free.f4',
      'money.upgrade.free.f5',
      'money.upgrade.free.f6',
    ],
  },
  {
    id: 'premium',
    plannedPriceTzs: 15000,
    available: false,
    featureKeys: [
      'money.upgrade.premium.f1',
      'money.upgrade.premium.f2',
      'money.upgrade.premium.f3',
      'money.upgrade.premium.f4',
      'money.upgrade.premium.f5',
      'money.upgrade.premium.f6',
    ],
  },
  {
    id: 'cooperative',
    plannedPriceTzs: 50000,
    available: false,
    featureKeys: [
      'money.upgrade.cooperative.f1',
      'money.upgrade.cooperative.f2',
      'money.upgrade.cooperative.f3',
      'money.upgrade.cooperative.f4',
      'money.upgrade.cooperative.f5',
    ],
  },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t('money.upgrade.title')}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        backLabel={t('common.back')}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}>
        <AppText variant="body" tone="muted" style={{ marginBottom: spacing.md }}>
          {t('money.upgrade.subtitle')}
        </AppText>

        {/* Permanent: billing is not enabled, nothing can be bought or charged. */}
        <AlertCard
          variant="warning"
          title={t('money.upgrade.notice.title')}
          body={t('money.upgrade.notice.body')}
          testID="billing-notice"
          style={{ marginBottom: spacing.lg }}
        />

        {PLANS.map((plan) => {
          const name = t(`money.upgrade.plan.${plan.id}` as TranslationKey);
          const status = t(
            plan.available ? 'money.upgrade.status.available' : 'money.upgrade.status.planned'
          );
          const price =
            plan.plannedPriceTzs === null
              ? t('money.upgrade.price.free')
              : t('money.upgrade.price.planned', { price: formatTzs(plan.plannedPriceTzs) });
          return (
            <Card
              key={plan.id}
              variant={plan.available ? 'solid' : 'outlined'}
              style={{ marginBottom: spacing.md }}
              testID={`plan-${plan.id}`}
            >
              <View
                accessible
                accessibilityLabel={t('money.upgrade.plan.a11y', { plan: name, status, price })}
              >
                <View style={styles.head}>
                  <AppText variant="h3" accessibilityRole="header" style={{ flex: 1 }}>
                    {name}
                  </AppText>
                  <Badge label={status} variant={plan.available ? 'success' : 'neutral'} />
                </View>
                <AppText variant="label" tone={plan.available ? 'primary' : 'muted'} style={{ marginTop: 4 }}>
                  {price}
                </AppText>
              </View>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              {plan.featureKeys.map((k) => (
                <View key={k} style={styles.feature}>
                  <Check
                    size={16}
                    color={plan.available ? colors.primary : colors.textMute}
                    strokeWidth={2.5}
                  />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {t(k)}
                  </AppText>
                </View>
              ))}
            </Card>
          );
        })}

        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {t('money.upgrade.footer')}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
});
