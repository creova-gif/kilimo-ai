/**
 * Onboarding Wizard — Creative redesign
 * Steps: Language → Welcome → Role → Farm Profile → Done
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Globe,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Leaf,
  Tractor,
  Building2,
  ShoppingBag,
  GraduationCap,
  UserCog,
  Users,
  MapPin,
  Zap,
  TrendingUp,
  ShieldCheck,
  Sprout,
  User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useKilimoStore, FarmProfile, AppLanguage } from '../store/useKilimoStore';
import { CanonicalRole, allRoles, roleLabel, ROLE_DESCRIPTIONS } from '../lib/access';
import { useAgroAuth } from '../hooks/useAgroAuth';
import { mintAgroId, DocTag } from '../lib/agro/mintId';
import { getSupabase } from '../lib/supabase';
import { useTheme } from '../constants/Theme';

const { width: SW } = Dimensions.get('window');

const LOGO = require('../assets/icon.png');
const AUTH_ILLUSTRATION = require('../assets/images/onboarding_auth.png');
const ROLES_ILLUSTRATION = require('../assets/images/onboarding_roles.png');
const PROFILE_ILLUSTRATION = require('../assets/images/onboarding_profile.png');
const DONE_ILLUSTRATION = require('../assets/images/onboarding_done.png');
const WELCOME_BG = require('../assets/images/welcome_bg.png');

const REGIONS = [
  'Arusha',
  'Dar es Salaam',
  'Dodoma',
  'Geita',
  'Iringa',
  'Kagera',
  'Katavi',
  'Kigoma',
  'Kilimanjaro',
  'Lindi',
  'Manyara',
  'Mara',
  'Mbeya',
  'Morogoro',
  'Mtwara',
  'Mwanza',
  'Njombe',
  'Pwani',
  'Rukwa',
  'Ruvuma',
  'Shinyanga',
  'Simiyu',
  'Singida',
  'Songwe',
  'Tabora',
  'Tanga',
  'Zanzibar',
];

const CROPS = [
  'Mahindi (Maize)',
  'Mpunga (Rice)',
  'Maharage (Beans)',
  'Kahawa (Coffee)',
  'Pamba (Cotton)',
  'Alizeti (Sunflower)',
  'Mihogo (Cassava)',
  'Viazi (Potatoes)',
  'Nyanya (Tomatoes)',
  'Vitunguu (Onions)',
  'Karanga (Groundnuts)',
  'Ndizi (Bananas)',
  'Korosho (Cashews)',
  'Mbaazi (Peas)',
  'Mtama (Sorghum)',
  'Ngano (Wheat)',
  'Chai (Tea)',
  'Mboga (Vegetables)',
];

const ROLE_META: Record<CanonicalRole, { icon: React.ReactNode; color: string }> = {
  smallholder: { icon: <Leaf size={22} color="#2E6F40" />, color: '#2E6F40' },
  farmer: { icon: <Sprout size={22} color="#2E6F40" />, color: '#2E6F40' },
  commercial_farmer: { icon: <Tractor size={22} color="#3b82f6" />, color: '#3b82f6' },
  farm_manager: { icon: <UserCog size={22} color="#8b5cf6" />, color: '#8b5cf6' },
  commercial_admin: { icon: <Building2 size={22} color="#f59e0b" />, color: '#f59e0b' },
  agribusiness: { icon: <ShoppingBag size={22} color="#ec4899" />, color: '#ec4899' },
  coop_leader: { icon: <Users size={22} color="#06b6d4" />, color: '#06b6d4' },
  extension_officer: { icon: <GraduationCap size={22} color="#a78bfa" />, color: '#a78bfa' },
};

const FEATURES = [
  {
    icon: <Sparkles size={20} color="#2E6F40" />,
    bg: 'rgba(46, 111, 64, 0.12)',
    label: 'Sankofa AI',
    sub: 'Ushauri wa AI',
  },
  {
    icon: <Leaf size={20} color="#2E6F40" />,
    bg: 'rgba(46, 111, 64, 0.12)',
    label: 'Crop Scan',
    sub: 'Tambua magonjwa',
  },
  {
    icon: <TrendingUp size={20} color="#3b82f6" />,
    bg: 'rgba(59,130,246,0.12)',
    label: 'Soko',
    sub: 'Bei za sasa',
  },
  {
    icon: <ShieldCheck size={20} color="#f59e0b" />,
    bg: 'rgba(245,158,11,0.12)',
    label: 'Bima',
    sub: 'Ulinzi wa mazao',
  },
];

const COPY = {
  sw: {
    lang: {
      headline: 'KILIMO AI',
      tagline: 'Kilimo bora · Maisha bora',
      pick: 'Chagua lugha yako',
      sw: 'Kiswahili',
      en: 'English',
    },
    welcome: {
      title: 'Mwenzako wa Kidijiti',
      subtitle:
        'Ushauri wa AI kwa lugha yako, utambuzi wa magonjwa, na bei za soko — zote mahali pamoja.',
    },
    role: { title: 'Wewe ni nani?', subtitle: 'Tutaonyesha vipengele vinavyokufaa zaidi.' },
    profile: {
      title: 'Shamba lako',
      subtitle: 'Hii inaboresha mapendekezo ya AI.',
      name: 'Jina lako kamili',
      namePh: 'k.m. Justin Mafie',
      region: 'Mkoa',
      crops: 'Mazao makuu (1–4)',
      size: 'Ukubwa wa shamba (ekari)',
      activity: 'Shughuli kuu',
      mazao: 'Mazao',
      mifugo: 'Mifugo',
      mchanganyiko: 'Mchanganyiko',
      livestock: 'Una mifugo?',
      irrigation: 'Una umwagiliaji?',
    },
    done: {
      title: 'Karibu! 🌿',
      subtitle: 'Agro ID yako imeundwa. Uko tayari kuanza safari ya kilimo bora.',
      cta: 'Ingia kwenye Dashibodi',
    },
    back: 'Rudi',
    next: 'Endelea',
  },
  en: {
    lang: {
      headline: 'KILIMO AI',
      tagline: 'Better farming · Better life',
      pick: 'Choose your language',
      sw: 'Kiswahili',
      en: 'English',
    },
    welcome: {
      title: 'Your Digital Farming Partner',
      subtitle:
        'AI advice in your language, disease diagnosis, and live market prices — all in one place.',
    },
    role: {
      title: 'Who are you?',
      subtitle: "We'll show you the features that matter most to you.",
    },
    profile: {
      title: 'Your Farm',
      subtitle: 'This sharpens your AI recommendations.',
      name: 'Full name',
      namePh: 'e.g. Justin Mafie',
      region: 'Region',
      crops: 'Primary crops (1–4)',
      size: 'Farm size (acres)',
      activity: 'Main activity',
      mazao: 'Crops',
      mifugo: 'Livestock',
      mchanganyiko: 'Mixed',
      livestock: 'Raise livestock?',
      irrigation: 'Have irrigation?',
    },
    done: {
      title: 'All set! 🌿',
      subtitle: 'Your Agro ID is ready. Welcome to better farming.',
      cta: 'Enter Dashboard',
    },
    back: 'Back',
    next: 'Continue',
  },
};

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function OnboardingWizard() {
  const router = useRouter();
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const setAgroId = useKilimoStore((s) => s.setAgroId);
  const setFarmProfile = useKilimoStore((s) => s.setFarmProfile);
  const setOnboardingComplete = useKilimoStore((s) => s.setOnboardingComplete);
  const registeredIds = useKilimoStore((s) => s.registeredIds);
  const addRegisteredId = useKilimoStore((s) => s.addRegisteredId);
  const { signInWithPhone, signInWithEmail, verifyOtp, loading } = useAgroAuth();
  const { colors, isDark } = useTheme();

  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState<Step>(0);
  const [lang, setLang] = useState<AppLanguage>('sw');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<CanonicalRole>('farmer');
  const [name, setName] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [crops, setCrops] = useState<string[]>([]);
  const [acres, setAcres] = useState('2');
  const [activity, setActivity] = useState<FarmProfile['mainActivity']>('mazao');
  const [hasLivestock, setHasLivestock] = useState(false);
  const [hasIrrigation, setHasIrrigation] = useState(false);

  // ID Verification state
  const [idType, setIdType] = useState<'nida' | 'tin' | 'license'>('nida');
  const [nida, setNida] = useState('');
  const [tin, setTin] = useState('');
  const [license, setLicense] = useState('');

  const t = COPY[lang];

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) {
      if (authMethod === 'email') return email.includes('@') && email.trim().length > 4;
      return phone.length >= 9;
    }
    if (step === 2) return otp.length === 6; // OTP Step
    if (step === 3) return !!role; // Role Step
    if (step === 4) return name.trim().length >= 2 && crops.length > 0 && parseFloat(acres) > 0; // Profile Step
    if (step === 5) {
      // ID Verification Step
      if (idType === 'nida') return /^\d{20}$/.test(nida.trim());
      if (idType === 'tin') return /^\d{9}$/.test(tin.trim());
      if (idType === 'license') return /^[a-zA-Z0-9-]{6,12}$/.test(license.trim());
      return false;
    }
    return true; // Done Step
  }, [
    step,
    lang,
    phone,
    otp,
    role,
    name,
    crops,
    acres,
    authMethod,
    email,
    idType,
    nida,
    tin,
    license,
  ]);

  async function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) {
      setLanguage(lang);
      setStep(1);
      return;
    }
    if (step === 1) {
      if (authMethod === 'email') {
        try {
          await signInWithEmail(email);
          setStep(2);
        } catch (err: any) {
          Alert.alert(
            lang === 'sw' ? 'Hitilafu' : 'Error',
            err.message ||
              (lang === 'sw'
                ? 'Imeshindwa kutuma OTP kwa barua pepe'
                : 'Failed to send OTP to email')
          );
        }
        return;
      } else {
        try {
          await signInWithPhone(phone);
          setStep(2);
        } catch (err: any) {
          Alert.alert(
            lang === 'sw' ? 'Hitilafu' : 'Error',
            err.message || (lang === 'sw' ? 'Imeshindwa kutuma OTP' : 'Failed to send OTP')
          );
        }
        return;
      }
    }
    if (step === 2) {
      try {
        const contact = authMethod === 'email' ? email : phone;
        const result = await verifyOtp(contact, otp);
        if (result.existingUser) {
          setOnboardingComplete(true);
          router.replace('/(tabs)');
          return;
        }
        setUserId(result.user.id);
        setStep(3); // Role selection
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Invalid OTP');
      }
      return;
    }
    if (step === 5) {
      // Perform ID uniqueness check
      const enteredId =
        idType === 'nida' ? nida.trim() : idType === 'tin' ? tin.trim() : license.trim();
      if (registeredIds.includes(enteredId)) {
        Alert.alert(
          lang === 'sw' ? 'Hitilafu ya Uhakiki' : 'Verification Error',
          lang === 'sw'
            ? 'Namba hii ya kitambulisho tayari imesajiliwa na akaunti nyingine!'
            : 'This identification number is already registered to another account!'
        );
        return;
      }
      addRegisteredId(enteredId);
      setStep(6); // Done screen
      return;
    }
    if (step < 6) setStep((s) => Math.min(6, s + 1) as Step);
  }
  function back() {
    Haptics.selectionAsync();
    if (step > 0) {
      setStep((s) => Math.max(0, s - 1) as Step);
    }
  }
  const [finishing, setFinishing] = useState(false);
  async function finish() {
    if (finishing) return;
    setFinishing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFarmProfile({
      primaryCrops: crops,
      region,
      farmSizeAcres: parseFloat(acres) || 0,
      mainActivity: activity,
      hasLivestock,
      hasIrrigation,
    });
    const enteredId =
      idType === 'nida' ? nida.trim() : idType === 'tin' ? tin.trim() : license.trim();
    const docTag: DocTag =
      idType === 'nida' ? 'NIDA' : idType === 'tin' ? 'TIN' : idType === 'license' ? 'LIC' : 'REG';

    // Mint the authoritative, server-side Agro-ID so the public QR is verifiable
    // immediately after onboarding. Idempotent; falls back to a local CSPRNG id
    // (serverMinted:false → provisional/pending) when offline.
    let newId = userId || 'mock-user-id';
    let serverMinted = false;
    try {
      const minted = await mintAgroId(docTag);
      newId = minted.id;
      serverMinted = minted.serverMinted;
    } catch {
      /* keep local fallback id */
    }

    const newProfile = {
      id: newId,
      name,
      role,
      location: region,
      tier: 'Free',
      joinDate: new Date().getFullYear().toString(),
      mpesaLinked: false,
      biometricEnabled: false,
      // Only a server-minted id is authoritative; a provisional/offline id stays
      // 'pending'. If KYC docs were supplied, review is pending regardless.
      verificationStatus: serverMinted && !enteredId ? 'verified' : 'pending',
      nationalId: idType === 'nida' ? enteredId : undefined,
      tinNumber: idType === 'tin' ? enteredId : undefined,
      businessLicense: idType === 'license' ? enteredId : undefined,
    } as any;
    setAgroId(newProfile);

    // File the KYC verification with the backend (best-effort, offline-safe).
    if (enteredId) {
      const businessRoles = ['commercial_farmer', 'agribusiness', 'commercial_admin'];
      const verificationType = businessRoles.includes(role) ? 'business' : 'personal';
      const idField = idType === 'nida' ? 'nationalId' : idType === 'tin' ? 'tin' : 'regNumber';
      try {
        const supabase = getSupabase();
        await supabase?.functions.invoke('submit-verification', {
          body: { verificationType, [idField]: enteredId },
        });
      } catch {
        /* verification will be re-submittable from Profile; don't block onboarding */
      }
    }

    setFinishing(false);
    setOnboardingComplete(true);
  }
  function toggleCrop(c: string) {
    Haptics.selectionAsync();
    setCrops((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length < 4 ? [...p, c] : p));
  }
  const isWelcomeStep = step === 0;

  // Determine full-screen background image for current step
  const stepBgImage = useMemo(() => {
    switch (step) {
      case 1:
      case 2:
        return AUTH_ILLUSTRATION;
      case 3:
        return ROLES_ILLUSTRATION;
      case 4:
      case 5:
        return PROFILE_ILLUSTRATION;
      case 6:
        return DONE_ILLUSTRATION;
      default:
        return WELCOME_BG;
    }
  }, [step]);

  if (isWelcomeStep) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <WelcomeStep lang={lang} setLang={setLang} onNext={next} />
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Dynamic Background Image */}
      <Image source={stepBgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {/* Dark/Light overlay gradient for text and input readability */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']
            : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.85)']
        }
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Progress + nav bar ───────── */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={back}
            style={s.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={18} color={colors.textMute} />
            <Text style={[s.backText, { color: colors.textMute }]}>{t.back}</Text>
          </TouchableOpacity>
          <View style={s.progressPills}>
            {([1, 2, 3, 4, 5, 6] as Step[]).map((i) => (
              <View
                key={i}
                style={[
                  s.progressPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' },
                  i === step && [s.progressActive, { backgroundColor: colors.primary }],
                  i < step && [s.progressDone, { backgroundColor: colors.primary + '80' }],
                ]}
              />
            ))}
          </View>
          <Text style={s.stepNum}>{step}/6</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={`step-${step}`}
              entering={FadeInUp.springify().damping(24).stiffness(200)}
              exiting={FadeOutUp}
              style={{ flex: 1 }}
            >
              {step === 1 && (
                <AuthStep
                  authMethod={authMethod}
                  setAuthMethod={setAuthMethod}
                  phone={phone}
                  setPhone={setPhone}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  lang={lang}
                  setUserId={setUserId}
                  setStep={setStep}
                  setName={setName}
                />
              )}
              {step === 2 && (
                <OtpStep
                  otp={otp}
                  setOtp={setOtp}
                  lang={lang}
                  contact={authMethod === 'email' ? email : phone}
                  onResend={() => {
                    if (authMethod === 'email') {
                      signInWithEmail(email);
                    } else {
                      signInWithPhone(phone);
                    }
                  }}
                />
              )}
              {step === 3 && <RoleStep t={t.role} role={role} setRole={setRole} />}
              {step === 4 && (
                <ProfileStep
                  t={t.profile}
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
              )}
              {step === 5 && (
                <VerificationStep
                  lang={lang}
                  idType={idType}
                  setIdType={setIdType}
                  nida={nida}
                  setNida={setNida}
                  license={license}
                  setLicense={setLicense}
                  tin={tin}
                  setTin={setTin}
                />
              )}
              {step === 6 && (
                <DoneStep t={t.done} name={name || 'Mkulima'} role={role} lang={lang} />
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Footer CTA ── */}
        <View style={s.footer}>
          <TouchableOpacity
            onPress={step === 6 ? finish : next}
            disabled={!canContinue || loading || finishing}
            activeOpacity={0.88}
            style={[s.ctaWrap, (!canContinue || loading || finishing) && { opacity: 0.38 }]}
            accessibilityRole="button"
            accessibilityLabel={loading || finishing ? 'Loading' : step === 6 ? t.done.cta : t.next}
            accessibilityState={{ disabled: !canContinue || loading || finishing }}
          >
            <LinearGradient
              colors={['#0a3d18', '#163f20']}
              style={s.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.ctaText}>
                {loading ? 'Subiri...' : step === 6 ? t.done.cta : t.next}
              </Text>
              <View style={s.ctaArrow}>
                <ChevronRight size={18} color="#0a3d18" strokeWidth={2.5} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 0 — Welcome
// ─────────────────────────────────────────────────────────────
// Step 0 — Welcome Redesigned
// ─────────────────────────────────────────────────────────────
function WelcomeStep({ lang, setLang, onNext }: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Localized strings
  const titleLine1 = lang === 'sw' ? 'KILIMO CHAKO,' : 'YOUR FARM,';
  const titleLine2 = lang === 'sw' ? 'KWA AKILI.' : 'SMARTER.';
  const subtitle =
    lang === 'sw'
      ? 'Fuatilia afya ya mazao, gundua magonjwa, na upate bei za soko kwa ushauri wa AI mkononi mwako.'
      : 'Monitor crop health, optimize resources, and increase yield with data driven insights.';
  const btnText = lang === 'sw' ? 'Anza Sasa' : 'Get Started';

  return (
    <View style={s.welcomeHeroRoot}>
      {/* Background Image */}
      <Image source={WELCOME_BG} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      {/* Dark overlay to make text highly readable */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Language Switcher */}
      <SafeAreaView style={s.welcomeLangSafeArea}>
        <BlurView intensity={Platform.OS === 'ios' ? 25 : 80} tint="dark" style={s.welcomeLangBlur}>
          {(['sw', 'en'] as const).map((L) => {
            const active = lang === L;
            return (
              <TouchableOpacity
                key={L}
                onPress={() => {
                  Haptics.selectionAsync();
                  setLang(L);
                }}
                style={[s.welcomeLangTab, active && s.welcomeLangTabActive]}
                accessibilityRole="button"
                accessibilityLabel={L === 'sw' ? 'Kiswahili' : 'English'}
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.welcomeLangTabText, active && s.welcomeLangTabTextActive]}>
                  {L === 'sw' ? 'Kiswahili' : 'English'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </SafeAreaView>

      <View style={s.welcomeHeroContent}>
        {/* Headline Value Prop */}
        <View style={{ gap: 4 }}>
          <Text style={s.welcomeHeroTitle}>{titleLine1}</Text>
          <Text style={s.welcomeHeroTitle}>{titleLine2}</Text>
        </View>

        {/* Description */}
        <Text style={s.welcomeHeroSubtitle}>{subtitle}</Text>

        {/* Get Started Button — editorial dark-green capsule */}
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.86}
          style={s.welcomeCtaBtn}
          accessibilityRole="button"
          accessibilityLabel={btnText}
        >
          <View style={s.welcomeCtaInner}>
            <Text style={s.welcomeCtaText}>{btnText}</Text>
            <View style={s.welcomeCtaChip}>
              <ChevronRight size={20} color="#0a3d18" strokeWidth={2.5} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Auth (Phone OTP or Email Password)
// ─────────────────────────────────────────────────────────────
function AuthStep({
  authMethod,
  setAuthMethod,
  phone,
  setPhone,
  email,
  setEmail,
  lang,
  setUserId,
  setStep,
  setName,
}: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const isSupabaseConfigured = Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { color: colors.text }]}>
        {authMethod === 'phone'
          ? lang === 'sw'
            ? 'Namba yako ya simu'
            : 'Your Phone Number'
          : lang === 'sw'
            ? 'Barua Pepe Yako'
            : 'Your Email Address'}
      </Text>
      <Text style={[s.sub, { color: colors.textMute }]}>
        {authMethod === 'phone'
          ? lang === 'sw'
            ? 'Tutakutumia namba ya siri (OTP) kwa usalama.'
            : 'We will send you a secret OTP code for security.'
          : lang === 'sw'
            ? 'Tutakutumia namba ya siri (OTP) kwenye barua pepe yako.'
            : 'We will send you a secret OTP code to your email.'}
      </Text>

      {authMethod === 'phone' ? (
        <View style={{ marginTop: 24 }}>
          <FieldLabel label={lang === 'sw' ? 'SIMU' : 'PHONE'} />
          <BlurView
            intensity={isDark ? 16 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+255 7..."
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text }]}
              keyboardType="phone-pad"
              autoFocus
              accessibilityLabel="Phone Number Input"
              accessibilityHint="Type your phone number to authenticate"
            />
          </BlurView>
        </View>
      ) : (
        <View style={{ marginTop: 24, gap: 16 }}>
          <View>
            <FieldLabel label={lang === 'sw' ? 'BARUA PEPE' : 'EMAIL'} />
            <BlurView
              intensity={isDark ? 16 : 40}
              tint={isDark ? 'dark' : 'light'}
              style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="mkulima@kilimo.ai"
                placeholderTextColor={colors.textMute}
                style={[s.input, { color: colors.text }]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                accessibilityLabel="Email Input"
                accessibilityHint="Type your email address to authenticate"
              />
            </BlurView>
          </View>
        </View>
      )}

      {/* Toggle Method Link */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          setAuthMethod(authMethod === 'phone' ? 'email' : 'phone');
        }}
        style={[s.methodToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={authMethod === 'phone' ? 'Use email instead' : 'Use phone instead'}
      >
        <Text style={[s.methodToggleText, { color: colors.primary }]}>
          {authMethod === 'phone'
            ? lang === 'sw'
              ? 'Tumia Barua Pepe Badala yake'
              : 'Use Email Address Instead'
            : lang === 'sw'
              ? 'Tumia Namba ya Simu Badala yake'
              : 'Use Phone Number Instead'}
        </Text>
      </TouchableOpacity>
    </BlurView>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 3 — OTP
// ─────────────────────────────────────────────────────────────
function OtpStep({ otp, setOtp, lang, contact, onResend }: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(60);
    if (onResend) {
      onResend();
    }
  };

  const isEmail = contact?.includes('@');
  const descText =
    lang === 'sw'
      ? isEmail
        ? `Ingiza tarakimu 6 tulizotuma kwenye barua pepe yako: ${contact}`
        : `Ingiza tarakimu 6 tulizotuma kwenye simu yako: ${contact}`
      : isEmail
        ? `Enter the 6-digit code we sent to your email: ${contact}`
        : `Enter the 6-digit code we sent to your phone: ${contact}`;

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { color: colors.text }]}>
        {lang === 'sw' ? 'Namba ya siri' : 'Secret Code'}
      </Text>
      <Text style={[s.sub, { color: colors.textMute }]}>{descText}</Text>

      <FieldLabel label="OTP" />
      <BlurView
        intensity={isDark ? 16 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="123456"
          placeholderTextColor={colors.textMute}
          style={[s.input, { color: colors.text }]}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          accessibilityLabel="OTP Verification Input"
          accessibilityHint="Type the 6 digit code received"
        />
      </BlurView>

      <View style={{ marginTop: 20, alignItems: 'center' }}>
        <TouchableOpacity
          disabled={timer > 0}
          onPress={handleResend}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20,
            backgroundColor: timer > 0 ? 'transparent' : `${colors.primary}15`,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 13,
              color: timer > 0 ? colors.textMute : colors.primary,
            }}
          >
            {timer > 0
              ? lang === 'sw'
                ? `Tuma tena baada ya sekunde ${timer}`
                : `Resend code in ${timer}s`
              : lang === 'sw'
                ? 'Tuma tena namba ya siri'
                : 'Resend verification code'}
          </Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Role
// ─────────────────────────────────────────────────────────────
function RoleStep({ t, role, setRole }: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { color: colors.text }]}>{t.title}</Text>
      <Text style={[s.sub, { color: colors.textMute }]}>{t.subtitle}</Text>
      <View style={{ gap: 8, marginTop: 20 }}>
        {allRoles().map((r) => {
          const meta = ROLE_META[r];
          const active = role === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => {
                Haptics.selectionAsync();
                setRole(r);
              }}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Select role ${roleLabel(r)}`}
              accessibilityState={{ selected: active }}
            >
              <View
                style={[
                  s.roleCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  active && { borderColor: meta.color, backgroundColor: `${meta.color}14` },
                ]}
              >
                <View style={[s.roleIconWrap, { backgroundColor: `${meta.color}18` }]}>
                  {meta.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.roleName, { color: colors.text }, active && { color: meta.color }]}
                  >
                    {roleLabel(r)}
                  </Text>
                  <Text style={[s.roleDesc, { color: colors.textMute }]} numberOfLines={1}>
                    {ROLE_DESCRIPTIONS[r]}
                  </Text>
                </View>
                <View
                  style={[
                    s.roleRadio,
                    { borderColor: colors.border },
                    active && { backgroundColor: meta.color, borderColor: meta.color },
                  ]}
                >
                  {active && <Check size={12} color="#000" strokeWidth={3} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Farm Profile
// ─────────────────────────────────────────────────────────────
function ProfileStep({
  t,
  name,
  setName,
  region,
  setRegion,
  crops,
  toggleCrop,
  acres,
  setAcres,
  activity,
  setActivity,
  hasLivestock,
  setHasLivestock,
  hasIrrigation,
  setHasIrrigation,
}: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { color: colors.text }]}>{t.title}</Text>
      <Text style={[s.sub, { color: colors.textMute }]}>{t.subtitle}</Text>

      <FieldLabel label={t.name} />
      <BlurView
        intensity={isDark ? 16 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t.namePh}
          placeholderTextColor={colors.textMute}
          style={[s.input, { color: colors.text }]}
          accessibilityLabel="Full Name Input"
          accessibilityHint="Enter your full name for your agricultural identity profile"
        />
      </BlurView>

      <FieldLabel label={t.region} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {REGIONS.map((r) => {
          const isSelected = region === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => {
                Haptics.selectionAsync();
                setRegion(r);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select region ${r}`}
              accessibilityState={{ selected: isSelected }}
              style={[
                s.pill,
                { borderColor: colors.border, backgroundColor: colors.card },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  { color: colors.textMute },
                  isSelected && { color: colors.primary },
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FieldLabel label={t.crops} />
      <View style={s.cropGrid}>
        {CROPS.map((c) => {
          const on = crops.includes(c);
          const maxed = !on && crops.length >= 4;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggleCrop(c)}
              disabled={maxed}
              accessibilityRole="button"
              accessibilityLabel={`Select crop ${c}`}
              accessibilityState={{ selected: on, disabled: maxed }}
              style={[
                s.cropPill,
                { borderColor: colors.border, backgroundColor: colors.card },
                on && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                maxed && { opacity: 0.32 },
              ]}
            >
              <Text
                style={[s.pillText, { color: colors.textMute }, on && { color: colors.primary }]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FieldLabel label={t.size} />
      <BlurView
        intensity={isDark ? 16 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <TextInput
          value={acres}
          onChangeText={setAcres}
          keyboardType="decimal-pad"
          placeholder="2.5"
          placeholderTextColor={colors.textMute}
          style={[s.input, { color: colors.text }]}
          accessibilityLabel="Farm Size Input"
          accessibilityHint="Enter your farm size in acres using numbers"
        />
      </BlurView>

      <FieldLabel label={t.activity} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['mazao', 'mifugo', 'mchanganyiko'] as const).map((a) => {
          const isSelected = activity === a;
          return (
            <TouchableOpacity
              key={a}
              onPress={() => {
                Haptics.selectionAsync();
                setActivity(a);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select main activity ${a}`}
              accessibilityState={{ selected: isSelected }}
              style={[
                s.actBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  { color: colors.textMute },
                  isSelected && { color: colors.primary },
                ]}
              >
                {(t as any)[a]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
        <Text style={[s.toggleLabel, { color: colors.text }]}>{t.livestock}</Text>
        <Switch
          value={hasLivestock}
          onValueChange={setHasLivestock}
          trackColor={{ false: isDark ? '#1C241E' : '#E6DFD5', true: colors.primary }}
          thumbColor="#fff"
          accessibilityRole="switch"
          accessibilityLabel={t.livestock}
          accessibilityState={{ checked: hasLivestock }}
        />
      </View>
      <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
        <Text style={[s.toggleLabel, { color: colors.text }]}>{t.irrigation}</Text>
        <Switch
          value={hasIrrigation}
          onValueChange={setHasIrrigation}
          trackColor={{ false: isDark ? '#1C241E' : '#E6DFD5', true: colors.primary }}
          thumbColor="#fff"
          accessibilityRole="switch"
          accessibilityLabel={t.irrigation}
          accessibilityState={{ checked: hasIrrigation }}
        />
      </View>
    </BlurView>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 6 — Done
// ─────────────────────────────────────────────────────────────
function DoneStep({ t, name, role, lang }: any) {
  const meta = ROLE_META[role as CanonicalRole];
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { textAlign: 'center', color: colors.text }]}>{t.title}</Text>
      <Text style={[s.sub, { textAlign: 'center', color: colors.textMute }]}>{t.subtitle}</Text>

      {/* ID card preview */}
      <LinearGradient
        colors={isDark ? [colors.primary + '1F', colors.primary + '08'] : ['#F0FAF2', '#FFFFFF']}
        style={[s.idCard, { borderColor: colors.border }]}
      >
        <View style={s.idRow}>
          <View style={[s.idIconWrap, { backgroundColor: `${meta.color}20` }]}>{meta.icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={[s.idName, { color: colors.text }]}>{name}</Text>
            <Text style={[s.idRole, { color: colors.textMute }]}>{roleLabel(role)}</Text>
          </View>
          <View
            style={[
              s.idBadge,
              { backgroundColor: colors.primaryLight, borderColor: colors.border },
            ]}
          >
            <Text style={[s.idBadgeText, { color: colors.primary }]}>FREE</Text>
          </View>
        </View>
        <View style={[s.idDivider, { backgroundColor: colors.border }]} />
        <Text style={[s.idFooter, { color: colors.textMute }]}>
          {lang === 'sw' ? '🌿 Agro ID yako imesajiliwa' : '🌿 Your Agro ID is registered'}
        </Text>
      </LinearGradient>
    </BlurView>
  );
}

function FieldLabel({ label }: { label: string }) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return <Text style={[s.fieldLabel, { color: colors.textMute }]}>{label}</Text>;
}

function createStyles(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // Background decoration
    orb: { position: 'absolute', borderRadius: 999 },
    gridLine1: {
      position: 'absolute',
      top: '30%',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)',
    },
    gridLine2: {
      position: 'absolute',
      top: '60%',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)',
    },

    // Top nav
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingRight: 8,
    },
    backText: { color: colors.textMute, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    progressPills: { flexDirection: 'row', gap: 5 },
    progressPill: {
      width: 20,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    },
    progressActive: { backgroundColor: '#2E6F40', width: 32 },
    progressDone: { backgroundColor: 'rgba(46, 111, 64, 0.5)' },
    stepNum: {
      color: colors.textMute,
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      minWidth: 28,
      textAlign: 'right',
    },

    // Scroll containers
    scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
    scrollLang: { flexGrow: 1 },

    // Generic step root
    stepRoot: { paddingTop: 8, paddingBottom: 12 },

    // Typography
    h1: {
      color: colors.text,
      fontSize: 30,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -0.8,
      lineHeight: 36,
      marginBottom: 8,
    },
    sub: { color: colors.textMute, fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
    fieldLabel: {
      color: colors.textMute,
      fontSize: 10,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      marginTop: 20,
      marginBottom: 8,
    },

    // Input
    inputWrap: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    input: {
      color: colors.text,
      backgroundColor: colors.card,
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    // Pills
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { borderColor: '#2E6F40', backgroundColor: 'rgba(46, 111, 64, 0.15)' },
    pillText: { color: colors.textMute, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    pillTextActive: { color: '#2E6F40' },
    cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cropPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
      justifyContent: 'center',
    },
    actBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },

    // Toggles
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    toggleLabel: { color: colors.text, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

    // Footer CTA
    footer: {
      paddingHorizontal: 22,
      paddingBottom: Platform.OS === 'ios' ? 32 : 22,
      paddingTop: 12,
    },
    ctaWrap: { borderRadius: 100, overflow: 'hidden' },
    ctaGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingLeft: 28,
      paddingRight: 10,
    },
    ctaText: {
      color: '#FCFBF7',
      fontSize: 18,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: 0.3,
      flex: 1,
    },
    ctaArrow: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#2E6F40',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },

    // ── Lang step ─────────────────────────────────────────────
    langRoot: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 40,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    logoWrap: {
      width: 96,
      height: 96,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      position: 'relative',
    },
    logoGrad: {
      width: 88,
      height: 88,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoRing: {
      position: 'absolute',
      width: 96,
      height: 96,
      borderRadius: 30,
      borderWidth: 1.5,
      borderColor: 'rgba(46, 111, 64, 0.3)',
      top: 0,
      left: 0,
    },
    logoImg: { width: 80, height: 80 },
    langHeadline: {
      color: colors.text,
      fontSize: 34,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -1.2,
      textAlign: 'center',
    },
    taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    taglineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2E6F40' },
    langTagline: {
      color: colors.textMute,
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 0.5,
    },
    langDivider: {
      width: 40,
      height: 1.5,
      backgroundColor: 'rgba(46, 111, 64, 0.3)',
      marginVertical: 28,
    },
    langPick: {
      color: colors.textMute,
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    langCards: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
    langCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 10,
      overflow: 'hidden',
    },
    langFlag: { fontSize: 32 },
    langLabel: {
      color: colors.text,
      fontSize: 15,
      fontFamily: 'Inter_800ExtraBold',
      textAlign: 'center',
    },
    langCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#2E6F40',
      justifyContent: 'center',
      alignItems: 'center',
    },
    langCheckEmpty: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    langCtaWrap: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', marginTop: 28 },
    langCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 17,
    },
    langCtaText: {
      color: '#022c22',
      fontSize: 16,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: 0.2,
    },
    langFootnote: {
      color: colors.textMute,
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      marginTop: 16,
      textAlign: 'center',
    },

    // ── Welcome step ──────────────────────────────────────────
    welcomeLogoWrap: {
      width: 80,
      height: 80,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 22,
      borderWidth: 1,
      borderColor: 'rgba(46, 111, 64, 0.25)',
    },
    welcomeLogoBg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    welcomeLogoImg: { width: 60, height: 60 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
    featureCard: {
      width: (SW - 44 - 10) / 2,
      borderRadius: 16,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.07)',
    },
    featureIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureLabel: { color: '#fff', fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
    featureSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular' },

    // ── Role step ─────────────────────────────────────────────
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    roleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roleName: { color: '#fff', fontSize: 13, fontFamily: 'Inter_800ExtraBold', marginBottom: 2 },
    roleDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Inter_400Regular' },
    roleRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Done step ─────────────────────────────────────────────
    doneRingOuter: {
      width: 100,
      height: 100,
      borderRadius: 50,
      padding: 3,
      backgroundColor: 'rgba(46, 111, 64, 0.15)',
    },
    doneRingInner: { flex: 1, borderRadius: 47, justifyContent: 'center', alignItems: 'center' },
    idCard: {
      alignSelf: 'stretch',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(46, 111, 64, 0.2)',
      padding: 18,
      marginTop: 28,
    },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    idIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    idName: { color: '#fff', fontSize: 16, fontFamily: 'Inter_800ExtraBold' },
    idRole: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      marginTop: 2,
    },
    idBadge: {
      backgroundColor: 'rgba(46, 111, 64, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(46, 111, 64, 0.3)',
    },
    idBadgeText: {
      color: '#2E6F40',
      fontSize: 10,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: 1,
    },
    idDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginVertical: 14,
    },
    idFooter: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    methodToggle: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 24,
    },
    methodToggleText: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
    },
    warnBanner: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 16,
      gap: 6,
    },
    warnTitle: {
      color: '#fff',
      fontSize: 14,
      fontFamily: 'Inter_800ExtraBold',
    },
    warnBody: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      lineHeight: 18,
    },
    demoBypassBtn: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      marginTop: 12,
    },
    demoBypassText: {
      color: '#fff',
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
    },
    // Welcome Splash Styles
    welcomeHeroRoot: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    welcomeHeroContent: {
      paddingHorizontal: 28,
      paddingBottom: Platform.OS === 'ios' ? 70 : 50,
      gap: 20,
    },
    welcomeHeroTitle: {
      color: '#FCFBF7',
      fontSize: 42,
      fontFamily: 'InstrumentSerif_400Regular',
      lineHeight: 48,
      letterSpacing: -1,
    },
    welcomeHeroSubtitle: {
      color: 'rgba(252, 251, 247, 0.75)',
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      lineHeight: 24,
    },
    welcomeCtaBtn: {
      marginTop: 20,
      borderRadius: 100,
      height: 72,
      justifyContent: 'center',
      width: '100%',
      backgroundColor: 'rgba(10, 61, 24, 0.62)',
      borderWidth: 1.5,
      borderColor: 'rgba(46, 111, 64, 0.32)',
    },
    welcomeCtaInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 28,
      paddingRight: 10,
    },
    welcomeCtaText: {
      color: '#FCFBF7',
      fontSize: 22,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: 0.4,
      flex: 1,
    },
    welcomeCtaChip: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#2E6F40',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    welcomeArrowCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#FCFBF7',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    welcomeCarats: {
      color: 'rgba(252, 251, 247, 0.4)',
      fontSize: 16,
      fontFamily: 'Inter_800ExtraBold',
      marginRight: 20,
    },
    welcomeLangSafeArea: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      right: 20,
      zIndex: 100,
    },
    welcomeLangBlur: {
      flexDirection: 'row',
      borderRadius: 20,
      overflow: 'hidden',
      padding: 3,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    welcomeLangTab: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 17,
    },
    welcomeLangTabActive: {
      backgroundColor: '#2E6F40',
    },
    welcomeLangTabText: {
      color: 'rgba(252, 251, 247, 0.6)',
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
    },
    welcomeLangTabTextActive: {
      color: '#FCFBF7',
    },
    welcomeScroll: {
      paddingTop: 100,
      paddingBottom: 40,
      alignItems: 'center',
      width: '100%',
    },
    illustrationContainer: {
      width: 220,
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 20,
      position: 'relative',
    },
    pulseRing: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2.5,
    },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 2.5,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    cropInterestContainer: {
      width: '100%',
      marginTop: 10,
      marginBottom: 20,
    },
    cropInterestTitle: {
      fontSize: 14,
      fontFamily: 'Inter_800ExtraBold',
      marginBottom: 12,
    },
    cropInterestGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    cropChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: 'center',
    },
    cropChipText: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
    },
    stepIllustration: {
      width: '100%',
      height: 220,
      borderRadius: 20,
      marginBottom: 20,
    },
    doneIllustration: {
      width: 160,
      height: 160,
      borderRadius: 24,
      marginBottom: 16,
    },
    glassCard: {
      borderRadius: 24,
      borderWidth: 1,
      padding: 20,
      marginTop: 8,
      marginBottom: 16,
      overflow: 'hidden',
    },
  });
}

function VerificationStep({
  lang,
  idType,
  setIdType,
  nida,
  setNida,
  license,
  setLicense,
  tin,
  setTin,
}: any) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 25 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        s.glassCard,
        {
          borderColor: colors.border,
          backgroundColor: isDark ? 'rgba(8,12,8,0.45)' : 'rgba(255,255,255,0.45)',
        },
      ]}
    >
      <Text style={[s.h1, { color: colors.text }]}>
        {lang === 'sw' ? 'Uthibitisho wa Kitambulisho' : 'Identity Verification'}
      </Text>
      <Text style={[s.sub, { color: colors.textMute }]}>
        {lang === 'sw'
          ? 'Tafadhali chagua na uingize namba ya kitambulisho kimoja ili kuwezesha akaunti yako.'
          : 'Please select and enter one identification number to activate your account.'}
      </Text>

      {/* Selectors */}
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 18 }}>
        {(['nida', 'tin', 'license'] as const).map((type) => {
          const isSelected = idType === type;
          const label =
            type === 'nida'
              ? 'NIDA'
              : type === 'tin'
                ? 'TIN'
                : lang === 'sw'
                  ? 'Leseni'
                  : 'License';
          return (
            <TouchableOpacity
              key={type}
              onPress={() => {
                Haptics.selectionAsync();
                setIdType(type);
              }}
              style={[
                s.pill,
                {
                  flex: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                },
                isSelected && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '15',
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 13,
                  color: isSelected ? colors.primary : colors.textMute,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Input */}
      {idType === 'nida' && (
        <View>
          <FieldLabel
            label={lang === 'sw' ? 'Kitambulisho cha Taifa (NIDA)' : 'National ID (NIDA)'}
          />
          <BlurView
            intensity={isDark ? 16 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <TextInput
              value={nida}
              onChangeText={setNida}
              placeholder="19900101123456789012"
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text }]}
              keyboardType="number-pad"
              maxLength={20}
              accessibilityLabel="NIDA Input"
            />
          </BlurView>
          <Text
            style={{
              fontSize: 11,
              color: colors.textMute,
              marginTop: 6,
              fontFamily: 'Inter_500Medium',
            }}
          >
            {lang === 'sw' ? 'Inapaswa kuwa tarakimu 20 za namba.' : 'Must be exactly 20 digits.'}
          </Text>
        </View>
      )}

      {idType === 'tin' && (
        <View>
          <FieldLabel label={lang === 'sw' ? 'Namba ya TIN' : 'TIN Number'} />
          <BlurView
            intensity={isDark ? 16 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <TextInput
              value={tin}
              onChangeText={setTin}
              placeholder="123456789"
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text }]}
              keyboardType="number-pad"
              maxLength={9}
              accessibilityLabel="TIN Input"
            />
          </BlurView>
          <Text
            style={{
              fontSize: 11,
              color: colors.textMute,
              marginTop: 6,
              fontFamily: 'Inter_500Medium',
            }}
          >
            {lang === 'sw' ? 'Inapaswa kuwa tarakimu 9 za namba.' : 'Must be exactly 9 digits.'}
          </Text>
        </View>
      )}

      {idType === 'license' && (
        <View>
          <FieldLabel label={lang === 'sw' ? 'Leseni ya Biashara' : 'Business License'} />
          <BlurView
            intensity={isDark ? 16 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <TextInput
              value={license}
              onChangeText={setLicense}
              placeholder="LIC-123456"
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text }]}
              autoCapitalize="characters"
              maxLength={12}
              accessibilityLabel="Business License Input"
            />
          </BlurView>
          <Text
            style={{
              fontSize: 11,
              color: colors.textMute,
              marginTop: 6,
              fontFamily: 'Inter_500Medium',
            }}
          >
            {lang === 'sw'
              ? 'Kati ya herufi/tarakimu 6 hadi 12.'
              : 'Alphanumeric, 6 to 12 characters.'}
          </Text>
        </View>
      )}
    </BlurView>
  );
}
