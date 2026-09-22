import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Chip, TextField } from '../ui';
import { FormSheet } from './FormSheet';
import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import {
  NETWORK_BRAND_NAME,
  PAYMENT_NETWORKS,
  validatePaymentInput,
  type PaymentDirection,
  type PaymentErrors,
  type PaymentInput,
  type PaymentNetwork,
} from '../../lib/paymentRecords';
import type { WriteFailure } from '../../hooks/useFinance';

export interface PaymentFormSheetProps {
  visible: boolean;
  /** Which kind of record the user chose on the main screen. */
  direction: PaymentDirection;
  busy: boolean;
  offline: boolean;
  onSubmit: (input: PaymentInput) => Promise<{ ok: true } | WriteFailure>;
  onClose: () => void;
}

/** Localised label for a network: brand names as-is, `cash` / `other` translated. */
export function useNetworkLabel() {
  const { t } = useT();
  return (n: PaymentNetwork) =>
    NETWORK_BRAND_NAME[n] ?? t(`money.network.${n === 'cash' ? 'cash' : 'other'}` as const);
}

/**
 * Form for one payment RECORD. It states, in the sheet itself, that saving only keeps a note: nothing
 * here can send or receive money.
 */
export function PaymentFormSheet({
  visible,
  direction,
  busy,
  offline,
  onSubmit,
  onClose,
}: PaymentFormSheetProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  const networkLabel = useNetworkLabel();
  const [counterparty, setCounterparty] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState<PaymentNetwork>('mpesa');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCounterparty('');
    setPhone('');
    setAmount('');
    setNetwork('mpesa');
    setReference('');
    setNote('');
    setErrors({});
    setSubmitError(null);
  }, [visible, direction]);

  const isRequest = direction === 'request';

  const submit = async () => {
    const input: PaymentInput = { direction, counterparty, phone, amount, network, reference, note };
    const found = validatePaymentInput(input);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setSubmitError(null);
    const r = await onSubmit(input);
    if (r.ok === true) return; // the parent closes the sheet and shows the honest "no money moved" notice
    setSubmitError(
      r.reason === 'signed_out'
        ? t('money.error.signedOut')
        : r.reason === 'offline'
          ? t('money.offline.needsConnection')
          : t('money.error.saveFailed')
    );
  };

  return (
    <FormSheet
      visible={visible}
      title={t(`money.pay.form.title.${direction}` as TranslationKey)}
      closeLabel={t('money.form.close')}
      onClose={onClose}
    >
      <Card variant="tinted" style={{ marginBottom: spacing.lg }}>
        <AppText variant="small" testID="pay-form-helper">
          {t(isRequest ? 'money.pay.form.helper.request' : 'money.pay.form.helper.record')}
        </AppText>
      </Card>

      <TextField
        label={t('money.pay.counterparty')}
        value={counterparty}
        onChangeText={setCounterparty}
        placeholder={t('money.pay.counterparty.placeholder')}
        maxLength={80}
        error={errors.counterparty ? t('money.pay.error.counterparty') : undefined}
        testID="pay-counterparty"
      />
      <TextField
        label={t('money.pay.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder={t('money.pay.phone.placeholder')}
        maxLength={20}
        error={errors.phone ? t('money.pay.error.phone') : undefined}
        testID="pay-phone"
      />
      <TextField
        label={t('money.form.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder={t('money.form.amount.placeholder')}
        error={errors.amount ? t('money.error.amount') : undefined}
        testID="pay-amount"
      />

      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {t('money.pay.network')}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {PAYMENT_NETWORKS.map((n) => (
          <Chip
            key={n}
            label={networkLabel(n)}
            selected={network === n}
            onPress={() => setNetwork(n)}
          />
        ))}
      </View>

      <TextField
        label={t('money.pay.reference')}
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
        maxLength={60}
        error={errors.reference ? t('money.pay.error.reference') : undefined}
        testID="pay-reference"
      />
      <TextField
        label={t('money.pay.note')}
        value={note}
        onChangeText={setNote}
        maxLength={300}
        error={errors.note ? t('money.pay.error.note') : undefined}
        testID="pay-note"
      />

      {submitError ? (
        <AppText
          variant="small"
          tone="error"
          accessibilityRole="alert"
          style={{ marginBottom: spacing.md }}
        >
          {submitError}
        </AppText>
      ) : null}

      <Button
        label={busy ? t('money.form.saving') : t(isRequest ? 'money.pay.save.request' : 'money.pay.save.record')}
        onPress={submit}
        loading={busy}
        disabled={offline}
        accessibilityHint={offline ? t('money.offline.needsConnection') : undefined}
        testID="pay-save"
      />
      {offline ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {t('money.offline.needsConnection')}
        </AppText>
      ) : null}
    </FormSheet>
  );
}
