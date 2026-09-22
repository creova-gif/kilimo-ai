/**
 * Insurance records — a farmer's own record book of policies and claims.
 *
 * This screen used to fake enrolment, a camera capture and claim "submission". It is now honest:
 * you record the policies you already hold and keep claim records, and you can share a plain-text
 * summary through your phone's share sheet. Kilimo AI is not connected to any insurer, so recording a
 * claim here does NOT file it — the screen says so wherever it matters. There is no photo evidence:
 * nothing could store or forward it, so it is not offered.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Shield } from 'lucide-react-native';

import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
  TextField,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useInsurance } from '../hooks/useInsurance';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import type { TranslationKey } from '../lib/i18n/en';
import {
  INCIDENT_TYPES,
  addMonths,
  buildClaimSummary,
  claimStatusKey,
  failed,
  hasErrors,
  incidentKey,
  incidentWithinPolicy,
  parseDay,
  policyOverview,
  policyStanding,
  todayString,
  validateClaimInput,
  validatePolicyInput,
  type ClaimErrors,
  type ClaimStatus,
  type IncidentType,
  type InsuranceClaim,
  type InsurancePolicy,
  type PolicyErrors,
  type PolicyState,
} from '../lib/insurance';
import { formatMoney } from '../lib/listings';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;
type FormState = null | { type: 'policy' } | { type: 'claim'; policyId: string };

const STANDING_BADGE: Record<PolicyState, 'success' | 'warning' | 'info' | 'neutral'> = {
  active: 'success',
  expiring_soon: 'warning',
  upcoming: 'info',
  expired: 'neutral',
  cancelled: 'neutral',
};

const CLAIM_BADGE: Record<ClaimStatus, 'neutral' | 'info'> = {
  draft: 'neutral',
  submitted_record: 'info',
  closed: 'neutral',
};

export default function InsuranceScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();

  const denied = (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('insurance.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <EmptyState title={t('insurance.gate.title')} description={t('insurance.gate.body')} />
    </SafeAreaView>
  );

  return (
    <Gate feature="insurance" fallback={denied}>
      <InsuranceRecords />
    </Gate>
  );
}

function InsuranceRecords() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const ins = useInsurance();
  const { policies, claims, loading, loaded, error, isOffline } = ins;

  const [form, setForm] = useState<FormState>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(id);
  }, [flash]);

  const writeError = (reason: string) =>
    reason === 'offline' ? t('insurance.write.offline') : t('insurance.write.failed');

  const confirmDeletePolicy = (p: InsurancePolicy) =>
    Alert.alert(t('insurance.policy.delete.confirmTitle'), t('insurance.policy.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('insurance.policy.delete'),
        style: 'destructive',
        onPress: async () => {
          const r = await ins.removePolicy(p.id);
          if (failed(r)) Alert.alert(t('state.error.title'), writeError(r.reason));
        },
      },
    ]);

  const confirmDeleteClaim = (c: InsuranceClaim) =>
    Alert.alert(t('insurance.claim.delete.confirmTitle'), t('insurance.claim.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('insurance.claim.delete'),
        style: 'destructive',
        onPress: async () => {
          const r = await ins.removeClaim(c.id);
          if (failed(r)) Alert.alert(t('state.error.title'), writeError(r.reason));
        },
      },
    ]);

  const changeClaimStatus = async (c: InsuranceClaim, status: ClaimStatus) => {
    const r = await ins.setClaimStatus(c.id, status);
    if (failed(r)) Alert.alert(t('state.error.title'), writeError(r.reason));
  };

  const cancelPolicy = async (p: InsurancePolicy) => {
    const r = await ins.setPolicyStatus(p.id, 'cancelled');
    if (failed(r)) Alert.alert(t('state.error.title'), writeError(r.reason));
  };

  // Opens the phone's share sheet. Nothing is sent by the app itself.
  const shareClaim = async (p: InsurancePolicy, c: InsuranceClaim) => {
    try {
      await Share.share({ message: buildClaimSummary(p, c, t) });
    } catch {
      Alert.alert(t('state.error.title'), t('insurance.claim.share.failed'));
    }
  };

  // ── body ────────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (loading && !loaded) {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        {[0, 1].map((i) => (
          <SkeletonBlock key={i} height={150} radius={16} style={{ marginBottom: spacing.md }} />
        ))}
      </SkeletonGroup>
    );
  } else if (error === 'not_configured') {
    body = <EmptyState title={t('insurance.unconfigured')} />;
  } else if (!loaded) {
    body = (
      <ErrorState
        title={t('insurance.error.title')}
        description={isOffline ? t('insurance.offline.banner') : t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={ins.refresh}
      />
    );
  } else {
    body = (
      <>
        {error ? (
          <AlertCard
            variant="warning"
            title={t('insurance.error.title')}
            actionLabel={t('common.retry')}
            onAction={ins.refresh}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {flash ? (
          <AlertCard variant="success" title={flash} announce style={{ marginBottom: spacing.md }} />
        ) : null}

        {form?.type === 'policy' ? (
          <PolicyForm
            t={t}
            onCancel={() => setForm(null)}
            onSave={async (input) => {
              const r = await ins.addPolicy(input);
              if (failed(r)) return writeError(r.reason);
              setForm(null);
              setFlash(t('insurance.policy.saved'));
              return null;
            }}
          />
        ) : policies.length > 0 ? (
          <>
            <AppText variant="h3" accessibilityRole="header" style={{ marginBottom: spacing.sm }}>
              {t('insurance.policies.heading')}
            </AppText>
            <Button
              label={t('insurance.addPolicy')}
              icon={<Plus size={20} color={colors.textOnPrimary} />}
              onPress={() => setForm({ type: 'policy' })}
              size="md"
              style={{ marginBottom: spacing.md }}
            />
          </>
        ) : null}

        {policies.length === 0 && form?.type !== 'policy' ? (
          <EmptyState
            title={t('insurance.empty.title')}
            description={t('insurance.empty.body')}
            icon={<Shield size={48} color={colors.primary} />}
            actionLabel={t('insurance.addPolicy')}
            onAction={() => setForm({ type: 'policy' })}
            style={{ flex: 0 }}
          />
        ) : null}

        {policies.map((p) => {
          const own = claims.filter((c) => c.policyId === p.id);
          return (
            <View key={p.id} style={{ marginBottom: spacing.md }}>
              <PolicyCard
                t={t}
                policy={p}
                claims={own}
                onAddClaim={() => setForm({ type: 'claim', policyId: p.id })}
                onCancel={() => cancelPolicy(p)}
                onDelete={() => confirmDeletePolicy(p)}
                onClaimStatus={changeClaimStatus}
                onShare={(c) => shareClaim(p, c)}
                onDeleteClaim={confirmDeleteClaim}
              />
              {form?.type === 'claim' && form.policyId === p.id ? (
                <ClaimForm
                  t={t}
                  policy={p}
                  onCancel={() => setForm(null)}
                  onSave={async (input) => {
                    const r = await ins.addClaim(input);
                    if (failed(r)) return writeError(r.reason);
                    setForm(null);
                    setFlash(t('insurance.claim.saved'));
                    return null;
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('insurance.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={ins.refresh} />}
        >
          {isOffline ? (
            <OfflineBanner
              message={t('insurance.offline.banner')}
              style={{ marginBottom: spacing.md }}
            />
          ) : null}
          <AlertCard
            variant="info"
            title={t('insurance.notice.title')}
            body={t('insurance.notice.body')}
            style={{ marginBottom: spacing.lg }}
          />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── policy + claim cards ────────────────────────────────────────────────────────────────── */
function PolicyCard({
  t,
  policy,
  claims,
  onAddClaim,
  onCancel,
  onDelete,
  onClaimStatus,
  onShare,
  onDeleteClaim,
}: {
  t: Translate;
  policy: InsurancePolicy;
  claims: InsuranceClaim[];
  onAddClaim: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onClaimStatus: (c: InsuranceClaim, status: ClaimStatus) => void;
  onShare: (c: InsuranceClaim) => void;
  onDeleteClaim: (c: InsuranceClaim) => void;
}) {
  const { spacing } = useTheme();
  const standing = policyStanding(policy);
  const overview = policyOverview(policy, claims);
  const standingLabel =
    standing.state === 'expiring_soon'
      ? t('insurance.standing.expiring_soon', { n: standing.daysLeft ?? 0 })
      : t(`insurance.standing.${standing.state}` as TranslationKey);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{policy.provider}</AppText>
          <AppText variant="body">{policy.cropOrAsset}</AppText>
        </View>
        <Badge label={standingLabel} variant={STANDING_BADGE[standing.state]} />
      </View>

      <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
        {policy.policyNumber ? (
          <AppText variant="small" tone="muted">
            {t('insurance.policy.number', { value: policy.policyNumber })}
          </AppText>
        ) : null}
        <AppText variant="small" tone="muted">
          {t('insurance.policy.period', { start: policy.startDate, end: policy.endDate })}
        </AppText>
        {policy.coverAmountTzs !== null ? (
          <AppText variant="small" tone="muted">
            {t('insurance.policy.cover', { amount: formatMoney(policy.coverAmountTzs) })}
          </AppText>
        ) : null}
        {policy.premiumTzs !== null ? (
          <AppText variant="small" tone="muted">
            {t('insurance.policy.premium', { amount: formatMoney(policy.premiumTzs) })}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {t('insurance.policy.selfReported')}
        </AppText>
      </View>

      <AppText variant="smallStrong" style={{ marginTop: spacing.md }}>
        {overview.totals.count === 0
          ? t('insurance.policy.noClaims')
          : t('insurance.policy.claimsSummary', {
              count: overview.totals.count,
              amount: formatMoney(overview.totals.totalEstimatedLossTzs),
            })}
      </AppText>
      {overview.exceedsCover ? (
        <AlertCard
          variant="warning"
          title={t('insurance.policy.exceedsCover')}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      {claims.length > 0 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <AppText variant="label" accessibilityRole="header">
            {t('insurance.claims.heading')}
          </AppText>
          {claims.map((c) => (
            <ClaimCard
              key={c.id}
              t={t}
              claim={c}
              onStatus={(s) => onClaimStatus(c, s)}
              onShare={() => onShare(c)}
              onDelete={() => onDeleteClaim(c)}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Button label={t('insurance.policy.addClaim')} onPress={onAddClaim} size="sm" />
        {policy.status !== 'cancelled' ? (
          <Button
            label={t('insurance.policy.cancel')}
            onPress={onCancel}
            variant="outline"
            size="sm"
          />
        ) : null}
        <Button
          label={t('insurance.policy.delete')}
          onPress={onDelete}
          variant="destructiveOutline"
          size="sm"
        />
      </View>
    </Card>
  );
}

function ClaimCard({
  t,
  claim,
  onStatus,
  onShare,
  onDelete,
}: {
  t: Translate;
  claim: InsuranceClaim;
  onStatus: (s: ClaimStatus) => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const { spacing } = useTheme();
  return (
    <Card variant="tinted" padding={12}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">
            {t(incidentKey(claim.incidentType))} · {claim.incidentDate}
          </AppText>
        </View>
        <Badge label={t(claimStatusKey(claim.status))} variant={CLAIM_BADGE[claim.status]} />
      </View>
      <AppText variant="body" style={{ marginTop: spacing.xs }}>
        {claim.description}
      </AppText>
      <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
        {claim.estimatedLossTzs !== null
          ? t('insurance.claim.estimated', { amount: formatMoney(claim.estimatedLossTzs) })
          : t('insurance.claim.noEstimate')}
      </AppText>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {claim.status === 'draft' ? (
          <>
            <Button
              label={t('insurance.claim.markSent')}
              onPress={() => onStatus('submitted_record')}
              size="sm"
              variant="secondary"
            />
            <AppText variant="caption" tone="muted">
              {t('insurance.claim.markSent.hint')}
            </AppText>
          </>
        ) : null}
        {claim.status === 'submitted_record' ? (
          <Button
            label={t('insurance.claim.markClosed')}
            onPress={() => onStatus('closed')}
            size="sm"
            variant="secondary"
          />
        ) : null}
        {claim.status !== 'draft' ? (
          <Button
            label={t('insurance.claim.reopen')}
            onPress={() => onStatus('draft')}
            size="sm"
            variant="ghost"
          />
        ) : null}
        <Button label={t('insurance.claim.share')} onPress={onShare} size="sm" variant="outline" />
        <Button
          label={t('insurance.claim.delete')}
          onPress={onDelete}
          size="sm"
          variant="destructiveOutline"
        />
      </View>
    </Card>
  );
}

/* ── forms ───────────────────────────────────────────────────────────────────────────────── */
const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '');

function PolicyForm({
  t,
  onSave,
  onCancel,
}: {
  t: Translate;
  onSave: (input: {
    provider: string;
    policyNumber: string;
    cropOrAsset: string;
    coverAmount: string;
    premium: string;
    startDate: string;
    endDate: string;
    notes: string;
  }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { spacing } = useTheme();
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [asset, setAsset] = useState('');
  const [cover, setCover] = useState('');
  const [premium, setPremium] = useState('');
  const [start, setStart] = useState(todayString());
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<PolicyErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const endBase = parseDay(start) !== null ? start : todayString();

  const submit = async () => {
    const input = {
      provider,
      policyNumber,
      cropOrAsset: asset,
      coverAmount: cover,
      premium,
      startDate: start,
      endDate: end,
      notes,
    };
    const e = validatePolicyInput(input);
    setErrors(e);
    if (hasErrors(e)) {
      setFailure(t('insurance.form.invalid'));
      return;
    }
    setBusy(true);
    setFailure(null);
    const msg = await onSave(input);
    setBusy(false);
    if (msg) setFailure(msg);
  };

  const endError = errors.endDate
    ? parseDay(end) === null
      ? t('insurance.form.dateInvalid')
      : t('insurance.form.endBeforeStart')
    : undefined;

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <AppText variant="h3" accessibilityRole="header">
        {t('insurance.form.policy.title')}
      </AppText>
      <TextField
        label={t('insurance.form.provider')}
        placeholder={t('insurance.form.provider.ph')}
        value={provider}
        onChangeText={setProvider}
        maxLength={120}
        error={errors.provider ? t('insurance.form.invalid') : undefined}
        wrapperStyle={{ marginTop: spacing.md }}
        testID="insurance-provider"
      />
      <TextField
        label={t('insurance.form.policyNumber')}
        value={policyNumber}
        onChangeText={setPolicyNumber}
        maxLength={60}
        autoCapitalize="characters"
        testID="insurance-policy-number"
      />
      <TextField
        label={t('insurance.form.asset')}
        placeholder={t('insurance.form.asset.ph')}
        value={asset}
        onChangeText={setAsset}
        maxLength={120}
        error={errors.cropOrAsset ? t('insurance.form.invalid') : undefined}
        testID="insurance-asset"
      />
      <TextField
        label={t('insurance.form.cover')}
        value={cover}
        onChangeText={(v) => setCover(digitsOnly(v))}
        keyboardType="number-pad"
        error={errors.coverAmount ? t('insurance.form.invalid') : undefined}
        testID="insurance-cover"
      />
      <TextField
        label={t('insurance.form.premium')}
        value={premium}
        onChangeText={(v) => setPremium(digitsOnly(v))}
        keyboardType="number-pad"
        error={errors.premium ? t('insurance.form.invalid') : undefined}
        testID="insurance-premium"
      />

      <TextField
        label={t('insurance.form.start')}
        hint={t('insurance.form.dateHint')}
        value={start}
        onChangeText={setStart}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={errors.startDate ? t('insurance.form.dateInvalid') : undefined}
        testID="insurance-start"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Chip label={t('insurance.form.today')} onPress={() => setStart(todayString())} />
      </View>

      <TextField
        label={t('insurance.form.end')}
        hint={t('insurance.form.dateHint')}
        value={end}
        onChangeText={setEnd}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={endError}
        testID="insurance-end"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Chip
          label={t('insurance.form.plus6')}
          onPress={() => setEnd(addMonths(endBase, 6) ?? '')}
        />
        <Chip
          label={t('insurance.form.plus12')}
          onPress={() => setEnd(addMonths(endBase, 12) ?? '')}
        />
      </View>

      <TextField
        label={t('insurance.form.notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={1000}
      />

      {failure ? (
        <AppText variant="small" tone="error" accessibilityLiveRegion="polite" style={{ marginBottom: spacing.sm }}>
          {failure}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button label={t('insurance.form.save')} onPress={submit} loading={busy} size="md" />
        <Button label={t('common.cancel')} onPress={onCancel} variant="ghost" size="md" disabled={busy} />
      </View>
    </Card>
  );
}

function ClaimForm({
  t,
  policy,
  onSave,
  onCancel,
}: {
  t: Translate;
  policy: InsurancePolicy;
  onSave: (input: {
    policyId: string;
    incidentDate: string;
    incidentType: IncidentType;
    description: string;
    estimatedLoss: string;
  }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { spacing } = useTheme();
  const [date, setDate] = useState(todayString());
  const [type, setType] = useState<IncidentType | ''>('');
  const [description, setDescription] = useState('');
  const [loss, setLoss] = useState('');
  const [errors, setErrors] = useState<ClaimErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validDate = parseDay(date) !== null;
  const outside = validDate && !incidentWithinPolicy(policy, date);

  const submit = async () => {
    const e = validateClaimInput({
      policyId: policy.id,
      incidentDate: date,
      incidentType: type,
      description,
      estimatedLoss: loss,
    });
    setErrors(e);
    if (hasErrors(e) || type === '') {
      setFailure(t('insurance.form.invalid'));
      return;
    }
    setBusy(true);
    setFailure(null);
    const msg = await onSave({
      policyId: policy.id,
      incidentDate: date,
      incidentType: type,
      description,
      estimatedLoss: loss,
    });
    setBusy(false);
    if (msg) setFailure(msg);
  };

  return (
    <Card variant="tinted" style={{ marginTop: spacing.sm }}>
      <AppText variant="h3" accessibilityRole="header">
        {t('insurance.claim.form.title')}
      </AppText>
      <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
        {t('insurance.claim.form.policy')}: {policy.provider} · {policy.cropOrAsset}
      </AppText>

      <TextField
        label={t('insurance.claim.form.date')}
        hint={t('insurance.form.dateHint')}
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={
          errors.incidentDate
            ? validDate
              ? t('insurance.claim.form.future')
              : t('insurance.form.dateInvalid')
            : undefined
        }
        wrapperStyle={{ marginTop: spacing.md }}
        testID="claim-date"
      />
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Chip label={t('insurance.form.today')} onPress={() => setDate(todayString())} />
      </View>
      {outside ? (
        <AlertCard
          variant="warning"
          title={t('insurance.claim.form.outsidePeriod')}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      <AppText variant="label" style={{ marginBottom: spacing.sm }}>
        {t('insurance.claim.form.type')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {INCIDENT_TYPES.map((it) => (
          <Chip key={it} label={t(incidentKey(it))} selected={type === it} onPress={() => setType(it)} />
        ))}
      </View>
      {errors.incidentType ? (
        <AppText variant="caption" tone="error" style={{ marginTop: spacing.xs }}>
          {t('insurance.form.invalid')}
        </AppText>
      ) : null}

      <TextField
        label={t('insurance.claim.form.description')}
        placeholder={t('insurance.claim.form.description.ph')}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
        error={errors.description ? t('insurance.form.invalid') : undefined}
        wrapperStyle={{ marginTop: spacing.lg }}
        testID="claim-description"
      />
      <TextField
        label={t('insurance.claim.form.loss')}
        value={loss}
        onChangeText={(v) => setLoss(digitsOnly(v))}
        keyboardType="number-pad"
        error={errors.estimatedLoss ? t('insurance.form.invalid') : undefined}
        testID="claim-loss"
      />

      <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>
        {t('insurance.notice.body')}
      </AppText>
      {failure ? (
        <AppText variant="small" tone="error" accessibilityLiveRegion="polite" style={{ marginBottom: spacing.sm }}>
          {failure}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button label={t('insurance.claim.form.save')} onPress={submit} loading={busy} size="md" />
        <Button label={t('common.cancel')} onPress={onCancel} variant="ghost" size="md" disabled={busy} />
      </View>
    </Card>
  );
}
