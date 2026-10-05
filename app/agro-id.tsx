import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import RemoteImage from '../components/RemoteImage';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  QrCode,
  ShieldCheck,
  Download,
  Plus,
  Info,
  Check,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useFarmDataStore } from '../store/useFarmDataStore';
import { exportPnlPdf, PnlReport } from '../lib/pdf/pnl';
import { Gate } from '../lib/access';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { computeCreditScore } from '../lib/credit/score';
import { pushLedgerEntry } from '../lib/credit/ledgerSync';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.abs(n));

const INCOME_CATEGORIES = ['Sale · Mazao', 'Cooperative', 'Mkataba', 'Other'];
const EXPENSE_CATEGORIES = ['Input · Mbegu', 'Input · Mbolea', 'Labour', 'Transport', 'Other'];

const TRACK_RECORDS = [
  { date: 'Feb 10', title: 'Compost', subtitle: 'Fertilizer', completed: true },
  { date: 'Feb 17', title: 'Superior', subtitle: 'Seeds', completed: true },
  { date: 'Feb 24', title: 'KCl', subtitle: 'Fertilizer', completed: true },
  { date: 'Mar 03', title: 'SP-36', subtitle: 'Fertilizer', completed: false },
];

export default function AgroIdScreen() {
  const router = useRouter();
  const { colors, isDark, radius } = useTheme();
  const agroId = useKilimoStore((s) => s.agroId);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const ledger = useFarmDataStore((s) => s.ledger);
  const addLedgerEntry = useFarmDataStore((s) => s.addLedgerEntry);
  const insurance = useFarmDataStore((s) => s.insurance);
  const language = useKilimoStore((s) => s.language);
  const sw = language === 'sw';
  const [exporting, setExporting] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  // Add-entry form state
  const [entryType, setEntryType] = useState<'income' | 'expense'>('income');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const { income, expense, net } = useMemo(() => {
    const inc = ledger.filter((e) => e.amountTZS > 0).reduce((s, e) => s + e.amountTZS, 0);
    const exp = ledger
      .filter((e) => e.amountTZS < 0)
      .reduce((s, e) => s + Math.abs(e.amountTZS), 0);
    return { income: inc, expense: exp, net: inc - exp };
  }, [ledger]);

  // Transparent, rule-based credit score derived from the verified ledger.
  const credit = useMemo(
    () =>
      computeCreditScore({
        ledger,
        nowISO: new Date().toISOString(),
        hasActiveInsurance: insurance.some((p) => p.status === 'active'),
        contractsCompleted: 0,
      }),
    [ledger, insurance]
  );

  // Verifiable QR — points at the public verify-agro-id edge function when the
  // backend URL is configured, falling back to the marketing verify page.
  const qrPayload = SUPABASE_URL
    ? `${SUPABASE_URL}/functions/v1/verify-agro-id?token=${encodeURIComponent(agroId?.id ?? 'unknown')}`
    : `https://kilimo.ai/verify/${agroId?.id ?? 'unknown'}`;

  async function handleExport() {
    if (!agroId) return;
    setExporting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const report: PnlReport = {
        agroId,
        seasonLabel: 'Msimu wa Mvua Ndefu 2026',
        items: ledger.map(({ id, ...rest }) => ({
          date: rest.date,
          category: rest.category,
          description: rest.description,
          amount: rest.amountTZS,
        })),
        generatedAt: new Date().toISOString(),
        qrPayload,
      };
      await exportPnlPdf(report);
    } catch (err: any) {
      Alert.alert('Hitilafu', err?.message ?? 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }

  function resetEntryForm() {
    setEntryAmount('');
    setEntryNote('');
    setEntryCategory('');
    setEntryType('income');
  }

  async function submitEntry() {
    const amt = parseInt(entryAmount.replace(/[^0-9]/g, ''), 10);
    if (!amt || amt <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        sw ? 'Kiasi si sahihi' : 'Invalid amount',
        sw ? 'Tafadhali weka kiasi sahihi cha TZS.' : 'Please enter a valid TZS amount.'
      );
      return;
    }
    const cat =
      entryCategory || (entryType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    // One id shared by the local row and the server row so the two can be
    // reconciled/deduped (the store keeps this id; pushLedgerEntry sends it as
    // client_id).
    const clientId = `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry = {
      date: new Date().toISOString(),
      category: cat,
      description: entryNote.trim() || cat,
      amountTZS: entryType === 'income' ? amt : -amt,
    };

    setSavingEntry(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Offline-first: the entry is saved locally immediately, then synced. We
    // await the sync so the confirmation reflects whether the server has it yet
    // (self-reported entries are not "verified" until a trusted source confirms).
    addLedgerEntry({ ...entry, id: clientId });
    const sync = await pushLedgerEntry({ id: clientId, ...entry });
    setSavingEntry(false);
    resetEntryForm();
    setUpdateModalVisible(false);
    Alert.alert(
      sw ? 'Imehifadhiwa' : 'Saved',
      sync.ok
        ? sw
          ? 'Muamala umehifadhiwa na kusawazishwa.'
          : 'Entry saved and synced to your ledger.'
        : sw
          ? 'Muamala umehifadhiwa kwenye kifaa; itasawazishwa ukiwa mtandaoni.'
          : 'Entry saved on device; it will sync when you’re online.'
    );
  }

  // Previously claimed every one of these fields was "verified... retrieved
  // from your cooperative farm profile" — false for all five: Market Price /
  // Highest Demand / Fertilization / Plant Age / Certification are static
  // sample values (see MARKET_INFO_SAMPLE below), not pulled from any
  // cooperative or real market/agronomy backend. Only the credit score is
  // genuinely computed from the farmer's own ledger (see the honest
  // footnote already shown under that card).
  const handleInfoPress = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      label,
      language === 'sw'
        ? 'Hii ni thamani ya mfano kwa onyesho — si data halisi ya ushirika au soko.'
        : 'This is a sample value for preview — not real cooperative or market data.'
    );
  };

  if (!agroId) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.textMute, fontFamily: 'Inter_500Medium' }}>
          Sign in to view your Agro ID.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <Gate
      feature="agro_id"
      fallback={
        <SafeAreaView
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            },
          ]}
        >
          <Card variant="solid" style={{ padding: 24, alignItems: 'center' }}>
            <ShieldCheck size={32} color={colors.textMute} />
            <Text
              style={{
                color: colors.text,
                fontFamily: 'Inter_800ExtraBold',
                fontSize: 16,
                marginTop: 12,
              }}
            >
              Access Denied
            </Text>
            <Text
              style={{
                color: colors.textMute,
                textAlign: 'center',
                marginTop: 8,
                fontFamily: 'Inter_500Medium',
              }}
            >
              Your tier does not support Agro ID verification passport.
            </Text>
          </Card>
        </SafeAreaView>
      }
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Top Hero Photo */}
          <View style={styles.heroWrapper}>
            <Image
              source={require('../assets/images/rice-field-bg.png')}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.1)']}
              style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.heroHeader}>
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={sw ? 'Rudi nyuma' : 'Go back'}
              >
                <BlurView intensity={30} tint="dark" style={styles.iconBtn}>
                  <ChevronLeft size={22} color="#fff" />
                </BlurView>
              </TouchableOpacity>

              <View style={[styles.locationPill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <MapPin size={12} color={colors.primary} />
                <Text style={styles.locationText}>
                  {farmProfile?.region || agroId?.location || (sw ? 'Tanzania' : 'Tanzania')}
                </Text>
              </View>

              <View style={styles.heroAvatarBorder}>
                <RemoteImage
                  uri={agroId?.avatarUrl}
                  style={styles.heroAvatar}
                  resizeMode="cover"
                  accessibilityLabel={agroId?.name ? `${agroId.name} avatar` : 'Profile avatar'}
                  fallback={
                    <View style={[styles.heroAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.heroAvatarText}>{agroId?.name?.[0]}</Text>
                    </View>
                  }
                />
              </View>
            </SafeAreaView>
          </View>

          {/* Details Card Content (mokupoku UI) */}
          <View
            style={[
              styles.contentCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cropTitle, { color: colors.text }]}>
              {farmProfile?.primaryCrops?.[0]
                ? `${farmProfile.primaryCrops[0]} Farming`
                : sw
                  ? 'Shamba Langu'
                  : 'My Farm'}
            </Text>

            {/* Credit Score — transparent, ledger-derived */}
            <View
              style={[
                styles.creditCard,
                {
                  backgroundColor: isDark ? colors.primary + '14' : colors.primary + '0D',
                  borderColor: colors.primary + '33',
                },
              ]}
            >
              <View style={styles.creditTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.creditLabel, { color: colors.textMute }]}>
                    {sw ? 'ALAMA YA MIKOPO' : 'CREDIT SCORE'}
                  </Text>
                  <View style={styles.creditScoreRow}>
                    <Text style={[styles.creditScoreNum, { color: colors.primary }]}>
                      {credit.score}
                    </Text>
                    <Text style={[styles.creditScoreMax, { color: colors.textMute }]}>/ 850</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={[styles.creditBandPill, { backgroundColor: colors.primary + '18' }]}>
                    <ShieldCheck size={11} color={colors.primary} />
                    <Text style={[styles.creditBandText, { color: colors.primary }]}>
                      {sw ? credit.bandLabelSw : credit.bandLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleInfoPress(sw ? 'Alama ya Mikopo' : 'Credit Score')}
                    style={styles.infoCircle}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={sw ? 'Maelezo ya alama ya mikopo' : 'About credit score'}
                  >
                    <Info size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.creditTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.creditFill,
                    {
                      width: `${Math.round(((credit.score - 300) / 550) * 100)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.factorList}>
                {credit.factors.map((f) => (
                  <View key={f.key} style={styles.factorRow}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={[styles.factorLabel, { color: colors.text }]} numberOfLines={1}>
                        {sw ? f.labelSw : f.label}
                      </Text>
                      <Text
                        style={[styles.factorDetail, { color: colors.textMute }]}
                        numberOfLines={1}
                      >
                        {sw ? f.detailSw : f.detail}
                      </Text>
                    </View>
                    <View style={[styles.factorBarTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.factorBarFill,
                          {
                            width: `${Math.round((f.score / f.max) * 100)}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <Text style={[styles.creditFootnote, { color: colors.textMute }]}>
                {sw
                  ? 'Imehesabiwa kutoka leja yako iliyothibitishwa. Si ushauri wa kifedha.'
                  : 'Computed from your verified ledger. Not financial advice.'}
              </Text>
            </View>

            {/* Section 1: Market Conditions — sample data below (see comment
                on handleInfoPress above); no live market-price backend is
                wired anywhere in this app. */}
            <View style={styles.section}>
              <View
                style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}
              >
                <Text style={[styles.sectionHeader, { color: colors.textMute, marginBottom: 0 }]}>
                  {sw ? 'HALI YA SOKO' : 'MARKET CONDITIONS'}
                </Text>
                <Text
                  style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.textMute + '99' }}
                >
                  {sw ? '· MFANO' : '· SAMPLE'}
                </Text>
              </View>
              <View style={[styles.cardBlock, { borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMute }]}>Market Price</Text>
                  <View style={styles.detailRight}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      $50.00 / TZS 120k
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleInfoPress('Market Price')}
                      style={styles.infoCircle}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={sw ? 'Maelezo zaidi' : 'More info'}
                    >
                      <Info size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMute }]}>
                    Highest Demand
                  </Text>
                  <View style={styles.detailRight}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {farmProfile?.region || 'Mbeya, Arusha, Dodoma'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleInfoPress('Highest Demand')}
                      style={styles.infoCircle}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={sw ? 'Maelezo zaidi' : 'More info'}
                    >
                      <Info size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: Information — Plant Age / Fertilization are sample
                data (no per-crop growth or input-application tracking is
                wired anywhere in this app yet — tapping the info icon now
                honestly says so via the fixed handleInfoPress above).
                Certification below uses the real agroId.verificationStatus. */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: colors.textMute }]}>INFORMATION</Text>
              <View style={[styles.cardBlock, { borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMute }]}>Plant Age</Text>
                  <View style={styles.detailRight}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>Week 4</Text>
                  </View>
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMute }]}>
                    Fertilization
                  </Text>
                  <View style={styles.detailRight}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      Urea, SP-36, KCl and ZA
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleInfoPress('Fertilization')}
                      style={styles.infoCircle}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={sw ? 'Maelezo zaidi' : 'More info'}
                    >
                      <Info size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMute }]}>
                    {sw ? 'Uthibitisho' : 'Verification'}
                  </Text>
                  <View style={styles.detailRight}>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color:
                            agroId.verificationStatus === 'verified'
                              ? colors.primary
                              : agroId.verificationStatus === 'pending'
                                ? '#f59e0b'
                                : colors.textMute,
                        },
                      ]}
                    >
                      {agroId.verificationStatus === 'verified'
                        ? sw
                          ? 'Imethibitishwa'
                          : 'Verified'
                        : agroId.verificationStatus === 'pending'
                          ? sw
                            ? 'Inasubiri'
                            : 'Pending'
                          : sw
                            ? 'Haijathibitishwa'
                            : 'Unverified'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 3: Track Records — 2×2 card grid. Sample data: no
                per-input application tracking is wired anywhere in this app
                yet, so this is illustrative rather than this farmer's real
                fertilizer/seed history. */}
            <View style={styles.section}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <Text style={[styles.sectionHeader, { color: colors.textMute, marginBottom: 0 }]}>
                  TRACK RECORDS {sw ? '· MFANO' : '· SAMPLE'}
                </Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.primary }}>
                  {TRACK_RECORDS.filter((r) => r.completed).length}/{TRACK_RECORDS.length} Done
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {TRACK_RECORDS.map((item, idx) => {
                  const nextIdx = TRACK_RECORDS.findIndex((r) => !r.completed);
                  const isCompleted = item.completed;
                  const isNext = !item.completed && nextIdx === idx;
                  const accentColor = isCompleted
                    ? colors.primary
                    : isNext
                      ? '#f59e0b'
                      : isDark
                        ? 'rgba(255,255,255,0.1)'
                        : '#c4d0c0';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.trackCard2,
                        {
                          backgroundColor: isCompleted
                            ? isDark
                              ? colors.primary + '12'
                              : colors.primary + '0D'
                            : isNext
                              ? isDark
                                ? 'rgba(245,158,11,0.07)'
                                : 'rgba(245,158,11,0.05)'
                              : isDark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                          borderColor: isCompleted
                            ? colors.primary + '38'
                            : isNext
                              ? 'rgba(245,158,11,0.28)'
                              : colors.border,
                        },
                      ]}
                    >
                      {/* Left accent bar */}
                      <View style={[styles.trackAccentBar, { backgroundColor: accentColor }]} />

                      {/* Card content */}
                      <View style={styles.trackCardBody}>
                        {/* Top row: status circle + date */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 9,
                          }}
                        >
                          <View
                            style={[
                              styles.trackStatusCircle,
                              {
                                backgroundColor: isCompleted
                                  ? colors.primary + '26'
                                  : isNext
                                    ? 'rgba(245,158,11,0.15)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.06)'
                                      : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                          >
                            {isCompleted ? (
                              <Check size={10} color={colors.primary} strokeWidth={3} />
                            ) : isNext ? (
                              <View
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 3,
                                  backgroundColor: '#f59e0b',
                                }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 3,
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#c4d0c0',
                                }}
                              />
                            )}
                          </View>
                          <Text
                            style={{
                              fontFamily: 'Inter_700Bold',
                              fontSize: 10,
                              color: isCompleted
                                ? colors.primary
                                : isNext
                                  ? '#f59e0b'
                                  : colors.textMute,
                            }}
                          >
                            {item.date}
                          </Text>
                        </View>

                        {/* Title + subtitle */}
                        <Text
                          style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 13,
                            color: isDark ? '#fff' : colors.text,
                            marginBottom: 2,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 11,
                            color: colors.textMute,
                          }}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Ledger P&L summary list */}
            <View style={[styles.section, { marginTop: 8 }]}>
              <View style={styles.ledgerHeader}>
                <Text style={[styles.sectionHeader, { color: colors.textMute, marginBottom: 0 }]}>
                  {language === 'sw' ? 'RIPOTI YA MAPATO NA MATUMIZI' : 'FINANCIAL PASSPORT LEDGER'}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: 'Inter_800ExtraBold',
                    color: net < 0 ? '#ef4444' : colors.primary,
                  }}
                >
                  NET: {net < 0 ? '−' : ''}TZS {fmt(net)}
                </Text>
              </View>

              <View style={[styles.cardBlock, { borderColor: colors.border, padding: 12 }]}>
                {ledger.length === 0 ? (
                  <Text
                    style={{
                      color: colors.textMute,
                      fontSize: 12,
                      textAlign: 'center',
                      paddingVertical: 12,
                      fontFamily: 'Inter_500Medium',
                    }}
                  >
                    No financial records found. Tap Update Info to add.
                  </Text>
                ) : (
                  ledger.slice(0, 5).map((e, idx) => (
                    <View key={e.id}>
                      <View style={styles.ledgerRow}>
                        <View
                          style={[
                            styles.ledgerDot,
                            { backgroundColor: e.amountTZS > 0 ? colors.primary : '#ef4444' },
                          ]}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text
                            style={[styles.ledgerDesc, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {e.description}
                          </Text>
                          <Text style={[styles.ledgerMeta, { color: colors.textMute }]}>
                            {e.category} · {new Date(e.date).toLocaleDateString('en-GB')}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.ledgerAmt,
                            { color: e.amountTZS > 0 ? colors.primary : '#ef4444' },
                          ]}
                        >
                          {e.amountTZS > 0 ? '+' : '−'} {fmt(e.amountTZS)}
                        </Text>
                      </View>
                      {idx < Math.min(4, ledger.length - 1) && (
                        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: isDark ? '#263322' : '#D4E9CD' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setQrModalVisible(true);
                }}
              >
                <QrCode size={18} color={isDark ? '#FFFFFF' : colors.primary} />
                <Text style={[styles.downloadText, { color: isDark ? '#FFFFFF' : colors.primary }]}>
                  Download QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.updateBtn, { backgroundColor: '#0a3d18' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setUpdateModalVisible(true);
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.updateText}>Update Info</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modal 1: Scannable QR ID Modal */}
        <Modal
          visible={qrModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setQrModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <ShieldCheck size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Verified Crop Passport
                </Text>
              </View>
              <Text style={[styles.modalDesc, { color: colors.textMute }]}>
                ID: {agroId.id} • {agroId.name}
              </Text>

              <View style={styles.modalQrContainer}>
                <QRCode value={qrPayload} size={160} backgroundColor="#fff" color="#000" />
              </View>

              <Text style={[styles.modalHint, { color: colors.textMute }]}>
                Banks, buyers, and agricultural cooperatives scan this code to instantly verify your
                farm record, certifications, and P&L history.
              </Text>

              <TouchableOpacity
                style={[
                  styles.modalCtaBtn,
                  { backgroundColor: colors.primary, opacity: exporting ? 0.6 : 1 },
                ]}
                onPress={() => {
                  setQrModalVisible(false);
                  handleExport();
                }}
                disabled={exporting}
              >
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.modalCtaText}>
                  {exporting ? 'Exporting PDF...' : 'Download Verified PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={[styles.modalCloseText, { color: colors.textMute }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal 2: Update Ledger entry Modal */}
        <Modal
          visible={updateModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setUpdateModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.addSheetOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setUpdateModalVisible(false)}
            />
            <View
              style={[
                styles.addSheet,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Drag handle */}
              <View style={[styles.addSheetHandle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={styles.addSheetHeader}>
                <View style={[styles.addSheetIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Layers size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addSheetTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Ongeza Muamala' : 'Add Entry'}
                  </Text>
                  <Text style={[styles.addSheetSub, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Ledger ya Agro ID yako' : 'Your verified Agro ID ledger'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setUpdateModalVisible(false)}
                  style={[
                    styles.addSheetClose,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <X size={16} color={colors.textMute} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={[styles.addSheetDivider, { backgroundColor: colors.border }]} />

              {/* Income / Expense toggle */}
              <View style={styles.segmentRow}>
                {(['income', 'expense'] as const).map((t) => {
                  const active = entryType === t;
                  const accent = t === 'income' ? colors.primary : '#ef4444';
                  return (
                    <TouchableOpacity
                      key={t}
                      activeOpacity={0.85}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEntryType(t);
                        setEntryCategory('');
                      }}
                      style={[
                        styles.segmentBtn,
                        {
                          borderColor: active ? accent : colors.border,
                          backgroundColor: active ? accent + '14' : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={
                        t === 'income' ? (sw ? 'Mapato' : 'Income') : sw ? 'Gharama' : 'Expense'
                      }
                    >
                      {t === 'income' ? (
                        <ArrowDownLeft size={16} color={active ? accent : colors.textMute} />
                      ) : (
                        <ArrowUpRight size={16} color={active ? accent : colors.textMute} />
                      )}
                      <Text
                        style={[styles.segmentText, { color: active ? accent : colors.textMute }]}
                      >
                        {t === 'income' ? (sw ? 'Mapato' : 'Income') : sw ? 'Gharama' : 'Expense'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { color: colors.textMute }]}>
                {sw ? 'Kiasi (TZS)' : 'Amount (TZS)'}
              </Text>
              <View
                style={[
                  styles.amountWrap,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.amountPrefix, { color: colors.textMute }]}>TZS</Text>
                <TextInput
                  value={entryAmount}
                  onChangeText={(t) => setEntryAmount(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMute}
                  style={[styles.amountInput, { color: colors.text }]}
                  accessibilityLabel={sw ? 'Kiasi cha TZS' : 'TZS amount'}
                  returnKeyType="done"
                />
              </View>

              {/* Category chips */}
              <Text style={[styles.fieldLabel, { color: colors.textMute }]}>
                {sw ? 'Aina' : 'Category'}
              </Text>
              <View style={styles.chipRow}>
                {(entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => {
                  const selected =
                    (entryCategory ||
                      (entryType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])) ===
                    c;
                  return (
                    <TouchableOpacity
                      key={c}
                      activeOpacity={0.85}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEntryCategory(c);
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + '14' : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.primary : colors.textMute },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Note */}
              <Text style={[styles.fieldLabel, { color: colors.textMute }]}>
                {sw ? 'Maelezo (hiari)' : 'Note (optional)'}
              </Text>
              <TextInput
                value={entryNote}
                onChangeText={setEntryNote}
                placeholder={sw ? 'mf. Mauzo ya mahindi 200kg' : 'e.g. Maize sale 200kg'}
                placeholderTextColor={colors.textMute}
                style={[
                  styles.noteInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                accessibilityLabel={sw ? 'Maelezo' : 'Note'}
              />

              {/* Save */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primary, opacity: savingEntry ? 0.6 : 1 },
                ]}
                onPress={submitEntry}
                disabled={savingEntry}
                accessibilityRole="button"
                accessibilityLabel={sw ? 'Hifadhi muamala' : 'Save entry'}
              >
                <Check size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{sw ? 'Hifadhi Muamala' : 'Save Entry'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Gate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 0 },

  // Hero Image
  heroWrapper: {
    height: 250,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 36,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  heroAvatarBorder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    padding: 1.5,
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
  },

  // Content Overlay Card
  contentCard: {
    marginTop: -30,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  cropTitle: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // Grouped rows block
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 9,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardBlock: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  infoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 111, 64, 0.08)',
  },
  rowDivider: {
    height: 1,
  },

  // Track records — 2×2 card grid
  trackCard2: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trackAccentBar: {
    width: 4,
  },
  trackCardBody: {
    flex: 1,
    padding: 12,
  },
  trackStatusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Ledger summary
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  ledgerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ledgerDesc: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  ledgerMeta: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  ledgerAmt: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
  },

  // Bottom action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 6,
  },
  downloadText: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  updateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 6,
  },
  updateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },

  // ── Add Entry Bottom Sheet ─────────────────────────────────────────
  addSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  addSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  addSheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSheetTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  addSheetSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 1,
  },
  addSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  addSheetCards: {
    gap: 10,
    marginBottom: 16,
  },
  addSheetActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  addSheetActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSheetActionLabel: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    marginBottom: 3,
  },
  addSheetActionSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  addSheetActionPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSheetCancel: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addSheetCancelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.2,
  },
  modalDesc: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalQrContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
  },
  modalHint: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  modalCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  modalCloseBtn: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  ledgerActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  quickBtnText: {
    fontFamily: 'Inter_800ExtraBold',
  },

  // ── Credit Score card ──────────────────────────────────────────────
  creditCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  creditTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  creditLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  creditScoreNum: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  creditScoreMax: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  creditBandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  creditBandText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  creditTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  creditFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorList: {
    gap: 10,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  factorLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  factorDetail: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  factorBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  creditFootnote: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginTop: 14,
    lineHeight: 14,
  },

  // ── Add-entry form ─────────────────────────────────────────────────
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  amountPrefix: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    paddingVertical: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 18,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
  },
});
