/**
 * Onboarding step bodies. Presentational only: state, validation, auth and persistence live in
 * app/onboarding.tsx. All copy and accessibility labels come from lib/i18n (EN/SW).
 */
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../constants/Theme';
import { CROPS, MAX_CROPS, REGIONS } from '../../constants/onboardingOptions';
import { CanonicalRole, ROLE_DESCRIPTIONS, allRoles, roleLabel } from '../../lib/access';
import { useT } from '../../lib/i18n';
import { useKilimoStore } from '../../store/useKilimoStore';
import { AppText, Button, Chip, ListGroup, ListRow, TextField } from '../ui';

const WELCOME_BG = require('../../assets/images/welcome_bg.png');

/* ── Welcome + language ─────────────────────────────────────────────────────────────────── */
export function WelcomeStep({ onStart }: { onStart: () => void }) {
  const { t, lang } = useT();
  const { spacing, colors } = useTheme();
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={WELCOME_BG} style={styles.flex} imageStyle={styles.bgImage}>
      <View style={styles.scrim}>
        <View
          style={[styles.langRow, { padding: spacing.lg, paddingTop: insets.top + spacing.sm }]}
        >
          <View
            style={styles.langPill}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onb.language')}
          >
            <Chip
              label="Kiswahili"
              selected={lang === 'sw'}
              onPress={() => setLanguage('sw')}
              accessibilityRole="radio"
              accessibilityState={{ selected: lang === 'sw' }}
            />
            <Chip
              label="English"
              selected={lang === 'en'}
              onPress={() => setLanguage('en')}
              accessibilityRole="radio"
              accessibilityState={{ selected: lang === 'en' }}
            />
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <View
          style={{
            padding: spacing.lg,
            paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md),
          }}
        >
          <AppText variant="display" style={styles.onImage} accessibilityRole="header">
            {t('onb.welcome.title')}
          </AppText>
          <AppText
            variant="bodyLg"
            style={[styles.onImage, { marginTop: spacing.md, opacity: 0.92 }]}
          >
            {t('onb.welcome.body')}
          </AppText>
          <Button
            label={t('onb.welcome.cta')}
            onPress={onStart}
            size="lg"
            fullWidth
            style={{ marginTop: spacing.xl, backgroundColor: colors.primary }}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

/* ── Registration (phone or email) ──────────────────────────────────────────────────────── */
export interface RegisterStepProps {
  method: 'phone' | 'email';
  setMethod: (m: 'phone' | 'email') => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  consentError: boolean;
  onOpenLegal: () => void;
}

export function RegisterStep(p: RegisterStepProps) {
  const { t } = useT();
  const { colors, spacing } = useTheme();

  return (
    <View>
      {p.method === 'phone' ? (
        <TextField
          label={t('onb.register.phone.label')}
          hint={t('onb.register.phone.hint')}
          value={p.phone}
          onChangeText={p.setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          accessibilityLabel={t('onb.register.phone.a11y')}
          size="lg"
          placeholder="+255 7…"
        />
      ) : (
        <TextField
          label={t('onb.register.email.label')}
          value={p.email}
          onChangeText={p.setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel={t('onb.register.email.a11y')}
          size="lg"
        />
      )}

      <Button
        label={p.method === 'phone' ? t('onb.register.useEmail') : t('onb.register.usePhone')}
        variant="link"
        onPress={() => p.setMethod(p.method === 'phone' ? 'email' : 'phone')}
        style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
      />

      <Pressable
        onPress={() => p.setConsent(!p.consent)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: p.consent }}
        accessibilityLabel={t('onb.register.consent')}
        style={[styles.consent, { marginTop: spacing.lg }]}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: p.consentError ? colors.error : colors.primary,
              backgroundColor: p.consent ? colors.primary : 'transparent',
            },
          ]}
        >
          {p.consent && <Check size={14} color="#fff" />}
        </View>
        <AppText variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
          {t('onb.register.consent')}
        </AppText>
      </Pressable>
      <Button
        label={t('onb.register.legalLink')}
        variant="link"
        size="sm"
        onPress={p.onOpenLegal}
        style={{ alignSelf: 'flex-start' }}
      />
      {p.consentError && (
        <AppText variant="caption" tone="error" accessibilityLiveRegion="polite">
          {t('onb.register.consent.required')}
        </AppText>
      )}
    </View>
  );
}

/* ── OTP ────────────────────────────────────────────────────────────────────────────────── */
export interface OtpStepProps {
  otp: string;
  setOtp: (v: string) => void;
  secondsLeft: number;
  onResend: () => void;
}

export function OtpStep({ otp, setOtp, secondsLeft, onResend }: OtpStepProps) {
  const { t } = useT();
  const { spacing } = useTheme();
  return (
    <View>
      <TextField
        label={t('onb.otp.label')}
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        accessibilityLabel={t('onb.otp.a11y')}
        size="lg"
        placeholder="123456"
      />
      <View style={{ marginTop: spacing.md }}>
        {secondsLeft > 0 ? (
          <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {t('onb.otp.resendIn', { seconds: secondsLeft })}
          </AppText>
        ) : (
          <Button
            label={t('onb.otp.resend')}
            variant="link"
            onPress={onResend}
            style={{ alignSelf: 'flex-start' }}
          />
        )}
      </View>
    </View>
  );
}

/* ── Role ───────────────────────────────────────────────────────────────────────────────── */
export function RoleStep({
  role,
  setRole,
}: {
  role: CanonicalRole;
  setRole: (r: CanonicalRole) => void;
}) {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <ListGroup>
      {allRoles().map((r, i, arr) => (
        <ListRow
          key={r}
          title={roleLabel(r)}
          subtitle={ROLE_DESCRIPTIONS[r]}
          selected={role === r}
          divider={i < arr.length - 1}
          onPress={() => setRole(r)}
          accessibilityLabel={t('onb.role.a11y', { role: roleLabel(r) })}
          trailing={role === r ? <Check size={20} color={colors.primary} /> : undefined}
        />
      ))}
    </ListGroup>
  );
}

/* ── Farm profile ───────────────────────────────────────────────────────────────────────── */
export interface FarmStepProps {
  name: string;
  setName: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  crops: string[];
  toggleCrop: (c: string) => void;
  acres: string;
  setAcres: (v: string) => void;
  activity: 'mazao' | 'mifugo' | 'mchanganyiko';
  setActivity: (v: 'mazao' | 'mifugo' | 'mchanganyiko') => void;
  hasLivestock: boolean;
  setHasLivestock: (v: boolean) => void;
  hasIrrigation: boolean;
  setHasIrrigation: (v: boolean) => void;
}

export function FarmStep(p: FarmStepProps) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const label = (k: Parameters<typeof t>[0]) => (
    <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {t(k)}
    </AppText>
  );

  return (
    <View>
      <TextField
        label={t('onb.farm.name')}
        hint={t('onb.farm.name.hint')}
        value={p.name}
        onChangeText={p.setName}
        autoCapitalize="words"
        textContentType="name"
        accessibilityLabel={t('onb.farm.name')}
        size="lg"
      />

      {label('onb.farm.region')}
      <View style={styles.chips}>
        {REGIONS.map((r) => (
          <Chip
            key={r}
            label={r}
            selected={p.region === r}
            onPress={() => p.setRegion(r)}
            accessibilityLabel={t('onb.farm.region.a11y', { region: r })}
          />
        ))}
      </View>

      {label('onb.farm.crops')}
      <View style={styles.chips}>
        {CROPS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={p.crops.includes(c)}
            onPress={() => p.toggleCrop(c)}
            accessibilityLabel={t('onb.farm.crop.a11y', { crop: c })}
            disabled={!p.crops.includes(c) && p.crops.length >= MAX_CROPS}
          />
        ))}
      </View>

      <TextField
        label={t('onb.farm.size')}
        hint={t('onb.farm.size.hint')}
        value={p.acres}
        onChangeText={(v) => p.setAcres(v.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        accessibilityLabel={t('onb.farm.size')}
        size="lg"
        wrapperStyle={{ marginTop: spacing.lg }}
      />

      {label('onb.farm.activity')}
      <View style={styles.chips}>
        {(['mazao', 'mifugo', 'mchanganyiko'] as const).map((a) => (
          <Chip
            key={a}
            label={t(`onb.farm.activity.${a}` as const)}
            selected={p.activity === a}
            onPress={() => p.setActivity(a)}
          />
        ))}
      </View>

      <View style={[styles.switchRow, { marginTop: spacing.lg, borderColor: colors.border }]}>
        <AppText variant="body" style={{ flex: 1 }}>
          {t('onb.farm.livestock')}
        </AppText>
        <Switch
          value={p.hasLivestock}
          onValueChange={p.setHasLivestock}
          accessibilityLabel={t('onb.farm.livestock')}
          trackColor={{ true: colors.primary }}
        />
      </View>
      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <AppText variant="body" style={{ flex: 1 }}>
          {t('onb.farm.irrigation')}
        </AppText>
        <Switch
          value={p.hasIrrigation}
          onValueChange={p.setHasIrrigation}
          accessibilityLabel={t('onb.farm.irrigation')}
          trackColor={{ true: colors.primary }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bgImage: { resizeMode: 'cover' },
  scrim: { flex: 1, backgroundColor: 'rgba(12,18,8,0.48)' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  langPill: { flexDirection: 'row', gap: 8 },
  onImage: { color: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  consent: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
});
