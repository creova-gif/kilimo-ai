/**
 * Insurance Hub — crop & livestock insurance discovery + claims
 * Integrates prefilled Agro ID profiles, Tanzanian insurers (Jubilee, NIC, Reliance),
 * and an interactive claims-filing process with photo uploads.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Shield,
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Check,
  User,
  Phone,
  MapPin,
  X,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../components/PageScaffold';
import { useTheme } from '../constants/Theme';
import { useFarmDataStore, InsurancePolicy } from '../store/useFarmDataStore';
import { useKilimoStore } from '../store/useKilimoStore';
import { Gate } from '../lib/access';

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

// No real insurer integration exists anywhere in this codebase — no payment
// gateway call, no API to Jubilee/NIC/Reliance/Britam/ACRE Africa. Enrollment
// and claims used to fake success after a 1.5s delay, telling users their
// mobile-money premium payment was "being verified" and that a real,
// named insurer was reviewing their claim — neither of which ever happened.
// Matches the honest IOT_BILLING_LIVE / SUPPLIER_ORDERING_LIVE pattern used
// elsewhere in this app for the same class of not-yet-real integration.
const INSURANCE_LIVE = false;

const STATUS_META = {
  browse: { color: '#94a3b8', label: 'Available' },
  pending: { color: '#f59e0b', label: 'Pending' },
  active: { color: '#2E6F40', label: 'Active' },
  expired: { color: '#64748b', label: 'Expired' },
  claimed: { color: '#3b82f6', label: 'Claim Filed' },
};

// Tanzanian Insurers & Policies list
const INSURER_POLICIES = [
  {
    id: 'p_jubilee',
    product: 'Mazao Bima — Crop Index Cover',
    provider: 'Jubilee Insurance',
    coverage: 'crop' as const,
    premiumTZS: 55_000,
    payoutMaxTZS: 1_500_000,
    termMonths: 6,
    status: 'browse' as const,
    desc: 'Bima ya mazao dhidi ya ukame, mafuriko, na wadudu kulingana na fahirisi ya hali ya hewa ya satelaiti.',
  },
  {
    id: 'p_nic',
    product: 'Mifugo Care — Livestock Cover',
    provider: 'NIC Insurance',
    coverage: 'livestock' as const,
    premiumTZS: 95_000,
    payoutMaxTZS: 2_800_000,
    termMonths: 12,
    status: 'browse' as const,
    desc: "Kinga thabiti kwa ng'ombe na mbuzi dhidi ya magonjwa ya mlipuko na vifo vya dharura.",
  },
  {
    id: 'p_reliance',
    product: 'Drought Shield — Tomato Cover',
    provider: 'Reliance Insurance',
    coverage: 'crop' as const,
    premiumTZS: 40_000,
    payoutMaxTZS: 1_200_000,
    termMonths: 4,
    status: 'browse' as const,
    desc: 'Bima maalum kwa wakulima wa mboga mboga dhidi ya ukosefu wa mvua wakati wa maua na matunda.',
  },
];

export default function InsuranceScreen() {
  const { colors, isDark } = useTheme();

  // Stores
  const agroId = useKilimoStore((s) => s.agroId);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const language = useKilimoStore((s) => s.language);

  const storePolicies = useFarmDataStore((s) => s.insurance);
  const enroll = useFarmDataStore((s) => s.enrollPolicy);
  const fileClaim = useFarmDataStore((s) => s.fileClaim);

  // Combine store policies and our custom Tanzanian insurer policies, ensuring uniqueness by ID
  const allPolicies = React.useMemo(() => {
    const map = new Map<string, InsurancePolicy>();
    // Seed initial policies from store
    storePolicies.forEach((p) => map.set(p.id, p));
    // Add custom ones if not already present
    INSURER_POLICIES.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [storePolicies]);

  const myPolicies = allPolicies.filter(
    (p) => p.status === 'active' || p.status === 'pending' || p.status === 'claimed'
  );
  const available = allPolicies.filter((p) => p.status === 'browse');

  // Modal States
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedEnrollPolicy, setSelectedEnrollPolicy] = useState<InsurancePolicy | null>(null);
  const [enrollStep, setEnrollStep] = useState(1);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  // Form Fields for Enrollment (Prefilled from Agro ID)
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerRegion, setFarmerRegion] = useState('');
  const [cropCovered, setCropCovered] = useState('');
  const [farmAcres, setFarmAcres] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');

  // Claims Modal States
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedClaimPolicy, setSelectedClaimPolicy] = useState<InsurancePolicy | null>(null);
  const [claimStep, setClaimStep] = useState(1);
  const [claimReason, setClaimReason] = useState('');
  const [damageLevel, setDamageLevel] = useState<'low' | 'medium' | 'high' | 'total'>('medium');
  const [claimPhoto, setClaimPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);

  // Prefill helper
  function openEnrollment(p: InsurancePolicy) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEnrollPolicy(p);
    setEnrollStep(1);

    // Pre-populate with store settings
    setFarmerName(agroId?.name || '');
    setFarmerPhone(agroId?.phoneNumber || '');
    setFarmerRegion(farmProfile?.region || agroId?.location || '');
    setCropCovered(farmProfile?.primaryCrops?.join(', ') || 'Maize');
    setFarmAcres(farmProfile?.farmSizeAcres ? String(farmProfile.farmSizeAcres) : '2.5');
    setNationalId(agroId?.nationalId || '');
    setPaymentMethod(agroId?.mpesaLinked ? 'mpesa' : 'tigo_pesa');

    setEnrollModalVisible(true);
  }

  function handleEnrollSubmit() {
    if (!selectedEnrollPolicy) return;

    if (!INSURANCE_LIVE) {
      setEnrollModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
        language === 'sw'
          ? `Usajili wa moja kwa moja wa ${selectedEnrollPolicy.product} kupitia ${selectedEnrollPolicy.provider} haupatikani bado kwenye programu. Hakuna malipo yaliyofanywa.`
          : `Direct enrollment in ${selectedEnrollPolicy.product} through ${selectedEnrollPolicy.provider} isn't available in the app yet. No payment was made.`
      );
      return;
    }

    setLoadingEnroll(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      enroll(selectedEnrollPolicy.id);
      setLoadingEnroll(false);
      setEnrollModalVisible(false);
      Alert.alert(
        language === 'sw' ? 'Usajili Umefanikiwa' : 'Enrollment Successful',
        language === 'sw'
          ? `Umesajiliwa kikamilifu kwenye ${selectedEnrollPolicy.product}. Malipo yako yatahakikiwa.`
          : `You have successfully enrolled in ${selectedEnrollPolicy.product}. Your premium payment is being verified.`
      );
    }, 1500);
  }

  function openClaimModal(p: InsurancePolicy) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedClaimPolicy(p);
    setClaimStep(1);
    setClaimReason('');
    setDamageLevel('medium');
    setClaimPhoto(null);
    setClaimModalVisible(true);
  }

  function simulateCameraCapture() {
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      // Simulate taking a photo of a dry crop
      setClaimPhoto(
        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400'
      );
      setIsCapturing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
  }

  function handleClaimSubmit() {
    if (!selectedClaimPolicy) return;

    if (!INSURANCE_LIVE) {
      setClaimModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
        language === 'sw'
          ? `Uwasilishaji wa madai kwa ${selectedClaimPolicy.provider} haupatikani bado kwenye programu. Dai lako halijawasilishwa kwa kampuni ya bima.`
          : `Filing claims with ${selectedClaimPolicy.provider} isn't available in the app yet. Your claim was not sent to the insurer.`
      );
      return;
    }

    setLoadingClaim(true);

    const payoutRatio =
      damageLevel === 'low'
        ? 0.2
        : damageLevel === 'medium'
          ? 0.5
          : damageLevel === 'high'
            ? 0.8
            : 1.0;
    const estPayout = Math.round(selectedClaimPolicy.payoutMaxTZS * payoutRatio);

    setTimeout(() => {
      fileClaim(selectedClaimPolicy.id, claimReason || 'Drought damage to farm blocks', estPayout);
      setLoadingClaim(false);
      setClaimModalVisible(false);
      Alert.alert(
        language === 'sw' ? 'Dai Limewasilishwa' : 'Claim Submitted',
        language === 'sw'
          ? `Dai lako la TZS ${fmt(estPayout)} limepokewa na linafanyiwa kazi na ${selectedClaimPolicy.provider}.`
          : `Your claim of TZS ${fmt(estPayout)} was received and is under review by ${selectedClaimPolicy.provider}.`
      );
    }, 1500);
  }

  return (
    <Gate
      feature="insurance"
      fallback={
        <PageScaffold title="Bima" badge="INSURANCE">
          <AccessDenied />
        </PageScaffold>
      }
    >
      <PageScaffold
        title="Bima ya Kilimo"
        subtitle="Crop & livestock protection"
        badge="INSURANCE HUB"
      >
        {/* Verification Alert Banner */}
        {agroId && agroId.verificationStatus !== 'verified' && (
          <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
            <GlassCard
              style={{
                padding: 14,
                borderColor: '#f59e0b40',
                backgroundColor: '#f59e0b10',
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <AlertTriangle size={18} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#f59e0b' }}>
                  {language === 'sw' ? 'Agro ID haijathibitishwa' : 'Agro ID unverified'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter_500Medium',
                    color: colors.textMute,
                    marginTop: 1,
                  }}
                >
                  {language === 'sw'
                    ? 'Thibitisha wasifu wako ili upate punguzo la ruzuku ya bima kupitia ushirika wako.'
                    : 'Verify your profile to unlock cooperative insurance subsidies.'}
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        <SectionHeader title={language === 'sw' ? 'Sera Zangu · My Policies' : 'My Policies'} />
        {myPolicies.length === 0 ? (
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <GlassCard style={{ padding: 20, alignItems: 'center' }}>
              <Shield size={24} color={colors.textMute} style={{ opacity: 0.7 }} />
              <Text style={[s.empty, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'Hakuna sera bado · No active policies'
                  : 'No active policies yet'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter_500Medium',
                  color: colors.textMute,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {language === 'sw'
                  ? 'Sajili mazao au mifugo yako ili ujilinde na majanga ya tabianchi.'
                  : 'Enroll in a coverage below to protect your farming investments.'}
              </Text>
            </GlassCard>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 10, marginBottom: 20 }}>
            {myPolicies.map((p) => (
              <PolicyCard key={p.id} p={p} onClaim={() => openClaimModal(p)} />
            ))}
          </View>
        )}

        <SectionHeader
          title={language === 'sw' ? 'Chagua Sera · Available Coverage' : 'Available Coverage'}
        />
        <View style={{ paddingHorizontal: 24, gap: 12, paddingBottom: 80 }}>
          {available.map((p) => (
            <GlassCard key={p.id} style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[s.iconBg, { backgroundColor: colors.primary + '15' }]}>
                  <Shield size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[s.product, { color: colors.text }]}>{p.product}</Text>
                  <Text style={[s.provider, { color: colors.textMute }]}>
                    {p.provider} · {p.coverage.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 11.5,
                  fontFamily: 'Inter_500Medium',
                  color: colors.text,
                  marginTop: 10,
                  lineHeight: 17,
                }}
              >
                {(p as any).desc ||
                  (language === 'sw'
                    ? 'Kinga dhidi ya mabadiliko ya hali ya hewa.'
                    : 'Coverage against climatic anomalies.')}
              </Text>

              <View style={[s.specs, { borderTopColor: colors.border }]}>
                <Spec label="Premium / Ada" value={`TZS ${fmt(p.premiumTZS)}`} />
                <Spec label="Max Payout / Fidia" value={`TZS ${fmt(p.payoutMaxTZS)}`} highlight />
                <Spec label="Term / Muda" value={`${p.termMonths} mo`} />
              </View>

              <TouchableOpacity
                onPress={() => openEnrollment(p)}
                style={[s.enrollBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw'
                    ? `Omba bima ya ${p.product} kutoka ${p.provider}`
                    : `Apply for ${p.product} from ${p.provider}`
                }
              >
                <Text style={s.enrollText}>
                  {language === 'sw' ? 'Omba Bima · Apply Now' : 'Apply Now'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          ))}
        </View>

        {/* ─── MODAL 1: ENROLLMENT FORM (PREFILLED) ─── */}
        <Modal
          visible={enrollModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEnrollModalVisible(false)}
        >
          <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[s.modalTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Ombi la Bima' : 'Insurance Application'}
                </Text>
                <Text
                  style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }}
                >
                  {selectedEnrollPolicy?.product}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEnrollModalVisible(false)}
                style={s.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Funga dirisha la maombi' : 'Close application modal'
                }
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Stepper indicator */}
            <View style={s.stepperRow}>
              {[1, 2, 3].map((step) => (
                <View key={step} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      s.stepNumCircle,
                      {
                        backgroundColor: enrollStep >= step ? colors.primary : colors.border,
                        borderColor: enrollStep === step ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: '#000', fontSize: 12, fontFamily: 'Inter_800ExtraBold' }}>
                      {step}
                    </Text>
                  </View>
                  {step < 3 && (
                    <View
                      style={[
                        s.stepLine,
                        { backgroundColor: enrollStep > step ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
            >
              {/* STEP 1: Personal & Agro ID Sync */}
              {enrollStep === 1 && (
                <View style={{ gap: 14 }}>
                  <View style={s.prefillBanner}>
                    <Sparkles size={14} color={colors.primary} />
                    <Text style={s.prefillBannerText}>
                      {language === 'sw'
                        ? 'Habari zimejazwa moja kwa moja kutoka kwenye Agro ID yako.'
                        : 'Details prefilled using your verified Agro ID profile.'}
                    </Text>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Jina la Mkulima / Farmer Name
                    </Text>
                    <View style={[s.inputWrap, { borderColor: colors.border }]}>
                      <User size={16} color={colors.textMute} />
                      <TextInput
                        style={[s.textInput, { color: colors.text }]}
                        value={farmerName}
                        onChangeText={setFarmerName}
                        placeholder="Enter full name"
                        placeholderTextColor={colors.textMute}
                        accessibilityLabel={language === 'sw' ? 'Jina la Mkulima' : 'Farmer Name'}
                        accessibilityHint={
                          language === 'sw' ? 'Weka jina lako kamili' : 'Enter your full name'
                        }
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Nambari ya Simu / Phone
                    </Text>
                    <View style={[s.inputWrap, { borderColor: colors.border }]}>
                      <Phone size={16} color={colors.textMute} />
                      <TextInput
                        style={[s.textInput, { color: colors.text }]}
                        value={farmerPhone}
                        onChangeText={setFarmerPhone}
                        keyboardType="phone-pad"
                        placeholder="e.g. +255 765 123 456"
                        placeholderTextColor={colors.textMute}
                        accessibilityLabel={language === 'sw' ? 'Nambari ya Simu' : 'Phone Number'}
                        accessibilityHint={
                          language === 'sw'
                            ? 'Weka nambari yako ya simu ya mkononi'
                            : 'Enter your mobile phone number'
                        }
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      NIDA / National ID Number
                    </Text>
                    <View style={[s.inputWrap, { borderColor: colors.border }]}>
                      <Shield size={16} color={colors.textMute} />
                      <TextInput
                        style={[s.textInput, { color: colors.text }]}
                        value={nationalId}
                        onChangeText={setNationalId}
                        placeholder="NIDA Number (digits)"
                        placeholderTextColor={colors.textMute}
                        accessibilityLabel={
                          language === 'sw' ? 'Nambari ya NIDA' : 'National ID Number'
                        }
                        accessibilityHint={
                          language === 'sw'
                            ? 'Weka nambari yako ya NIDA ya Kitanzania'
                            : 'Enter your Tanzanian NIDA number'
                        }
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Mkoa na Wilaya / Region
                    </Text>
                    <View style={[s.inputWrap, { borderColor: colors.border }]}>
                      <MapPin size={16} color={colors.textMute} />
                      <TextInput
                        style={[s.textInput, { color: colors.text }]}
                        value={farmerRegion}
                        onChangeText={setFarmerRegion}
                        placeholder="e.g. Mbeya, Rungwe"
                        placeholderTextColor={colors.textMute}
                        accessibilityLabel={
                          language === 'sw' ? 'Mkoa na Wilaya' : 'Region and District'
                        }
                        accessibilityHint={
                          language === 'sw'
                            ? 'Weka eneo lilipo shamba lako'
                            : 'Enter where your farm is located'
                        }
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 2: Farm Specifics */}
              {enrollStep === 2 && (
                <View style={{ gap: 14 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter_700Bold',
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {language === 'sw' ? 'Maelezo ya Shamba' : 'Farm Details'}
                  </Text>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Zao Linalokatiwa Bima / Crop to Cover
                    </Text>
                    <TextInput
                      style={[
                        s.singleTextInput,
                        { color: colors.text, borderColor: colors.border },
                      ]}
                      value={cropCovered}
                      onChangeText={setCropCovered}
                      placeholder="e.g. Maize / Nyanya"
                      placeholderTextColor={colors.textMute}
                      accessibilityLabel={
                        language === 'sw' ? 'Zao Linalokatiwa Bima' : 'Crop to Cover'
                      }
                      accessibilityHint={
                        language === 'sw' ? 'Weka jina la zao' : 'Enter the crop type'
                      }
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Ukubwa wa Shamba (Acres) / Farm Size
                    </Text>
                    <TextInput
                      style={[
                        s.singleTextInput,
                        { color: colors.text, borderColor: colors.border },
                      ]}
                      value={farmAcres}
                      onChangeText={setFarmAcres}
                      keyboardType="numeric"
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMute}
                      accessibilityLabel={
                        language === 'sw' ? 'Ukubwa wa Shamba kwa Ekari' : 'Farm Size in Acres'
                      }
                      accessibilityHint={
                        language === 'sw'
                          ? 'Weka idadi ya ekari za shamba'
                          : 'Enter the size of the farm in acres'
                      }
                    />
                  </View>

                  <GlassCard
                    style={{ padding: 14, marginTop: 10, borderColor: colors.primary + '20' }}
                  >
                    <Text
                      style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textMute }}
                    >
                      COVERAGE LIMITS
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.text,
                        }}
                      >
                        Max Loss Payout:
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.primary,
                        }}
                      >
                        TZS{' '}
                        {fmt(
                          (selectedEnrollPolicy?.payoutMaxTZS ?? 0) * (parseFloat(farmAcres) || 1)
                        )}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMute,
                        marginTop: 4,
                        fontFamily: 'Inter_500Medium',
                      }}
                    >
                      Payout is adjusted dynamically based on satellite NDVI vegetation stress index
                      readings.
                    </Text>
                  </GlassCard>
                </View>
              )}

              {/* STEP 3: Premium Billing Integration */}
              {enrollStep === 3 && (
                <View style={{ gap: 16 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>
                    {language === 'sw' ? 'Malipo ya Bima' : 'Premium Payment'}
                  </Text>

                  <View style={[s.pnlBox, { borderColor: colors.border }]}>
                    <View style={s.pnlRow}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.text,
                        }}
                      >
                        Premium Rate:
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.text,
                        }}
                      >
                        TZS {fmt(selectedEnrollPolicy?.premiumTZS ?? 0)}
                      </Text>
                    </View>
                    <View style={s.pnlRow}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.text,
                        }}
                      >
                        Cooperative Subsidy (30%):
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.primary,
                        }}
                      >
                        - TZS {fmt(Math.round((selectedEnrollPolicy?.premiumTZS ?? 0) * 0.3))}
                      </Text>
                    </View>
                    <View
                      style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }}
                    />
                    <View style={s.pnlRow}>
                      <Text
                        style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        Total Due:
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.primary,
                        }}
                      >
                        TZS {fmt(Math.round((selectedEnrollPolicy?.premiumTZS ?? 0) * 0.7))}
                      </Text>
                    </View>
                  </View>

                  <Text style={[s.inputLabel, { color: colors.textMute, marginBottom: -6 }]}>
                    Chagua Njia ya Malipo / Payment Method
                  </Text>

                  <TouchableOpacity
                    onPress={() => setPaymentMethod('mpesa')}
                    style={[
                      s.payMethodCard,
                      { borderColor: paymentMethod === 'mpesa' ? colors.primary : colors.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Vodacom M-Pesa"
                    accessibilityState={{ selected: paymentMethod === 'mpesa' }}
                  >
                    <View
                      style={[
                        s.radioCircle,
                        { borderColor: paymentMethod === 'mpesa' ? colors.primary : colors.border },
                      ]}
                    >
                      {paymentMethod === 'mpesa' && (
                        <View style={[s.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text
                        style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        Vodacom M-Pesa
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMute,
                          fontFamily: 'Inter_500Medium',
                        }}
                      >
                        Auto-deduct linked number: {farmerPhone || 'Not set'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPaymentMethod('tigo')}
                    style={[
                      s.payMethodCard,
                      { borderColor: paymentMethod === 'tigo' ? colors.primary : colors.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Tigo Pesa"
                    accessibilityState={{ selected: paymentMethod === 'tigo' }}
                  >
                    <View
                      style={[
                        s.radioCircle,
                        { borderColor: paymentMethod === 'tigo' ? colors.primary : colors.border },
                      ]}
                    >
                      {paymentMethod === 'tigo' && (
                        <View style={[s.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text
                        style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        Tigo Pesa
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMute,
                          fontFamily: 'Inter_500Medium',
                        }}
                      >
                        Manual push USSD prompt
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View
                    style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 8 }}
                  >
                    <CheckCircle2 size={14} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter_500Medium',
                        color: colors.textMute,
                        flex: 1,
                      }}
                    >
                      {language === 'sw'
                        ? 'Mkataba wako wa bima utaanza mara moja baada ya malipo kuthibitishwa.'
                        : 'Your cover goes active immediately upon automated mobile money confirmation.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bottom Nav inside modal */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                {enrollStep > 1 && (
                  <TouchableOpacity
                    onPress={() => setEnrollStep(enrollStep - 1)}
                    style={[s.modalSecBtn, { borderColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
                  >
                    <Text style={[s.modalSecBtnText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                )}

                {enrollStep < 3 ? (
                  <TouchableOpacity
                    onPress={() => setEnrollStep(enrollStep + 1)}
                    style={[s.modalPriBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Endelea' : 'Continue'}
                  >
                    <Text style={s.modalPriBtnText}>Continue</Text>
                    <ChevronRight size={16} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleEnrollSubmit}
                    disabled={loadingEnroll}
                    style={[s.modalPriBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'sw'
                        ? 'Thibitisha malipo na utume'
                        : 'Confirm payment and submit'
                    }
                  >
                    {loadingEnroll ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Text style={s.modalPriBtnText}>
                          {language === 'sw' ? 'Thibitisha Malipo' : 'Submit & Pay'}
                        </Text>
                        <Check size={16} color="#000" />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ─── MODAL 2: INTERACTIVE CLAIMS FLOW (WITH CAMERA VIEWER) ─── */}
        <Modal
          visible={claimModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setClaimModalVisible(false)}
        >
          <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[s.modalTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Wasilisha Dai la Fidia' : 'Submit Insurance Claim'}
                </Text>
                <Text
                  style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }}
                >
                  {selectedClaimPolicy?.product} · {selectedClaimPolicy?.provider}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setClaimModalVisible(false)}
                style={s.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Funga dirisha la madai' : 'Close claims modal'
                }
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Stepper */}
            <View style={s.stepperRow}>
              {[1, 2, 3].map((step) => (
                <View key={step} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      s.stepNumCircle,
                      {
                        backgroundColor: claimStep >= step ? colors.primary : colors.border,
                        borderColor: claimStep === step ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: '#000', fontSize: 12, fontFamily: 'Inter_800ExtraBold' }}>
                      {step}
                    </Text>
                  </View>
                  {step < 3 && (
                    <View
                      style={[
                        s.stepLine,
                        { backgroundColor: claimStep > step ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
            >
              {/* STEP 1: Assessment details */}
              {claimStep === 1 && (
                <View style={{ gap: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>
                    {language === 'sw' ? 'Hatua ya 1: Chanzo cha hasara' : 'Step 1: Cause of Loss'}
                  </Text>

                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: colors.textMute }]}>
                      Sababu ya Hasara / Reason for Loss
                    </Text>
                    <TextInput
                      style={[s.textarea, { color: colors.text, borderColor: colors.border }]}
                      multiline
                      numberOfLines={4}
                      value={claimReason}
                      onChangeText={setClaimReason}
                      placeholder={
                        language === 'sw'
                          ? 'Eleza kwa kifupi uharibifu uliotokea na tarehe yake...'
                          : 'Describe what happened (e.g. drought impact, armyworms, flooding)...'
                      }
                      placeholderTextColor={colors.textMute}
                      accessibilityLabel={
                        language === 'sw' ? 'Sababu ya Hasara' : 'Reason for Loss'
                      }
                      accessibilityHint={
                        language === 'sw'
                          ? 'Eleza kwa nini unadai fidia na nini kilitokea shambani'
                          : 'Explain why you are filing a claim and what happened'
                      }
                    />
                  </View>

                  <Text style={[s.inputLabel, { color: colors.textMute, marginBottom: -6 }]}>
                    Kiwango cha Uharibifu / Damage Severity
                  </Text>

                  <View style={s.severityRow}>
                    {(['low', 'medium', 'high', 'total'] as const).map((sev) => (
                      <TouchableOpacity
                        key={sev}
                        onPress={() => setDamageLevel(sev)}
                        style={[
                          s.sevCard,
                          {
                            borderColor: damageLevel === sev ? colors.primary : colors.border,
                            backgroundColor:
                              damageLevel === sev ? colors.primary + '10' : 'transparent',
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw'
                            ? `Kiwango cha uharibifu: ${sev}`
                            : `Damage level: ${sev}`
                        }
                        accessibilityState={{ selected: damageLevel === sev }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontFamily: 'Inter_700Bold',
                            color: damageLevel === sev ? colors.primary : colors.text,
                            textTransform: 'capitalize',
                          }}
                        >
                          {sev}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedClaimPolicy && (
                    <GlassCard
                      style={{
                        padding: 14,
                        borderColor: '#ef444430',
                        backgroundColor: '#ef444405',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_700Bold',
                          color: colors.textMute,
                        }}
                      >
                        ESTIMATED PAYOUT
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontFamily: 'Inter_800ExtraBold',
                          color: '#ef4444',
                          marginTop: 4,
                        }}
                      >
                        TZS{' '}
                        {fmt(
                          Math.round(
                            selectedClaimPolicy.payoutMaxTZS *
                              (damageLevel === 'low'
                                ? 0.2
                                : damageLevel === 'medium'
                                  ? 0.5
                                  : damageLevel === 'high'
                                    ? 0.8
                                    : 1.0)
                          )
                        )}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMute,
                          marginTop: 4,
                          fontFamily: 'Inter_500Medium',
                        }}
                      >
                        * Fidia halisi imedhamiriwa baada ya ukaguzi wa picha na uthibitisho wa
                        satelaiti.
                      </Text>
                    </GlassCard>
                  )}
                </View>
              )}

              {/* STEP 2: Photo evidence camera simulator */}
              {claimStep === 2 && (
                <View style={{ gap: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>
                    {language === 'sw'
                      ? 'Hatua ya 2: Ushahidi wa Picha'
                      : 'Step 2: Upload Photo Evidence'}
                  </Text>

                  {/* Viewfinder simulator */}
                  {!claimPhoto ? (
                    <View
                      style={[
                        s.viewfinder,
                        {
                          backgroundColor: isDark ? '#111810' : '#f4fbf3',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {isCapturing ? (
                        <View style={{ alignItems: 'center', gap: 10 }}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: 'Inter_600SemiBold',
                              color: colors.textMute,
                            }}
                          >
                            {language === 'sw'
                              ? 'Inapakua picha ya ushahidi...'
                              : 'Analyzing crop damage image...'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center', padding: 24, gap: 14 }}>
                          <Camera size={44} color={colors.textMute} style={{ opacity: 0.6 }} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: 'Inter_600SemiBold',
                              color: colors.textMute,
                              textAlign: 'center',
                            }}
                          >
                            {language === 'sw'
                              ? 'Piga picha ya shamba lako au mifugo ili kuthibitisha hasara.'
                              : 'Take a clear photo of the damaged area to prove the claim.'}
                          </Text>
                          <TouchableOpacity
                            onPress={simulateCameraCapture}
                            style={[s.cameraBtn, { backgroundColor: colors.primary }]}
                            accessibilityRole="button"
                            accessibilityLabel={
                              language === 'sw'
                                ? 'Piga picha ya ushahidi wa hasara'
                                : 'Capture photo evidence of damage'
                            }
                          >
                            <Camera size={16} color="#000" />
                            <Text style={s.cameraBtnText}>
                              {language === 'sw' ? 'Piga Picha · Capture' : 'Capture Evidence'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <View style={[s.photoPreviewContainer, { borderColor: colors.border }]}>
                        <Image source={{ uri: claimPhoto }} style={s.photoPreview} />
                        <View style={s.photoSuccessOverlay}>
                          <CheckCircle2 size={24} color={colors.primary} />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => setClaimPhoto(null)}
                          style={[s.modalSecBtn, { borderColor: colors.border, flex: 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            language === 'sw' ? 'Piga picha tena' : 'Retake photo'
                          }
                        >
                          <Text style={[s.modalSecBtnText, { color: colors.text }]}>
                            {language === 'sw' ? 'Piga Tena' : 'Retake'}
                          </Text>
                        </TouchableOpacity>
                        <View
                          style={[
                            s.evidenceBadge,
                            {
                              flex: 1.5,
                              backgroundColor: colors.primary + '15',
                              borderColor: colors.primary,
                            },
                          ]}
                        >
                          <Sparkles size={12} color={colors.primary} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: 'Inter_700Bold',
                              color: colors.primary,
                            }}
                          >
                            Geo-Tagged & Secured
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* STEP 3: Confirm & Submit */}
              {claimStep === 3 && (
                <View style={{ gap: 16 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>
                    {language === 'sw'
                      ? 'Hatua ya 3: Uhakiki na Kutuma'
                      : 'Step 3: Review & Submit'}
                  </Text>

                  <View style={[s.pnlBox, { borderColor: colors.border }]}>
                    <View style={s.pnlRow}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.textMute,
                        }}
                      >
                        Sera / Policy:
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        {selectedClaimPolicy?.product}
                      </Text>
                    </View>
                    <View style={s.pnlRow}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.textMute,
                        }}
                      >
                        Mtoa Huduma / Provider:
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        {selectedClaimPolicy?.provider}
                      </Text>
                    </View>
                    <View style={s.pnlRow}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.textMute,
                        }}
                      >
                        Kiwango cha Hasara:
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_800ExtraBold',
                          color: '#ef4444',
                          textTransform: 'uppercase',
                        }}
                      >
                        {damageLevel}
                      </Text>
                    </View>
                    <View
                      style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }}
                    />
                    <View style={s.pnlRow}>
                      <Text
                        style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        Fidia Inayotarajiwa:
                      </Text>
                      <Text
                        style={{ fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: '#ef4444' }}
                      >
                        TZS{' '}
                        {fmt(
                          Math.round(
                            (selectedClaimPolicy?.payoutMaxTZS ?? 0) *
                              (damageLevel === 'low'
                                ? 0.2
                                : damageLevel === 'medium'
                                  ? 0.5
                                  : damageLevel === 'high'
                                    ? 0.8
                                    : 1.0)
                          )
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    {claimPhoto && <Image source={{ uri: claimPhoto }} style={s.thumbnail} />}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.text }}
                      >
                        {language === 'sw'
                          ? 'Ushahidi wa picha umepakiwa'
                          : 'Photo evidence attached'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMute,
                          marginTop: 1,
                          fontFamily: 'Inter_500Medium',
                        }}
                        numberOfLines={2}
                      >
                        {claimReason || 'No text description entered.'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.agreeBox}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMute,
                        lineHeight: 15,
                        fontFamily: 'Inter_500Medium',
                      }}
                    >
                      Nathibitisha kuwa taarifa zote zilizotolewa hapa ni za kweli na zinaonyesha
                      uhalisia wa hasara iliyotokea shambani kwangu.
                    </Text>
                  </View>
                </View>
              )}

              {/* Navigation buttons inside Claims Modal */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                {claimStep > 1 && (
                  <TouchableOpacity
                    onPress={() => setClaimStep(claimStep - 1)}
                    style={[s.modalSecBtn, { borderColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
                  >
                    <Text style={[s.modalSecBtnText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                )}

                {claimStep < 3 ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (claimStep === 2 && !claimPhoto) {
                        Alert.alert(
                          language === 'sw' ? 'Ushahidi unahitajika' : 'Evidence required',
                          language === 'sw'
                            ? 'Tafadhali piga picha kwanza.'
                            : 'Please capture photo evidence before continuing.'
                        );
                        return;
                      }
                      setClaimStep(claimStep + 1);
                    }}
                    style={[s.modalPriBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Endelea' : 'Continue'}
                  >
                    <Text style={s.modalPriBtnText}>Continue</Text>
                    <ChevronRight size={16} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleClaimSubmit}
                    disabled={loadingClaim}
                    style={[s.modalPriBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'sw' ? 'Tuma dai la fidia' : 'Submit crop claim'
                    }
                  >
                    {loadingClaim ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Text style={s.modalPriBtnText}>
                          {language === 'sw' ? 'Tuma Dai Sasa' : 'Submit Claim'}
                        </Text>
                        <Check size={16} color="#000" />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </PageScaffold>
    </Gate>
  );
}

function PolicyCard({ p, onClaim }: { p: InsurancePolicy; onClaim: () => void }) {
  const { colors } = useTheme();
  const meta = STATUS_META[p.status];
  return (
    <GlassCard style={{ padding: 18 }}>
      <View style={s.policyRow}>
        <View style={[s.statusBadge, { backgroundColor: meta.color + '25' }]}>
          <View style={[s.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[s.statusText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
        </View>
        {p.expiresAt && (
          <Text style={[s.expires, { color: colors.textMute }]}>
            <Clock size={10} color={colors.textMute} /> Until{' '}
            {new Date(p.expiresAt).toLocaleDateString('en-GB')}
          </Text>
        )}
      </View>
      <Text style={[s.product, { color: colors.text, marginTop: 8 }]}>{p.product}</Text>
      <Text style={[s.provider, { color: colors.textMute }]}>{p.provider}</Text>

      {p.status === 'claimed' ? (
        <View style={[s.claimBox, { borderColor: '#3b82f640', backgroundColor: '#3b82f605' }]}>
          <FileCheck2 size={14} color="#3b82f6" />
          <Text style={[s.claimText, { color: '#3b82f6' }]}>
            Claim filed: TZS {fmt(p.claimAmountTZS ?? 0)} — under review
          </Text>
        </View>
      ) : p.status === 'active' ? (
        <TouchableOpacity onPress={onClaim} style={[s.claimBtn, { borderColor: colors.primary }]}>
          <Text style={[s.claimBtnText, { color: colors.primary }]}>Omba Fidia · File Claim</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

function Spec({ label, value, highlight }: any) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.specLabel, { color: colors.textMute }]}>{label.toUpperCase()}</Text>
      <Text
        style={[s.specValue, { color: highlight ? colors.primary : colors.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function AccessDenied() {
  const language = useKilimoStore((s) => s.language);
  return (
    <EmptyState
      icon={<AlertTriangle size={36} color="#f59e0b" />}
      title="Haipatikani"
      body={
        language === 'sw'
          ? 'Bima haipatikani kwa jukumu lako.'
          : 'Insurance features are not accessible for your role.'
      }
    />
  );
}

const s = StyleSheet.create({
  empty: { fontSize: 13, fontFamily: 'Inter_700Bold', marginTop: 8 },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  product: {
    fontSize: 16,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
    fontWeight: '600',
  },
  provider: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, marginTop: 2 },
  specs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  specLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  specValue: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', marginTop: 2 },
  enrollBtn: {
    marginTop: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  enrollText: { color: '#000', fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  expires: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  claimText: { fontSize: 12, fontFamily: 'Inter_700Bold', flex: 1 },
  claimBtn: {
    marginTop: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  claimBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },

  // Modals
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepperRow: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, gap: 4 },
  stepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  stepLine: { height: 2, flex: 1, marginHorizontal: 6 },

  prefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(46, 111, 64,0.06)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(46, 111, 64,0.2)',
    marginBottom: 8,
  },
  prefillBannerText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#146e2e', flex: 1 },

  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', padding: 0 },
  singleTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  pnlBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  payMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },

  modalPriBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 6,
  },
  modalPriBtnText: { color: '#000', fontSize: 13.5, fontFamily: 'Inter_700Bold' },
  modalSecBtn: {
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  severityRow: { flexDirection: 'row', gap: 8 },
  sevCard: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewfinder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  cameraBtnText: { color: '#000', fontSize: 12, fontFamily: 'Inter_700Bold' },

  photoPreviewContainer: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoSuccessOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    height: 48,
  },
  thumbnail: { width: 56, height: 56, borderRadius: 10 },
  agreeBox: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
});
