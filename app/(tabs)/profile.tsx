import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  Switch,
  Platform,
} from 'react-native';
import {
  Settings,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  Database,
  Fingerprint,
  WifiOff,
  Globe,
  Bot,
  Award,
  Tv,
  Trash2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import Animated, { FadeIn, FadeOut, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useAgroAuth } from '../../hooks/useAgroAuth';
import { ArrowUpRight } from 'lucide-react-native';
import { Alert, AlertButton } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AGRO_ID_FALLBACK = {
  name: 'Justin Mafie',
  role: 'Mkulima Mkuu',
  location: 'Arusha, Tanzania',
  id: 'KILIMO-8492-XJ',
  tier: 'Premium Co-op Member',
  joinDate: '2023',
};

const showSafeAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[],
  // For irreversible actions (e.g. account deletion): when window.confirm is
  // unavailable (sandboxed iframe throws), DEFAULT TO CANCEL instead of
  // auto-running the destructive button. Never delete without explicit consent.
  opts?: { cancelOnUnavailable?: boolean }
) => {
  const runCancel = () => {
    const cancelBtn = buttons?.find((b) => b.style === 'cancel') || buttons?.[0];
    cancelBtn?.onPress?.();
  };
  const runPrimary = () => {
    const primaryBtn =
      buttons?.find((b) => b.style === 'destructive') ||
      buttons?.find(
        (b) =>
          b.text === 'Ondoka' ||
          b.text === 'Discard' ||
          b.text === 'Sync' ||
          b.text === 'Kusawazisha'
      ) ||
      buttons?.[1] ||
      buttons?.[0];
    primaryBtn?.onPress?.();
  };

  if (Platform.OS === 'web') {
    try {
      if (window.confirm(`${title}\n\n${message}`)) runPrimary();
      else runCancel();
    } catch (e) {
      console.warn('Alert blocked by iframe sandbox:', e);
      // Fail safe: destructive flows cancel; non-destructive keep prior behavior.
      if (opts?.cancelOnUnavailable) runCancel();
      else runPrimary();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function ProfileScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const router = useRouter();
  const storedAgroId = useKilimoStore((s) => s.agroId);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const setOffline = useKilimoStore((s) => s.setOffline);
  const resetOnboarding = useKilimoStore((s) => s.resetOnboarding);
  const language = useKilimoStore((s) => s.language);
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const { deleteAccount, loading: authLoading } = useAgroAuth();
  const aiCertified = useKilimoStore((s) => s.aiCertified);

  const [biometric, setBiometric] = useState(true);

  const AGRO_ID_DATA = useMemo(() => {
    if (storedAgroId) return storedAgroId;
    return {
      ...AGRO_ID_FALLBACK,
      role: language === 'sw' ? 'Mkulima Mkuu' : 'Master Farmer',
      tier: language === 'sw' ? 'Mwanachama wa Ushirika wa Premium' : 'Premium Co-op Member',
    };
  }, [storedAgroId, language]);

  const PROFILE_SECTIONS = [
    {
      title: language === 'sw' ? 'AGRO ID & USALAMA' : 'AGRO ID & SECURITY',
      items: [
        {
          id: 'identity',
          title: language === 'sw' ? 'Uthibitisho wa Kibayometriki' : 'Biometric Identity',
          icon: <Fingerprint size={20} color="#3b82f6" />,
          hasSwitch: true,
          switchVal: biometric,
          onSwitch: (v: boolean) => {
            setBiometric(v);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          value: '',
        },
        {
          id: 'security',
          title: language === 'sw' ? 'Usalama & Faragha' : 'Security & Privacy',
          icon: <ShieldCheck size={20} color="#64748b" />,
          hasSwitch: false,
          value: '',
          onPress: () => router.push('/privacy' as any),
        },
      ],
    },
    {
      title: language === 'sw' ? 'AI & MAFUNZO' : 'AI & TRAINING',
      items: [
        {
          id: 'ai-hub',
          title: language === 'sw' ? 'Mafunzo ya Sankofa AI' : 'Sankofa AI Training Hub',
          icon: <Award size={20} color="#eab308" />,
          hasSwitch: false,
          value: aiCertified
            ? language === 'sw'
              ? 'Imethibitishwa'
              : 'Certified'
            : language === 'sw'
              ? 'Anza'
              : 'Start',
          onPress: () => router.push('/ai-training-hub' as any),
        },
        {
          id: 'ai-admin',
          title: language === 'sw' ? 'Usimamizi wa Sankofa' : 'AI Admin Console',
          icon: <Bot size={20} color="#10b981" />,
          hasSwitch: false,
          value: '',
          onPress: () => router.push('/ai-admin' as any),
        },
        {
          id: 'video-hub',
          title: language === 'sw' ? 'Maktaba ya Video' : 'Agriculture Video Hub',
          icon: <Tv size={20} color="#ef4444" />,
          hasSwitch: false,
          value: '',
          onPress: () => router.push('/video-hub' as any),
        },
      ],
    },
    {
      title: language === 'sw' ? 'KILIMO CHA KISASA' : 'SMART FARMING',
      items: [
        {
          id: 'iot',
          title: language === 'sw' ? 'Mifumo ya IoT & Drones' : 'IoT & Drone Systems',
          icon: <Settings size={20} color="#0ea5e9" />,
          hasSwitch: false,
          value: language === 'sw' ? 'Inatafuta...' : 'Searching...',
          onPress: () => router.push('/iot-systems' as any),
        },
        {
          id: 'soil',
          title: language === 'sw' ? 'Uchambuzi wa Udongo' : 'Soil Analysis',
          icon: <Database size={20} color="#a3e635" />,
          hasSwitch: false,
          value: '',
          onPress: () => router.push('/soil-analysis' as any),
        },
      ],
    },
    {
      title: language === 'sw' ? 'MIFUMO & MTANDAO' : 'SYSTEM & NETWORK',
      items: [
        {
          id: 'language',
          title: language === 'sw' ? 'Lugha ya Programu' : 'App Language',
          icon: <Globe size={20} color={colors.primary} />,
          hasSwitch: false,
          value: language === 'sw' ? 'Kiswahili' : 'English',
          onPress: () => {
            const nextLang = language === 'sw' ? 'en' : 'sw';
            setLanguage(nextLang);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showSafeAlert(
              nextLang === 'sw' ? 'Lugha Imesasishwa' : 'Language Updated',
              nextLang === 'sw'
                ? 'Lugha ya programu sasa ni Kiswahili.'
                : 'App language is now English.'
            );
          },
        },
        {
          id: 'offline',
          title: language === 'sw' ? 'Njia ya Nje ya Mtandao' : 'Offline-First Mode',
          icon: <WifiOff size={20} color="#ef4444" />,
          hasSwitch: true,
          switchVal: isOffline,
          onSwitch: (v: boolean) => {
            setOffline(v);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
          value: '',
        },
        {
          id: 'sync',
          title: language === 'sw' ? 'Kusawazisha Data' : 'Local Cache Sync',
          icon: <Database size={20} color="#8b5cf6" />,
          hasSwitch: false,
          value: language === 'sw' ? 'Mwisho: saa 2 zilizopita' : 'Last sync: 2h ago',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showSafeAlert(
              language === 'sw' ? 'Kusawazisha' : 'Sync',
              language === 'sw'
                ? 'Data yako imesawazishwa kikamilifu.'
                : 'Your data has been fully synchronized.'
            );
          },
        },
      ],
    },
    {
      title: language === 'sw' ? 'MSAADA & VIGEZO' : 'HELP & SUPPORT',
      items: [
        {
          id: 'help',
          title: language === 'sw' ? 'Msaada & Huduma' : 'Help & Support',
          icon: <HelpCircle size={20} color="#64748b" />,
          hasSwitch: false,
          value: '',
          onPress: () => router.push('/terms' as any),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Cinematic Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isDark ? ['#080C08', '#0E1E10', '#080C08'] : ['#F0FAF2', '#E6F5EB', '#F0FAF2']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View>
            {/* Header */}
            <Animated.View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Kitambulisho' : 'Identity'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/edit-profile' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit profile settings"
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Settings size={24} color={colors.text} />
              </TouchableOpacity>
            </Animated.View>

            {/* Agro ID Card */}
            <Animated.View style={styles.idCardContainer}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/agro-id' as any);
                }}
                activeOpacity={0.92}
                accessibilityRole="button"
                accessibilityLabel="Open Agro ID dashboard"
              >
                <BlurView
                  intensity={isDark ? 30 : 70}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.idCard, { borderColor: colors.border }]}
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? [colors.primary + '26', 'rgba(30, 41, 59, 0.4)']
                        : [colors.primary + '1A', 'rgba(255, 255, 255, 0.8)']
                    }
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />

                  <View style={styles.idHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.idBadge}>
                        <Fingerprint size={12} color={colors.primary} />
                        <Text style={[styles.idBadgeText, { color: colors.primary }]}>AGRO ID</Text>
                      </View>
                      {aiCertified && (
                        <View
                          style={[styles.idBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                        >
                          <Bot size={12} color="#3b82f6" />
                          <Text style={[styles.idBadgeText, { color: '#3b82f6' }]}>
                            SANKOFA CERTIFIED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.idNumber, { color: colors.textMute }]}>
                      {AGRO_ID_DATA.id}
                    </Text>
                  </View>

                  <View style={styles.profileRow}>
                    <View
                      style={[
                        styles.profileImage,
                        {
                          borderColor: colors.primary + '40',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 24,
                          fontFamily: 'InstrumentSerif_400Regular',
                        }}
                      >
                        {AGRO_ID_DATA.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileName, { color: colors.text }]}>
                        {AGRO_ID_DATA.name}
                      </Text>
                      <Text style={[styles.profileRole, { color: colors.textMute }]}>
                        {AGRO_ID_DATA.role}
                      </Text>
                      <Text style={[styles.profileLocation, { color: colors.textMute }]}>
                        {AGRO_ID_DATA.location}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tierContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.tierText, { color: colors.text }]}>
                      {AGRO_ID_DATA.tier}
                    </Text>
                    <Text style={[styles.joinText, { color: colors.textMute }]}>
                      {language === 'sw'
                        ? `Mwanachama tangu ${AGRO_ID_DATA.joinDate}`
                        : `Member since ${AGRO_ID_DATA.joinDate}`}
                    </Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>

            {/* Sections */}
            {PROFILE_SECTIONS.map((section, sIdx) => (
              <View key={sIdx} style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textMute }]}>
                  {section.title}
                </Text>

                <BlurView
                  intensity={isDark ? 20 : 60}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.sectionBlock, { borderColor: colors.border }]}
                >
                  {section.items.map((item, iIdx) => (
                    <View key={item.id}>
                      <TouchableOpacity
                        activeOpacity={item.hasSwitch ? 1 : 0.7}
                        onPress={() => {
                          if (!item.hasSwitch && (item as any).onPress) {
                            Haptics.selectionAsync();
                            (item as any).onPress();
                          }
                        }}
                        style={styles.itemRow}
                        accessibilityRole={item.hasSwitch ? 'none' : 'button'}
                        accessibilityLabel={item.title}
                        accessibilityHint={!item.hasSwitch && item.value ? item.value : undefined}
                      >
                        <View
                          style={[
                            styles.itemIconBg,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.03)',
                            },
                          ]}
                        >
                          {item.icon}
                        </View>
                        <View style={styles.itemContent}>
                          <Text style={[styles.itemTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          {!item.hasSwitch && item.value ? (
                            <Text style={[styles.itemValue, { color: colors.textMute }]}>
                              {item.value}
                            </Text>
                          ) : null}
                        </View>

                        {item.hasSwitch ? (
                          <Switch
                            value={(item as any).switchVal as boolean}
                            trackColor={{
                              false: isDark ? '#1C241E' : '#E6DFD5',
                              true: colors.primary,
                            }}
                            thumbColor="#fff"
                            onValueChange={(v) => (item as any).onSwitch?.(v)}
                            accessibilityLabel={item.title}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: (item as any).switchVal as boolean }}
                          />
                        ) : (
                          <ChevronRight size={20} color={colors.textMute} />
                        )}
                      </TouchableOpacity>

                      {iIdx < section.items.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))}
                </BlurView>
              </View>
            ))}

            {/* Logout */}
            <View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  showSafeAlert('Ondoka', 'Una uhakika unataka kutoka? Utahitaji kuingia tena.', [
                    { text: 'Ghairi', style: 'cancel' },
                    { text: 'Ondoka', style: 'destructive', onPress: () => resetOnboarding() },
                  ]);
                }}
                style={styles.logoutBtn}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                accessibilityHint="Signs you out and returns to the login screen"
              >
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Ondoka (Log Out)</Text>
              </TouchableOpacity>
            </View>

            {/* Delete account (required by App Store 5.1.1(v) / Google Play) */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={authLoading}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  const isSw = language === 'sw';
                  showSafeAlert(
                    isSw ? 'Futa Akaunti' : 'Delete Account',
                    isSw
                      ? 'Hii itafuta kabisa akaunti yako na taarifa zako zote (rekodi za fedha, Agro ID). Haiwezi kutenduliwa.'
                      : 'This permanently deletes your account and all your data (financial records, Agro ID). This cannot be undone.',
                    [
                      { text: isSw ? 'Ghairi' : 'Cancel', style: 'cancel' },
                      {
                        text: isSw ? 'Futa Kabisa' : 'Delete Forever',
                        style: 'destructive',
                        onPress: async () => {
                          const res = await deleteAccount();
                          if (res.ok) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            resetOnboarding();
                          } else {
                            showSafeAlert(
                              isSw ? 'Imeshindikana' : 'Deletion failed',
                              (isSw ? 'Tafadhali jaribu tena. ' : 'Please try again. ') +
                                (res.error ?? '')
                            );
                          }
                        },
                      },
                    ],
                    // Irreversible: never auto-confirm if the web dialog is blocked.
                    { cancelOnUnavailable: true }
                  );
                }}
                style={styles.deleteAccountBtn}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Futa akaunti' : 'Delete account'}
                accessibilityHint={
                  language === 'sw'
                    ? 'Kufuta akaunti yako na taarifa zote kabisa'
                    : 'Permanently deletes your account and all data'
                }
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={styles.deleteAccountText}>
                  {language === 'sw' ? 'Futa Akaunti (Delete Account)' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  bgOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    filter: 'blur(100px)',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -1,
  },
  idCardContainer: {
    marginBottom: 32,
  },
  idCard: {
    borderRadius: 32,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  idHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 111, 64, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  idBadgeText: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1,
  },
  idNumber: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 2,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  tierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  tierText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  joinText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  sectionBlock: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 16,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  itemValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'transparent',
    gap: 8,
  },
  deleteAccountText: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
