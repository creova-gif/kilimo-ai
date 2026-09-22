/**
 * Agro ID — the farmer's identity card and financial passport, built only from real records:
 * the income/expense ledger in `finance_entries` (edited on the Finance screen) and the policies
 * in `insurance_policies`. The credit score is a transparent, rule-based estimate
 * (lib/credit/score.ts), not a lender's decision. The QR points at verify-agro-id, which reports
 * only non-identifying aggregates of the same ledger.
 */
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { IdCard, QrCode } from 'lucide-react-native';

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
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { formatDate } from '../components/records';
import { useTheme } from '../constants/Theme';
import { useFinance } from '../hooks/useFinance';
import { useInsurance } from '../hooks/useInsurance';
import { ledgerFromFinance } from '../lib/credit/ledger';
import { computeCreditScore } from '../lib/credit/score';
import { formatTzs, totals } from '../lib/finance';
import { useT } from '../lib/i18n';
import { isInForce } from '../lib/insurance';
import { exportPnlPdf, type PnlReport } from '../lib/pdf/pnl';
import { useKilimoStore } from '../store/useKilimoStore';

const RECENT = 5;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export default function AgroIdScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const agroId = useKilimoStore((s) => s.agroId);
  const finance = useFinance();
  const insurance = useInsurance();
  const [qrOpen, setQrOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const ledger = useMemo(() => ledgerFromFinance(finance.entries), [finance.entries]);
  const sums = useMemo(() => totals(finance.entries), [finance.entries]);
  const insured = insurance.policies.some((p) => isInForce(p));
  const credit = useMemo(
    () =>
      ledger.length === 0
        ? null
        : computeCreditScore({
            ledger,
            nowISO: new Date().toISOString(),
            hasActiveInsurance: insured,
            contractsCompleted: 0,
          }),
    [ledger, insured]
  );

  const qrPayload = agroId
    ? SUPABASE_URL
      ? `${SUPABASE_URL}/functions/v1/verify-agro-id?token=${encodeURIComponent(agroId.id)}`
      : null
    : null;

  // Oldest and newest entry dates (entries are sorted newest first).
  const range = finance.entries.length
    ? {
        from: finance.entries[finance.entries.length - 1].entryDate,
        to: finance.entries[0].entryDate,
      }
    : null;

  async function handleExport() {
    if (!agroId || !range) return;
    setExporting(true);
    setExportError(false);
    try {
      const report: PnlReport = {
        agroId,
        seasonLabel: t('profile.agroId.export.period', {
          from: formatDate(range.from, lang),
          to: formatDate(range.to, lang),
        }),
        items: ledger.map((e) => ({
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amountTZS,
        })),
        generatedAt: new Date().toISOString(),
        qrPayload: qrPayload ?? agroId.id,
      };
      await exportPnlPdf(report);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  const header = (
    <ScreenHeader
      title={t('profile.agroId.title')}
      showBack
      onBack={() => router.back()}
      backLabel={t('common.back')}
    />
  );

  if (!agroId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        {header}
        <EmptyState
          icon={<IdCard size={48} color={colors.primary} />}
          title={t('profile.card.none.title')}
          description={t('profile.card.none.body')}
          actionLabel={t('profile.card.none.action')}
          onAction={() => router.push('/onboarding' as any)}
        />
      </SafeAreaView>
    );
  }

  const verification = agroId.verificationStatus;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {header}
      <OfflineBanner visible={finance.isOffline} message={t('profile.agroId.offline')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}>
        {/* Identity */}
        <Card style={{ marginBottom: spacing.lg }}>
          <AppText variant="overline" tone="muted" uppercase>
            {t('profile.card.agroId')}
          </AppText>
          <AppText variant="h2" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
            {agroId.name}
          </AppText>
          <AppText variant="small" tone="muted" style={{ marginTop: 2 }} selectable>
            {agroId.id}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <Badge
              variant={
                verification === 'verified'
                  ? 'success'
                  : verification === 'pending'
                    ? 'warning'
                    : 'neutral'
              }
              label={t(
                `profile.verification.${verification === 'pending' ? 'pending' : verification}` as const
              )}
            />
            <Badge variant="neutral" label={t('profile.card.tier', { tier: agroId.tier })} />
          </View>
          {agroId.location ? (
            <AppText variant="small" style={{ marginTop: spacing.md }}>
              {agroId.location}
            </AppText>
          ) : null}
          {agroId.joinDate ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
              {t('profile.card.memberSince', {
                date: formatDate(agroId.joinDate.slice(0, 10), lang),
              })}
            </AppText>
          ) : null}
          <Button
            label={t('profile.agroId.qr.open')}
            variant="outline"
            icon={<QrCode size={18} color={colors.primary} />}
            onPress={() => setQrOpen(true)}
            disabled={!qrPayload}
            style={{ marginTop: spacing.lg }}
          />
          {!qrPayload ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('profile.agroId.qr.unavailable')}
            </AppText>
          ) : null}
        </Card>

        {/* Credit estimate + ledger */}
        {finance.loading && !finance.loaded ? (
          <SkeletonGroup label={t('state.loading')}>
            <SkeletonBlock height={160} radius={16} />
            <SkeletonBlock height={200} radius={16} />
          </SkeletonGroup>
        ) : finance.error && !finance.loaded ? (
          <ErrorState
            title={t('state.error.title')}
            description={
              finance.error === 'not_configured'
                ? t('state.unavailable.body')
                : t('state.error.body')
            }
            retryLabel={t('common.retry')}
            onRetry={finance.refresh}
          />
        ) : (
          <>
            <Card style={{ marginBottom: spacing.lg }}>
              <AppText variant="h3" accessibilityRole="header">
                {t('profile.agroId.credit.title')}
              </AppText>
              {credit ? (
                <>
                  <View
                    accessible
                    accessibilityLabel={t('profile.agroId.credit.a11y', {
                      score: credit.score,
                      band: lang === 'sw' ? credit.bandLabelSw : credit.bandLabel,
                    })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: spacing.sm,
                      marginTop: spacing.md,
                    }}
                  >
                    <AppText variant="display">{String(credit.score)}</AppText>
                    <AppText variant="label" tone="muted">
                      {lang === 'sw' ? credit.bandLabelSw : credit.bandLabel}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
                    {t('profile.agroId.credit.range')}
                  </AppText>
                  {credit.factors.map((f) => (
                    <View
                      key={f.key}
                      accessible
                      accessibilityLabel={`${lang === 'sw' ? f.labelSw : f.label}: ${f.score}/${f.max}`}
                      style={{ paddingVertical: spacing.xs2 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <AppText variant="small">{lang === 'sw' ? f.labelSw : f.label}</AppText>
                        <AppText variant="small" tone="muted">{`${f.score}/${f.max}`}</AppText>
                      </View>
                      <AppText variant="caption" tone="muted">
                        {lang === 'sw' ? f.detailSw : f.detail}
                      </AppText>
                    </View>
                  ))}
                  <AlertCard
                    variant="info"
                    title={t('profile.agroId.credit.disclaimer')}
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : (
                <AppText tone="muted" style={{ marginTop: spacing.sm }}>
                  {t('profile.agroId.credit.empty')}
                </AppText>
              )}
            </Card>

            <Card style={{ marginBottom: spacing.lg }}>
              <AppText variant="h3" accessibilityRole="header">
                {t('profile.agroId.ledger.title')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <Stat label={t('profile.agroId.ledger.income')} value={formatTzs(sums.income)} />
                <Stat label={t('profile.agroId.ledger.expense')} value={formatTzs(sums.expense)} />
                <Stat label={t('profile.agroId.ledger.net')} value={formatTzs(sums.net)} />
              </View>
              {finance.entries.length === 0 ? (
                <AppText tone="muted" style={{ marginTop: spacing.md }}>
                  {t('profile.agroId.ledger.empty')}
                </AppText>
              ) : (
                <View style={{ marginTop: spacing.md }}>
                  <AppText
                    variant="overline"
                    tone="muted"
                    uppercase
                    style={{ marginBottom: spacing.xs }}
                  >
                    {t('profile.agroId.ledger.recent')}
                  </AppText>
                  {finance.entries.slice(0, RECENT).map((e) => {
                    const amount = `${e.kind === 'income' ? '+' : '−'}${formatTzs(e.amountTzs)}`;
                    return (
                      <View
                        key={e.id}
                        accessible
                        accessibilityLabel={`${e.description || e.category}, ${amount}, ${formatDate(e.entryDate, lang)}`}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: spacing.xs2,
                          gap: spacing.md,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <AppText variant="small" numberOfLines={1}>
                            {e.description || e.category}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {formatDate(e.entryDate, lang)}
                          </AppText>
                        </View>
                        <AppText variant="label" tone={e.kind === 'income' ? 'success' : undefined}>
                          {amount}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
                <Button
                  label={t('profile.agroId.ledger.open')}
                  variant="outline"
                  onPress={() => router.push('/finance' as any)}
                />
                <Button
                  label={t('profile.agroId.export.button')}
                  onPress={handleExport}
                  loading={exporting}
                  disabled={!range}
                />
              </View>
              {exportError ? (
                <AlertCard
                  variant="danger"
                  announce
                  title={t('profile.agroId.export.failed')}
                  style={{ marginTop: spacing.md }}
                />
              ) : null}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal
        visible={qrOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQrOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <Card>
            <AppText variant="h3" accessibilityRole="header">
              {t('profile.agroId.qr.title')}
            </AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
              {`${agroId.name} · ${agroId.id}`}
            </AppText>
            {qrPayload ? (
              <View
                accessible
                accessibilityLabel={t('profile.agroId.qr.a11y')}
                style={{
                  alignItems: 'center',
                  padding: spacing.lg,
                  backgroundColor: '#fff',
                  marginVertical: spacing.lg,
                  borderRadius: 12,
                }}
              >
                <QRCode value={qrPayload} size={180} backgroundColor="#fff" color="#000" />
              </View>
            ) : null}
            <AppText variant="small" tone="muted">
              {t('profile.agroId.qr.body')}
            </AppText>
            <Button
              label={t('common.close')}
              variant="outline"
              onPress={() => setQrOpen(false)}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1 }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText
        variant="label"
        style={{ marginTop: spacing.xs }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
    </View>
  );
}
