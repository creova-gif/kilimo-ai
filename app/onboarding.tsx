/**
 * Onboarding — Figma "Onboarding v2" (Welcome 106:1004 → Sign Up 106:1045 → OTP 106:2059 →
 * Role 108:1002 → Farm Setup 14:4109), following the reconciled journey in
 * docs/kilimo-v2/04_RECONCILIATION/auth_onboarding_profile_settings.md.
 *
 *   welcome/language → register (phone|email + consent) → OTP → role → farm → dashboard
 *
 * Decisions vs the legacy 2,100-line wizard:
 *  - the mandatory 20-digit NIDA gate is gone (not every smallholder has one); identity
 *    verification is offered later from the dashboard / Profile;
 *  - a returning user (server already has their Agro-ID) skips role + farm and is restored from
 *    the backend, instead of re-onboarding;
 *  - nothing is pre-filled with invented values (no default region, crops or "2 acres");
 *  - the primary button is above the keyboard; auth errors are localized, never raw.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { OnboardingScaffold } from '../components/onboarding/OnboardingScaffold';
import {
  FarmStep,
  OtpStep,
  RegisterStep,
  RoleStep,
  WelcomeStep,
} from '../components/onboarding/steps';
import { MAX_CROPS } from '../constants/onboardingOptions';
import { useAgroAuth } from '../hooks/useAgroAuth';
import { CanonicalRole } from '../lib/access';
import { mintAgroId } from '../lib/agro/mintId';
import { authErrorKey } from '../lib/authErrors';
import { saveFarmerProfile } from '../lib/farmerProfile';
import { agroFromProfile, fetchMyProfile } from '../lib/hydrateProfile';
import { useT } from '../lib/i18n';
import { normalizePhone } from '../lib/phone';
import { getSupabase } from '../lib/supabase';
import { AgroID, useKilimoStore } from '../store/useKilimoStore';

type Step = 'welcome' | 'register' | 'otp' | 'role' | 'farm';
const ORDER: Step[] = ['register', 'otp', 'role', 'farm'];
const RESEND_SECONDS = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HERO = {
  auth: require('../assets/images/onboarding_auth.png'),
  roles: require('../assets/images/onboarding_roles.png'),
  profile: require('../assets/images/onboarding_profile.png'),
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, lang } = useT();
  const auth = useAgroAuth();

  const setAgroId = useKilimoStore((s) => s.setAgroId);
  const setFarmProfile = useKilimoStore((s) => s.setFarmProfile);
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const addNotification = useKilimoStore((s) => s.addNotification);

  const [step, setStep] = useState<Step>('welcome');
  const [busy, setBusy] = useState(false);

  // register
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  // otp
  const [otp, setOtp] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  // role + farm — deliberately empty: nothing invented for the farmer
  const [role, setRole] = useState<CanonicalRole>('farmer');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [crops, setCrops] = useState<string[]>([]);
  const [acres, setAcres] = useState('');
  const [activity, setActivity] = useState<'mazao' | 'mifugo' | 'mchanganyiko'>('mazao');
  const [hasLivestock, setHasLivestock] = useState(false);
  const [hasIrrigation, setHasIrrigation] = useState(false);

  const e164 = useMemo(() => normalizePhone(phone), [phone]);
  const contact = method === 'phone' ? (e164 ?? phone) : email.trim();
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  // Tick once a second only while the OTP step is showing a countdown.
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  const fail = useCallback(
    (err: unknown) => Alert.alert(t('state.error.title'), t(authErrorKey(err))),
    [t]
  );

  const back = useCallback(() => {
    const i = ORDER.indexOf(step);
    setStep(i <= 0 ? 'welcome' : ORDER[i - 1]);
  }, [step]);

  /* ── register → send code ─────────────────────────────────────────────────────────────── */
  const sendCode = useCallback(async () => {
    if (method === 'phone' && !e164) {
      Alert.alert(t('onb.register.invalidNumber.title'), t('onb.register.invalidNumber.body'));
      return;
    }
    if (method === 'email' && !EMAIL_RE.test(email.trim())) {
      Alert.alert(t('onb.register.invalidNumber.title'), t('onb.register.invalidEmail.body'));
      return;
    }
    if (!consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setBusy(true);
    try {
      if (method === 'phone') await auth.signInWithPhone(e164 as string);
      else await auth.signInWithEmail(email.trim());
      setOtp('');
      setNow(Date.now());
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      setStep('otp');
    } catch (err) {
      fail(err);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [method, e164, email, consent, auth, fail, t]);

  const resend = useCallback(async () => {
    try {
      if (method === 'phone') await auth.signInWithPhone(e164 as string);
      else await auth.signInWithEmail(email.trim());
      setNow(Date.now());
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
    } catch (err) {
      fail(err);
    }
  }, [method, e164, email, auth, fail]);

  /* ── otp → verify → (restore returning user | continue) ───────────────────────────────── */
  const verify = useCallback(async () => {
    setBusy(true);
    try {
      await auth.verifyOtp(contact, otp);
      // The server decides whether this person has already onboarded.
      const mine = await fetchMyProfile(getSupabase());
      const restored = agroFromProfile(mine);
      if (restored) {
        if (mine.farm) setFarmProfile(mine.farm);
        if (mine.farm?.language === 'sw' || mine.farm?.language === 'en')
          setLanguage(mine.farm.language);
        setAgroId(restored as AgroID); // marks authenticated + onboarding complete
        router.replace('/(tabs)' as any);
        return;
      }
      if (!mine.ok && mine.message && mine.message !== 'not_configured')
        throw new Error(mine.message);
      setStep('role');
    } catch (err) {
      fail(err);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [auth, contact, otp, fail, router, setAgroId, setFarmProfile, setLanguage]);

  /* ── farm → finish ────────────────────────────────────────────────────────────────────── */
  const toggleCrop = useCallback((c: string) => {
    Haptics.selectionAsync();
    setCrops((p) =>
      p.includes(c) ? p.filter((x) => x !== c) : p.length < MAX_CROPS ? [...p, c] : p
    );
  }, []);

  const farmValid =
    name.trim().length >= 2 && !!region && crops.length > 0 && parseFloat(acres) > 0;

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const farm = {
        primaryCrops: crops,
        region,
        farmSizeAcres: parseFloat(acres) || 0,
        mainActivity: activity,
        hasLivestock,
        hasIrrigation,
      };
      // Server-minted Agro-ID; falls back to a provisional local id if offline (and we say so).
      const minted = await mintAgroId('REG');
      const profile: AgroID = {
        id: minted.id,
        name: name.trim(),
        role,
        location: region,
        tier: 'Free',
        joinDate: String(new Date().getFullYear()),
        mpesaLinked: false,
        phoneNumber: method === 'phone' ? (e164 ?? undefined) : undefined,
        biometricEnabled: false,
        // Only a reviewer on the server can mark this verified.
        verificationStatus: 'unverified',
      };
      setFarmProfile(farm);
      setAgroId(profile);

      const saved = await saveFarmerProfile(getSupabase(), {
        name: name.trim(),
        role,
        region,
        primaryCrops: crops,
        farmSizeAcres: farm.farmSizeAcres,
        mainActivity: activity,
        hasLivestock,
        hasIrrigation,
        language: lang,
      });
      if (!saved.ok && saved.reason !== 'not_configured') {
        addNotification({
          title: lang === 'sw' ? 'Wasifu haujasawazishwa' : 'Profile not synced',
          body:
            lang === 'sw'
              ? 'Wasifu wa shamba umehifadhiwa kwenye kifaa chako lakini haujasawazishwa mtandaoni.'
              : 'Your farm profile is saved on this device but could not sync online yet.',
          type: 'warning',
        });
      }
      if (!minted.serverMinted) {
        addNotification({
          title: lang === 'sw' ? 'Agro ID ya muda' : 'Provisional Agro ID',
          body:
            lang === 'sw'
              ? 'Agro ID yako ni ya muda hadi itakapothibitishwa mtandaoni.'
              : 'Your Agro ID is provisional until it is confirmed online.',
          type: 'warning',
        });
      }
      router.replace('/(tabs)' as any);
    } catch (err) {
      fail(err);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [
    crops,
    region,
    acres,
    activity,
    hasLivestock,
    hasIrrigation,
    name,
    role,
    method,
    e164,
    lang,
    router,
    setAgroId,
    setFarmProfile,
    addNotification,
    fail,
  ]);

  /* ── render ───────────────────────────────────────────────────────────────────────────── */
  if (step === 'welcome') return <WelcomeStep onStart={() => setStep('register')} />;

  const idx = ORDER.indexOf(step) + 1;
  const total = ORDER.length;
  const common = { step: idx, total, onBack: back } as const;

  switch (step) {
    case 'register':
      return (
        <OnboardingScaffold
          {...common}
          title={t('onb.register.title')}
          subtitle={t('onb.register.subtitle')}
          image={HERO.auth}
          cta={{
            label: t('onb.register.cta'),
            onPress: sendCode,
            loading: busy,
            disabled: method === 'phone' ? !e164 : !EMAIL_RE.test(email.trim()),
          }}
        >
          <RegisterStep
            method={method}
            setMethod={setMethod}
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            consent={consent}
            setConsent={(v) => {
              setConsent(v);
              if (v) setConsentError(false);
            }}
            consentError={consentError}
            onOpenLegal={() => router.push('/legal/terms' as any)}
          />
        </OnboardingScaffold>
      );
    case 'otp':
      return (
        <OnboardingScaffold
          {...common}
          title={t('onb.otp.title')}
          subtitle={t('onb.otp.subtitle', { contact })}
          image={HERO.auth}
          cta={{
            label: t('onb.otp.cta'),
            onPress: verify,
            loading: busy,
            disabled: otp.length !== 6,
          }}
        >
          <OtpStep otp={otp} setOtp={setOtp} secondsLeft={secondsLeft} onResend={resend} />
        </OnboardingScaffold>
      );
    case 'role':
      return (
        <OnboardingScaffold
          {...common}
          title={t('onb.role.title')}
          subtitle={t('onb.role.subtitle')}
          image={HERO.roles}
          cta={{ label: t('common.continue'), onPress: () => setStep('farm') }}
        >
          <RoleStep role={role} setRole={setRole} />
        </OnboardingScaffold>
      );
    case 'farm':
      return (
        <OnboardingScaffold
          {...common}
          title={t('onb.farm.title')}
          subtitle={t('onb.farm.subtitle')}
          image={HERO.profile}
          cta={{ label: t('onb.farm.cta'), onPress: finish, loading: busy, disabled: !farmValid }}
        >
          <FarmStep
            name={name}
            setName={setName}
            region={region}
            setRegion={setRegion}
            crops={crops}
            toggleCrop={toggleCrop}
            acres={acres}
            setAcres={setAcres}
            activity={activity}
            setActivity={setActivity}
            hasLivestock={hasLivestock}
            setHasLivestock={setHasLivestock}
            hasIrrigation={hasIrrigation}
            setHasIrrigation={setHasIrrigation}
          />
        </OnboardingScaffold>
      );
  }
  return <View />;
}
