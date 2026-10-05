/**
 * Features Hub — redesigned: Dribbble-inspired stats + filter tabs + IoT preview
 */
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Leaf,
  TrendingUp,
  ShieldCheck,
  MapPin,
  ClipboardList,
  Beef,
  Package,
  ShoppingBag,
  FileText,
  Truck,
  Users,
  GraduationCap,
  Wallet,
  BarChart3,
  Cpu,
  Sprout,
  Bell,
  User,
  ChevronRight,
  Lock,
  Camera,
  Zap,
  LayoutGrid,
  Activity,
  Wifi,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useAccess, useCan, Feature, roleLabel } from '../../lib/access';

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration — an unguarded 0 here flowed into a negative <Svg> chart
// width downstream (real console error + broken chart flash).
const SW = Dimensions.get('window').width || 360;
const CARD_PAD = 20;
const CHART_W = SW - CARD_PAD * 2 - 8;
const CHART_H = 54;

// ── Mini sparkline activity chart ─────────────────────────────────────────────
const ACTIVITY_VALS = [42, 61, 55, 78, 65, 85, 74];

function ActivitySparkline({ isDark }: { isDark: boolean }) {
  const max = Math.max(...ACTIVITY_VALS);
  const min = Math.min(...ACTIVITY_VALS);
  const range = max - min || 1;
  const xStep = CHART_W / (ACTIVITY_VALS.length - 1);
  const pts = ACTIVITY_VALS.map((v, i) => ({
    x: +(i * xStep).toFixed(1),
    y: +(CHART_H - ((v - min) / range) * (CHART_H * 0.78) - CHART_H * 0.12).toFixed(1),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x} ${CHART_H} L 0 ${CHART_H} Z`;
  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgGrad id="spkGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2E6F40" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#2E6F40" stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={area} fill="url(#spkGrad)" />
      <Path
        d={line}
        fill="none"
        stroke="#2E6F40"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Stat chips (Dribbble "Overview Statistics" pattern) ───────────────────────
const STAT_CHIPS = [
  {
    key: 'pest',
    labelSw: 'WADUDU',
    labelEn: 'PEST',
    value: '18%',
    subSw: 'Kiwango cha Kawaida',
    subEn: 'Normal Level',
    bg: '#2E6F40',
    text: '#fff',
  },
  {
    key: 'water',
    labelSw: 'MAJI',
    labelEn: 'WATER',
    value: '74%',
    subSw: 'Unyevu wa Udongo',
    subEn: 'Soil Moisture',
    bg: '#0a1d08',
    text: '#fff',
  },
  {
    key: 'soil',
    labelSw: 'UDONGO',
    labelEn: 'SOIL',
    value: '8.3',
    subSw: 'pH Bora',
    subEn: 'Optimal pH',
    bg: '#a3e635',
    text: '#000',
  },
];

// IoT device preview (top-3 drones)
const IOT_PREVIEW = [
  { name: 'RIFT AD-40', bat: 84 },
  { name: 'RIFT SA6', bat: 92 },
  { name: 'VaultSense', bat: 68 },
];

// ── Feature data ──────────────────────────────────────────────────────────────

type FeatureEntry = {
  feature: Feature;
  label: string;
  sub: string;
  route: string;
  icon: React.ReactNode;
  color: string;
  pinned?: boolean;
};

const ALL_FEATURES: FeatureEntry[] = [
  {
    feature: 'ai_chat',
    label: 'Sankofa AI',
    sub: 'Mshauri wako wa AI',
    route: '/(tabs)/ai',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'voice_assistant',
    label: 'Sauti AI',
    sub: 'Ongea na AI kwa sauti',
    route: '/ai-voice',
    icon: null,
    color: '#F59E0B',
  },
  {
    feature: 'photo_diagnosis',
    label: 'Skani ya Mazao',
    sub: 'Tambua magonjwa ya mazao',
    route: '/scan',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'analytics_predictive',
    label: 'Uchanganuzi wa AI',
    sub: 'Utabiri na takwimu',
    route: '/analytics',
    icon: null,
    color: '#F59E0B',
  },
  {
    feature: 'digital_farm_twin',
    label: 'Shamba Dijiti',
    sub: 'Mfano wa kidijiti',
    route: '/farm-twin',
    icon: null,
    color: '#8b5cf6',
  },
  {
    feature: 'crop_planning',
    label: 'Upangaji Mazao',
    sub: 'Panga mzunguko wa mazao',
    route: '/crop-planning',
    icon: null,
    color: '#2E6F40',
  },
  {
    feature: 'crop_library',
    label: 'Maktaba ya Mazao',
    sub: 'Miongozo ya kilimo & magonjwa',
    route: '/crop-library',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'market_prices',
    label: 'Bei za Soko',
    sub: 'Bei za mazao ya sasa hivi',
    route: '/market',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'contract_farming',
    label: 'Mikataba',
    sub: 'Mkataba wa ukulima',
    route: '/contracts',
    icon: null,
    color: '#8b5cf6',
  },
  {
    feature: 'input_supply',
    label: 'Wauzaji',
    sub: 'Vifaa vya kilimo',
    route: '/input-supply',
    icon: null,
    color: '#3b82f6',
  },
  {
    feature: 'marketplace',
    label: 'Soko la Bidhaa',
    sub: 'Nunua na uza mazao',
    route: '/market',
    icon: null,
    color: '#2E6F40',
  },
  {
    feature: 'farm_mapping',
    label: 'Ramani ya Shamba',
    sub: 'GPS na safu za NDVI',
    route: '/map',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'livestock',
    label: 'Mifugo',
    sub: 'Simamia mifugo yako',
    route: '/livestock',
    icon: null,
    color: '#F59E0B',
  },
  {
    feature: 'inventory',
    label: 'Pembejeo',
    sub: 'Ghala na vifaa',
    route: '/inventory',
    icon: null,
    color: '#8b5cf6',
  },
  {
    feature: 'task_management',
    label: 'Kazi',
    sub: 'Orodha ya kazi za shamba',
    route: '/tasks',
    icon: null,
    color: '#64748b',
  },
  {
    feature: 'offline_mode',
    label: 'Nje ya Mtandao',
    sub: 'Skani bila mtandao',
    route: '/offline-queue',
    icon: null,
    color: '#64748b',
  },
  {
    feature: 'iot_systems',
    label: 'IoT & Drones',
    sub: 'Mifumo ya kisasa ya shamba',
    route: '/iot-systems',
    icon: null,
    color: '#0ea5e9',
  },
  {
    feature: 'soil_analysis',
    label: 'Udongo & pH',
    sub: 'Uchambuzi wa afya ya udongo',
    route: '/soil-analysis',
    icon: null,
    color: '#a3e635',
  },
  {
    feature: 'finance_tracker',
    label: 'Daftari la Fedha',
    sub: 'Matumizi na mapato',
    route: '/finance',
    icon: null,
    color: '#2E6F40',
    pinned: true,
  },
  {
    feature: 'mobile_money',
    label: 'M-Pesa / Airtel',
    sub: 'Tuma na pokea pesa',
    route: '/mobile-money',
    icon: null,
    color: '#2E6F40',
  },
  {
    feature: 'wallet_admin',
    label: 'Pochi Msimamizi',
    sub: 'Malipo na akaunti',
    route: '/wallet-admin',
    icon: null,
    color: '#2E6F40',
  },
  {
    feature: 'insurance',
    label: 'Bima',
    sub: 'Ulinzi wa mazao yako',
    route: '/insurance',
    icon: null,
    color: '#8b5cf6',
  },
  {
    feature: 'agro_id',
    label: 'Agro ID',
    sub: 'Kitambulisho · PDF ya P&L',
    route: '/agro-id',
    icon: null,
    color: '#3b82f6',
  },
  {
    feature: 'peer_groups',
    label: 'Vikundi',
    sub: 'Vikundi vya wakulima',
    route: '/peer-groups',
    icon: null,
    color: '#8b5cf6',
  },
  {
    feature: 'expert_consultations',
    label: 'Wataalamu',
    sub: 'Ushauri wa wataalamu',
    route: '/consultations',
    icon: null,
    color: '#2E6F40',
  },
  {
    feature: 'weather_alerts',
    label: 'Hali ya Hewa',
    sub: 'Utabiri wa hali ya hewa',
    route: '/forecast',
    icon: null,
    color: '#F59E0B',
  },
];

const ICONS: Record<Feature, React.ReactNode> = {
  ai_chat: <Sparkles size={20} color="#2E6F40" />,
  photo_diagnosis: <Camera size={20} color="#2E6F40" />,
  analytics_predictive: <BarChart3 size={20} color="#F59E0B" />,
  digital_farm_twin: <Cpu size={20} color="#8b5cf6" />,
  crop_planning: <Sprout size={20} color="#2E6F40" />,
  crop_library: <Leaf size={20} color="#2E6F40" />,
  market_prices: <TrendingUp size={20} color="#2E6F40" />,
  contract_farming: <FileText size={20} color="#8b5cf6" />,
  input_supply: <Truck size={20} color="#3b82f6" />,
  marketplace: <ShoppingBag size={20} color="#2E6F40" />,
  farm_mapping: <MapPin size={20} color="#2E6F40" />,
  livestock: <Beef size={20} color="#F59E0B" />,
  inventory: <Package size={20} color="#8b5cf6" />,
  task_management: <ClipboardList size={20} color="#64748b" />,
  wallet_admin: <Wallet size={20} color="#2E6F40" />,
  insurance: <ShieldCheck size={20} color="#8b5cf6" />,
  agro_id: <User size={20} color="#3b82f6" />,
  peer_groups: <Users size={20} color="#8b5cf6" />,
  expert_consultations: <GraduationCap size={20} color="#2E6F40" />,
  weather_alerts: <Bell size={20} color="#F59E0B" />,
  voice_assistant: <Zap size={20} color="#F59E0B" />,
  finance_tracker: <BarChart3 size={20} color="#2E6F40" />,
  mobile_money: <Wallet size={20} color="#2E6F40" />,
  offline_mode: <Zap size={20} color="#64748b" />,
  iot_systems: <Cpu size={20} color="#0ea5e9" />,
  soil_analysis: <Leaf size={20} color="#a3e635" />,
};

const CATEGORIES = [
  {
    key: 'ai',
    title: 'Akili Bandia',
    titleEn: 'AI',
    color: '#2E6F40',
    features: [
      'ai_chat',
      'voice_assistant',
      'photo_diagnosis',
      'analytics_predictive',
      'digital_farm_twin',
      'crop_planning',
      'crop_library',
    ] as Feature[],
  },
  {
    key: 'market',
    title: 'Soko',
    titleEn: 'Market',
    color: '#2E6F40',
    features: ['market_prices', 'contract_farming', 'input_supply', 'marketplace'] as Feature[],
  },
  {
    key: 'farm',
    title: 'Shamba',
    titleEn: 'Farm',
    color: '#F59E0B',
    features: [
      'farm_mapping',
      'livestock',
      'inventory',
      'task_management',
      'offline_mode',
      'iot_systems',
      'soil_analysis',
    ] as Feature[],
  },
  {
    key: 'finance',
    title: 'Fedha',
    titleEn: 'Finance',
    color: '#2E6F40',
    features: [
      'finance_tracker',
      'mobile_money',
      'wallet_admin',
      'insurance',
      'agro_id',
    ] as Feature[],
  },
  {
    key: 'community',
    title: 'Jamii',
    titleEn: 'Community',
    color: '#8b5cf6',
    features: ['peer_groups', 'expert_consultations', 'weather_alerts'] as Feature[],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function PinnedCard({ item }: { item: FeatureEntry }) {
  const router = useRouter();
  const { colors } = useTheme();
  const can = useCan(item.feature);
  return (
    <TouchableOpacity
      onPress={() => {
        if (!can) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(item.route as any);
      }}
      activeOpacity={0.8}
      style={{ width: (SW - 56) / 2, opacity: can ? 1 : 0.4 }}
    >
      <LinearGradient
        colors={[item.color + '22', item.color + '08']}
        style={[pc.card, { borderColor: item.color + '30' }]}
      >
        <View
          style={[
            pc.iconRing,
            { backgroundColor: item.color + '18', borderColor: item.color + '30' },
          ]}
        >
          {React.cloneElement(ICONS[item.feature] as React.ReactElement<any>, {
            color: item.color,
          })}
        </View>
        <Text style={[pc.label, { color: colors.text }]} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={[pc.sub, { color: colors.textMute }]} numberOfLines={1}>
          {item.sub}
        </Text>
        {!can && <Lock size={12} color={colors.textMute} style={{ marginTop: 4 }} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function FeatureRow({ item }: { item: FeatureEntry }) {
  const router = useRouter();
  const { colors } = useTheme();
  const access = useAccess(item.feature);
  const locked = access === 'none';
  return (
    <TouchableOpacity
      onPress={() => {
        if (locked) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(item.route as any);
      }}
      activeOpacity={locked ? 1 : 0.75}
      style={[fr.row, { opacity: locked ? 0.38 : 1 }]}
    >
      <View style={[fr.iconWrap, { backgroundColor: item.color + '15' }]}>
        {React.cloneElement(ICONS[item.feature] as React.ReactElement<any>, { color: item.color })}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[fr.label, { color: colors.text }]}>{item.label}</Text>
          {access === 'basic' && !locked && (
            <View style={fr.basicBadge}>
              <Text style={fr.basicText}>BASIC</Text>
            </View>
          )}
        </View>
        <Text style={[fr.sub, { color: colors.textMute }]}>{item.sub}</Text>
      </View>
      {locked ? (
        <Lock size={14} color={colors.textMute} />
      ) : (
        <ChevronRight size={16} color={colors.textMute} />
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FeaturesScreen() {
  const { colors, isDark } = useTheme();
  const lang = useKilimoStore((s) => s.language);
  const agroId = useKilimoStore((s) => s.agroId);
  const role = (agroId?.role ?? 'farmer') as any;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ai');

  const featureMap = useMemo(() => {
    const map: Record<string, FeatureEntry> = {};
    ALL_FEATURES.forEach((f) => {
      map[f.feature] = { ...f, icon: ICONS[f.feature] };
    });
    return map;
  }, []);

  const pinnedItems = ALL_FEATURES.filter((f) => f.pinned);
  const activeCategory = CATEGORIES.find((c) => c.key === activeTab)!;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View
        style={[
          s.orb1,
          { backgroundColor: isDark ? 'rgba(46, 111, 64,0.1)' : 'rgba(46, 111, 64,0.05)' },
        ]}
      />
      <View
        style={[
          s.orb2,
          { backgroundColor: isDark ? 'rgba(46,90,39,0.08)' : 'rgba(46,90,39,0.04)' },
        ]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Hero + sparkline ──────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.springify()}>
            <LinearGradient
              colors={isDark ? ['#0c250c', '#080f08'] : ['#f0fdf4', '#f8fafc']}
              style={[
                s.hero,
                { borderColor: isDark ? 'rgba(46, 111, 64,0.22)' : 'rgba(46, 111, 64,0.15)' },
              ]}
            >
              {/* Top row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View
                    style={[
                      s.heroBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(46, 111, 64,0.25)'
                          : 'rgba(46, 111, 64,0.1)',
                      },
                    ]}
                  >
                    <Sparkles size={11} color={isDark ? '#6B9E5F' : colors.primary} />
                    <Text style={[s.heroBadgeText, { color: isDark ? '#6B9E5F' : colors.primary }]}>
                      FEATURES HUB
                    </Text>
                  </View>
                  <Text style={[s.heroTitle, { color: isDark ? '#fff' : colors.text }]}>
                    {lang === 'sw' ? 'Vipengele Vyako' : 'Your Features'}
                  </Text>
                  <Text style={[s.heroRole, { color: colors.textMute }]}>{roleLabel(role)}</Text>
                </View>
                <LinearGradient colors={['#2E6F40', '#0a3d18']} style={s.heroCircle}>
                  <LayoutGrid size={22} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </View>

              {/* Sparkline label */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 18,
                  marginBottom: 10,
                }}
              >
                <Activity size={11} color="#2E6F40" />
                <Text
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 9,
                    color: '#2E6F40',
                    letterSpacing: 1,
                  }}
                >
                  {lang === 'sw' ? 'SHUGHULI ZA WIKI HILI' : 'WEEKLY FARM ACTIVITY'}
                </Text>
              </View>

              {/* Chart */}
              <ActivitySparkline isDark={isDark} />
            </LinearGradient>
          </Animated.View>

          {/* ── Overview Statistics (Dribbble-inspired chips) ─────────── */}
          <Animated.View entering={FadeInDown.delay(60).springify()} style={{ marginTop: 24 }}>
            <Text style={[s.secLabel, { color: colors.textMute }]}>
              {lang === 'sw' ? 'TAKWIMU ZA JUMLA' : 'OVERVIEW STATISTICS'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {STAT_CHIPS.map((chip) => (
                <View key={chip.key} style={[s.statChip, { backgroundColor: chip.bg }]}>
                  <Text style={[s.statChipLabel, { color: chip.text, opacity: 0.72 }]}>
                    {lang === 'sw' ? chip.labelSw : chip.labelEn}
                  </Text>
                  <Text style={[s.statChipVal, { color: chip.text }]}>{chip.value}</Text>
                  <Text
                    style={[s.statChipSub, { color: chip.text, opacity: 0.65 }]}
                    numberOfLines={2}
                  >
                    {lang === 'sw' ? chip.subSw : chip.subEn}
                  </Text>
                </View>
              ))}
              {/* IoT devices chip */}
              <View
                style={[
                  s.statChip,
                  {
                    backgroundColor: isDark ? '#091a09' : '#e8f5e9',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(46, 111, 64,0.22)' : 'rgba(46, 111, 64,0.3)',
                  },
                ]}
              >
                <Text style={[s.statChipLabel, { color: '#2E6F40', opacity: 0.85 }]}>
                  {lang === 'sw' ? 'VIFAA' : 'DEVICES'}
                </Text>
                <Text style={[s.statChipVal, { color: isDark ? '#fff' : colors.text }]}>6</Text>
                <Text style={[s.statChipSub, { color: '#2E6F40', opacity: 0.8 }]}>
                  {lang === 'sw' ? 'Mtandaoni' : 'Online'}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>

          {/* ── IoT Equipment Preview card ────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginTop: 20 }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/iot-systems' as any);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(14,165,233,0.14)', 'rgba(14,165,233,0.04)']
                    : ['rgba(14,165,233,0.07)', 'rgba(14,165,233,0.02)']
                }
                style={[
                  s.iotCard,
                  { borderColor: isDark ? 'rgba(14,165,233,0.28)' : 'rgba(14,165,233,0.2)' },
                ]}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={s.iotIconRing}>
                      <Cpu size={15} color="#0ea5e9" />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontFamily: 'Inter_800ExtraBold',
                          fontSize: 13,
                          color: isDark ? '#fff' : colors.text,
                        }}
                      >
                        {lang === 'sw' ? 'KITUO CHA VIFAA' : 'EQUIPMENT HUB'}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 11,
                          color: colors.textMute,
                        }}
                      >
                        IoT · Drones · Sensors
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={s.livePulse} />
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#2E6F40' }}>
                      LIVE
                    </Text>
                    <ChevronRight size={14} color={colors.textMute} />
                  </View>
                </View>

                {/* Device list preview */}
                {IOT_PREVIEW.map((dev, idx) => (
                  <View key={dev.name}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Wifi size={12} color="#0ea5e9" />
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 12,
                          color: isDark ? '#e0f2e9' : colors.text,
                          flex: 1,
                        }}
                      >
                        {dev.name}
                      </Text>
                      <View style={s.batTrack}>
                        <View
                          style={[
                            s.batFill,
                            {
                              width: `${dev.bat}%` as any,
                              backgroundColor:
                                dev.bat > 60 ? '#2E6F40' : dev.bat > 30 ? '#f59e0b' : '#ef4444',
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={{
                          fontFamily: 'Inter_700Bold',
                          fontSize: 10,
                          width: 32,
                          textAlign: 'right',
                          color: dev.bat > 60 ? '#2E6F40' : '#f59e0b',
                        }}
                      >
                        {dev.bat}%
                      </Text>
                    </View>
                    {idx < IOT_PREVIEW.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          marginVertical: 9,
                        }}
                      />
                    )}
                  </View>
                ))}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Quick launch grid ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={{ marginTop: 28 }}>
            <Text style={[s.secLabel, { color: colors.textMute }]}>
              {lang === 'sw' ? 'VIPENGELE VYA HARAKA' : 'QUICK LAUNCH'}
            </Text>
            <View style={s.pinnedGrid}>
              {pinnedItems.map((item, i) => (
                <Animated.View
                  key={item.feature}
                  entering={FadeInDown.delay(160 + i * 45).springify()}
                >
                  <PinnedCard item={item} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* ── Category filter tabs ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginTop: 28 }}>
            <Text style={[s.secLabel, { color: colors.textMute }]}>
              {lang === 'sw' ? 'VIPENGELE VYOTE' : 'ALL FEATURES'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = cat.key === activeTab;
                const activeBg = cat.color;
                const activeText = '#000';
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveTab(cat.key);
                    }}
                    activeOpacity={0.75}
                    style={[
                      s.filterTab,
                      isActive
                        ? { backgroundColor: activeBg, borderColor: 'transparent' }
                        : {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[s.filterTabText, { color: isActive ? activeText : colors.textMute }]}
                    >
                      {lang === 'sw' ? cat.title : cat.titleEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* ── Features for active tab ───────────────────────────────── */}
          <Animated.View key={activeTab} entering={FadeIn.duration(220)} style={{ marginTop: 12 }}>
            <BlurView
              intensity={isDark ? 18 : 55}
              tint={isDark ? 'dark' : 'light'}
              style={[s.card, { borderColor: colors.border }]}
            >
              <View style={[s.catAccent, { backgroundColor: activeCategory.color }]} />
              {activeCategory.features.map((feat, idx) => {
                const item = featureMap[feat];
                if (!item) return null;
                return (
                  <View key={feat}>
                    <FeatureRow item={item} />
                    {idx < activeCategory.features.length - 1 && (
                      <View
                        style={[s.divider, { backgroundColor: colors.border, marginLeft: 72 }]}
                      />
                    )}
                  </View>
                );
              })}
            </BlurView>
          </Animated.View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  orb1: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -80, right: -80 },
  orb2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: 100,
    left: -60,
  },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 40 },

  // Hero
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.2 },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  heroRole: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  heroCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stat chips
  statChip: { width: 112, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 20, gap: 6 },
  statChipLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, letterSpacing: 1 },
  statChipVal: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 36,
  },
  statChipSub: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14 },

  // IoT preview
  iotCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  iotIconRing: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(14,165,233,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E6F40' },
  batTrack: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  batFill: { height: '100%', borderRadius: 2 },

  // Sections
  secLabel: {
    fontSize: 11,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 2,
  },
  pinnedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Filter tabs
  filterTab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  filterTabText: { fontFamily: 'Inter_700Bold', fontSize: 12 },

  // Feature list card
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  catAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  divider: { height: StyleSheet.hairlineWidth },
});

const pc = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
  sub: { fontSize: 10, fontFamily: 'Inter_500Medium', lineHeight: 14 },
});

const fr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', marginBottom: 1 },
  sub: { fontSize: 11, fontFamily: 'Inter_500Medium', lineHeight: 15 },
  basicBadge: {
    backgroundColor: 'rgba(245,158,11,0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  basicText: {
    color: '#f59e0b',
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.8,
  },
});
