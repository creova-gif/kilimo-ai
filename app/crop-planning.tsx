/**
 * Crop Planning — AI-assisted seasonal crop calendar
 * Redesigned: visual season cards, profit/yield graphs, timeline, plan workflow
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeOut, FadeInRight } from 'react-native-reanimated';
import {
  ChevronLeft,
  Sparkles,
  Leaf,
  Droplets,
  CheckCircle2,
  Plus,
  TrendingUp,
  Sun,
  Cloud,
  CloudRain,
  Calendar,
  Target,
  ArrowRight,
  Zap,
  BarChart3,
  Clock,
  MapPin,
  Wheat,
  Info,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import { useTasks } from '../hooks/useTasks';
import { useKilimoStore } from '../store/useKilimoStore';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type Season = 'masika' | 'vuli' | 'kiangazi';
type WaterNeed = 'Chini' | 'Wastani' | 'Juu';
type Risk = 'Chini' | 'Wastani' | 'Juu';

interface CropRec {
  id: string;
  name: string;
  nameSw: string;
  emoji: string;
  daysToHarvest: number;
  yieldPerAcre: string;
  yieldNum: number;
  price: string;
  priceNum: number;
  water: WaterNeed;
  risk: Risk;
  color: string;
  plantWeeks: number;
  growWeeks: number;
  harvestWeeks: number;
  tips: string[];
}

const SEASONS = [
  {
    key: 'masika' as Season,
    label: 'Masika',
    sublabel: 'Mvua Ndefu',
    months: 'Mar–Mei',
    icon: <CloudRain size={18} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    key: 'vuli' as Season,
    label: 'Vuli',
    sublabel: 'Mvua Fupi',
    months: 'Okt–Des',
    icon: <Cloud size={18} color="#8b5cf6" />,
    color: '#8b5cf6',
  },
  {
    key: 'kiangazi' as Season,
    label: 'Kiangazi',
    sublabel: 'Kiangazi',
    months: 'Jun–Sep',
    icon: <Sun size={18} color="#f59e0b" />,
    color: '#f59e0b',
  },
];

const CROP_DATA: Record<Season, CropRec[]> = {
  masika: [
    {
      id: 'm1',
      name: 'Maize',
      nameSw: 'Mahindi',
      emoji: '🌽',
      daysToHarvest: 120,
      yieldPerAcre: '2.5 t',
      yieldNum: 2.5,
      price: 'TSh 85,000/mfuko',
      priceNum: 85,
      water: 'Wastani',
      risk: 'Chini',
      color: '#f59e0b',
      plantWeeks: 2,
      growWeeks: 13,
      harvestWeeks: 2,
      tips: [
        'Tumia mbegu DK8031 au H614D',
        'Weka CAN wiki 4 baada ya kupanda',
        'Dhibiti wadudu wa buni mapema',
      ],
    },
    {
      id: 'm2',
      name: 'Beans',
      nameSw: 'Maharage',
      emoji: '🫘',
      daysToHarvest: 80,
      yieldPerAcre: '0.8 t',
      yieldNum: 0.8,
      price: 'TSh 210,000/mfuko',
      priceNum: 210,
      water: 'Wastani',
      risk: 'Chini',
      color: '#2E6F40',
      plantWeeks: 1,
      growWeeks: 9,
      harvestWeeks: 1,
      tips: [
        'Weka Rhizobium kabla ya kupanda',
        'Epuka udongo wenye maji',
        'Vuna mapema kuepuka mvua',
      ],
    },
    {
      id: 'm3',
      name: 'Paddy Rice',
      nameSw: 'Mpunga',
      emoji: '🌾',
      daysToHarvest: 150,
      yieldPerAcre: '3.0 t',
      yieldNum: 3.0,
      price: 'TSh 120,000/mfuko',
      priceNum: 120,
      water: 'Juu',
      risk: 'Wastani',
      color: '#3b82f6',
      plantWeeks: 3,
      growWeeks: 16,
      harvestWeeks: 2,
      tips: [
        'Hitaji mfumo mzuri wa umwagiliaji',
        'Tumia mbegu SARO 5 au TXD 306',
        'Kagua mara kwa mara kwa magonjwa',
      ],
    },
    {
      id: 'm4',
      name: 'Tomatoes',
      nameSw: 'Nyanya',
      emoji: '🍅',
      daysToHarvest: 90,
      yieldPerAcre: '5.0 t',
      yieldNum: 5.0,
      price: 'TSh 38,000/crate',
      priceNum: 38,
      water: 'Wastani',
      risk: 'Juu',
      color: '#ef4444',
      plantWeeks: 2,
      growWeeks: 9,
      harvestWeeks: 2,
      tips: [
        'Panda katika kitalu kwanza wiki 3',
        'Weka steki na uunganishe sawa',
        'Dhibiti Blossom End Rot',
      ],
    },
  ],
  vuli: [
    {
      id: 'v1',
      name: 'Short Maize',
      nameSw: 'Mahindi (Mfupi)',
      emoji: '🌽',
      daysToHarvest: 90,
      yieldPerAcre: '2.0 t',
      yieldNum: 2.0,
      price: 'TSh 85,000/mfuko',
      priceNum: 85,
      water: 'Wastani',
      risk: 'Chini',
      color: '#f59e0b',
      plantWeeks: 2,
      growWeeks: 10,
      harvestWeeks: 1,
      tips: [
        'Chagua SEEDCO SC403 (siku 90)',
        'Panda siku 1-3 za mvua za kwanza',
        'Funika udongo (mulching)',
      ],
    },
    {
      id: 'v2',
      name: 'Onions',
      nameSw: 'Vitunguu',
      emoji: '🧅',
      daysToHarvest: 120,
      yieldPerAcre: '4.0 t',
      yieldNum: 4.0,
      price: 'TSh 45,000/net 20kg',
      priceNum: 45,
      water: 'Wastani',
      risk: 'Wastani',
      color: '#a855f7',
      plantWeeks: 2,
      growWeeks: 13,
      harvestWeeks: 2,
      tips: [
        'Anzisha kitalu wiki 4-6 mapema',
        'Udongo wenye rutuba na mifereji',
        'Kausha vizuri kabla ya kuhifadhi',
      ],
    },
    {
      id: 'v3',
      name: 'Cabbage',
      nameSw: 'Kabichi',
      emoji: '🥬',
      daysToHarvest: 90,
      yieldPerAcre: '6.0 t',
      yieldNum: 6.0,
      price: 'TSh 15,000/kichwa',
      priceNum: 15,
      water: 'Wastani',
      risk: 'Chini',
      color: '#2E6F40',
      plantWeeks: 2,
      growWeeks: 9,
      harvestWeeks: 2,
      tips: [
        'Panda kitalu wiki 3 mapema',
        'Weka mbolea CAN mara kwa mara',
        'Dhibiti viwavi mapema',
      ],
    },
    {
      id: 'v4',
      name: 'Beans',
      nameSw: 'Maharage',
      emoji: '🫘',
      daysToHarvest: 80,
      yieldPerAcre: '0.7 t',
      yieldNum: 0.7,
      price: 'TSh 210,000/mfuko',
      priceNum: 210,
      water: 'Chini',
      risk: 'Chini',
      color: '#2E6F40',
      plantWeeks: 1,
      growWeeks: 9,
      harvestWeeks: 1,
      tips: [
        'Tumia Jesca au Lyamungu 85',
        'Inafaa mvua kidogo',
        'Vuna mapema kuepuka mvua ya mwisho',
      ],
    },
  ],
  kiangazi: [
    {
      id: 'k1',
      name: 'Sunflower',
      nameSw: 'Alizeti',
      emoji: '🌻',
      daysToHarvest: 95,
      yieldPerAcre: '0.5 t',
      yieldNum: 0.5,
      price: 'TSh 95,000/mfuko',
      priceNum: 95,
      water: 'Chini',
      risk: 'Chini',
      color: '#f59e0b',
      plantWeeks: 2,
      growWeeks: 10,
      harvestWeeks: 2,
      tips: ['Umbali 75cm × 30cm', 'Faa maeneo kame', 'Fua mbegu kabla ya kuuza'],
    },
    {
      id: 'k2',
      name: 'Irrig. Tomatoes',
      nameSw: 'Nyanya (Umwagiliaji)',
      emoji: '🍅',
      daysToHarvest: 90,
      yieldPerAcre: '7.0 t',
      yieldNum: 7.0,
      price: 'TSh 38,000/crate',
      priceNum: 38,
      water: 'Juu',
      risk: 'Wastani',
      color: '#ef4444',
      plantWeeks: 2,
      growWeeks: 9,
      harvestWeeks: 2,
      tips: [
        'Hitaji drip au flood irrigation',
        'Bei nzuri wakati wa kiangazi',
        'Dhibiti Late Blight',
      ],
    },
    {
      id: 'k3',
      name: 'Chili Peppers',
      nameSw: 'Pilipili Kali',
      emoji: '🌶️',
      daysToHarvest: 120,
      yieldPerAcre: '1.2 t',
      yieldNum: 1.2,
      price: 'TSh 800/kg fresh',
      priceNum: 80,
      water: 'Wastani',
      risk: 'Chini',
      color: '#f97316',
      plantWeeks: 2,
      growWeeks: 13,
      harvestWeeks: 2,
      tips: [
        'Panda kitalu wiki 4 mapema',
        'Inaweza kukaa miaka 2-3',
        'Soko la export linalipa vizuri',
      ],
    },
    {
      id: 'k4',
      name: 'Sorghum',
      nameSw: 'Mtama',
      emoji: '🌿',
      daysToHarvest: 90,
      yieldPerAcre: '1.5 t',
      yieldNum: 1.5,
      price: 'TSh 55,000/mfuko',
      priceNum: 55,
      water: 'Chini',
      risk: 'Chini',
      color: '#2E6F40',
      plantWeeks: 1,
      growWeeks: 10,
      harvestWeeks: 2,
      tips: [
        'Ustahimili ukame zaidi ya mahindi',
        'Inafaa Dodoma/Singida',
        'Kwa chakula na lishe ya wanyama',
      ],
    },
  ],
};

const WATER_COLOR: Record<WaterNeed, string> = {
  Chini: '#22c55e',
  Wastani: '#f59e0b',
  Juu: '#3b82f6',
};
const RISK_COLOR: Record<Risk, string> = { Chini: '#22c55e', Wastani: '#f59e0b', Juu: '#ef4444' };

// ─── Yield bar chart (sparkbar) ────────────────────────────────────────────────
function YieldChart({ crops }: { crops: CropRec[] }) {
  const { isDark } = useTheme();
  const max = Math.max(...crops.map((c) => c.yieldNum));
  return (
    <View style={yc.wrap}>
      {crops.map((c) => (
        <View key={c.id} style={yc.col}>
          <Text style={yc.val}>{c.yieldNum}t</Text>
          <View style={yc.trackWrap}>
            <View
              style={[
                yc.track,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
              ]}
            >
              <View
                style={[
                  yc.fill,
                  { height: `${(c.yieldNum / max) * 100}%` as any, backgroundColor: c.color },
                ]}
              />
            </View>
          </View>
          <Text style={yc.label} numberOfLines={1}>
            {c.emoji}
          </Text>
        </View>
      ))}
    </View>
  );
}

const yc = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 6,
    height: 80,
    alignItems: 'flex-end',
  },
  col: { flex: 1, alignItems: 'center', gap: 3 },
  val: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#2E6F40' },
  trackWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  track: {
    width: '100%',
    flex: 1,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: { borderRadius: 4, minHeight: 4 },
  label: { fontSize: 14 },
});

// ─── Planting timeline ────────────────────────────────────────────────────────
function PlantingTimeline({ crop }: { crop: CropRec }) {
  const [activePhase, setActivePhase] = useState<'planting' | 'growing' | 'harvesting'>('planting');
  const total = crop.plantWeeks + crop.growWeeks + crop.harvestWeeks;
  const plantPct = (crop.plantWeeks / total) * 100;
  const growPct = (crop.growWeeks / total) * 100;
  const harvestPct = (crop.harvestWeeks / total) * 100;

  const phases = [
    {
      key: 'planting' as const,
      label: 'Upanzi',
      color: '#22c55e',
      pct: plantPct,
      weeks: crop.plantWeeks,
    },
    {
      key: 'growing' as const,
      label: 'Ukuaji',
      color: '#f59e0b',
      pct: growPct,
      weeks: crop.growWeeks,
    },
    {
      key: 'harvesting' as const,
      label: 'Mavuno',
      color: '#f97316',
      pct: harvestPct,
      weeks: crop.harvestWeeks,
    },
  ];

  const PHASE_BODY: Record<typeof activePhase, string> = {
    planting: `Inachukua wiki 1–${crop.plantWeeks}. Chimba mashimo, weka mbolea ya chini (DAP/NPK) na ufunike kwa udongo kidogo, kisha panda mbegu kwenye kina cha sm 2–5.`,
    growing: `Inachukua wiki ${crop.growWeeks}. Palilia shamba ndani ya wiki 2–3. Weka Urea/CAN wakati wa wiki 4–6 baada ya kuota wakati kuna unyevu.`,
    harvesting: `Inachukua wiki ${crop.harvestWeeks}. Mavuno bora siku ${crop.daysToHarvest}. Kausha mazao chini ya 15% unyevu kuzuia aflatoxin.`,
  };

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Text style={pt.label}>KALENDA ({crop.daysToHarvest} siku)</Text>

      {/* Bar */}
      <View
        style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}
      >
        {phases.map((ph) => (
          <TouchableOpacity
            key={ph.key}
            onPress={() => {
              Haptics.selectionAsync();
              setActivePhase(ph.key);
            }}
            style={{ width: `${ph.pct}%` as any, height: '100%' }}
            activeOpacity={0.8}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: ph.color,
                borderRadius: 4,
                opacity: activePhase === ph.key ? 1 : 0.4,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {phases.map((ph) => (
          <TouchableOpacity
            key={ph.key}
            onPress={() => {
              Haptics.selectionAsync();
              setActivePhase(ph.key);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: activePhase === ph.key ? 1 : 0.5,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ph.color }} />
            <Text style={[pt.phaseLbl, activePhase === ph.key && { color: '#2E6F40' }]}>
              {ph.label} ({ph.weeks}w)
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info box */}
      <Animated.View key={activePhase} entering={FadeInDown.springify()}>
        <View style={pt.infoBox}>
          <Text style={[pt.infoTitle, { color: phases.find((p) => p.key === activePhase)!.color }]}>
            {phases.find((p) => p.key === activePhase)!.label.toUpperCase()}
          </Text>
          <Text style={pt.infoBody}>{PHASE_BODY[activePhase]}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const pt = StyleSheet.create({
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#64748b', letterSpacing: 1 },
  phaseLbl: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b' },
  infoBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 111, 64,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.12)',
    gap: 4,
  },
  infoTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.6 },
  infoBody: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18, color: '#94a3b8' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CropPlanningScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { createTask } = useTasks();
  const addNotification = useKilimoStore((s) => s.addNotification);
  const language = useKilimoStore((s) => s.language);

  const [season, setSeason] = useState<Season>('masika');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [planning, setPlanning] = useState<Record<string, boolean>>({});

  const crops = CROP_DATA[season];
  const activeSeason = SEASONS.find((s) => s.key === season)!;

  function planCrop(crop: CropRec) {
    if (planning[crop.id]) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    createTask({
      title: `Panda ${crop.nameSw}`,
      titleSw: `Panda ${crop.nameSw}`,
      category: 'planting',
      priority: 'high',
      status: 'pending',
      xpReward: 25,
      dueDate: new Date(today.getTime() + 86400_000).toISOString(),
    });
    createTask({
      title: `Tunza ${crop.nameSw}`,
      titleSw: `Tunza ${crop.nameSw}`,
      category: 'scouting',
      priority: 'medium',
      status: 'pending',
      xpReward: 15,
      dueDate: new Date(today.getTime() + 14 * 86400_000).toISOString(),
    });
    createTask({
      title: `Vuna ${crop.nameSw}`,
      titleSw: `Vuna ${crop.nameSw}`,
      category: 'harvest',
      priority: 'critical',
      status: 'pending',
      xpReward: 40,
      dueDate: new Date(today.getTime() + crop.daysToHarvest * 86400_000).toISOString(),
    });
    addNotification({
      title: `Mpango wa ${crop.nameSw} Umewekwa`,
      body: `Kazi 3 zimeongezwa kwa ratiba.`,
      type: 'success',
    });
    setPlanning((p) => ({ ...p, [crop.id]: true }));
  }

  const plannedCount = Object.values(planning).filter(Boolean).length;

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Glows */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[st.glowTR, Platform.OS === 'web' && ({ filter: 'blur(90px)' } as any)]} />
        <View style={[st.glowBL, Platform.OS === 'web' && ({ filter: 'blur(70px)' } as any)]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={st.iconBtn}
          >
            <ChevronLeft size={22} color={isDark ? 'rgba(255,255,255,0.8)' : colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <View style={st.aiBadge}>
              <Sparkles size={10} color="#2E6F40" />
              <Text style={st.aiBadgeText}>KIELELEZO</Text>
            </View>
            <Text style={[st.headerTitle, { color: colors.text }]}>Upangaji Mazao</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open tasks"
            onPress={() => router.push('/tasks')}
            style={st.iconBtn}
          >
            <Calendar size={19} color="#2E6F40" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {/* ── Season selector ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {SEASONS.map((s) => {
              const active = season === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => {
                    setSeason(s.key);
                    setExpanded(null);
                    Haptics.selectionAsync();
                  }}
                  style={{ flex: 1 }}
                >
                  <View
                    style={[
                      st.seasonTab,
                      {
                        backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                        borderColor: active
                          ? s.color
                          : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : colors.border,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    {active && (
                      <LinearGradient
                        colors={[`${s.color}22`, 'transparent']}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                    )}
                    {s.icon}
                    <Text
                      style={[
                        st.seasonLabel,
                        {
                          color: active ? s.color : isDark ? 'rgba(255,255,255,0.6)' : colors.text,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text style={[st.seasonMonths, { color: colors.textMute }]}>{s.months}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              st.referenceNotice,
              {
                backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)',
                borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(180,83,9,0.20)',
              },
            ]}
          >
            <Info size={16} color="#d97706" />
            <Text style={[st.referenceNoticeText, { color: colors.textMute }]}>
              Hii ni kielelezo cha msimu. Mavuno, bei na vidokezo si mpango maalum wa shamba
              lako — thibitisha bei na ushauri wa eneo lako kabla ya kupanga kazi.
            </Text>
          </View>

          {/* ── Season banner ── */}
          <Animated.View key={season} entering={FadeInDown}>
            <View
              style={[
                st.banner,
                {
                  backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                  borderColor: `${activeSeason.color}35`,
                },
              ]}
            >
              <LinearGradient
                colors={[`${activeSeason.color}18`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[st.bannerTitle, { color: activeSeason.color }]}>
                  {activeSeason.label} — {activeSeason.sublabel}
                </Text>
                <Text style={[st.bannerSub, { color: colors.textMute }]}>
                  {activeSeason.months} · {crops.length} mazao ya kielelezo
                </Text>
              </View>
              {plannedCount > 0 && (
                <View style={st.plannedBadge}>
                  <Zap size={11} color="#f59e0b" />
                  <Text style={st.plannedBadgeText}>{plannedCount} ZIMEPANGWA</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ── Yield comparison chart ── */}
          <Animated.View entering={FadeInDown.delay(80)} style={{ marginVertical: 16 }}>
            <View
              style={[
                st.chartCard,
                {
                  backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
                },
              ]}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
              >
                <BarChart3 size={16} color="#2E6F40" />
                <Text style={[st.chartTitle, { color: colors.text }]}>Ulinganisho wa Mavuno ya Kielelezo</Text>
                <Text style={[st.chartSub, { color: colors.textMute }]}>tani/eka</Text>
              </View>
              <YieldChart crops={crops} />
            </View>
          </Animated.View>

          {/* ── Crop cards ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Leaf size={17} color="#2E6F40" />
            <Text style={[st.sectionTitle, { color: colors.text }]}>Mazao ya Kielelezo</Text>
          </View>

          <View style={{ gap: 14 }}>
            {crops.map((crop, idx) => {
              const isOpen = expanded === crop.id;
              const isPlanned = !!planning[crop.id];

              return (
                <Animated.View key={crop.id} entering={FadeInDown.delay(idx * 50).springify()}>
                  <TouchableOpacity
                    onPress={() => {
                      setExpanded(isOpen ? null : crop.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[
                        st.cropCard,
                        {
                          backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                          borderColor: isOpen
                            ? `${crop.color}55`
                            : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : colors.border,
                          borderWidth: isOpen ? 2 : 1,
                          borderLeftColor: crop.color,
                        },
                      ]}
                    >
                      {/* Top shimmer */}
                      <LinearGradient
                        colors={[`${crop.color}12`, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />

                      {/* Card head */}
                      <View style={st.cropHead}>
                        <View style={[st.cropEmoji, { backgroundColor: `${crop.color}18` }]}>
                          <Text style={{ fontSize: 22 }}>{crop.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[st.cropName, { color: isDark ? '#fff' : colors.text }]}>
                            {crop.nameSw}
                          </Text>
                          <Text style={[st.cropSub, { color: colors.textMute }]}>
                            {crop.name} · {crop.daysToHarvest} siku
                          </Text>
                        </View>
                        {isPlanned ? (
                          <View style={st.plannedChip}>
                            <CheckCircle2 size={12} color="#22c55e" />
                            <Text style={st.plannedChipText}>IMEPANGWA</Text>
                          </View>
                        ) : (
                          <View style={[st.arrowChip, { backgroundColor: `${crop.color}15` }]}>
                            <ArrowRight
                              size={14}
                              color={crop.color}
                              style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
                            />
                          </View>
                        )}
                      </View>

                      {/* Stats row */}
                      <View style={st.statsRow}>
                        <View style={st.stat}>
                          <Text style={[st.statLbl, { color: colors.textMute }]}>Mavuno/Eka</Text>
                          <Text style={[st.statVal, { color: isDark ? '#fff' : colors.text }]}>
                            {crop.yieldPerAcre}
                          </Text>
                        </View>
                        <View
                          style={[
                            st.statDiv,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                          ]}
                        />
                        <View style={st.stat}>
                          <Text style={[st.statLbl, { color: colors.textMute }]}>Bei ya Mfano</Text>
                          <Text style={[st.statVal, { color: '#2E6F40' }]}>{crop.price}</Text>
                        </View>
                        <View
                          style={[
                            st.statDiv,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                          ]}
                        />
                        <View style={st.stat}>
                          <Text style={[st.statLbl, { color: colors.textMute }]}>Maji</Text>
                          <Text style={[st.statVal, { color: WATER_COLOR[crop.water] }]}>
                            {crop.water}
                          </Text>
                        </View>
                        <View
                          style={[
                            st.statDiv,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                          ]}
                        />
                        <View style={st.stat}>
                          <Text style={[st.statLbl, { color: colors.textMute }]}>Hatari</Text>
                          <Text style={[st.statVal, { color: RISK_COLOR[crop.risk] }]}>
                            {crop.risk}
                          </Text>
                        </View>
                      </View>

                      {/* Expanded detail */}
                      {isOpen && (
                        <Animated.View entering={FadeInDown} exiting={FadeOut} style={{ gap: 14 }}>
                          <View
                            style={[
                              st.divider,
                              {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
                              },
                            ]}
                          />

                          {/* Timeline */}
                          <PlantingTimeline crop={crop} />

                          {/* Tips */}
                          <Text style={[st.tipsTitle, { color: colors.textMute }]}>
                            VIDOKEZO VYA KIELELEZO
                          </Text>
                          <View style={{ gap: 6 }}>
                            {crop.tips.map((tip, ti) => (
                              <View key={ti} style={st.tipRow}>
                                <View style={[st.tipDot, { backgroundColor: crop.color }]} />
                                <Text
                                  style={[
                                    st.tipText,
                                    { color: isDark ? 'rgba(255,255,255,0.75)' : colors.text },
                                  ]}
                                >
                                  {tip}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {/* Plan CTA */}
                          <TouchableOpacity
                            onPress={() => planCrop(crop)}
                            disabled={isPlanned}
                            activeOpacity={0.85}
                            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 4 }}
                          >
                            {isPlanned ? (
                              <View style={[st.planDone]}>
                                <CheckCircle2 size={16} color="#22c55e" />
                                <Text
                                  style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 13,
                                    color: '#22c55e',
                                  }}
                                >
                                  Kazi Zimeongezwa kwenye Ratiba
                                </Text>
                              </View>
                            ) : (
                              <LinearGradient
                                colors={['#2E6F40', '#1C4A29']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={st.planBtn}
                              >
                                <Plus size={16} color="#fff" />
                                <Text style={st.planBtnText}>Panga Kazi za {crop.nameSw}</Text>
                              </LinearGradient>
                            )}
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Bottom season tip ── */}
          <Animated.View entering={FadeInDown.delay(200)} style={{ marginTop: 20 }}>
            <View
              style={[
                st.tipCard,
                {
                  backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                  borderColor: 'rgba(46, 111, 64,0.18)',
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(46, 111, 64,0.1)', 'transparent']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}
              >
                <Target size={17} color="#2E6F40" />
                <Text style={[st.tipCardTitle, { color: colors.text }]}>Dokezo la Kielelezo</Text>
              </View>
              <Text style={[st.tipCardBody, { color: colors.textMute }]}>
                Msimu wa{' '}
                <Text style={{ color: activeSeason.color, fontFamily: 'Inter_700Bold' }}>
                  {activeSeason.label}
                </Text>{' '}
                ni wakati mzuri wa mazao yanayohitaji mvua{' '}
                {activeSeason.key === 'kiangazi'
                  ? 'kidogo au umwagiliaji'
                  : activeSeason.key === 'masika'
                    ? 'nyingi na ya uhakika'
                    : 'wastani'}
                . Tembelea Soko la KILIMO AI kupata bei za sasa hivi.
              </Text>
              <TouchableOpacity onPress={() => router.push('/tasks')} style={st.tipCardBtn}>
                <TrendingUp size={13} color="#2E6F40" />
                <Text style={st.tipCardBtnText}>Enda kwenye Ratiba</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1 },
  glowTR: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 111, 64,0.07)',
  },
  glowBL: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(46, 111, 64,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    marginBottom: 4,
  },
  aiBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#2E6F40', letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.4 },

  seasonTab: {
    borderRadius: 18,
    padding: 13,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  seasonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  seasonMonths: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  referenceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  referenceNoticeText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 18,
  },

  banner: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 0,
    gap: 10,
  },
  bannerTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  plannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
  },
  plannedBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#f59e0b' },

  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  chartTitle: { fontSize: 14, fontFamily: 'InstrumentSerif_400Regular' },
  chartSub: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 },

  sectionTitle: { fontSize: 19, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.3 },

  cropCard: {
    borderRadius: 20,
    borderLeftWidth: 3,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  cropHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropName: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  cropSub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  plannedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 10,
  },
  plannedChipText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#22c55e' },
  arrowChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLbl: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4 },
  statVal: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  statDiv: { width: 1, height: 28 },

  divider: { height: 1 },
  tipsTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  tipText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 19 },

  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  planBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  planDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 14,
  },

  tipCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    gap: 0,
  },
  tipCardTitle: { fontSize: 15, fontFamily: 'InstrumentSerif_400Regular' },
  tipCardBody: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20, marginBottom: 14 },
  tipCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.3)',
    backgroundColor: 'rgba(46, 111, 64,0.08)',
  },
  tipCardBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#2E6F40' },
});
