/**
 * Inventory — redesigned
 * Category filter chips · pill qty stepper · animated fill bars · value tiles
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
} from 'react-native';
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  Boxes,
  Sprout,
  Syringe,
  Wrench,
  Beef,
  Wheat,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  ShieldCheck,
  DollarSign,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../components/PageScaffold';
import { useTheme } from '../constants/Theme';
import { useFarmDataStore, InventoryItem, InventoryUnit } from '../store/useFarmDataStore';
import { Gate } from '../lib/access';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: {
  key: InventoryItem['category'];
  label: string;
  swahili: string;
  color: string;
  Icon: any;
}[] = [
  { key: 'seed', label: 'Seed', swahili: 'Mbegu', color: '#3C4A2A', Icon: Wheat },
  { key: 'fertilizer', label: 'Fertilizer', swahili: 'Mbolea', color: '#3b82f6', Icon: Sprout },
  { key: 'pesticide', label: 'Pesticide', swahili: 'Dawa', color: '#f59e0b', Icon: Syringe },
  { key: 'feed', label: 'Feed', swahili: 'Chakula', color: '#8b5cf6', Icon: Beef },
  { key: 'tool', label: 'Tool', swahili: 'Zana', color: '#64748b', Icon: Wrench },
  { key: 'other', label: 'Other', swahili: 'Nyingine', color: '#94a3b8', Icon: Package },
];

const UNITS: { key: InventoryUnit; label: string }[] = [
  { key: 'kg', label: 'kg' },
  { key: 'L', label: 'Lit' },
  { key: 'bag', label: 'Mfuko' },
  { key: 'piece', label: 'Kipande' },
  { key: 'pack', label: 'Pakiti' },
];

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
const fmtShort = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(0)}K`
      : String(n);
const catMeta = (c: InventoryItem['category']) =>
  CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[5];

// ─── Fill bar ─────────────────────────────────────────────────────────────────
function FillBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={fb.track}>
      <View
        style={[
          fb.fill,
          { backgroundColor: color, width: `${Math.round(progress * 100)}%` as any },
        ]}
      />
    </View>
  );
}
const fb = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[st.tile, { backgroundColor: colors.card, borderColor: accent + '30' }]}>
      <View style={[st.iconRing, { backgroundColor: accent + '15' }]}>{icon}</View>
      <Text style={[st.value, { color: colors.text }]}>{value}</Text>
      <Text style={[st.label, { color: colors.textMute }]}>{label}</Text>
      {sub && <Text style={[st.sub, { color: accent }]}>{sub}</Text>}
    </View>
  );
}
const st = StyleSheet.create({
  tile: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  iconRing: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  value: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textAlign: 'center' },
  sub: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
});

// ─── Add modal ────────────────────────────────────────────────────────────────
function AddItemModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (i: Omit<InventoryItem, 'id'>) => void;
}) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('seed');
  const [unit, setUnit] = useState<InventoryUnit>('kg');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [lowAt, setLowAt] = useState('');
  const [supplier, setSupplier] = useState('');

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Jina linahitajika', 'Tafadhali weka jina la bidhaa.');
      return;
    }
    const q = parseFloat(qty) || 0;
    if (q <= 0) {
      Alert.alert('Kiasi kinahitajika', 'Tafadhali weka kiasi cha sasa hivi.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      name: name.trim(),
      category,
      unit,
      qty: q,
      lowStockAt: parseFloat(lowAt) || 0,
      costPerUnitTZS: parseFloat(cost) || undefined,
      supplier: supplier.trim() || undefined,
    });
    setName('');
    setQty('');
    setCost('');
    setLowAt('');
    setSupplier('');
    onClose();
  }

  const cm = catMeta(category);
  const CatIcon = cm.Icon;

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
        <View style={[mo.sheet, { backgroundColor: isDark ? '#141c10' : '#fff' }]}>
          <View style={[mo.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={mo.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[mo.preview, { backgroundColor: cm.color + '20' }]}>
                <CatIcon size={20} color={cm.color} />
              </View>
              <View>
                <Text style={[mo.title, { color: colors.text }]}>Bidhaa Mpya</Text>
                <Text style={[mo.sub, { color: colors.textMute }]}>Ongeza kwenye hifadhi yako</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[mo.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <X size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Category chips */}
            <Text style={[mo.label, { color: colors.textMute }]}>AINA YA BIDHAA</Text>
            <View style={mo.catGrid}>
              {CATEGORIES.map((c) => {
                const Icon = c.Icon;
                const active = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(c.key);
                    }}
                    style={[
                      mo.catChip,
                      {
                        borderColor: active ? c.color : colors.border,
                        backgroundColor: active ? c.color + '18' : colors.card,
                      },
                    ]}
                  >
                    <Icon size={14} color={active ? c.color : colors.textMute} />
                    <Text style={[mo.catText, { color: active ? c.color : colors.textMute }]}>
                      {c.swahili}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[mo.label, { color: colors.textMute }]}>JINA LA BIDHAA *</Text>
            <View
              style={[mo.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                style={[mo.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. DAP Fertilizer, Maize Seed..."
              />
            </View>

            <Text style={[mo.label, { color: colors.textMute }]}>KIPIMO</Text>
            <View style={mo.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setUnit(u.key);
                  }}
                  style={[
                    mo.unitPill,
                    {
                      borderColor: unit === u.key ? colors.primary : colors.border,
                      backgroundColor: unit === u.key ? colors.primary + '18' : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      mo.unitText,
                      { color: unit === u.key ? colors.primary : colors.textMute },
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[mo.label, { color: colors.textMute }]}>KIASI SASA *</Text>
                <View
                  style={[
                    mo.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <TextInput
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="decimal-pad"
                    style={[mo.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="0"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[mo.label, { color: colors.textMute }]}>KIWANGO CHA CHINI</Text>
                <View
                  style={[
                    mo.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <TextInput
                    value={lowAt}
                    onChangeText={setLowAt}
                    keyboardType="decimal-pad"
                    style={[mo.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="0"
                  />
                </View>
              </View>
            </View>

            <Text style={[mo.label, { color: colors.textMute }]}>GHARAMA KWA KIPIMO (TZS)</Text>
            <View
              style={[mo.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                style={[mo.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. 95,000"
              />
            </View>

            <Text style={[mo.label, { color: colors.textMute }]}>MUUZAJI (HIARI)</Text>
            <View
              style={[mo.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <TextInput
                value={supplier}
                onChangeText={setSupplier}
                style={[mo.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. YARA, East African Seed..."
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={[mo.saveBtn, { backgroundColor: cm.color }]}
            >
              <Plus size={18} color="#fff" />
              <Text style={mo.saveBtnText}>Hifadhi Bidhaa</Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Item card — redesigned ───────────────────────────────────────────────────
function ItemCard({
  item,
  idx,
  adjust,
  remove,
}: {
  item: InventoryItem;
  idx: number;
  adjust: (id: string, delta: number) => void;
  remove: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cm = catMeta(item.category);
  const { Icon } = cm;
  const low = item.qty <= item.lowStockAt && item.lowStockAt > 0;
  const warn = !low && item.lowStockAt > 0 && item.qty <= item.lowStockAt * 1.5;

  const maxVal = Math.max(item.qty, item.lowStockAt * 2, 1);
  const progress = Math.min(item.qty / maxVal, 1);
  const barColor = low ? '#ef4444' : warn ? '#f59e0b' : cm.color;

  const totalValue = item.qty * (item.costPerUnitTZS ?? 0);

  function confirmDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Futa Bidhaa', `Futa "${item.name}" kutoka hifadhi?`, [
      { text: 'Ghairi', style: 'cancel' },
      { text: 'Futa', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  }

  return (
    <Animated.View entering={FadeInDown.delay(idx * 50).springify()}>
      <GlassCard style={[ic.card, low && { borderColor: '#ef444440', borderWidth: 1.5 }]}>
        {/* Top accent stripe */}
        <View style={[ic.stripe, { backgroundColor: cm.color }]} />

        <View style={ic.body}>
          {/* Row 1 — icon · name · stepper */}
          <View style={ic.topRow}>
            <View style={[ic.iconCircle, { backgroundColor: cm.color + '15' }]}>
              <Icon size={22} color={cm.color} />
            </View>

            <View style={ic.nameBlock}>
              <Text style={[ic.name, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <View style={[ic.badge, { backgroundColor: cm.color + '18' }]}>
                  <Text style={[ic.badgeText, { color: cm.color }]}>
                    {cm.swahili.toUpperCase()}
                  </Text>
                </View>
                {item.supplier && (
                  <View style={[ic.badge, { backgroundColor: colors.border + '80' }]}>
                    <Text style={[ic.badgeText, { color: colors.textMute }]}>{item.supplier}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pill stepper */}
            <View
              style={[
                ic.stepper,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  adjust(item.id, -1);
                }}
                style={ic.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Minus size={12} color={item.qty <= 0 ? colors.border : colors.textMute} />
              </TouchableOpacity>
              <Text style={[ic.stepVal, { color: low ? '#ef4444' : colors.text }]}>
                {item.qty}
                <Text
                  style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.textMute }}
                >
                  {item.unit}
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  adjust(item.id, 1);
                }}
                style={ic.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Plus size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Fill bar */}
          <FillBar progress={progress} color={barColor} />

          {/* Low-stock banner */}
          {low && (
            <Animated.View
              entering={FadeIn}
              style={[ic.lowBanner, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]}
            >
              <TrendingDown size={12} color="#ef4444" />
              <Text style={ic.lowText}>
                Stock chini — min. {item.lowStockAt}
                {item.unit}
              </Text>
            </Animated.View>
          )}

          {/* Row 2 — value + expand */}
          <TouchableOpacity
            onPress={() => {
              setExpanded(!expanded);
              Haptics.selectionAsync();
            }}
            style={[ic.footRow, { borderTopColor: colors.border }]}
          >
            <View style={{ gap: 1 }}>
              {item.costPerUnitTZS ? (
                <>
                  <Text style={[ic.priceTag, { color: colors.textMute }]}>
                    TZS {fmt(item.costPerUnitTZS)}/{item.unit}
                  </Text>
                  <Text style={[ic.totalTag, { color: colors.text }]}>
                    Thamani:{' '}
                    <Text style={{ color: cm.color, fontFamily: 'Inter_500Medium' }}>
                      TZS {fmt(totalValue)}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text style={[ic.priceTag, { color: colors.textMute }]}>Bonyeza kwa maelezo</Text>
              )}
            </View>
            <View style={[ic.expandChip, { backgroundColor: colors.border + '50' }]}>
              {expanded ? (
                <ChevronUp size={14} color={colors.textMute} />
              ) : (
                <ChevronDown size={14} color={colors.textMute} />
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded detail */}
          {expanded && (
            <Animated.View
              entering={FadeIn}
              style={[
                ic.detail,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: colors.border,
                },
              ]}
            >
              {item.costPerUnitTZS ? (
                <DetailRow
                  label="Gharama kwa kipimo"
                  value={`TZS ${fmt(item.costPerUnitTZS)}`}
                  colors={colors}
                />
              ) : null}
              {item.costPerUnitTZS ? (
                <DetailRow
                  label="Thamani yote"
                  value={`TZS ${fmt(totalValue)}`}
                  colors={colors}
                  accent={cm.color}
                />
              ) : null}
              {item.expiresOn ? (
                <DetailRow
                  label="Tarehe ya mwisho"
                  value={new Date(item.expiresOn).toLocaleDateString('en-GB')}
                  colors={colors}
                />
              ) : null}
              {item.supplier ? (
                <DetailRow label="Muuzaji" value={item.supplier} colors={colors} />
              ) : null}
              <TouchableOpacity onPress={confirmDelete} style={ic.deleteBtn}>
                <Trash2 size={13} color="#ef4444" />
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#ef4444' }}>
                  Futa bidhaa hii
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: any;
  accent?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: colors.textMute, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
      <Text style={{ color: accent ?? colors.text, fontSize: 13, fontFamily: 'Inter_700Bold' }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const { colors } = useTheme();
  const items = useFarmDataStore((s) => s.inventory);
  const adjust = useFarmDataStore((s) => s.adjustItem);
  const addItem = useFarmDataStore((s) => s.addItem);
  const removeItem = useFarmDataStore((s) => s.removeItem);

  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InventoryItem['category'] | 'all'>('all');

  const lowStock = items.filter((i) => i.qty <= i.lowStockAt && i.lowStockAt > 0);
  const totalValue = items.reduce((sum, i) => sum + i.qty * (i.costPerUnitTZS ?? 0), 0);

  const filtered = useMemo(
    () => (activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter)),
    [items, activeFilter]
  );

  // Category counts for filter badges
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.category] = (map[i.category] ?? 0) + 1;
    });
    return map;
  }, [items]);

  return (
    <Gate
      feature="inventory"
      fallback={
        <PageScaffold title="Hifadhi" badge="INVENTORY">
          <AccessDenied />
        </PageScaffold>
      }
    >
      <AddItemModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={(i) => addItem(i)}
      />
      <PageScaffold
        title="Hifadhi"
        subtitle="Pembejeo zako zote"
        badge="INVENTORY"
        headerRight={
          <TouchableOpacity
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
        {/* ── Stat tiles ── */}
        {items.length > 0 && (
          <Animated.View entering={FadeInDown.delay(30).springify()}>
            <View style={{ paddingHorizontal: 24, flexDirection: 'row', gap: 10 }}>
              <StatTile
                icon={<Boxes size={18} color={colors.primary} />}
                label="Bidhaa Zote"
                value={String(items.length)}
                accent={colors.primary}
              />
              <StatTile
                icon={
                  <TrendingDown size={18} color={lowStock.length > 0 ? '#ef4444' : '#3C4A2A'} />
                }
                label="Stock Chini"
                value={String(lowStock.length)}
                sub={lowStock.length > 0 ? 'Angalia' : 'Salama'}
                accent={lowStock.length > 0 ? '#ef4444' : '#3C4A2A'}
              />
              <StatTile
                icon={<DollarSign size={18} color="#8b5cf6" />}
                label="Thamani Yote"
                value={`${fmtShort(totalValue)}`}
                sub="TZS"
                accent="#8b5cf6"
              />
            </View>
          </Animated.View>
        )}

        {/* ── Low stock alert banner ── */}
        {lowStock.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
              <View
                style={[s.alertBanner, { backgroundColor: '#ef444412', borderColor: '#ef444435' }]}
              >
                <View style={s.alertIconRing}>
                  <AlertTriangle size={16} color="#ef4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.alertTitle, { color: colors.text }]}>
                    Bidhaa {lowStock.length} {lowStock.length === 1 ? 'ina' : 'zina'} stock chini
                  </Text>
                  <Text style={[s.alertBody, { color: colors.textMute }]} numberOfLines={1}>
                    {lowStock.map((i) => `${i.name} (${i.qty}${i.unit})`).join(' · ')}
                  </Text>
                </View>
                <View style={[s.alertCount, { backgroundColor: '#ef4444' }]}>
                  <Text style={s.alertCountText}>{lowStock.length}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Category filter chips ── */}
        {items.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <View style={{ paddingTop: 20, paddingBottom: 2 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
              >
                {/* All */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveFilter('all');
                  }}
                  style={[
                    s.filterChip,
                    {
                      backgroundColor: activeFilter === 'all' ? colors.primary : colors.card,
                      borderColor: activeFilter === 'all' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.filterText,
                      { color: activeFilter === 'all' ? '#000' : colors.textMute },
                    ]}
                  >
                    Zote {items.length}
                  </Text>
                </TouchableOpacity>
                {CATEGORIES.filter((c) => (catCounts[c.key] ?? 0) > 0).map((c) => {
                  const active = activeFilter === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setActiveFilter(c.key);
                      }}
                      style={[
                        s.filterChip,
                        {
                          backgroundColor: active ? c.color + '20' : colors.card,
                          borderColor: active ? c.color : colors.border,
                        },
                      ]}
                    >
                      <c.Icon size={12} color={active ? c.color : colors.textMute} />
                      <Text style={[s.filterText, { color: active ? c.color : colors.textMute }]}>
                        {c.swahili} {catCounts[c.key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </Animated.View>
        )}

        {/* ── Item list ── */}
        <SectionHeader
          title={
            activeFilter === 'all'
              ? `Hifadhi · ${items.length} bidhaa`
              : `${catMeta(activeFilter).swahili} · ${filtered.length} bidhaa`
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<Boxes size={40} color={colors.primary} />}
            title="Hakuna bidhaa bado"
            body="Anza kufuatilia mbegu, mbolea, dawa na zana zako zote."
            cta="Ongeza Bidhaa ya Kwanza"
            onCta={() => setShowModal(true)}
          />
        ) : filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <Text
                style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.textMute }}
              >
                Hakuna bidhaa za {catMeta(activeFilter as InventoryItem['category']).swahili} bado.
              </Text>
            </GlassCard>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {filtered.map((i, idx) => (
              <ItemCard key={i.id} item={i} idx={idx} adjust={adjust} remove={removeItem} />
            ))}
          </View>
        )}
      </PageScaffold>
    </Gate>
  );
}

function AccessDenied() {
  return (
    <EmptyState
      icon={<AlertTriangle size={36} color="#f59e0b" />}
      title="Haipatikani"
      body="Pembejeo haipatikani kwa jukumu lako."
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  alertIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
  alertBody: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  alertCount: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCountText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#fff' },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});

const ic = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  stripe: { height: 3 },
  body: { padding: 16 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameBlock: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.8 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepVal: {
    fontSize: 14,
    fontFamily: 'InstrumentSerif_400Regular',
    minWidth: 42,
    textAlign: 'center',
  },

  lowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  lowText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#ef4444', flex: 1 },

  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceTag: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  totalTag: { fontSize: 13, fontFamily: 'InstrumentSerif_400Regular' },
  expandChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  detail: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef444440',
    alignSelf: 'flex-start',
  },
});

const mo = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  preview: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  sub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  catText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  input: { fontSize: 15, fontFamily: 'Inter_500Medium', paddingVertical: 10 },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  unitText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 17,
    borderRadius: 18,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0.3,
  },
});
