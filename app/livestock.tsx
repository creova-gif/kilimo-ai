/**
 * Livestock Tracking — full health records, vaccination schedule, add/update/delete
 */
import React, { useState } from 'react';
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
} from 'react-native';
import {
  Beef,
  Bird,
  Plus,
  Syringe,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  X,
  Cpu,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, FadeInDown, FadeInUp } from 'react-native-reanimated';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../components/PageScaffold';
import { useTheme } from '../constants/Theme';
import { useFarmDataStore, LivestockAnimal, LivestockSpecies } from '../store/useFarmDataStore';
import { Gate } from '../lib/access';
import Svg, { Polyline, Circle as SvgCircle, Rect } from 'react-native-svg';

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration — an unguarded 0 here flowed into negative <Svg>/<Rect>
// widths downstream (real console error + broken chart flash).
const SW = Dimensions.get('window').width || 360;

// ─── Species config ───────────────────────────────────────────────────────────
const SPECIES: { key: LivestockSpecies; label: string; swahili: string; color: string }[] = [
  { key: 'cattle', label: 'Cattle', swahili: "Ng'ombe", color: '#2E6F40' },
  { key: 'goat', label: 'Goat', swahili: 'Mbuzi', color: '#f59e0b' },
  { key: 'sheep', label: 'Sheep', swahili: 'Kondoo', color: '#8b5cf6' },
  { key: 'poultry', label: 'Poultry', swahili: 'Kuku', color: '#3b82f6' },
  { key: 'pig', label: 'Pig', swahili: 'Nguruwe', color: '#ec4899' },
];

const HEALTH: { key: LivestockAnimal['healthStatus']; label: string; color: string; icon: any }[] =
  [
    { key: 'healthy', label: 'Mzima', color: '#2E6F40', icon: CheckCircle2 },
    { key: 'attention', label: 'Tahadhari', color: '#f59e0b', icon: AlertTriangle },
    { key: 'sick', label: 'Mgonjwa', color: '#ef4444', icon: HeartPulse },
  ];

function speciesColor(s: LivestockSpecies) {
  return SPECIES.find((x) => x.key === s)?.color ?? '#94a3b8';
}
function SpeciesIcon({
  species,
  size,
  color,
}: {
  species: LivestockSpecies;
  size: number;
  color: string;
}) {
  if (species === 'poultry') return <Bird size={size} color={color} />;
  return <Beef size={size} color={color} />;
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000);
}

// ─── RIFT Micro Chart ───────────────────────────────────────────────────────────
function VitalTrendChart({ data, color }: { data: number[]; color: string }) {
  // Clamp: window width can read 0 on first web hydration, which fed a
  // negative width into the SVG chart (console error + broken flash).
  const chartW = Math.max(1, SW - 80);
  const chartH = 60;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * (chartW - 10) + 5;
      const y = chartH - ((val - min) / (max - min || 1)) * (chartH - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ marginVertical: 8, height: chartH }}>
      <Svg width={chartW} height={chartH}>
        <Rect width={chartW} height={chartH} fill="rgba(0,0,0,0.02)" rx={8} />
        <Polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
        {data.map((val, index) => {
          const x = (index / (data.length - 1)) * (chartW - 10) + 5;
          const y = chartH - ((val - min) / (max - min || 1)) * (chartH - 10) - 5;
          return (
            <SvgCircle
              key={index}
              cx={x}
              cy={y}
              r="3.5"
              fill={color}
              stroke="#FFF"
              strokeWidth="1.5"
            />
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Add modal ────────────────────────────────────────────────────────────────
function AddAnimalModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (a: Omit<LivestockAnimal, 'id'>) => void;
}) {
  const { colors, isDark } = useTheme();
  const [species, setSpecies] = useState<LivestockSpecies>('cattle');
  const [name, setName] = useState('');
  const [tag, setTag] = useState(() => `TZ-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [weight, setWeight] = useState('');
  const [health, setHealth] = useState<LivestockAnimal['healthStatus']>('healthy');

  function handleSave() {
    if (!tag.trim()) {
      Alert.alert('Tagi inahitajika', 'Tafadhali weka namba ya tagi ya mnyama.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      tag: tag.trim(),
      species,
      name: name.trim() || undefined,
      weightKg: parseFloat(weight) || undefined,
      healthStatus: health,
      nextVaccineDue: new Date(Date.now() + 90 * 86400_000).toISOString(),
    });
    setName('');
    setWeight('');
    setHealth('healthy');
    setTag(`TZ-${Math.floor(Math.random() * 9000 + 1000)}`);
    onClose();
  }

  const sc = SPECIES.find((x) => x.key === species)!;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={[m.sheet, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
          {/* Handle */}
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <View style={m.sheetHeader}>
            <Text style={[m.sheetTitle, { color: colors.text }]}>Sajili Mnyama Mpya</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[m.closeBtn, { backgroundColor: colors.card }]}
            >
              <X size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Species */}
            <Text style={[m.label, { color: colors.textMute }]}>AINA YA MNYAMA</Text>
            <View style={m.speciesRow}>
              {SPECIES.map((sp) => (
                <TouchableOpacity
                  key={sp.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSpecies(sp.key);
                  }}
                  style={[
                    m.speciesPill,
                    {
                      borderColor: species === sp.key ? sp.color : colors.border,
                      backgroundColor: species === sp.key ? sp.color + '20' : 'transparent',
                    },
                  ]}
                >
                  <SpeciesIcon
                    species={sp.key}
                    size={16}
                    color={species === sp.key ? sp.color : colors.textMute}
                  />
                  <Text
                    style={[
                      m.speciesText,
                      { color: species === sp.key ? sp.color : colors.textMute },
                    ]}
                  >
                    {sp.swahili}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tag */}
            <Text style={[m.label, { color: colors.textMute }]}>NAMBA YA TAGI *</Text>
            <View
              style={[m.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={tag}
                onChangeText={setTag}
                style={[m.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. TZ-1234"
              />
            </View>

            {/* Name */}
            <Text style={[m.label, { color: colors.textMute }]}>JINA (HIARI)</Text>
            <View
              style={[m.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                style={[m.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. Sita, Bahati..."
              />
            </View>

            {/* Weight */}
            <Text style={[m.label, { color: colors.textMute }]}>UZITO (kg, HIARI)</Text>
            <View
              style={[m.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                style={[m.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. 320"
              />
            </View>

            {/* Health */}
            <Text style={[m.label, { color: colors.textMute }]}>HALI YA AFYA</Text>
            <View style={m.healthRow}>
              {HEALTH.map((h) => {
                const Icon = h.icon;
                return (
                  <TouchableOpacity
                    key={h.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setHealth(h.key);
                    }}
                    style={[
                      m.healthPill,
                      {
                        borderColor: health === h.key ? h.color : colors.border,
                        backgroundColor: health === h.key ? h.color + '20' : 'transparent',
                        flex: 1,
                      },
                    ]}
                  >
                    <Icon size={14} color={health === h.key ? h.color : colors.textMute} />
                    <Text
                      style={[
                        m.healthText,
                        { color: health === h.key ? h.color : colors.textMute },
                      ]}
                    >
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={[m.saveBtn, { backgroundColor: sc.color }]}
            >
              <Plus size={18} color="#fff" />
              <Text style={m.saveBtnText}>Sajili {sc.swahili}</Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Animal card ──────────────────────────────────────────────────────────────
function AnimalCard({
  a,
  idx,
  onUpdateHealth,
  onDelete,
}: {
  a: LivestockAnimal;
  idx: number;
  onUpdateHealth: (id: string, next: LivestockAnimal['healthStatus']) => void;
  onDelete: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sc = speciesColor(a.species);
  const healthMeta = HEALTH.find((h) => h.key === a.healthStatus)!;
  const HealthIcon = healthMeta.icon;
  const speciesMeta = SPECIES.find((x) => x.key === a.species)!;

  const vacDays = a.nextVaccineDue ? daysUntil(a.nextVaccineDue) : null;
  const vacColor =
    vacDays !== null
      ? vacDays < 0
        ? '#ef4444'
        : vacDays < 14
          ? '#f59e0b'
          : colors.primary
      : colors.textMute;
  // Urgency fill: 0 = far away, 1 = overdue
  const vacUrgency =
    vacDays !== null ? Math.min(1, Math.max(0, vacDays < 0 ? 1 : (90 - vacDays) / 90)) : 0;

  function cycleHealth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const i = HEALTH.findIndex((h) => h.key === a.healthStatus);
    onUpdateHealth(a.id, HEALTH[(i + 1) % HEALTH.length].key);
  }

  function confirmDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Futa Mnyama', `Futa ${a.tag}${a.name ? ` (${a.name})` : ''}?`, [
      { text: 'Ghairi', style: 'cancel' },
      { text: 'Futa', style: 'destructive', onPress: () => onDelete(a.id) },
    ]);
  }

  return (
    <Animated.View entering={FadeInDown.delay(idx * 40)}>
      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        {/* ── Card body: left accent strip + content ── */}
        <View style={{ flexDirection: 'row' }}>
          {/* Left accent strip */}
          <View
            style={{
              width: 4,
              backgroundColor: sc,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: expanded ? 0 : 16,
            }}
          />

          {/* Content */}
          <View style={{ flex: 1, padding: 14 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Species icon bubble */}
              <View
                style={[
                  ac.iconBg,
                  { backgroundColor: sc + '18', borderColor: sc + '30', borderWidth: 1 },
                ]}
              >
                <SpeciesIcon species={a.species} size={20} color={sc} />
              </View>

              {/* Tag + name + chips */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
                >
                  <Text style={[ac.tag, { color: colors.text }]}>{a.tag}</Text>
                  {a.name && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View
                        style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: sc }}
                      />
                      <Text style={[ac.name, { color: sc }]}>{a.name}</Text>
                    </View>
                  )}
                </View>
                {/* Species + weight chips */}
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                  <View style={[ac.chip, { backgroundColor: sc + '12', borderColor: sc + '30' }]}>
                    <Text style={[ac.chipText, { color: sc }]}>
                      {speciesMeta.swahili.toUpperCase()}
                    </Text>
                  </View>
                  {a.weightKg && (
                    <View
                      style={[
                        ac.chip,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[ac.chipText, { color: colors.textMute }]}>{a.weightKg} kg</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Health badge — tappable to cycle */}
              <TouchableOpacity
                onPress={cycleHealth}
                style={[
                  ac.healthBadge,
                  {
                    backgroundColor: healthMeta.color + '15',
                    borderColor: healthMeta.color + '40',
                  },
                ]}
              >
                <HealthIcon size={10} color={healthMeta.color} />
                <Text style={[ac.healthText, { color: healthMeta.color }]}>{healthMeta.label}</Text>
              </TouchableOpacity>
            </View>

            {/* Vaccine section */}
            {a.nextVaccineDue && (
              <View style={{ marginTop: 12 }}>
                {/* Label row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Syringe size={11} color={vacColor} />
                  <Text style={[ac.vacText, { color: vacColor, flex: 1 }]}>
                    {vacDays! < 0
                      ? `Chanjo imechelewa — siku ${Math.abs(vacDays!)} zilipita`
                      : vacDays === 0
                        ? 'Chanjo leo!'
                        : `Chanjo katika siku ${vacDays}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setExpanded(!expanded);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      ac.expandBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {expanded ? (
                      <ChevronUp size={12} color={colors.textMute} />
                    ) : (
                      <ChevronDown size={12} color={colors.textMute} />
                    )}
                  </TouchableOpacity>
                </View>
                {/* Urgency progress bar */}
                <View
                  style={{
                    height: 3,
                    backgroundColor: colors.border,
                    borderRadius: 2,
                    marginTop: 6,
                  }}
                >
                  <View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: vacColor,
                      width: `${Math.round(vacUrgency * 100)}%`,
                      opacity: 0.85,
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Expanded details */}
        {expanded && (
          <Animated.View
            entering={FadeInDown}
            style={[
              ac.expandedBox,
              {
                borderTopColor: colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              },
            ]}
          >
            {a.birthDate && (
              <Detail
                label="Tarehe ya kuzaliwa"
                value={new Date(a.birthDate).toLocaleDateString('en-GB')}
              />
            )}
            {a.lastVaccineDate && (
              <Detail
                label="Chanjo ya mwisho"
                value={new Date(a.lastVaccineDate).toLocaleDateString('en-GB')}
              />
            )}
            {a.notes && <Detail label="Maelezo" value={a.notes} />}
            <TouchableOpacity
              onPress={confirmDelete}
              style={[ac.deleteBtn, { borderColor: '#ef444435' }]}
            >
              <Trash2 size={12} color="#ef4444" />
              <Text style={ac.deleteText}>Futa mnyama huyu</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: colors.textMute, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: 11, fontFamily: 'Inter_700Bold' }}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LivestockScreen() {
  const { colors } = useTheme();
  const animals = useFarmDataStore((s) => s.livestock);
  const addAnimal = useFarmDataStore((s) => s.addAnimal);
  const updateAnimal = useFarmDataStore((s) => s.updateAnimal);
  const removeAnimal = useFarmDataStore((s) => s.removeAnimal);
  const [showModal, setShowModal] = useState(false);

  const healthy = animals.filter((a) => a.healthStatus === 'healthy').length;
  const attention = animals.filter((a) => a.healthStatus === 'attention').length;
  const sick = animals.filter((a) => a.healthStatus === 'sick').length;
  const dueSoon = animals.filter((a) => a.nextVaccineDue && daysUntil(a.nextVaccineDue) < 14);

  return (
    <Gate
      feature="livestock"
      fallback={
        <PageScaffold title="Mifugo" badge="LIVESTOCK">
          <AccessDenied />
        </PageScaffold>
      }
    >
      <AddAnimalModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={(a) => addAnimal(a)}
      />
      <PageScaffold
        title="Mifugo"
        subtitle={`${animals.length} wanyama`}
        badge="LIVESTOCK"
        headerRight={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add livestock"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowModal(true);
            }}
            style={[s.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={20} color="#000" />
          </TouchableOpacity>
        }
      >
        {/* Summary ribbon */}
        {animals.length > 0 && (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            <Animated.View entering={FadeInDown}>
              <GlassCard style={s.summaryCard}>
                <SummaryPill count={healthy} label="Wazima" color={colors.primary} />
                <SummaryPill count={attention} label="Tahadhari" color="#f59e0b" />
                <SummaryPill count={sick} label="Wagonjwa" color="#ef4444" />
                {dueSoon.length > 0 && (
                  <SummaryPill
                    count={dueSoon.length}
                    label="Chanjo Karibuni"
                    color="#3b82f6"
                  />
                )}
              </GlassCard>
            </Animated.View>

            {/* Species Breakdown */}
            <Animated.View entering={FadeInDown.delay(100)}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 10,
                    color: colors.textMute,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  AINA YA MIFUGO · BY SPECIES
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {SPECIES.map((sp) => {
                  const count = animals.filter((a) => a.species === sp.key).length;
                  return (
                    <GlassCard
                      key={sp.key}
                      style={{
                        width: 90,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        alignItems: 'center',
                        borderColor: count > 0 ? sp.color + '40' : colors.border,
                        borderWidth: count > 0 ? 1.5 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: sp.color + '12',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <SpeciesIcon species={sp.key} size={14} color={sp.color} />
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: 'InstrumentSerif_400Regular',
                          color: colors.text,
                          fontWeight: '600',
                        }}
                      >
                        {count}
                      </Text>
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontFamily: 'Inter_700Bold',
                          color: colors.textMute,
                          marginTop: 1,
                        }}
                      >
                        {sp.swahili}
                      </Text>
                    </GlassCard>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        )}

        {/* Vaccine alert */}
        {dueSoon.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <GlassCard style={[s.alertCard, { borderColor: '#f59e0b50' }]}>
              <Syringe size={18} color="#f59e0b" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.alertTitle, { color: colors.text }]}>Chanjo Zinakaribia</Text>
                <Text style={[s.alertBody, { color: colors.textMute }]}>
                  {dueSoon.map((a) => a.tag).join(', ')} — ndani ya siku 14
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        <SectionHeader title={`Kundi · ${animals.length} wanyama`} />
        {animals.length === 0 ? (
          <EmptyState
            icon={<Beef size={40} color={colors.primary} />}
            title="Hakuna wanyama bado"
            body="Anza kufuatilia afya, ukuaji na chanjo za mifugo yako."
            cta="Sajili Mnyama wa Kwanza"
            onCta={() => setShowModal(true)}
          />
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 10 }}>
            {animals.map((a, idx) => (
              <AnimalCard
                key={a.id}
                a={a}
                idx={idx}
                onUpdateHealth={(id, next) => updateAnimal(id, { healthStatus: next })}
                onDelete={removeAnimal}
              />
            ))}
          </View>
        )}

      </PageScaffold>
    </Gate>
  );
}

function SummaryPill({ count, label, color }: { count: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.pillCount, { color }]}>{count}</Text>
      <Text style={[s.pillLabel, { color: colors.textMute }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ─── RIFT HerdTag IoT Section ────────────────────────────────────────────────
const RIFT_FEATURES = [
  { icon: '📡', title: 'GPS Tracking', desc: 'Eneo la mnyama kwa wakati halisi — accuracy ±3m' },
  { icon: '💓', title: 'Mapigo ya Moyo', desc: 'Heart rate & temperature monitoring ya masaa 24' },
  {
    icon: '⚡',
    title: 'Betri ya Mwaka 2',
    desc: 'Ultra-low power design — kubadilisha mara moja kwa miaka 2',
  },
  {
    icon: '🔔',
    title: 'Tahadhari za Haraka',
    desc: 'SMS + in-app alert ukiwa nje ya eneo au mnyama ana homa',
  },
];

function RIFTHerdTagSection({ animals }: { animals: LivestockAnimal[] }) {
  const { colors, isDark } = useTheme();
  const [registered, setRegistered] = React.useState<Set<string>>(new Set(['a1']));

  function toggleTag(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRegistered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <SectionHeader title="RIFT HerdTag · IoT Masikio" />
      <View style={{ paddingHorizontal: 24, gap: 10 }}>
        {/* Feature pills */}
        <View
          style={[
            rt.featureCard,
            {
              backgroundColor: isDark ? colors.primary + '0F' : colors.primary + '0A',
              borderColor: '#2E6F4030',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={[rt.tagIconBg, { backgroundColor: '#2E6F4018' }]}>
              <Text style={{ fontSize: 16 }}>🏷️</Text>
            </View>
            <View>
              <Text style={[rt.tagTitle, { color: colors.text }]}>RIFT HerdTag™</Text>
              <Text style={[rt.tagSub, { color: colors.primary }]}>
                Smart Ear Tag · 4G + BLE + GPS
              </Text>
            </View>
          </View>
          <View style={rt.featureGrid}>
            {RIFT_FEATURES.map((f) => (
              <View key={f.icon} style={rt.featurePill}>
                <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[rt.featureTitle, { color: colors.text }]}>{f.title}</Text>
                  <Text style={[rt.featureDesc, { color: colors.textMute }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Per-animal registration */}
        {animals.map((a) => {
          const isReg = registered.has(a.id);
          const sp = SPECIES.find((x) => x.key === a.species);
          return (
            <GlassCard
              key={a.id}
              style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}
            >
              <View
                style={[rt.animalIcon, { backgroundColor: (sp?.color ?? colors.primary) + '18' }]}
              >
                <SpeciesIcon species={a.species} size={18} color={sp?.color ?? colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[rt.animalTag, { color: colors.text }]}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ''}
                </Text>
                <Text style={[rt.animalSub, { color: isReg ? colors.primary : colors.textMute }]}>
                  {isReg
                    ? '📡 RIFT tag imeunganishwa · Ikiangaliwa'
                    : 'Haijaunganishwa na RIFT tag'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleTag(a.id)}
                style={[
                  rt.regBtn,
                  {
                    backgroundColor: isReg ? colors.primary : colors.primary + '15',
                    borderColor: isReg ? colors.primary : colors.primary + '40',
                  },
                ]}
              >
                <Text style={[rt.regText, { color: isReg ? '#fff' : colors.primary }]}>
                  {isReg ? 'Imesajiliwa ✓' : 'Sajili'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          );
        })}

        {animals.length === 0 && (
          <GlassCard style={{ padding: 20, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Inter_600SemiBold',
                color: colors.textMute,
                textAlign: 'center',
              }}
            >
              Ongeza mnyama kwanza ili kuweza kusajili RIFT HerdTag.
            </Text>
          </GlassCard>
        )}
      </View>
    </>
  );
}

const rt = StyleSheet.create({
  featureCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  tagIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagTitle: { fontSize: 15, fontFamily: 'InstrumentSerif_400Regular' },
  tagSub: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.3 },
  featureGrid: { gap: 10 },
  featurePill: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  featureDesc: { fontSize: 11, fontFamily: 'Inter_500Medium', lineHeight: 15, marginTop: 1 },
  animalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalTag: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  animalSub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
  regBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  regText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
});

function AccessDenied() {
  return (
    <EmptyState
      icon={<AlertTriangle size={36} color="#f59e0b" />}
      title="Haipatikani"
      body="Kipengele cha mifugo hakipatikani kwa jukumu lako."
    />
  );
}

const s = StyleSheet.create({
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: { flexDirection: 'row', padding: 16 },
  pillCount: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  pillLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  alertCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1 },
  alertTitle: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
  alertBody: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
});

const ac = StyleSheet.create({
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: { fontSize: 15, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: 0.3 },
  name: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  chipText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.8 },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  healthText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  vacText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  expandBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedBox: {
    marginHorizontal: 4,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  deleteText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', color: '#ef4444' },
});

const m = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
  },
  speciesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speciesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  speciesText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 15, fontFamily: 'Inter_600SemiBold', paddingVertical: 10 },
  healthRow: { flexDirection: 'row', gap: 8 },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  healthText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0.3,
  },
});
