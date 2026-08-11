/**
 * Daftari la Fedha — Financial Tracker
 * Income/expense ledger with monthly P&L, category breakdown, budget progress tracking,
 * contract-linked invoice generator, cash flow warnings, and mobile money sync hooks.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Tag,
  ChevronRight,
  Wheat,
  Truck,
  Package,
  Droplets,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Smartphone,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import Svg, {
  Line as SvgLine,
  Text as SvgText,
  Rect as SvgRect,
  Defs as SvgDefs,
  LinearGradient as SvgGrad,
  Stop as SvgStop,
} from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { GlassCard } from '../components/PageScaffold';

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

const { width: SW } = Dimensions.get('window');

type EntryType = 'income' | 'expense';
type Category = 'mazao' | 'mbolea' | 'usafirishaji' | 'umwagiliaji' | 'zana' | 'nyingine';

type Entry = {
  id: string;
  type: EntryType;
  category: Category;
  label: string;
  amount: number;
  ts: number;
};

const INITIAL_ENTRIES: Entry[] = [
  {
    id: 'e1',
    type: 'income',
    category: 'mazao',
    label: 'Uza Mahindi — Kg 200',
    amount: 84000,
    ts: Date.now() - 86400000,
  },
  {
    id: 'e2',
    type: 'expense',
    category: 'mbolea',
    label: 'Urea 50kg — Yara',
    amount: 42500,
    ts: Date.now() - 172800000,
  },
  {
    id: 'e3',
    type: 'income',
    category: 'mazao',
    label: 'Maharage — Sehemu 1',
    amount: 62000,
    ts: Date.now() - 259200000,
  },
  {
    id: 'e4',
    type: 'expense',
    category: 'usafirishaji',
    label: 'Lori — Dodoma–Mbeya',
    amount: 18000,
    ts: Date.now() - 345600000,
  },
  {
    id: 'e5',
    type: 'expense',
    category: 'umwagiliaji',
    label: 'Bomba Jipya — m 30',
    amount: 9500,
    ts: Date.now() - 432000000,
  },
  {
    id: 'e6',
    type: 'income',
    category: 'mazao',
    label: 'Alizeti — Kg 80',
    amount: 168000,
    ts: Date.now() - 518400000,
  },
  {
    id: 'e7',
    type: 'expense',
    category: 'zana',
    label: 'Jembe la trekta — serikali',
    amount: 35000,
    ts: Date.now() - 604800000,
  },
  {
    id: 'e8',
    type: 'income',
    category: 'mazao',
    label: 'Mbegu — Mauzo Ya Ziada',
    amount: 21000,
    ts: Date.now() - 691200000,
  },
];

const CAT_META: Record<
  Category,
  { icon: (c: string) => React.ReactNode; color: string; label: string; labelEn: string }
> = {
  mazao: {
    icon: (c) => <Wheat size={14} color={c} />,
    color: '#2E6F40',
    label: 'Mazao',
    labelEn: 'Crops',
  },
  mbolea: {
    icon: (c) => <Package size={14} color={c} />,
    color: '#f59e0b',
    label: 'Mbolea',
    labelEn: 'Inputs',
  },
  usafirishaji: {
    icon: (c) => <Truck size={14} color={c} />,
    color: '#3b82f6',
    label: 'Usafirishaji',
    labelEn: 'Transport',
  },
  umwagiliaji: {
    icon: (c) => <Droplets size={14} color={c} />,
    color: '#06b6d4',
    label: 'Umwagiliaji',
    labelEn: 'Irrigation',
  },
  zana: {
    icon: (c) => <Zap size={14} color={c} />,
    color: '#8b5cf6',
    label: 'Zana',
    labelEn: 'Tools',
  },
  nyingine: {
    icon: (c) => <Tag size={14} color={c} />,
    color: '#94a3b8',
    label: 'Nyingine',
    labelEn: 'Other',
  },
};

// Mock Contracts
const CONTRACTS = [
  {
    id: 'c1',
    title: 'Mkataba wa Mahindi - Tandale Co.',
    buyer: 'Tandale Wholesalers',
    value: 850000,
    milestone: 'Uwasilishaji wa Kwanza',
  },
  {
    id: 'c2',
    title: 'Mkataba wa Mpunga - Mbeya Buyer',
    buyer: 'Mbeya Millers',
    value: 1200000,
    milestone: 'Kukamilisha Upanzi',
  },
];

function fmtTZS(n: number) {
  return `TSh ${new Intl.NumberFormat('en-US').format(Math.round(n))}`;
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric' });
}

function MonthlyChart({
  months,
  colors,
}: {
  months: { label: string; income: number; expense: number }[];
  colors: any;
}) {
  const CW = Dimensions.get('window').width - 64;
  const H = 110;
  const PAD_LEFT = 42;
  const PAD_BOT = 24;
  const PAD_TOP = 8;
  const chartW = CW - PAD_LEFT - 8;
  const chartH = H - PAD_BOT - PAD_TOP;
  const maxVal = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const toY = (v: number) => PAD_TOP + chartH - (v / maxVal) * chartH;
  const barW = Math.max(6, (chartW / months.length - 6) / 2);
  const colW = chartW / months.length;
  const gridVals = [0.25, 0.5, 0.75, 1.0];

  const fmtK = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primary }}
          />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textMute }}>
            Mapato
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#ef4444' }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textMute }}>
            Matumizi
          </Text>
        </View>
      </View>
      <Svg width={CW} height={H}>
        <SvgDefs>
          <SvgGrad id="incGrad" x1="0" y1="0" x2="0" y2="1">
            <SvgStop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <SvgStop offset="100%" stopColor="#3A8D52" stopOpacity="0.9" />
          </SvgGrad>
          <SvgGrad id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <SvgStop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <SvgStop offset="100%" stopColor="#dc2626" stopOpacity="0.7" />
          </SvgGrad>
        </SvgDefs>

        {gridVals.map((pct) => {
          const gy = toY(maxVal * pct);
          return (
            <SvgLine
              key={pct}
              x1={PAD_LEFT}
              y1={gy}
              x2={CW - 8}
              y2={gy}
              stroke={colors.border}
              strokeWidth="0.8"
              strokeDasharray="3,3"
            />
          );
        })}
        {gridVals.map((pct) => (
          <SvgText
            key={pct}
            x={PAD_LEFT - 4}
            y={toY(maxVal * pct) + 3.5}
            fontSize="12"
            fontFamily="Inter_600SemiBold"
            fill={colors.textMute}
            textAnchor="end"
          >
            {fmtK(maxVal * pct)}
          </SvgText>
        ))}

        <SvgLine
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={PAD_TOP + chartH}
          stroke={colors.border}
          strokeWidth="1"
        />

        {months.map((m, i) => {
          const cx = PAD_LEFT + i * colW + colW / 2;
          const incH = Math.max(2, (m.income / maxVal) * chartH);
          const expH = Math.max(2, (m.expense / maxVal) * chartH);
          const isLast = i === months.length - 1;
          return (
            <React.Fragment key={m.label}>
              <SvgRect
                x={cx - barW - 1}
                y={toY(m.income)}
                width={barW}
                height={incH}
                rx="3"
                fill={isLast ? 'url(#incGrad)' : colors.primary}
                opacity={isLast ? 1 : 0.45}
              />
              <SvgRect
                x={cx + 1}
                y={toY(m.expense)}
                width={barW}
                height={expH}
                rx="3"
                fill={isLast ? 'url(#expGrad)' : '#ef4444'}
                opacity={isLast ? 0.85 : 0.3}
              />
              <SvgText
                x={cx}
                y={H - 4}
                fontSize="12"
                fontFamily="Inter_600SemiBold"
                fill={isLast ? colors.text : colors.textMute}
                textAnchor="middle"
              >
                {m.label}
              </SvgText>
              {isLast && (
                <SvgText
                  x={cx - barW / 2 - 1}
                  y={toY(m.income) - 3}
                  fontSize="12"
                  fontFamily="Inter_700Bold"
                  fill={colors.primary}
                  textAnchor="middle"
                >
                  {fmtK(m.income)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        <SvgLine
          x1={PAD_LEFT}
          y1={PAD_TOP + chartH}
          x2={CW - 8}
          y2={PAD_TOP + chartH}
          stroke={colors.border}
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}

export default function FinanceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<EntryType>('income');
  const [newCat, setNewCat] = useState<Category>('mazao');

  // Budget state
  const budgetLimit = 200000; // Monthly limit
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('c1');

  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === 'income').reduce((a, b) => a + b.amount, 0),
    [entries]
  );
  const totalExpense = useMemo(
    () => entries.filter((e) => e.type === 'expense').reduce((a, b) => a + b.amount, 0),
    [entries]
  );
  const profit = totalIncome - totalExpense;

  const currentMonthExpense = useMemo(() => {
    // Simulated current month expenses from entries list
    return entries.filter((e) => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
  }, [entries]);

  const budgetProgressPct = Math.min(1, currentMonthExpense / budgetLimit);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter]
  );

  const catTotals = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    entries.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + (e.type === 'income' ? e.amount : -e.amount);
    });
    return Object.entries(map)
      .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))
      .slice(0, 4) as [Category, number][];
  }, [entries]);

  const months = useMemo(() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    return labels.map((label, i) => ({
      label,
      income:
        40000 + Math.sin(i * 1.3 + 0.5) * 20000 + (i === labels.length - 1 ? totalIncome * 0.1 : 0),
      expense:
        20000 + Math.cos(i * 1.1) * 10000 + (i === labels.length - 1 ? totalExpense * 0.1 : 0),
    }));
  }, [totalIncome, totalExpense]);

  const handleAdd = () => {
    const amt = parseFloat(newAmount.replace(/,/g, ''));
    if (!newLabel || !amt || amt <= 0) {
      Alert.alert(language === 'sw' ? 'Tafadhali jaza fomu' : 'Please complete the form');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: Entry = {
      id: Date.now().toString(),
      type: newType,
      category: newCat,
      label: newLabel,
      amount: amt,
      ts: Date.now(),
    };
    setEntries((prev) => [entry, ...prev]);
    setShowAdd(false);
    setNewLabel('');
    setNewAmount('');
  };

  const handleGenerateInvoice = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const contract = CONTRACTS.find((c) => c.id === selectedContractId)!;

    // Simulate generating invoice
    setShowInvoiceModal(false);
    Alert.alert(
      language === 'sw' ? 'Ankara Imetengenezwa!' : 'Invoice Generated!',
      language === 'sw'
        ? `Ankara ya TSh ${fmt(contract.value / 3)} kwa ajili ya "${contract.milestone}" imehifadhiwa. Unaweza kuituma sasa.`
        : `Invoice for TSh ${fmt(contract.value / 3)} for milestone "${contract.milestone}" is generated and ready to share.`
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#050e06', '#070f08', colors.background]
            : ['#f0fdf4', '#f8fafc', colors.background]
        }
        style={StyleSheet.absoluteFill}
        locations={[0, 0.3, 1]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.text }]}>
              {language === 'sw' ? 'Daftari la Fedha' : 'Finance Tracker'}
            </Text>
            <Text style={[s.sub, { color: colors.textMute }]}>
              {entries.length} {language === 'sw' ? 'rekodi' : 'records'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/agro-id' as any)}
            style={[
              s.exportBtn,
              { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Pakua ripoti ya PDF' : 'Download PDF report'}
          >
            <FileText size={14} color={colors.primary} />
            <Text style={[s.exportTxt, { color: colors.primary }]}>PDF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Predictive Cash Flow Warning Banner */}
          {profit < 50000 && (
            <Animated.View entering={FadeInUp} style={s.cashFlowWarning}>
              <ShieldAlert size={18} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={s.warningTitle}>
                  {language === 'sw' ? 'TAHADHARI YA CASH FLOW' : 'CASH FLOW ALERT'}
                </Text>
                <Text style={s.warningDesc}>
                  {language === 'sw'
                    ? 'Matumizi yaliyokadiriwa ya mwezi ujao yanaweza kuzidi mapato ya kawaida ya mazao. Punguza gharama za pembejeo.'
                    : 'Projected expenses next month exceed historical average sales. We recommend deferring heavy equipment expenses.'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* P&L Summary */}
          <Animated.View
            entering={FadeInUp.springify()}
            style={{ paddingHorizontal: 16, marginTop: 8 }}
          >
            <LinearGradient
              colors={isDark ? ['#0d1f0e', '#080f09'] : ['#f0fdf4', '#e8f9ed']}
              style={[s.plCard, { borderColor: isDark ? '#2E6F4022' : '#2E6F4033' }]}
            >
              <View style={s.plRow}>
                <View style={s.plItem}>
                  <Text style={[s.plLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'MAPATO' : 'INCOME'}
                  </Text>
                  <Text style={[s.plValue, { color: colors.primary }]}>{fmtTZS(totalIncome)}</Text>
                </View>
                <View style={[s.plDivider, { backgroundColor: colors.border }]} />
                <View style={s.plItem}>
                  <Text style={[s.plLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'MATUMIZI' : 'EXPENSES'}
                  </Text>
                  <Text style={[s.plValue, { color: '#ef4444' }]}>{fmtTZS(totalExpense)}</Text>
                </View>
                <View style={[s.plDivider, { backgroundColor: colors.border }]} />
                <View style={s.plItem}>
                  <Text style={[s.plLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'FAIDA' : 'PROFIT'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {profit >= 0 ? (
                      <TrendingUp size={14} color={colors.primary} />
                    ) : (
                      <TrendingDown size={14} color="#ef4444" />
                    )}
                    <Text style={[s.plValue, { color: profit >= 0 ? colors.primary : '#ef4444' }]}>
                      {fmtTZS(Math.abs(profit))}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Monthly Budgeting Section */}
          <Animated.View entering={FadeInDown} style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <GlassCard style={s.budgetCard}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={[s.chartTitle, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'Kikomo cha Bajeti ya Matumizi'
                    : 'Monthly Operations Budget'}
                </Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary }}>
                  {fmtTZS(currentMonthExpense)} / {fmtTZS(budgetLimit)}
                </Text>
              </View>
              <View style={[s.budgetBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.budgetBarFill,
                    {
                      width: `${budgetProgressPct * 100}%`,
                      backgroundColor: budgetProgressPct > 0.85 ? '#ef4444' : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMute }}>
                {language === 'sw'
                  ? `Umetumia ${Math.round(budgetProgressPct * 100)}% ya bajeti ya matumizi ya mwezi huu.`
                  : `You have consumed ${Math.round(budgetProgressPct * 100)}% of your monthly operational budget.`}
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Monthly chart */}
          <Animated.View
            entering={FadeInDown.delay(80).springify()}
            style={{ paddingHorizontal: 16, marginTop: 12 }}
          >
            <View
              style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={s.chartHeader}>
                <Text style={[s.chartTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Muhtasari wa Miezi 6' : '6-Month Overview'}
                </Text>
                <View style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[s.legendTxt, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Mapato' : 'Income'}
                  </Text>
                  <View style={[s.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[s.legendTxt, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Matumizi' : 'Expenses'}
                  </Text>
                </View>
              </View>
              <MonthlyChart months={months} colors={colors} />
            </View>
          </Animated.View>

          {/* Sync Mobile Money Accounts Hooks */}
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={{ paddingHorizontal: 16, marginTop: 12 }}
          >
            <GlassCard style={{ padding: 16, gap: 10 }}>
              <Text style={[s.chartTitle, { color: colors.text }]}>
                {language === 'sw'
                  ? 'Akaunti za Mobile Money zilizounganishwa'
                  : 'Linked Mobile Money Integrations'}
              </Text>
              <View style={s.syncRow}>
                <Smartphone size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.syncTitle, { color: colors.text }]}>Vodacom M-Pesa</Text>
                  <Text
                    style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMute }}
                  >
                    Last sync: 2 hours ago
                  </Text>
                </View>
                <View style={s.syncStatusBadge}>
                  <Text style={s.syncStatusText}>AUTO-SYNC</Text>
                </View>
              </View>

              <View style={s.syncRow}>
                <Smartphone size={16} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.syncTitle, { color: colors.text }]}>Tigo Pesa</Text>
                  <Text
                    style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMute }}
                  >
                    Last sync: Just now
                  </Text>
                </View>
                <View style={s.syncStatusBadge}>
                  <Text style={s.syncStatusText}>AUTO-SYNC</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Category breakdown */}
          <Animated.View
            entering={FadeInDown.delay(120).springify()}
            style={{ paddingHorizontal: 16, marginTop: 12 }}
          >
            <View style={[s.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.chartTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Mgawanyo wa Gharama' : 'Breakdown by Category'}
              </Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {catTotals.map(([cat, val]) => {
                  const meta = CAT_META[cat];
                  const pct = Math.min(1, Math.abs(val) / Math.max(totalIncome, totalExpense, 1));
                  return (
                    <View key={cat} style={s.catRow}>
                      <View style={[s.catIcon, { backgroundColor: meta.color + '18' }]}>
                        {meta.icon(meta.color)}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[s.catLabel, { color: colors.text }]}>
                            {language === 'sw' ? meta.label : meta.labelEn}
                          </Text>
                          <Text
                            style={[s.catVal, { color: val >= 0 ? colors.primary : '#ef4444' }]}
                          >
                            {val >= 0 ? '+' : ''}
                            {fmtTZS(Math.abs(val))}
                          </Text>
                        </View>
                        <View style={[s.catTrack, { backgroundColor: colors.background }]}>
                          <View
                            style={[
                              s.catFill,
                              {
                                width: `${pct * 100}%`,
                                backgroundColor: val >= 0 ? colors.primary : '#ef4444',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Invoice generation & new entry actions */}
          <View style={s.filterRow}>
            {(['all', 'income', 'expense'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f);
                }}
                style={[
                  s.filterTab,
                  {
                    backgroundColor:
                      filter === f
                        ? f === 'income'
                          ? colors.primary
                          : f === 'expense'
                            ? '#ef4444'
                            : colors.primary
                        : colors.card,
                    borderColor: filter === f ? 'transparent' : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  f === 'all'
                    ? language === 'sw'
                      ? 'Onyesha rekodi zote za fedha'
                      : 'Show all financial records'
                    : f === 'income'
                      ? language === 'sw'
                        ? 'Onyesha mapato pekee'
                        : 'Show income only'
                      : language === 'sw'
                        ? 'Onyesha matumizi pekee'
                        : 'Show expenses only'
                }
                accessibilityState={{ selected: filter === f }}
              >
                <Text style={[s.filterTxt, { color: filter === f ? '#fff' : colors.textMute }]}>
                  {f === 'all'
                    ? language === 'sw'
                      ? 'Zote'
                      : 'All'
                    : f === 'income'
                      ? language === 'sw'
                        ? 'Mapato'
                        : 'Income'
                      : language === 'sw'
                        ? 'Matumizi'
                        : 'Expenses'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowInvoiceModal(true);
              }}
              style={[s.invoiceBtn, { borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'sw' ? 'Tengeneza ankara ya mkataba' : 'Generate contract invoice'
              }
            >
              <FileText size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowAdd((v) => !v);
              }}
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'sw'
                  ? 'Fungua fomu ya kuongeza rekodi mpya'
                  : 'Open form to add a new record'
              }
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Add entry form */}
          {showAdd && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={{ paddingHorizontal: 16, marginBottom: 8 }}
            >
              <View
                style={[s.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[s.formTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Ingiza Rekodi' : 'Add Entry'}
                </Text>
                <View style={s.typeRow}>
                  {(['income', 'expense'] as EntryType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setNewType(t)}
                      style={[
                        s.typeBtn,
                        {
                          backgroundColor:
                            newType === t
                              ? t === 'income'
                                ? colors.primary
                                : '#ef4444'
                              : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        t === 'income'
                          ? language === 'sw'
                            ? 'Chagua kama Mapato'
                            : 'Select as Income'
                          : language === 'sw'
                            ? 'Chagua kama Matumizi'
                            : 'Select as Expense'
                      }
                      accessibilityState={{ selected: newType === t }}
                    >
                      {t === 'income' ? (
                        <ArrowDownLeft size={14} color={newType === t ? '#fff' : colors.textMute} />
                      ) : (
                        <ArrowUpRight size={14} color={newType === t ? '#fff' : colors.textMute} />
                      )}
                      <Text
                        style={[s.typeTxt, { color: newType === t ? '#fff' : colors.textMute }]}
                      >
                        {t === 'income'
                          ? language === 'sw'
                            ? 'Mapato'
                            : 'Income'
                          : language === 'sw'
                            ? 'Matumizi'
                            : 'Expense'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={
                    language === 'sw'
                      ? 'Maelezo (e.g. Uza mahindi)'
                      : 'Description (e.g. Sold maize)'
                  }
                  placeholderTextColor={colors.textMute}
                  value={newLabel}
                  onChangeText={setNewLabel}
                  accessibilityLabel={
                    language === 'sw' ? 'Maelezo ya rekodi' : 'Record description'
                  }
                  accessibilityHint={
                    language === 'sw'
                      ? 'Weka jina au maelezo ya muamala'
                      : 'Enter transaction name or description'
                  }
                />
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={language === 'sw' ? 'Kiasi (TZS)' : 'Amount (TZS)'}
                  placeholderTextColor={colors.textMute}
                  keyboardType="numeric"
                  value={newAmount}
                  onChangeText={setNewAmount}
                  accessibilityLabel={language === 'sw' ? 'Kiasi cha fedha' : 'Transaction amount'}
                  accessibilityHint={
                    language === 'sw'
                      ? 'Weka kiasi cha fedha kwa Shilingi za Kitanzania'
                      : 'Enter amount in Tanzanian shillings'
                  }
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {(Object.keys(CAT_META) as Category[]).map((c) => {
                    const meta = CAT_META[c];
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setNewCat(c)}
                        style={[
                          s.catChip,
                          {
                            backgroundColor: newCat === c ? meta.color : colors.background,
                            borderColor: newCat === c ? meta.color : colors.border,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw'
                            ? `Chagua kikundi cha ${meta.label}`
                            : `Select category ${meta.labelEn}`
                        }
                        accessibilityState={{ selected: newCat === c }}
                      >
                        {meta.icon(newCat === c ? '#fff' : meta.color)}
                        <Text
                          style={[s.catChipTxt, { color: newCat === c ? '#fff' : colors.textMute }]}
                        >
                          {language === 'sw' ? meta.label : meta.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={[s.saveBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'sw' ? 'Hifadhi rekodi hii' : 'Save this record'}
                >
                  <Text style={s.saveTxt}>{language === 'sw' ? 'Hifadhi' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Entries list */}
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {filtered.map((e, i) => {
              const meta = CAT_META[e.category];
              return (
                <Animated.View key={e.id} entering={FadeInDown.delay(i * 40).springify()}>
                  <View
                    style={[
                      s.entryRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={[s.entryIcon, { backgroundColor: meta.color + '18' }]}>
                      {meta.icon(meta.color)}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.entryLabel, { color: colors.text }]} numberOfLines={1}>
                        {e.label}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[s.catBadge, { backgroundColor: meta.color + '18' }]}>
                          <Text style={[s.catBadgeTxt, { color: meta.color }]}>
                            {language === 'sw' ? meta.label : meta.labelEn}
                          </Text>
                        </View>
                        <Text style={[s.entryDate, { color: colors.textMute }]}>
                          {fmtDate(e.ts)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        s.entryAmt,
                        { color: e.type === 'income' ? colors.primary : '#ef4444' },
                      ]}
                    >
                      {e.type === 'income' ? '+' : '-'}
                      {fmtTZS(e.amount)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Agro ID export link */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={{ paddingHorizontal: 16, marginTop: 16 }}
          >
            <TouchableOpacity
              onPress={() => router.push('/agro-id' as any)}
              style={[s.exportLink, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'sw'
                  ? 'Toa Ripoti ya P&L, fungua Agro ID'
                  : 'Export P&L Report, open Agro ID'
              }
            >
              <FileText size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.exportLinkTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Toa Ripoti ya P&L' : 'Export P&L Report'}
                </Text>
                <Text style={[s.exportLinkSub, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'PDF yenye nembo — kupitia Agro ID'
                    : 'Branded PDF via your Agro ID'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMute} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Invoice Generation Modal */}
      <Modal
        visible={showInvoiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <View style={s.modalOverlay}>
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Tengeneza Ankara ya Mkataba' : 'Generate Contract Invoice'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowInvoiceModal(false)}
                style={s.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Funga dirisha hili' : 'Close this modal'}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_800ExtraBold',
                color: colors.textMute,
                letterSpacing: 0.5,
              }}
            >
              CHAGUA MKATABA ULIOKUBALIWA
            </Text>

            <View style={{ gap: 8 }}>
              {CONTRACTS.map((con) => {
                const selected = selectedContractId === con.id;
                return (
                  <TouchableOpacity
                    key={con.id}
                    onPress={() => setSelectedContractId(con.id)}
                    style={[
                      s.contractOption,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + '10' : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'sw'
                        ? `Chagua ${con.title}, mnunuzi ${con.buyer}`
                        : `Select ${con.title}, buyer ${con.buyer}`
                    }
                    accessibilityState={{ selected }}
                  >
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.text }}>
                      {con.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter_500Medium',
                        color: colors.textMute,
                      }}
                    >
                      Buyer: {con.buyer} · Value: {fmtTZS(con.value)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter_700Bold',
                        color: colors.primary,
                        marginTop: 4,
                      }}
                    >
                      Milestone: {con.milestone} (TSh {fmt(con.value / 3)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleGenerateInvoice}
              style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'sw'
                  ? 'Tengeneza ankara ya mkataba na uhifadhi'
                  : 'Generate contract invoice and save'
              }
            >
              <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_700Bold' }}>
                {language === 'sw' ? 'Tengeneza Ankara' : 'Generate & Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, letterSpacing: -0.3 },
  sub: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  exportTxt: { fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
  plCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  plRow: { flexDirection: 'row', alignItems: 'center' },
  plItem: { flex: 1, alignItems: 'center', gap: 4 },
  plLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, letterSpacing: 0.6 },
  plValue: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18 },
  plDivider: { width: 1, height: 40, marginHorizontal: 4 },
  chartCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  catCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  catVal: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  catTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: 5, borderRadius: 3 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  filterTxt: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  formTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeTxt: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  catChipTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  saveBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  entryDate: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  entryAmt: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 16, letterSpacing: -0.2 },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  exportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  exportLinkTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  exportLinkSub: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },

  // Budget module
  budgetCard: { padding: 16, gap: 6 },
  budgetBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 4 },

  // Cash flow alert
  cashFlowWarning: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#ef4444',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  warningDesc: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 16 },

  // Sync rows
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  syncTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  syncStatusBadge: {
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncStatusText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#2E6F40' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractOption: {
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
});
