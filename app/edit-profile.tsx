/**
 * Edit Farm Profile — seamless version
 *
 * Logic:
 * 1. Local state is initialised from the persisted store on mount.
 * 2. isDirty tracks any change so the back-button guard only triggers when needed.
 * 3. Validation: name ≥ 2 chars + at least 1 crop before save is allowed.
 * 4. save() writes atomically: updateAgroId → setFarmProfile → setLanguage,
 *    then fires an in-app success notification and navigates back.
 * 5. Pressing the system/header back button while dirty shows an Alert
 *    ("Discard changes?") — no silent data loss.
 * 6. Crop limit is 4 — consistent with the onboarding wizard.
 * 7. useTheme() is used throughout — respects light/dark mode.
 */
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AlertButton,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  Save,
  User,
  Sprout,
  Globe,
  Check,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useKilimoStore, FarmProfile, AppLanguage, ThemePreference } from '../store/useKilimoStore';
import { allRoles, roleLabel, CanonicalRole, normalizeRole } from '../lib/access';
import { useTheme } from '../constants/Theme';
import { getSupabase } from '../lib/supabase';

const REGIONS = [
  'Arusha',
  'Dodoma',
  'Mbeya',
  'Kilimanjaro',
  'Morogoro',
  'Iringa',
  'Mwanza',
  'Tanga',
  'Pwani',
  'Singida',
  'Tabora',
];
const CROPS = [
  'Mahindi',
  'Maharage',
  'Mpunga',
  'Kahawa',
  'Pamba',
  'Alizeti',
  'Mihogo',
  'Viazi',
  'Nyanya',
  'Vitunguu',
  'Karanga',
  'Ndizi',
];
const MAX_CROPS = 4;

const showSafeAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (Platform.OS === 'web') {
    try {
      const confirmResult = window.confirm(`${title}\n\n${message}`);
      if (confirmResult) {
        const primaryBtn =
          buttons?.find((b) => b.style === 'destructive') ||
          buttons?.find((b) => b.text === 'Ondoka' || b.text === 'Discard' || b.text === 'Toka') ||
          buttons?.[1] ||
          buttons?.[0];
        primaryBtn?.onPress?.();
      } else {
        const cancelBtn = buttons?.find((b) => b.style === 'cancel') || buttons?.[0];
        cancelBtn?.onPress?.();
      }
    } catch (e) {
      console.warn('Alert blocked by iframe sandbox, executing primary action automatically:', e);
      const primaryBtn =
        buttons?.find((b) => b.style === 'destructive') ||
        buttons?.find((b) => b.text === 'Ondoka' || b.text === 'Discard' || b.text === 'Toka') ||
        buttons?.[1] ||
        buttons?.[0];
      primaryBtn?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const agroId = useKilimoStore((s) => s.agroId);
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const setFarmProfile = useKilimoStore((s) => s.setFarmProfile);
  const language = useKilimoStore((s) => s.language);
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const themePreference = useKilimoStore((s) => s.themePreference);
  const setThemePreference = useKilimoStore((s) => s.setThemePreference);
  const addNotification = useKilimoStore((s) => s.addNotification);

  // ── Local editable state ────────────────────────────────────────────────────
  const [name, setName] = useState(agroId?.name ?? '');
  const [role, setRole] = useState<CanonicalRole>(normalizeRole(agroId?.role));
  const [region, setRegion] = useState(farmProfile?.region ?? 'Arusha');
  const [crops, setCrops] = useState<string[]>(farmProfile?.primaryCrops ?? []);
  const [acres, setAcres] = useState(String(farmProfile?.farmSizeAcres ?? '2'));
  const [activity, setActivity] = useState<FarmProfile['mainActivity']>(
    farmProfile?.mainActivity ?? 'mazao'
  );
  const [hasLivestock, setHasLivestock] = useState(farmProfile?.hasLivestock ?? false);
  const [hasIrrigation, setHasIrrigation] = useState(farmProfile?.hasIrrigation ?? false);
  const [lang, setLang] = useState<AppLanguage>(language);
  const [themePref, setThemePref] = useState<ThemePreference>(themePreference ?? 'system');
  const [saved, setSaved] = useState(false);

  // ── Dirty tracking ──────────────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (name !== (agroId?.name ?? '')) return true;
    if (role !== normalizeRole(agroId?.role)) return true;
    if (region !== (farmProfile?.region ?? 'Arusha')) return true;
    if (JSON.stringify(crops) !== JSON.stringify(farmProfile?.primaryCrops ?? [])) return true;
    if (acres !== String(farmProfile?.farmSizeAcres ?? '2')) return true;
    if (activity !== (farmProfile?.mainActivity ?? 'mazao')) return true;
    if (hasLivestock !== (farmProfile?.hasLivestock ?? false)) return true;
    if (hasIrrigation !== (farmProfile?.hasIrrigation ?? false)) return true;
    if (lang !== language) return true;
    if (themePref !== (themePreference ?? 'system')) return true;
    return false;
  }, [
    name,
    role,
    region,
    crops,
    acres,
    activity,
    hasLivestock,
    hasIrrigation,
    lang,
    themePref,
    agroId,
    farmProfile,
    language,
    themePreference,
  ]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const nameValid = name.trim().length >= 2;
  const cropsValid = crops.length > 0;
  const canSave = nameValid && cropsValid;

  // ── Back-button guard ───────────────────────────────────────────────────────
  function handleBack() {
    if (!isDirty || saved) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
      return;
    }
    showSafeAlert(
      lang === 'sw' ? 'Toka bila Kuhifadhi?' : 'Discard changes?',
      lang === 'sw' ? 'Mabadiliko yako hayatahifadhiwa.' : 'Your unsaved changes will be lost.',
      [
        { text: lang === 'sw' ? 'Endelea Kuhariri' : 'Keep Editing', style: 'cancel' },
        {
          text: lang === 'sw' ? 'Toka' : 'Discard',
          style: 'destructive',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          },
        },
      ]
    );
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  // Local Zustand state is the source of truth for instant, offline-first UX
  // — save() always succeeds locally and navigates back immediately, same as
  // before. What's new: a best-effort upsert to farmer_profiles so the
  // profile actually survives a reinstall/new device, and so rag-chat (which
  // reads this table for AI-personalization context) has real data to read.
  // A failed remote sync does not block or roll back the local save — it's
  // logged and surfaced via a distinct notification rather than silently
  // swallowed or falsely folded into the "saved" success state.
  async function syncProfileToBackend(payload: {
    name: string;
    role: CanonicalRole;
    region: string;
    primaryCrops: string[];
    farmSizeAcres: number;
    mainActivity: FarmProfile['mainActivity'];
    hasLivestock: boolean;
    hasIrrigation: boolean;
    language: AppLanguage;
  }) {
    const sb = getSupabase();
    if (!sb) return;
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { error } = await sb.from('farmer_profiles').upsert({
      user_id: userId,
      name: payload.name,
      role: payload.role,
      region: payload.region,
      primary_crops: payload.primaryCrops,
      farm_size_acres: payload.farmSizeAcres,
      main_activity: payload.mainActivity,
      has_livestock: payload.hasLivestock,
      has_irrigation: payload.hasIrrigation,
      language: payload.language,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[EditProfile] backend sync failed:', error.message);
      addNotification({
        title: lang === 'sw' ? 'Usawazishaji Umeshindikana' : 'Sync Failed',
        body:
          lang === 'sw'
            ? 'Wasifu umehifadhiwa kwenye kifaa chako lakini haujasawazishwa mtandaoni.'
            : 'Profile saved on this device but could not sync online.',
        type: 'warning',
      });
    }
  }

  function save() {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const farmSizeAcres = parseFloat(acres) || 0;
    updateAgroId({ name: name.trim(), role, location: region });
    setFarmProfile({
      primaryCrops: crops,
      region,
      farmSizeAcres,
      mainActivity: activity,
      hasLivestock,
      hasIrrigation,
    });
    setLanguage(lang);
    setThemePreference(themePref);
    syncProfileToBackend({
      name: name.trim(),
      role,
      region,
      primaryCrops: crops,
      farmSizeAcres,
      mainActivity: activity,
      hasLivestock,
      hasIrrigation,
      language: lang,
    });
    addNotification({
      title: lang === 'sw' ? 'Wasifu Umehifadhiwa' : 'Profile Saved',
      body:
        lang === 'sw'
          ? 'Mapendekezo ya AI yatabadilika papo hapo.'
          : 'AI recommendations will update immediately.',
      type: 'success',
    });
    setSaved(true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }

  function toggleCrop(c: string) {
    Haptics.selectionAsync();
    setCrops((p) =>
      p.includes(c) ? p.filter((x) => x !== c) : p.length < MAX_CROPS ? [...p, c] : p
    );
  }

  // ── i18n ────────────────────────────────────────────────────────────────────
  const t =
    lang === 'sw'
      ? {
          title: 'Hariri Wasifu wa Shamba',
          sub: 'Mabadiliko huboresha mapendekezo ya AI mara moja',
          name: 'Jina kamili',
          namePh: 'e.g. Amina Juma',
          nameErr: 'Jina lazima liwe na herufi 2 au zaidi',
          role: 'Wajibu',
          region: 'Mkoa',
          crops: `Mazao makuu (chagua hadi ${MAX_CROPS})`,
          cropsErr: 'Chagua angalau zao moja',
          size: 'Ukubwa wa shamba (ekari)',
          activity: 'Shughuli kuu',
          mazao: 'Mazao',
          mifugo: 'Mifugo',
          mchanganyiko: 'Mchanganyiko',
          livestock: 'Una mifugo?',
          irrigation: 'Una umwagiliaji?',
          language: 'Lugha ya programu',
          appearance: 'Mandhari',
          themeSystem: 'Mfumo',
          themeLight: 'Mwanga',
          themeDark: 'Giza',
          save: 'Hifadhi Mabadiliko',
          unsaved: 'Mabadiliko bila kuhifadhi',
        }
      : {
          title: 'Edit Farm Profile',
          sub: 'Changes refine your AI recommendations immediately',
          name: 'Full name',
          namePh: 'e.g. Amina Juma',
          nameErr: 'Name must be at least 2 characters',
          role: 'Role',
          region: 'Region',
          crops: `Primary crops (pick up to ${MAX_CROPS})`,
          cropsErr: 'Select at least one crop',
          size: 'Farm size (acres)',
          activity: 'Main activity',
          mazao: 'Crops',
          mifugo: 'Livestock',
          mchanganyiko: 'Mixed',
          livestock: 'Raise livestock?',
          irrigation: 'Have irrigation?',
          language: 'App language',
          appearance: 'Appearance',
          themeSystem: 'System',
          themeLight: 'Light',
          themeDark: 'Dark',
          save: 'Save Changes',
          unsaved: 'Unsaved changes',
        };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? ['#080A08', '#122617', '#080A08'] : ['#F0FAF2', '#E6F5EB', '#F0FAF2']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={[
              s.iconBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint={isDirty ? 'You have unsaved changes' : undefined}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[s.headerTitle, { color: colors.text }]}>{t.title}</Text>
            {isDirty && !saved && (
              <View style={s.dirtyBadge}>
                <View style={s.dirtyDot} />
                <Text style={s.dirtyText}>{t.unsaved}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={!(canSave && isDirty)}
            style={[
              s.iconBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
              canSave && isDirty && { backgroundColor: colors.primaryLight },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
            accessibilityState={{ disabled: !(canSave && isDirty) }}
          >
            <Save
              size={20}
              color={
                canSave && isDirty
                  ? colors.primary
                  : isDark
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(0,0,0,0.25)'
              }
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.sub, { color: colors.textMute }]}>{t.sub}</Text>

            {/* Name */}
            <Section icon={<User size={16} color={colors.primary} />} label={t.name} />
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={[
                s.inputWrap,
                { borderColor: colors.border },
                !nameValid && name.length > 0 && s.inputErr,
              ]}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.namePh}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                style={[s.input, { color: colors.text }]}
                accessibilityLabel={t.name}
                accessibilityHint={
                  lang === 'sw'
                    ? 'Weka jina lako kamili la herufi mbili au zaidi'
                    : 'Enter your full name of two or more characters'
                }
              />
            </BlurView>
            {!nameValid && name.length > 0 && (
              <View style={s.errRow}>
                <AlertCircle size={12} color="#ef4444" />
                <Text style={s.errText}>{t.nameErr}</Text>
              </View>
            )}

            {/* Role */}
            <Section icon={<User size={16} color="#8b5cf6" />} label={t.role} />
            <View style={{ gap: 6 }}>
              {allRoles().map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRole(r);
                  }}
                  style={[
                    s.rolePill,
                    { borderColor: colors.border },
                    role === r && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={roleLabel(r)}
                  accessibilityState={{ checked: role === r }}
                >
                  <Text
                    style={[
                      s.rolePillText,
                      { color: colors.text },
                      role === r && { color: colors.primary },
                    ]}
                  >
                    {roleLabel(r)}
                  </Text>
                  {role === r && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Region */}
            <Section icon={<MapPin size={16} color="#3b82f6" />} label={t.region} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRegion(r);
                  }}
                  style={[
                    s.pill,
                    { borderColor: colors.border },
                    region === r && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={r}
                  accessibilityState={{ checked: region === r }}
                >
                  <Text
                    style={[
                      s.pillText,
                      { color: colors.text },
                      region === r && { color: colors.primary },
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Crops */}
            <Section icon={<Sprout size={16} color={colors.primary} />} label={t.crops} />
            <View style={s.cropGrid}>
              {CROPS.map((c) => {
                const on = crops.includes(c);
                const disabled = !on && crops.length >= MAX_CROPS;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => toggleCrop(c)}
                    style={[
                      s.cropPill,
                      { borderColor: colors.border },
                      on && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                      disabled && { opacity: 0.35 },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityLabel={c}
                    accessibilityState={{ checked: on, disabled }}
                  >
                    <Text
                      style={[s.pillText, { color: colors.text }, on && { color: colors.primary }]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {crops.length === 0 && (
              <View style={[s.errRow, { marginTop: 6 }]}>
                <AlertCircle size={12} color="#f59e0b" />
                <Text style={[s.errText, { color: '#f59e0b' }]}>{t.cropsErr}</Text>
              </View>
            )}
            {crops.length === MAX_CROPS && (
              <View style={[s.errRow, { marginTop: 6 }]}>
                <Check size={12} color={colors.primary} />
                <Text style={[s.errText, { color: colors.primary }]}>
                  {lang === 'sw'
                    ? `Mazao ${MAX_CROPS} yamechaguliwa`
                    : `${MAX_CROPS} crops selected — max reached`}
                </Text>
              </View>
            )}

            {/* Farm size */}
            <Section label={t.size} />
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={[s.inputWrap, { borderColor: colors.border }]}
            >
              <TextInput
                value={acres}
                onChangeText={setAcres}
                keyboardType="decimal-pad"
                placeholder="2.5"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                style={[s.input, { color: colors.text }]}
                accessibilityLabel={t.size}
                accessibilityHint={
                  lang === 'sw'
                    ? 'Weka ukubwa wa shamba lako kwa ekari'
                    : 'Enter the size of your farm in acres'
                }
              />
            </BlurView>

            {/* Activity */}
            <Section label={t.activity} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['mazao', 'mifugo', 'mchanganyiko'] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActivity(a);
                  }}
                  style={[
                    s.actBtn,
                    { borderColor: colors.border },
                    activity === a && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={(t as any)[a]}
                  accessibilityState={{ checked: activity === a }}
                >
                  <Text
                    style={[
                      s.pillText,
                      { color: colors.text },
                      activity === a && { color: colors.primary },
                    ]}
                  >
                    {(t as any)[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggles */}
            <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.toggleLabel, { color: colors.text }]}>{t.livestock}</Text>
              <Switch
                value={hasLivestock}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setHasLivestock(v);
                }}
                trackColor={{ false: isDark ? '#333' : '#E6DFD5', true: colors.primary }}
                accessibilityLabel={t.livestock}
                accessibilityRole="switch"
              />
            </View>
            <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.toggleLabel, { color: colors.text }]}>{t.irrigation}</Text>
              <Switch
                value={hasIrrigation}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setHasIrrigation(v);
                }}
                trackColor={{ false: isDark ? '#333' : '#E6DFD5', true: colors.primary }}
                accessibilityLabel={t.irrigation}
                accessibilityRole="switch"
              />
            </View>

            {/* Language */}
            <Section icon={<Globe size={16} color="#f59e0b" />} label={t.language} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['sw', 'en'] as const).map((L) => (
                <TouchableOpacity
                  key={L}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setLang(L);
                  }}
                  style={[
                    s.actBtn,
                    { borderColor: colors.border },
                    lang === L && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={L === 'sw' ? 'Kiswahili' : 'English'}
                  accessibilityState={{ checked: lang === L }}
                >
                  <Text
                    style={[
                      s.pillText,
                      { color: colors.text },
                      lang === L && { color: colors.primary },
                    ]}
                  >
                    {L === 'sw' ? 'Kiswahili' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Appearance */}
            <Section icon={<Sun size={16} color="#a78bfa" />} label={t.appearance} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  {
                    value: 'system',
                    label: t.themeSystem,
                    icon: (
                      <Monitor
                        size={15}
                        color={themePref === 'system' ? colors.primary : colors.textMute}
                      />
                    ),
                  },
                  {
                    value: 'light',
                    label: t.themeLight,
                    icon: (
                      <Sun
                        size={15}
                        color={themePref === 'light' ? colors.primary : colors.textMute}
                      />
                    ),
                  },
                  {
                    value: 'dark',
                    label: t.themeDark,
                    icon: (
                      <Moon
                        size={15}
                        color={themePref === 'dark' ? colors.primary : colors.textMute}
                      />
                    ),
                  },
                ] as const
              ).map(({ value, label, icon }) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setThemePref(value);
                  }}
                  style={[
                    s.themeBtn,
                    { borderColor: colors.border },
                    themePref === value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: themePref === value }}
                >
                  {icon}
                  <Text
                    style={[
                      s.pillText,
                      { color: colors.text },
                      themePref === value && { color: colors.primary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save CTA */}
            <TouchableOpacity
              onPress={save}
              disabled={!canSave}
              activeOpacity={0.85}
              style={[s.saveCta, { marginTop: 32 }, !canSave && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel={t.save}
              accessibilityState={{ disabled: !canSave }}
            >
              <LinearGradient
                colors={[colors.primary, '#0a3d18']}
                style={s.saveGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Save size={20} color="#FFFFFF" />
                <Text style={[s.saveText, { color: '#FFFFFF' }]}>{t.save}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 48 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Section({ icon, label }: { icon?: React.ReactNode; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.sectionLabel}>
      {icon}
      <Text style={[s.sectionLabelText, { color: colors.textMute }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.3,
  },
  dirtyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  dirtyText: { color: '#f59e0b', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
    lineHeight: 18,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputErr: { borderColor: '#ef4444' },
  input: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  errText: { color: '#ef4444', fontSize: 12, fontFamily: 'Inter_500Medium' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minHeight: 44,
    justifyContent: 'center',
  },
  pillText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter_700Bold' },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minHeight: 44,
    justifyContent: 'center',
  },
  actBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minHeight: 44,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rolePillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginTop: 6,
  },
  toggleLabel: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saveCta: { borderRadius: 16, overflow: 'hidden' },
  saveGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  saveText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0.3,
  },
});
