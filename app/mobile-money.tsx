/**
 * Payment records — an honest note-keeping screen, NOT a wallet.
 *
 * No payment provider (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, a bank) is integrated in KILIMO AI,
 * so nothing here sends, receives or pays money. The user can keep notes about payments they made or
 * received outside the app, or about a request they intend to make later. A permanent notice at the top
 * says so; no action on this screen ever reports that money moved. Rows live in `public.payment_records`
 * (owner-only RLS); the seeded transactions, the wallet balance and the fake "sent" alert are gone.
 */
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WifiOff, Wallet } from 'lucide-react-native';

import { PaymentFormSheet, useNetworkLabel } from '../components/finance/PaymentFormSheet';
import {
  AlertCard,
  AppText,
  Button,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { usePaymentRecords } from '../hooks/useFinance';
import { useT, type TranslationKey } from '../lib/i18n';
import { formatTzs } from '../lib/finance';
import type { PaymentDirection, PaymentInput, PaymentRecord } from '../lib/paymentRecords';

const ACTIONS: PaymentDirection[] = ['sent', 'received', 'request'];

export default function MobileMoneyScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const networkLabel = useNetworkLabel();
  const { records, loading, loaded, error, isOffline, busy, add, cancel, remove, refresh } =
    usePaymentRecords();

  const [sheet, setSheet] = useState<{ open: boolean; direction: PaymentDirection }>({
    open: false,
    direction: 'sent',
  });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const canWrite = !isOffline && error !== 'not_configured' && error !== 'signed_out';

  const submit = async (input: PaymentInput) => {
    const r = await add(input);
    if (r.ok) {
      setSheet((s) => ({ ...s, open: false }));
      // Truthful by construction: a record was saved, nothing was sent or received.
      setNotice(t(input.direction === 'request' ? 'money.pay.saved.request' : 'money.pay.saved.record'));
    }
    return r;
  };

  const cancelRequest = async (id: string) => {
    const r = await cancel(id);
    if (r.ok) setNotice(t('money.pay.cancelled'));
    else Alert.alert(t('money.pay.actionFailed'));
  };

  const confirmDelete = (id: string) => {
    Alert.alert(t('money.pay.delete.title'), t('money.pay.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('money.pay.delete'),
        style: 'destructive',
        onPress: async () => {
          const r = await remove(id);
          if (r.ok) setNotice(t('money.pay.deleted'));
          else Alert.alert(t('money.pay.actionFailed'));
        },
      },
    ]);
  };

  /* ── list area (below the permanent notice) ──────────────────────────────────────────── */
  let body: React.ReactElement;
  if (error === 'not_configured') {
    body = (
      <EmptyState
        style={styles.state}
        title={t('money.notConfigured.title')}
        description={t('money.notConfigured.body')}
        icon={<Wallet size={48} color={colors.primary} />}
      />
    );
  } else if (error === 'signed_out') {
    body = (
      <EmptyState
        style={styles.state}
        title={t('money.signedOut.title')}
        description={t('money.signedOut.body')}
        icon={<Wallet size={48} color={colors.primary} />}
      />
    );
  } else if (!loaded && isOffline) {
    body = (
      <EmptyState
        style={styles.state}
        title={t('money.offline.empty.title')}
        description={t('money.offline.empty.body')}
        icon={<WifiOff size={48} color={colors.primary} />}
      />
    );
  } else if (!loaded && loading) {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={88} radius={16} />
        <SkeletonBlock height={88} radius={16} />
      </SkeletonGroup>
    );
  } else if (!loaded && error === 'error') {
    body = (
      <ErrorState
        style={styles.state}
        title={t('money.pay.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    );
  } else if (records.length === 0) {
    body = (
      <EmptyState
        style={styles.state}
        title={t('money.pay.empty.title')}
        description={t('money.pay.empty.body')}
        icon={<Wallet size={48} color={colors.primary} />}
      />
    );
  } else {
    body = (
      <View>
        <AppText variant="label" accessibilityRole="header" style={{ marginBottom: spacing.sm }}>
          {t('money.pay.list.title')}
        </AppText>
        {records.map((r) => (
          <RecordCard
            key={r.id}
            record={r}
            networkText={networkLabel(r.network)}
            canWrite={canWrite}
            onCancel={() => cancelRequest(r.id)}
            onDelete={() => confirmDelete(r.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t('money.pay.title')}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        backLabel={t('common.back')}
      />
      <OfflineBanner visible={isOffline} message={t('money.offline.banner')} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Permanent: never dismissible, never conditional on loading or data. */}
        <AlertCard
          variant="warning"
          title={t('money.pay.notice.title')}
          body={t('money.pay.notice.body')}
          testID="payments-notice"
          style={{ marginBottom: spacing.lg }}
        />

        {notice ? (
          <AlertCard variant="success" title={notice} announce style={{ marginBottom: spacing.lg }} />
        ) : null}
        {error && loaded ? (
          <AlertCard
            variant="warning"
            title={t('money.pay.error.title')}
            actionLabel={t('common.retry')}
            onAction={refresh}
            style={{ marginBottom: spacing.lg }}
          />
        ) : null}

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {ACTIONS.map((d) => (
            <Button
              key={d}
              label={t(`money.pay.action.${d}` as TranslationKey)}
              variant={d === 'sent' ? 'primary' : 'secondary'}
              size="md"
              shape="rounded"
              disabled={!canWrite}
              accessibilityHint={isOffline ? t('money.offline.needsConnection') : undefined}
              onPress={() => setSheet({ open: true, direction: d })}
              testID={`pay-action-${d}`}
            />
          ))}
        </View>

        {body}
      </ScrollView>

      <PaymentFormSheet
        visible={sheet.open}
        direction={sheet.direction}
        busy={busy}
        offline={isOffline}
        onSubmit={submit}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </SafeAreaView>
  );
}

function RecordCard({
  record,
  networkText,
  canWrite,
  onCancel,
  onDelete,
}: {
  record: PaymentRecord;
  networkText: string;
  canWrite: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const { spacing } = useTheme();
  const directionText = t(`money.pay.direction.${record.direction}` as TranslationKey);
  const statusText = t(`money.pay.status.${record.status}` as TranslationKey);
  const cancelled = record.status === 'cancelled';
  const meta = [networkText, record.phone, record.reference].filter(Boolean).join(' · ');

  return (
    <Card style={{ marginBottom: spacing.sm }} testID={`payment-${record.id}`}>
      <View
        accessible
        accessibilityLabel={t('money.pay.row.a11y', {
          direction: directionText,
          who: record.counterparty,
          amount: formatTzs(record.amountTzs),
          network: networkText,
          status: statusText,
        })}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <AppText variant="h3" numberOfLines={1}>
              {record.counterparty}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {meta}
            </AppText>
          </View>
          <AppText
            variant="h3"
            style={cancelled ? { textDecorationLine: 'line-through' } : undefined}
          >
            {formatTzs(record.amountTzs)}
          </AppText>
        </View>
        <View style={[styles.badges, { marginTop: spacing.sm }]}>
          <Badge label={directionText} variant="neutral" />
          <Badge
            label={statusText}
            variant={record.status === 'pending_provider' ? 'warning' : 'neutral'}
          />
        </View>
        {record.note ? (
          <AppText variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
            {record.note}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.actions, { marginTop: spacing.xs }]}>
        {record.status === 'pending_provider' ? (
          <Button
            label={t('money.pay.cancel')}
            variant="link"
            size="sm"
            fullWidth={false}
            disabled={!canWrite}
            onPress={onCancel}
          />
        ) : null}
        <Button
          label={t('money.pay.delete')}
          variant="link"
          size="sm"
          fullWidth={false}
          disabled={!canWrite}
          onPress={onDelete}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  state: { flex: 0, paddingVertical: 24 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
});
