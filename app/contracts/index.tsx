/**
 * Contract Farming — redesigned list + create modal
 * Editorial hero · gradient cards · segmented milestone progress
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Handshake,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  User,
  MapPin,
  Wheat,
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowUpRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../constants/Theme';
import {
  useContractsStore,
  STATUS_LABEL,
  STATUS_COLOR,
  Contract,
  ContractStatus,
} from '../../store/useContractsStore';
import { Gate } from '../../lib/access';
import { RequireVerification } from '../../components/RequireVerification';
import PageScaffold, { GlassCard, EmptyState } from '../../components/PageScaffold';

const { width: SW } = Dimensions.get('window');
const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

const FILTERS: { label: string; labelEn: string; status: 'all' | ContractStatus }[] = [
  { label: 'Yote', labelEn: 'All', status: 'all' },
  { label: 'Rasimu', labelEn: 'Draft', status: 'draft' },
  { label: 'Inakaguliwa', labelEn: 'In Review', status: 'under_review' },
  { label: 'Inaendelea', labelEn: 'Active', status: 'active' },
  { label: 'Imekamilika', labelEn: 'Completed', status: 'completed' },
];

const CROPS = [
  'Mahindi',
  'Mpunga',
  'Maharage',
  'Kahawa',
  'Alizeti',
  'Mihogo',
  'Nyanya',
  'Pamba',
  'Ngano',
  'Viazi',
];
const REGIONS = [
  'Arusha',
  'Mbeya',
  'Kilimanjaro',
  'Morogoro',
  'Iringa',
  'Dodoma',
  'Mwanza',
  'Tanga',
  'Pwani',
  'Singida',
];

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_ICON: Record<ContractStatus, React.ReactNode> = {
  draft: <Circle size={10} color="#94a3b8" fill="#94a3b8" />,
  sent: <Circle size={10} color="#3b82f6" fill="#3b82f6" />,
  under_review: <Circle size={10} color="#f59e0b" fill="#f59e0b" />,
  signed: <CheckCircle2 size={10} color="#3C4A2A" />,
  active: <CheckCircle2 size={10} color="#3C4A2A" />,
  milestone_due: <Circle size={10} color="#f59e0b" fill="#f59e0b" />,
  completed: <CheckCircle2 size={10} color="#3C4A2A" />,
  cancelled: <Circle size={10} color="#ef4444" fill="#ef4444" />,
  disputed: <Circle size={10} color="#ef4444" fill="#ef4444" />,
};

// ─── Create Modal ──────────────────────────────────────────────────────────────
function CreateContractModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const createContract = useContractsStore((s) => s.createContract);
  const [title, setTitle] = useState('');
  const [crop, setCrop] = useState('Mahindi');
  const [buyer, setBuyer] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [region, setRegion] = useState('Arusha');

  function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Kichwa kinahitajika', 'Tafadhali weka jina la mkataba.');
      return;
    }
    if (!buyer.trim()) {
      Alert.alert('Mnunuzi anahitajika', 'Tafadhali weka jina la mnunuzi.');
      return;
    }
    const q = parseFloat(qty),
      p = parseFloat(price);
    if (!q || q <= 0) {
      Alert.alert('Kiasi kinahitajika', 'Weka kiasi cha mazao kwa kg.');
      return;
    }
    if (!p || p <= 0) {
      Alert.alert('Bei inahitajika', 'Weka bei kwa kilo moja.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = createContract({
      title: title.trim(),
      crop,
      quantityKg: q,
      pricePerKgTZS: p,
      buyer: buyer.trim(),
      region,
      milestones: [],
    });
    setTitle('');
    setBuyer('');
    setQty('');
    setPrice('');
    onClose();
    onCreate(id);
  }

  const contractValue =
    qty && price && parseFloat(qty) > 0 && parseFloat(price) > 0
      ? parseFloat(qty) * parseFloat(price)
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <BlurView
        intensity={isDark ? 50 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={[cm.sheet, { backgroundColor: isDark ? '#0d1a0f' : '#fff' }]}>
          {/* Handle */}
          <View style={[cm.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <LinearGradient colors={['#3C4A2A18', '#3C4A2A00']} style={cm.sheetHeaderGrad}>
            <View style={cm.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <LinearGradient colors={[colors.primary, '#0a3d18']} style={cm.iconCircle}>
                  <Handshake size={18} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={[cm.sheetTitle, { color: colors.text }]}>Mkataba Mpya</Text>
                  <Text style={[cm.sheetSub, { color: colors.textMute }]}>New Contract</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[cm.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <X size={15} color={colors.textMute} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          >
            {/* Contract value preview bar */}
            {contractValue > 0 && (
              <Animated.View
                entering={FadeInDown}
                style={[cm.valueBar, { backgroundColor: '#3C4A2A15', borderColor: '#3C4A2A30' }]}
              >
                <Text style={[cm.valueBarLabel, { color: colors.textMute }]}>
                  Thamani ya mkataba
                </Text>
                <Text style={[cm.valueBarAmount, { color: colors.primary }]}>
                  TZS {fmt(contractValue)}
                </Text>
              </Animated.View>
            )}

            <LabelRow
              icon={<FileText size={12} color={colors.primary} />}
              label="JINA LA MKATABA"
              required
            />
            <View
              style={[cm.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[cm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. Mahindi Hifadhi ya 2026..."
              />
            </View>

            <LabelRow icon={<Wheat size={12} color={colors.primary} />} label="ZAO" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {CROPS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCrop(c);
                  }}
                  style={[
                    cm.chip,
                    {
                      borderColor: crop === c ? colors.primary : colors.border,
                      backgroundColor: crop === c ? '#3C4A2A20' : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[cm.chipText, { color: crop === c ? colors.primary : colors.textMute }]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <LabelRow icon={<User size={12} color="#8b5cf6" />} label="MNUNUZI" required />
            <View
              style={[cm.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={buyer}
                onChangeText={setBuyer}
                style={[cm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. NMB Foods Ltd..."
              />
            </View>

            <LabelRow icon={<MapPin size={12} color="#3b82f6" />} label="MKOA" />
            <ScrollView
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
                    cm.chip,
                    {
                      borderColor: region === r ? colors.primary : colors.border,
                      backgroundColor: region === r ? '#3C4A2A20' : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      cm.chipText,
                      { color: region === r ? colors.primary : colors.textMute },
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <LabelRow label="KIASI (kg)" required />
                <View
                  style={[
                    cm.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <TextInput
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="decimal-pad"
                    style={[cm.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="1000"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <LabelRow label="BEI/kg (TZS)" required />
                <View
                  style={[
                    cm.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    style={[cm.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="850"
                  />
                </View>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity onPress={handleCreate} activeOpacity={0.88} style={{ marginTop: 28 }}>
              <LinearGradient
                colors={[colors.primary, '#0a3d18']}
                style={cm.createBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Handshake size={18} color="#fff" />
                <Text style={cm.createBtnText}>Tengeneza Mkataba</Text>
                <ArrowUpRight size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LabelRow({
  icon,
  label,
  required,
}: {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 8 }}
    >
      {icon}
      <Text style={[cm.fieldLabel, { color: colors.textMute }]}>{label}</Text>
      {required && (
        <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_700Bold' }}>*</Text>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ContractsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const contracts = useContractsStore((s) => s.contracts);
  const [filter, setFilter] = useState<'all' | ContractStatus>('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = filter === 'all' ? contracts : contracts.filter((c) => c.status === filter);
  const active = contracts.filter((c) => c.status === 'active').length;
  const pending = contracts.filter(
    (c) => c.status === 'under_review' || c.status === 'sent'
  ).length;
  const draft = contracts.filter((c) => c.status === 'draft').length;
  const portfolio = contracts.reduce((s, c) => s + c.quantityKg * c.pricePerKgTZS, 0);

  return (
    <Gate
      feature="contract_farming"
      fallback={
        <PageScaffold title="Mikataba" badge="MARKETPLACE">
          <View style={{ padding: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <Handshake size={32} color={colors.textMute} />
              <Text
                style={{
                  color: colors.text,
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 16,
                  marginTop: 12,
                }}
              >
                Hairuhusiwi
              </Text>
              <Text
                style={{
                  color: colors.textMute,
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                Mikataba inapatikana kwa wakulima walio na akaunti ya Premium au Ushirika.
              </Text>
            </GlassCard>
          </View>
        </PageScaffold>
      }
    >
      <RequireVerification>
        <CreateContractModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onCreate={(id) => router.push(`/contracts/${id}` as any)}
        />

        <View style={[s.root, { backgroundColor: colors.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          {/* ── Hero header ─────────────────────────────────────── */}
          <LinearGradient
            colors={isDark ? ['#0c1f0d', '#070d08'] : ['#f0fdf4', '#f8fafc']}
            style={s.hero}
          >
            <SafeAreaView>
              <View style={s.heroInner}>
                {/* Back-row */}
                <View style={s.heroTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                      style={{
                        padding: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      }}
                    >
                      <ChevronLeft size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                      <View style={s.heroBadge}>
                        <View style={s.heroBadgeDot} />
                        <Text style={s.heroBadgeText}>CONTRACT FARMING</Text>
                      </View>
                      <Text style={[s.heroTitle, { color: colors.text }]}>Mikataba</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowModal(true);
                    }}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={[colors.primary, '#0a3d18']}
                      style={s.addBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Plus size={20} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Portfolio value */}
                {contracts.length > 0 && (
                  <Animated.View
                    entering={FadeInDown.springify()}
                    style={[
                      s.portfolioCard,
                      {
                        backgroundColor: isDark ? colors.primary + '14' : colors.primary + '0F',
                        borderColor: isDark ? colors.primary + '33' : colors.primary + '26',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.portfolioLabel, { color: colors.textMute }]}>
                        Thamani ya Jumla
                      </Text>
                      <Text style={[s.portfolioValue, { color: colors.text }]}>
                        TZS {fmt(portfolio)}
                      </Text>
                    </View>
                    <TrendingUp size={22} color={colors.primary} />
                  </Animated.View>
                )}

                {/* Stat chips */}
                {contracts.length > 0 && (
                  <View style={s.statRow}>
                    <StatChip count={contracts.length} label="Yote" color={colors.text} />
                    <StatChip count={active} label="Inaendelea" color={colors.primary} />
                    <StatChip count={pending} label="Inakaguliwa" color="#f59e0b" />
                    <StatChip count={draft} label="Rasimu" color={colors.textMute} />
                  </View>
                )}
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* ── Filter tabs ─────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
            style={{ flexGrow: 0 }}
          >
            {FILTERS.map((f) => {
              const isActive = filter === f.status;
              return (
                <TouchableOpacity
                  key={f.status}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(f.status);
                  }}
                  activeOpacity={0.8}
                  style={[
                    s.filterPill,
                    isActive
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: 'transparent', borderColor: colors.border },
                  ]}
                >
                  <Text style={[s.filterText, { color: isActive ? '#fff' : colors.textMute }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── List ────────────────────────────────────────────── */}
          <ScrollView
            contentContainerStyle={[s.listContent, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Section label */}
            <View style={s.secRow}>
              <View style={[s.secAccent, { backgroundColor: colors.primary }]} />
              <Text style={[s.secLabel, { color: colors.textMute }]}>
                {filtered.length} MIKATABA
              </Text>
            </View>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Handshake size={36} color={colors.primary} />}
                title="Hakuna mikataba"
                body="Tengeneza mkataba mpya wa kuuza mazao yako kwa mnunuzi aliyethibitishwa."
                cta="Tengeneza Mkataba"
                onCta={() => setShowModal(true)}
              />
            ) : (
              filtered.map((c, idx) => (
                <Animated.View key={c.id} entering={FadeInDown.delay(idx * 55).springify()}>
                  <ContractCard c={c} onPress={() => router.push(`/contracts/${c.id}` as any)} />
                </Animated.View>
              ))
            )}
          </ScrollView>
        </View>
      </RequireVerification>
    </Gate>
  );
}

// ─── StatChip ──────────────────────────────────────────────────────────────────
function StatChip({ count, label, color }: { count: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s.statChip, { borderColor: colors.border }]}>
      <Text style={[s.statCount, { color }]}>{count}</Text>
      <Text style={[s.statLabel, { color: colors.textMute }]}>{label}</Text>
    </View>
  );
}

// ─── ContractCard ──────────────────────────────────────────────────────────────
function ContractCard({ c, onPress }: { c: Contract; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const totalValue = c.quantityKg * c.pricePerKgTZS;
  const paidMilestones = c.milestones.filter((m) => m.paid).length;
  const statusColor = STATUS_COLOR[c.status] as string;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.cardWrap}>
      <View
        style={[
          s.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
            borderColor: colors.border,
          },
        ]}
      >
        {/* Left accent gradient strip */}
        <LinearGradient
          colors={[statusColor, statusColor + '44']}
          style={s.cardAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={s.cardBody}>
          {/* Top row: status + arrow */}
          <View style={s.cardTopRow}>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: statusColor + '18', borderColor: statusColor + '30' },
              ]}
            >
              {STATUS_ICON[c.status]}
              <Text style={[s.statusText, { color: statusColor }]}>{STATUS_LABEL[c.status]}</Text>
            </View>
            <View style={[s.arrowChip, { backgroundColor: statusColor + '15' }]}>
              <ChevronRight size={14} color={statusColor} />
            </View>
          </View>

          {/* Title + buyer */}
          <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {c.title}
          </Text>
          <Text style={[s.cardBuyer, { color: colors.textMute }]} numberOfLines={1}>
            {c.buyer}
            {c.buyerOrg ? ` · ${c.buyerOrg}` : ''} · {c.region}
          </Text>

          {/* Value + crop chip row */}
          <View style={s.cardMidRow}>
            <Text style={[s.cardValue, { color: colors.primary }]}>TZS {fmt(totalValue)}</Text>
            <View
              style={[s.cropPill, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[s.cropText, { color: colors.textMute }]}>{c.crop}</Text>
            </View>
          </View>

          {/* Metrics strip */}
          <View
            style={[
              s.metricsStrip,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                borderColor: colors.border,
              },
            ]}
          >
            <MetricTile label="Kiasi" value={`${fmt(c.quantityKg)} kg`} />
            <View style={[s.metricDiv, { backgroundColor: colors.border }]} />
            <MetricTile label="Bei/kg" value={`TZS ${fmt(c.pricePerKgTZS)}`} />
            {c.milestones.length > 0 && (
              <>
                <View style={[s.metricDiv, { backgroundColor: colors.border }]} />
                <MetricTile label="Hatua" value={`${paidMilestones}/${c.milestones.length}`} />
              </>
            )}
          </View>

          {/* Segmented milestone progress */}
          {c.milestones.length > 0 && (
            <View style={s.segRow}>
              {c.milestones.map((m, i) => (
                <View
                  key={i}
                  style={[
                    s.segment,
                    {
                      flex: 1,
                      backgroundColor: m.paid
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.08)'
                          : '#e2e8f0',
                    },
                    i === 0 && { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
                    i === c.milestones.length - 1 && {
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
      <Text style={[s.mLabel, { color: colors.textMute }]}>{label}</Text>
      <Text style={[s.mValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  hero: { paddingBottom: 0 },
  heroInner: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3C4A2A' },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: '#3C4A2A',
    letterSpacing: 1.5,
  },
  heroTitle: { fontSize: 32, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -1 },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Portfolio
  portfolioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  portfolioLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 4 },
  portfolioValue: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },

  // Stats
  statRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statCount: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Filter
  filterRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5 },
  filterText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  secAccent: { width: 3, height: 14, borderRadius: 2 },
  secLabel: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5 },

  // Card
  cardWrap: { marginBottom: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  arrowChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 17, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.3 },
  cardBuyer: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2, marginBottom: 10 },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardValue: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  cropPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  cropText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  // Metrics strip
  metricsStrip: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  metricDiv: { width: 1 },
  mLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mValue: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', marginTop: 2 },

  // Milestone segments
  segRow: { flexDirection: 'row', gap: 3, height: 6 },
  segment: { height: 6 },
});

const cm = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, maxHeight: '94%' },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  sheetHeaderGrad: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  sheetSub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5 },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input: { fontSize: 15, fontFamily: 'Inter_600SemiBold', paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  valueBar: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
  },
  valueBarLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  valueBarAmount: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 100,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'InstrumentSerif_400Regular',
    flex: 1,
    textAlign: 'center',
  },
});
