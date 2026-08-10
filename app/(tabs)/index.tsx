import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  SlideInRight,
  SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import {
  BrainCircuit,
  Camera,
  TrendingUp,
  Bell,
  LayoutGrid,
  Sparkles,
  Leaf,
  Droplets,
  Sun,
  Microscope,
  BarChart3,
  Waves,
  Fingerprint,
  ArrowUpRight,
  ArrowDownLeft,
  WifiOff,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  MapPin,
  ChevronDown,
  MoreHorizontal,
  Search,
  X,
  Globe,
  ShieldAlert,
  Check,
  Target,
  Cloud,
  CloudRain,
  ChevronRight,
  Thermometer,
  Wind,
  ChevronLeft,
  Calendar,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Text as SvgText,
  Circle,
} from 'react-native-svg';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { mintAgroId } from '../../lib/agro/mintId';
import { useTasks } from '../../hooks/useTasks';
import { generateRecommendations, severityColor } from '../../lib/recommendations';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { useWeather } from '../../hooks/useWeather';
import { chat, aiConfigured } from '../../lib/ai';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TRACK_RECORDS_DATA = {
  sw: [
    { date: 'Feb 10', title: 'Mbolea Vuli', subtitle: 'Samadi', completed: true },
    { date: 'Feb 17', title: 'Kupanda Mbegu', subtitle: 'Mbegu Bora', completed: true },
    { date: 'Feb 24', title: 'Mbolea ya KCl', subtitle: 'Kukua', completed: false },
    { date: 'Mar 03', title: 'Dawa SP-36', subtitle: 'Kuzuia wadudu', completed: false },
  ],
  en: [
    { date: 'Feb 10', title: 'Compost', subtitle: 'Fertilizer', completed: true },
    { date: 'Feb 17', title: 'Superior', subtitle: 'Seeds', completed: true },
    { date: 'Feb 24', title: 'KCl Fertilizer', subtitle: 'Fertilizer', completed: false },
    { date: 'Mar 03', title: 'SP-36', subtitle: 'Fertilizer', completed: false },
  ],
};

const GROWTH_DATA = [
  { label: 'Jul 24', value: 0.4 },
  { label: 'Jul 25', value: 0.55 },
  { label: 'Jul 26', value: 0.65 },
  { label: 'Jul 27', value: 0.45 },
  { label: 'Jul 28', value: 0.75 },
  { label: 'Jul 29', value: 0.9 },
  { label: 'Jul 30', value: 0.82 },
  { label: 'Jul 31', value: 0.7 },
  { label: 'Aug 01', value: 0.88 },
  { label: 'Aug 02', value: 0.95 },
  { label: 'Aug 03', value: 0.6 },
  { label: 'Aug 04', value: 0.85 },
];

// Pulsing indicator for "🔴 Live" crop telemetry
const PulsingDot = () => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 800 }), withTiming(0.8, { duration: 800 })),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[styles.liveOuterDot, animatedStyle]} />
      <View style={styles.liveInnerDot} />
    </View>
  );
};

// Horizontal stepper timeline component — redesigned
const TrackRecords = ({ colors, isDark, language, router: _router }: any) => {
  const records = language === 'sw' ? TRACK_RECORDS_DATA.sw : TRACK_RECORDS_DATA.en;
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const routerInner = useRouter();

  const completedCount = records.filter((r: any) => r.completed).length;
  const progressPct = (completedCount / records.length) * 100;
  const nextIdx = records.findIndex((r: any) => !r.completed);

  return (
    <View
      style={[
        styles.trackCard,
        {
          backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
        },
      ]}
    >
      {/* Shimmer strip */}
      <LinearGradient
        colors={[colors.primary + '14', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.trackHeader}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.trackTitle, { color: isDark ? '#fff' : colors.text }]}>
            {language === 'sw' ? 'Marekodi ya Ufuatiliaji' : 'Track Records'}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMute }}>
            {completedCount}/{records.length} {language === 'sw' ? 'zimekamilika' : 'completed'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            routerInner.push('/scan' as any);
          }}
          activeOpacity={0.8}
          style={styles.qrBadge}
          accessibilityRole="button"
          accessibilityLabel={language === 'sw' ? 'Changanua ufuatiliaji' : 'Scan tracker'}
        >
          <Microscope size={12} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>
            {language === 'sw' ? 'Changanua' : 'QR Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.trackProgressTrack}>
        <View style={[styles.trackProgressFill, { width: `${progressPct}%` as any }]} />
      </View>

      {/* Vertical timeline */}
      <View style={{ marginTop: 18 }}>
        {records.map((item: any, idx: number) => {
          const isCompleted = item.completed;
          const isNext = idx === nextIdx;
          const isActive = activeStep === idx;
          const isLast = idx === records.length - 1;
          const dotBorder = isCompleted
            ? colors.primary
            : isNext
              ? '#f59e0b'
              : isDark
                ? 'rgba(255,255,255,0.22)'
                : colors.border;
          const lineColor = isCompleted
            ? colors.primary + '59'
            : isDark
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(0,0,0,0.08)';

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveStep(isActive ? null : idx);
              }}
              activeOpacity={0.75}
              style={styles.trackRow}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {/* Left column: dot + vertical connector */}
              <View style={styles.trackRowLeft}>
                <View
                  style={[
                    styles.trackRowDot,
                    {
                      backgroundColor: isCompleted
                        ? colors.primary
                        : isNext
                          ? 'rgba(245,158,11,0.12)'
                          : isDark
                            ? 'rgba(255,255,255,0.05)'
                            : colors.background,
                      borderColor: dotBorder,
                      borderWidth: isNext ? 2.5 : 2,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Check size={11} color="#000" strokeWidth={3} />
                  ) : isNext ? (
                    <View
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }}
                    />
                  ) : null}
                </View>
                {!isLast && <View style={[styles.trackRowLine, { backgroundColor: lineColor }]} />}
              </View>

              {/* Right column: content */}
              <View style={[styles.trackRowContent, isLast && { paddingBottom: 4 }]}>
                <View style={styles.trackRowTopRow}>
                  <View
                    style={[
                      styles.trackRowDateChip,
                      {
                        backgroundColor: isCompleted
                          ? colors.primary + '1A'
                          : isNext
                            ? 'rgba(245,158,11,0.1)'
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.05)',
                        borderColor: isCompleted
                          ? colors.primary + '40'
                          : isNext
                            ? 'rgba(245,158,11,0.3)'
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackRowDateText,
                        {
                          color: isCompleted
                            ? colors.primary
                            : isNext
                              ? '#f59e0b'
                              : colors.textMute,
                        },
                      ]}
                    >
                      {item.date}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.trackRowStatusChip,
                      {
                        backgroundColor: isCompleted
                          ? colors.primary + '1A'
                          : isNext
                            ? 'rgba(245,158,11,0.08)'
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackRowStatusText,
                        {
                          color: isCompleted
                            ? colors.primary
                            : isNext
                              ? '#f59e0b'
                              : colors.textMute,
                        },
                      ]}
                    >
                      {isCompleted
                        ? language === 'sw'
                          ? '✓ IMEKAMILIKA'
                          : '✓ DONE'
                        : isNext
                          ? language === 'sw'
                            ? '▶ INAYOFUATA'
                            : '▶ NEXT'
                          : language === 'sw'
                            ? 'INANGOJA'
                            : 'PENDING'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.trackRowTitle, { color: isDark ? '#fff' : colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.trackRowSub, { color: colors.textMute }]}>
                  {item.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expanded step detail */}
      {activeStep !== null && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[
            styles.trackExpanded,
            {
              backgroundColor: isDark ? colors.primary + '0D' : colors.primary + '0A',
              borderColor: colors.primary + '26',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Leaf size={13} color={colors.primary} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary }}>
              {records[activeStep].title}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: colors.textMute,
              marginTop: 4,
              lineHeight: 18,
            }}
          >
            {records[activeStep].subtitle} · {records[activeStep].date}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              routerInner.push('/tasks' as any);
            }}
            style={styles.trackExpandedBtn}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Angalia Ratiba' : 'View Schedule'}
          >
            <Text style={styles.trackExpandedBtnText}>
              {language === 'sw' ? 'Angalia Ratiba →' : 'View Schedule →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

// ─── Market price + yield reference tables (Tanzania averages) ─────────────────
const CROP_PRICE_TZS: Record<string, number> = {
  maize: 850,
  beans: 1400,
  tomato: 1200,
  rice: 2000,
  cassava: 700,
  sunflower: 1500,
  sorghum: 900,
  chili: 3500,
  coffee: 6000,
  banana: 600,
  potato: 900,
  onion: 1100,
  cabbage: 800,
  watermelon: 700,
  groundnut: 2200,
};
const CROP_YIELD_T_HA: Record<string, number> = {
  maize: 2.5,
  beans: 1.0,
  tomato: 18,
  rice: 3.5,
  cassava: 15,
  sunflower: 1.3,
  sorghum: 1.8,
  chili: 6,
  coffee: 0.6,
  banana: 20,
  potato: 14,
  onion: 12,
  cabbage: 20,
  watermelon: 25,
  groundnut: 1.5,
};
const CROP_PLANTS_HA: Record<string, number> = {
  maize: 44000,
  beans: 150000,
  tomato: 15000,
  rice: 400000,
  cassava: 10000,
  sunflower: 40000,
  sorghum: 200000,
  chili: 20000,
  coffee: 1500,
  banana: 2500,
};

// ─── Crop Value Card — inspired by Nogyo "Bell Pepper / Pumpkin Field" cards ──
const CropValueCard = ({ colors, isDark, language }: any) => {
  const routerInner = useRouter();
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const farmVitals = useKilimoStore((s) => s.farmVitals);
  const primaryCrops = farmProfile?.primaryCrops || [];
  const [idx, setIdx] = useState(0);

  const activeCrop = primaryCrops[idx] || '';
  const cropMeta = useMemo(() => getCropMetadata(activeCrop, language), [activeCrop, language]);

  if (!activeCrop) return null;

  const nameLower = activeCrop.toLowerCase();
  const cropKey = Object.keys(CROP_PRICE_TZS).find((k) => nameLower.includes(k)) ?? 'maize';
  const pricePerKg = CROP_PRICE_TZS[cropKey];
  const yieldTHa = CROP_YIELD_T_HA[cropKey] ?? 2.5;
  const plantsHa = CROP_PLANTS_HA[cropKey] ?? 44000;
  const acreageHa = (farmProfile?.farmSizeAcres ?? 2) * 0.405;
  const estYieldKg = Math.round(acreageHa * yieldTHa * 1000);
  const estValueTZS = Math.round(estYieldKg * pricePerKg);
  const daysLeft = cropMeta.harvestDays - cropMeta.currentDay;
  const laborDays = Math.max(2, Math.ceil(estYieldKg / 300));
  const pctDone = Math.round((cropMeta.currentDay / cropMeta.harvestDays) * 100);
  const estPlants = Math.round(acreageHa * plantsHa);

  // Stage-contextual daily tip
  const stageTip = (() => {
    if (pctDone < 30)
      return language === 'sw'
        ? `Weka mbolea ya DAP mapema (kilo 50/hekta) kuimarisha mizizi ya ${cropMeta.displayName}.`
        : `Apply DAP fertilizer early (50 kg/ha) to strengthen ${cropMeta.displayName} root systems.`;
    if (pctDone < 70)
      return language === 'sw'
        ? `Kagua wadudu kila siku 3 kwenye ${cropMeta.displayName} — hatua hii ni muhimu kwa mavuno bora.`
        : `Scout ${cropMeta.displayName} for pests every 3 days — this stage is critical for yield quality.`;
    return language === 'sw'
      ? `Tayarisha ghala na magunia ya safi. Vuna ${cropMeta.displayName} mapema asubuhi kuepuka joto kali.`
      : `Prepare clean storage bags. Harvest ${cropMeta.displayName} early morning to avoid heat stress.`;
  })();

  const healthColor =
    farmVitals.soilPh >= 6 && farmVitals.soilPh <= 7.5 ? colors.primary : '#f59e0b';
  const healthLabel =
    farmVitals.soilPh >= 6 && farmVitals.soilPh <= 7.5
      ? language === 'sw'
        ? 'Nzuri'
        : 'Good'
      : language === 'sw'
        ? 'Wastani'
        : 'Fair';

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <View
        style={[
          styles.cropValueCard,
          {
            backgroundColor: isDark ? 'rgba(4,12,6,0.98)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary + '17', colors.primary + '08', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Header row */}
        <View style={styles.cropValueHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cropValueTitle, { color: isDark ? '#fff' : colors.text }]}>
              {cropMeta.displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <View style={styles.cropValueFieldBadge}>
                <Text style={styles.cropValueFieldText}>
                  {acreageHa.toFixed(1)} Ha · {estPlants.toLocaleString()}{' '}
                  {language === 'sw' ? 'miche' : 'plants'}
                </Text>
              </View>
              {primaryCrops.length > 1 && (
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() =>
                      setIdx((p) => (p - 1 + primaryCrops.length) % primaryCrops.length)
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Mmea uliotangulia' : 'Previous crop'}
                  >
                    <ChevronLeft size={16} color={colors.textMute} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter_600SemiBold',
                      color: colors.textMute,
                    }}
                  >
                    {idx + 1}/{primaryCrops.length}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIdx((p) => (p + 1) % primaryCrops.length)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Mmea unaofuata' : 'Next crop'}
                  >
                    <ChevronRight size={16} color={colors.textMute} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View
            style={[
              styles.cropHealthBadge,
              { backgroundColor: healthColor + '18', borderColor: healthColor + '35' },
            ]}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: healthColor }} />
            <Text style={[styles.cropHealthText, { color: healthColor }]}>
              {language === 'sw' ? 'Afya: ' : 'Health: '}
              {healthLabel}
            </Text>
          </View>
        </View>

        {/* Big stats */}
        <View style={styles.cropValueStats}>
          <View style={styles.cropValueStatCol}>
            <Text style={[styles.cropValueStatLabel, { color: colors.textMute }]}>
              {language === 'sw' ? 'Est. Mavuno' : 'Est. Total'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Text style={[styles.cropValueStatBig, { color: isDark ? '#fff' : colors.text }]}>
                {(estYieldKg / 1000).toFixed(1)}
              </Text>
              <Text style={[styles.cropValueStatUnit, { color: colors.textMute }]}>T</Text>
            </View>
            <Text style={[styles.cropValueStatSub, { color: colors.textMute }]}>
              ~{estYieldKg.toLocaleString()} kg
            </Text>
          </View>

          <View
            style={[
              styles.cropValueDivider,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
            ]}
          />

          <View style={styles.cropValueStatCol}>
            <Text style={[styles.cropValueStatLabel, { color: colors.textMute }]}>
              {language === 'sw' ? 'Est. Thamani' : 'Est. Market Value'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Text style={[styles.cropValueStatBig, { color: colors.primary }]}>
                {(estValueTZS / 1000000).toFixed(2)}M
              </Text>
            </View>
            <Text style={[styles.cropValueStatSub, { color: colors.textMute }]}>
              TZS @{pricePerKg.toLocaleString()}/kg
            </Text>
          </View>
        </View>

        {/* Harvest countdown + labor */}
        <View style={styles.cropValueCountdown}>
          <View style={styles.cropValueCountdownLeft}>
            <Text style={[styles.cropValueCountdownNum, { color: isDark ? '#fff' : colors.text }]}>
              {daysLeft}
            </Text>
            <View>
              <Text style={[styles.cropValueCountdownLabel, { color: colors.textMute }]}>
                {language === 'sw' ? 'siku · kasi ya kawaida' : 'days at regular rate'}
              </Text>
              <Text style={[styles.cropValueCountdownSub, { color: colors.textMute }]}>
                {language === 'sw' ? 'Hadi Mavuno' : 'Est. Harvest due in'}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.cropValueLaborBadge,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <Target size={11} color={colors.textMute} />
            <Text style={[styles.cropValueLaborText, { color: colors.textMute }]}>
              ~{laborDays} {language === 'sw' ? 'siku za kazi' : 'work days'}
            </Text>
          </View>
        </View>

        {/* Daily tip strip */}
        <View
          style={[
            styles.cropValueTipRow,
            {
              backgroundColor: isDark ? colors.primary + '0D' : colors.primary + '0A',
              borderColor: colors.primary + '21',
            },
          ]}
        >
          <Lightbulb size={12} color={colors.primary} />
          <Text style={[styles.cropValueTipText, { color: colors.textMute }]} numberOfLines={2}>
            {stageTip}
          </Text>
        </View>

        {/* CTA row */}
        <View style={styles.cropValueFooter}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              routerInner.push('/crop-planning' as any);
            }}
            style={[
              styles.cropValueCtaBtn,
              {
                backgroundColor: isDark ? colors.primary + '1F' : colors.primaryLight,
                borderColor: colors.primary + '40',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Fungua Mpango wa Mazao' : 'Open Crop Plan'}
          >
            <Leaf size={12} color={colors.primary} />
            <Text style={styles.cropValueCtaText}>
              {language === 'sw' ? 'Mpango wa Mazao' : 'Crop Plan'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              routerInner.push('/market' as any);
            }}
            style={[
              styles.cropValueCtaBtn,
              {
                backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                borderColor: 'rgba(245,158,11,0.25)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Fungua Bei za Masoko' : 'Open Market Prices'}
          >
            <TrendingUp size={12} color="#f59e0b" />
            <Text style={[styles.cropValueCtaText, { color: '#f59e0b' }]}>
              {language === 'sw' ? 'Angalia Soko' : 'Market Prices'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Daily Organizer Strip — inspired by Nogyo "Jeremy Zucker" daily task card ─
const DailyOrganizerStrip = ({ colors, isDark, language }: any) => {
  const routerInner = useRouter();
  const { tasks } = useTasks();

  const upcoming = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 48 * 60 * 60 * 1000;
    return tasks
      .filter((t) => t.status !== 'done' && t.status !== 'cancelled')
      .filter((t) => !t.dueDate || new Date(t.dueDate).getTime() <= cutoff)
      .sort((a, b) => {
        const ap = { critical: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 3;
        const bp = { critical: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 3;
        return ap - bp;
      })
      .slice(0, 3);
  }, [tasks]);

  const pendingTotal = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;

  const catIcon = (cat: string) => {
    switch (cat) {
      case 'irrigation':
        return <Droplets size={13} color="#3b82f6" />;
      case 'planting':
        return <Leaf size={13} color={colors.primary} />;
      case 'harvest':
        return <Sparkles size={13} color="#f59e0b" />;
      case 'scouting':
        return <Microscope size={13} color="#a78bfa" />;
      case 'finance':
        return <BarChart3 size={13} color={colors.primary} />;
      default:
        return <Target size={13} color={colors.textMute} />;
    }
  };
  const priorityColor = (p: string) =>
    ({
      critical: '#ef4444',
      high: '#f59e0b',
      medium: colors.primary,
      low: colors.textMute,
    })[p] ?? colors.textMute;

  const formatDue = (dueDate?: string) => {
    if (!dueDate) return language === 'sw' ? 'Leo' : 'Today';
    const ms = new Date(dueDate).getTime() - Date.now();
    const hrs = Math.round(ms / (60 * 60 * 1000));
    if (hrs <= 0) return language === 'sw' ? 'Sasa hivi' : 'Due now';
    if (hrs < 24) return language === 'sw' ? `Saa ${hrs} zijazo` : `in ${hrs}h`;
    return language === 'sw' ? 'Kesho' : 'Tomorrow';
  };

  return (
    <Animated.View entering={FadeInDown.delay(80).springify()}>
      <View
        style={[
          styles.organizerCard,
          {
            backgroundColor: isDark ? 'rgba(6,14,8,0.98)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary + '0F', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Header */}
        <View style={styles.organizerHeader}>
          <View style={{ gap: 1 }}>
            <Text style={[styles.organizerTitle, { color: isDark ? '#fff' : colors.text }]}>
              {language === 'sw' ? 'Leo Shambani' : "Today's Schedule"}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.textMute }}>
              {new Date().toLocaleDateString(language === 'sw' ? 'sw-TZ' : 'en-TZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
          <View
            style={[
              styles.organizerBadge,
              {
                backgroundColor: pendingTotal > 0 ? 'rgba(239,68,68,0.12)' : colors.primary + '1A',
                borderColor: pendingTotal > 0 ? 'rgba(239,68,68,0.25)' : colors.primary + '33',
              },
            ]}
          >
            <Text
              style={[
                styles.organizerBadgeText,
                { color: pendingTotal > 0 ? '#ef4444' : colors.primary },
              ]}
            >
              {pendingTotal} {language === 'sw' ? 'zingooja' : 'pending'}
            </Text>
          </View>
        </View>

        {/* Task rows */}
        {upcoming.length === 0 ? (
          <View style={styles.organizerEmpty}>
            <Check size={16} color={colors.primary} />
            <Text style={[styles.organizerEmptyText, { color: colors.textMute }]}>
              {language === 'sw' ? 'Hakuna kazi leo — imara sana!' : 'No tasks due — all clear!'}
            </Text>
          </View>
        ) : (
          <View style={styles.organizerList}>
            {upcoming.map((task, i) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  routerInner.push('/tasks' as any);
                }}
                activeOpacity={0.8}
                style={[
                  styles.organizerRow,
                  {
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.organizerIconWrap,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}
                >
                  {catIcon(task.category)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.organizerTaskTitle, { color: isDark ? '#fff' : colors.text }]}
                    numberOfLines={1}
                  >
                    {language === 'sw' && task.titleSw ? task.titleSw : task.title}
                  </Text>
                  {task.farmBlock && (
                    <Text style={[styles.organizerTaskSub, { color: colors.textMute }]}>
                      {task.farmBlock}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <View
                    style={[
                      styles.organizerPriorityDot,
                      { backgroundColor: priorityColor(task.priority) },
                    ]}
                  />
                  <Text style={[styles.organizerDueText, { color: colors.textMute }]}>
                    {formatDue(task.dueDate)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Footer CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            routerInner.push('/tasks' as any);
          }}
          style={[
            styles.organizerFooterBtn,
            { backgroundColor: isDark ? colors.primary + '1A' : colors.primaryLight },
          ]}
        >
          <LayoutGrid size={12} color={colors.primary} />
          <Text style={styles.organizerFooterText}>
            {language === 'sw' ? 'Angalia Ratiba Yote' : 'View Full Schedule'}
          </Text>
          <ArrowRight size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Growth Rates vertical bar chart component
const GrowthChart = ({ colors, isDark, language }: any) => {
  const [selectedRange, setSelectedRange] = useState('M');
  const screenWidth = Dimensions.get('window').width;

  const exportReport = async () => {
    try {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 40px; color: #1a1a1a;">
            <h1 style="color: ${colors.primary};">Kilimo AI - Growth Report</h1>
            <h2>Growth Rate: 0.75 kg/ha</h2>
            <p>Exported on ${new Date().toLocaleDateString()}</p>
            <hr />
            <p>Analytics indicate a steady growth trajectory matching the projected curve. Market conditions and localized weather data align with optimal harvest timing.</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const chartW = screenWidth - 80;
  const chartH = 160;
  const padL = 8;
  const padR = 8;
  const padTop = 20;
  const padBot = 28;
  const barAreaW = chartW - padL - padR;
  const n = GROWTH_DATA.length;
  const barW = Math.floor((barAreaW / n) * 0.55);
  const gap = Math.floor(barAreaW / n);
  const maxVal = Math.max(...GROWTH_DATA.map((d) => d.value));

  return (
    <Card
      variant="solid"
      style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartSub, { color: colors.textMute }]}>
            {language === 'sw' ? 'Kiwango cha ukuaji' : 'Growth rate'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
            <Text style={[styles.chartValue, { color: colors.text }]}>0.75</Text>
            <Text style={[styles.chartUnit, { color: colors.textMute }]}> kg/ha</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={exportReport}
            style={[styles.rangeBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_700Bold' }}>
              Export
            </Text>
          </TouchableOpacity>
          <View style={[styles.rangeSelector, { backgroundColor: isDark ? '#121711' : '#EDF1EC' }]}>
            {['W', 'M', 'Y'].map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setSelectedRange(range)}
                style={[
                  styles.rangeBtn,
                  selectedRange === range && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.rangeText,
                    { color: selectedRange === range ? '#FFFFFF' : colors.textMute },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
              <Stop offset="100%" stopColor="#0a3d18" stopOpacity="0.7" />
            </SvgLinearGradient>
          </Defs>
          {GROWTH_DATA.map((d, i) => {
            const barH = (d.value / maxVal) * (chartH - padTop - padBot);
            const x = padL + i * gap + (gap - barW) / 2;
            const y = chartH - padBot - barH;
            const isHighlighted = d.value === 0.75;
            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={isHighlighted ? colors.primary : 'url(#barGrad)'}
                  opacity={isHighlighted ? 1 : 0.6}
                />
                {isHighlighted && (
                  <SvgText
                    x={x + barW / 2}
                    y={y - 5}
                    fontSize={12}
                    fill={colors.primary}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {Math.round(d.value * 100)}%
                  </SvgText>
                )}
                <SvgText
                  x={x + barW / 2}
                  y={chartH - 6}
                  fontSize={12}
                  fill={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                  textAnchor="middle"
                >
                  {d.label.slice(-2)}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
};

// ─── Inline Sparks / Charts for stats cards ───────────────────────────

const SoilHealthChart = ({ color }: { color: string }) => (
  <View style={styles.miniChartContainer}>
    <Svg height="30" width="130">
      <Defs>
        <SvgLinearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M0 25 C 20 22, 40 12, 60 18 C 80 24, 100 5, 130 8 L 130 30 L 0 30 Z"
        fill="url(#soilGrad)"
      />
      <Path
        d="M0 25 C 20 22, 40 12, 60 18 C 80 24, 100 5, 130 8"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  </View>
);

const MoistureChart = () => (
  <View style={styles.miniChartContainer}>
    <Svg height="30" width="130">
      <Defs>
        <SvgLinearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M0 12 C 25 28, 50 2, 75 22 C 100 32, 115 12, 130 15 L 130 30 L 0 30 Z"
        fill="url(#moistGrad)"
      />
      <Path
        d="M0 12 C 25 28, 50 2, 75 22 C 100 32, 115 12, 130 15"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2"
      />
    </Svg>
  </View>
);

const TemperatureChart = () => {
  const heights = [10, 16, 14, 22, 26, 18, 20];
  return (
    <View style={styles.miniBarContainer}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: h,
            backgroundColor: i === heights.length - 1 ? '#F59E0B' : 'rgba(245, 158, 11, 0.35)',
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
};

const YieldChart = () => (
  <View style={styles.miniChartContainer}>
    <Svg height="30" width="130">
      <Defs>
        <SvgLinearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M0 28 Q 35 24, 65 15 T 130 3 L 130 30 L 0 30 Z" fill="url(#yieldGrad)" />
      <Path d="M0 28 Q 35 24, 65 15 T 130 3" fill="none" stroke="#8b5cf6" strokeWidth="2" />
    </Svg>
  </View>
);
// ─── Step 1 Animation: Soil prep scan ring ───────────────────────────────────
function Step1SoilPrepAnimation() {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1000, easing: Easing.ease }),
        withTiming(1.0, { duration: 1000, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.animationContainer}>
      <Animated.View style={[styles.scanOuterRing, { borderColor: colors.primary }, rotateStyle]} />
      <Animated.View
        style={[
          styles.animatedCompostCircle,
          { backgroundColor: colors.primary + '20', borderColor: colors.primary },
          pulseStyle,
        ]}
      >
        <Leaf size={32} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

// ─── Step 2 Animation: Spacing seed-drop falling animation ───────────────────
function Step2SpacingAnimation() {
  const seedY = useSharedValue(-40);
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    seedY.value = withRepeat(withTiming(35, { duration: 1500, easing: Easing.bounce }), -1, false);
    lineOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 200 }), withTiming(1, { duration: 1300 })),
      -1,
      false
    );
  }, []);

  const seedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: seedY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
  }));

  return (
    <View style={styles.animationContainer}>
      <View style={styles.animatedSoilLayer}>
        {/* Spacing lines */}
        <Animated.View style={[styles.spacingIndicatorLine, lineStyle]} />
        <Animated.Text style={[styles.spacingIndicatorText, lineStyle]}>75cm</Animated.Text>
        {/* Seed dropping */}
        <Animated.View style={[styles.animatedSeed, { backgroundColor: '#F59E0B' }, seedStyle]} />
      </View>
    </View>
  );
}

// ─── Step 3 Animation: Basal fertilizer side-by-side placement ────────────────
function Step3BasalFertilizerAnimation() {
  const { colors } = useTheme();
  const dropY = useSharedValue(-40);
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    dropY.value = withRepeat(
      withTiming(20, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    lineOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 1300 })),
      -1,
      false
    );
  }, []);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
  }));

  return (
    <View style={styles.animationContainer}>
      <View style={styles.fertilizerPlacementDiagram}>
        <Animated.View
          style={[styles.animatedSeedStatic, { backgroundColor: '#F59E0B' }, dropStyle]}
        />
        <Animated.View
          style={[styles.animatedFertilizerStatic, { backgroundColor: colors.primary }, dropStyle]}
        />
        <Animated.View style={[styles.fertilizerOffsetLine, lineStyle]} />
        <Animated.Text style={[styles.fertilizerOffsetText, lineStyle]}>5cm</Animated.Text>
      </View>
    </View>
  );
}

// ─── Step 4 Animation: Weeding & top-dressing growing sprout ─────────────────
function Step4GrowingSproutAnimation() {
  const { colors } = useTheme();
  const growScale = useSharedValue(0.3);
  const growY = useSharedValue(20);

  useEffect(() => {
    growScale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(1.2, { duration: 2000, easing: Easing.out(Easing.quad) }),
        withTiming(1.2, { duration: 1000 })
      ),
      -1,
      false
    );
    growY.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const sproutStyle = useAnimatedStyle(() => ({
    transform: [{ scale: growScale.value }, { translateY: growY.value }] as any,
  }));

  return (
    <View style={styles.animationContainer}>
      <View style={styles.growingMaizeContainer}>
        <Animated.View style={[sproutStyle, { alignItems: 'center', justifyContent: 'center' }]}>
          <Leaf size={48} color={colors.primary} />
        </Animated.View>
      </View>
    </View>
  );
}

// Get crop layout specifications and images based on their names
const getCropMetadata = (cropName: string, language: 'en' | 'sw') => {
  const nameLower = (cropName || '').toLowerCase();
  let image = require('../../assets/images/rice-field-bg.png');
  let displayName = cropName;
  let harvestDays = 74;
  let currentDay = 65;
  let markers = {
    left: {
      title: language === 'sw' ? 'Mbolea' : 'Manure',
      sub: language === 'sw' ? 'Kabla ya Kupanda' : 'Before Planting',
      top: 120,
      left: '8%',
      lineW: '20%',
      lineH: 42,
      dotTop: 174,
    },
    right: {
      title: language === 'sw' ? 'Mbolea ya KCl' : 'KCl Fertilizer',
      sub: language === 'sw' ? 'Wiki 2 - 3' : 'Age 2 - 3 Weeks',
      top: 88,
      right: '6%',
      lineW: '18%',
      lineH: 48,
      dotTop: 148,
    },
  };

  if (nameLower.includes('maize') || nameLower.includes('mahindi')) {
    image = require('../../assets/images/crop_maize.png');
    displayName = language === 'sw' ? 'Mahindi' : 'Maize';
    harvestDays = 120;
    currentDay = 98;
    markers = {
      left: {
        title: language === 'sw' ? 'Nafasi ya Mbegu' : 'Seed Spacing',
        sub: language === 'sw' ? 'Siku ya Kwanza' : 'Day 1 planting',
        top: 110,
        left: '8%',
        lineW: '22%',
        lineH: 38,
        dotTop: 160,
      },
      right: {
        title: language === 'sw' ? 'Mbolea ya Urea' : 'Urea Fertilizer',
        sub: language === 'sw' ? 'Wiki ya 4 - 6' : 'Week 4 - 6 dressing',
        top: 85,
        right: '8%',
        lineW: '20%',
        lineH: 52,
        dotTop: 150,
      },
    };
  } else if (nameLower.includes('beans') || nameLower.includes('maharage')) {
    image = require('../../assets/images/crop_beans.png');
    displayName = language === 'sw' ? 'Maharage' : 'Beans';
    harvestDays = 85;
    currentDay = 60;
    markers = {
      left: {
        title: language === 'sw' ? 'Kuweka Maji' : 'Watering',
        sub: language === 'sw' ? 'Ua la kwanza' : 'First flowering',
        top: 130,
        left: '5%',
        lineW: '24%',
        lineH: 40,
        dotTop: 180,
      },
      right: {
        title: language === 'sw' ? 'Dawa ya Wadudu' : 'Pesticide',
        sub: language === 'sw' ? 'Wiki ya 3' : 'Week 3 spray',
        top: 95,
        right: '5%',
        lineW: '18%',
        lineH: 45,
        dotTop: 152,
      },
    };
  } else if (nameLower.includes('tomato') || nameLower.includes('nyanya')) {
    image = require('../../assets/images/crop_tomato.png');
    displayName = language === 'sw' ? 'Nyanya' : 'Tomato';
    harvestDays = 90;
    currentDay = 72;
    markers = {
      left: {
        title: language === 'sw' ? 'Kupandikiza' : 'Transplanting',
        sub: language === 'sw' ? 'Siku ya 1' : 'Day 1 field',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Kukata Matawi' : 'Pruning',
        sub: language === 'sw' ? 'Kila Wiki' : 'Weekly trimming',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('banana') || nameLower.includes('ndizi')) {
    image = require('../../assets/images/crop_banana.png');
    displayName = language === 'sw' ? 'Ndizi' : 'Bananas';
    harvestDays = 270;
    currentDay = 150;
    markers = {
      left: {
        title: language === 'sw' ? 'Kukata Majani' : 'Deleafing',
        sub: language === 'sw' ? 'Kila Mwezi' : 'Monthly pruning',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Kuwekea Mbolea' : 'Fertilization',
        sub: language === 'sw' ? 'Mbolea ya NPK' : 'NPK Application',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('rice') || nameLower.includes('mpunga')) {
    image = require('../../assets/images/crop_rice.png');
    displayName = language === 'sw' ? 'Mpunga' : 'Rice';
    harvestDays = 130;
    currentDay = 105;
    markers = {
      left: {
        title: language === 'sw' ? 'Kupandikiza' : 'Transplanting',
        sub: language === 'sw' ? 'Siku ya 1' : 'Day 1 flooded',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Kukata Maji' : 'Drain Field',
        sub: language === 'sw' ? 'Wiki 2 kabla ya kuvuna' : '2 weeks pre-harvest',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('onion') || nameLower.includes('vitunguu')) {
    image = require('../../assets/images/crop_onion.png');
    displayName = language === 'sw' ? 'Vitunguu' : 'Onions';
    harvestDays = 120;
    currentDay = 85;
    markers = {
      left: {
        title: language === 'sw' ? 'Kupandikiza' : 'Transplanting',
        sub: language === 'sw' ? 'Siku ya 1' : 'Day 1 field',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Palizi ya Kwanza' : 'First Weeding',
        sub: language === 'sw' ? 'Wiki ya 3' : 'Week 3',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('cabbage') || nameLower.includes('kabichi')) {
    image = require('../../assets/images/crop_cabbage.png');
    displayName = language === 'sw' ? 'Kabichi' : 'Cabbage';
    harvestDays = 90;
    currentDay = 60;
    markers = {
      left: {
        title: language === 'sw' ? 'Mbolea ya Urea' : 'Urea Fertilizer',
        sub: language === 'sw' ? 'Wiki ya 4' : 'Week 4',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Viwavi' : 'Caterpillars',
        sub: language === 'sw' ? 'Siku ya 45' : 'Day 45 spray',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('sunflower') || nameLower.includes('alizeti')) {
    image = require('../../assets/images/crop_sunflower.png');
    displayName = language === 'sw' ? 'Alizeti' : 'Sunflower';
    harvestDays = 95;
    currentDay = 70;
    markers = {
      left: {
        title: language === 'sw' ? 'Nafasi ya Kupanda' : 'Plant Spacing',
        sub: language === 'sw' ? '75cm × 30cm' : 'Spacing 75x30cm',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Kukomaa' : 'Maturity Check',
        sub: language === 'sw' ? 'Siku ya 85' : 'Day 85 check',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('chili') || nameLower.includes('pilipili')) {
    image = require('../../assets/images/crop_chili.png');
    displayName = language === 'sw' ? 'Pilipili Kali' : 'Chili Peppers';
    harvestDays = 120;
    currentDay = 90;
    markers = {
      left: {
        title: language === 'sw' ? 'Kitalu' : 'Nursery Bed',
        sub: language === 'sw' ? 'Wiki 4 mapema' : '4 weeks before',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Mavuno ya Kwanza' : 'First Harvest',
        sub: language === 'sw' ? 'Wiki ya 17' : 'Week 17 harvest',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  } else if (nameLower.includes('sorghum') || nameLower.includes('mtama')) {
    image = require('../../assets/images/crop_sorghum.png');
    displayName = language === 'sw' ? 'Mtama' : 'Sorghum';
    harvestDays = 90;
    currentDay = 65;
    markers = {
      left: {
        title: language === 'sw' ? 'Kupalilia' : 'Weeding',
        sub: language === 'sw' ? 'Wiki ya 3' : 'Week 3 weed',
        top: 120,
        left: '8%',
        lineW: '20%',
        lineH: 42,
        dotTop: 174,
      },
      right: {
        title: language === 'sw' ? 'Kuzuia Ndege' : 'Bird Scaring',
        sub: language === 'sw' ? 'Wiki ya 10' : 'Week 10 bird net',
        top: 88,
        right: '6%',
        lineW: '18%',
        lineH: 48,
        dotTop: 148,
      },
    };
  }

  return { image, displayName, harvestDays, currentDay, markers };
};

// ─── Weather Widget Card ──────────────────────────────────────────────────────
function WeatherWidget({ weather, language, colors, isDark, router }: any) {
  const hourlyData = React.useMemo(() => {
    const currentHour = new Date().getHours();
    const baseTemp = weather.current?.temp ?? 24;
    const offsets = [0, 1, 2, 1, -1];
    return Array.from({ length: 5 }).map((_, i) => {
      const hr = (currentHour + i) % 24;
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
      const cond = weather.current?.condition ?? 'sun';
      return {
        label: `${displayHr} ${ampm}`,
        temp: Math.round(baseTemp + (offsets[i] ?? 0)),
        isRain: (cond === 'rain' || cond === 'storm') && i > 2,
        isCloud: i === 1 || i === 4,
      };
    });
  }, [weather.current?.temp, weather.current?.condition]);

  const displayTemp = Math.round(weather.current?.temp ?? 24);
  const humidity = weather.current?.humidity ?? 78;
  const feelsLike = Math.round((weather.current as any)?.feelsLike ?? displayTemp + 1);
  const conditionLabel =
    weather.current?.conditionLabel ?? (language === 'sw' ? 'Mawingu kidogo' : 'Partly cloudy');
  const condition = weather.current?.condition ?? 'cloud';
  const thumbPct = Math.max(8, Math.min(88, ((displayTemp - 14) / 22) * 100));
  const conditionColor =
    condition === 'rain'
      ? '#3b82f6'
      : condition === 'storm'
        ? '#6366f1'
        : condition === 'cloud'
          ? '#64748b'
          : '#F59E0B';

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(500).springify()}
      style={{ marginVertical: 8 }}
    >
      <Text
        style={[
          styles.bentoSectionTitle,
          { color: colors.textMute, marginLeft: 4, marginBottom: 8 },
        ]}
      >
        {language === 'sw' ? 'HALI YA HEWA' : 'WEATHER'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.93}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/forecast' as any);
        }}
        style={[styles.wxCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={
          language === 'sw' ? 'Fungua hali kamili ya hewa' : 'Open full weather forecast'
        }
      >
        {/* Header */}
        <View style={styles.wxHead}>
          <View style={styles.wxLoc}>
            <MapPin size={11} color={colors.primary} strokeWidth={2.5} />
            <Text style={[styles.wxLocText, { color: colors.textMute }]}>
              {(weather.location ?? 'Arusha').replace(',TZ', '').replace(',tz', '')}
            </Text>
          </View>
          <View style={[styles.wxBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.wxBadgeText, { color: colors.primary }]}>
              {language === 'sw' ? 'Leo' : 'Today'}
            </Text>
            <ChevronRight size={11} color={colors.primary} strokeWidth={2.5} />
          </View>
        </View>

        {/* Temperature + Icon */}
        <View style={styles.wxTempRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[styles.wxBigTemp, { color: colors.text }]}>{displayTemp}</Text>
              <Text style={[styles.wxDeg, { color: colors.primary }]}>°C</Text>
            </View>
            <Text style={[styles.wxCond, { color: colors.textMute }]}>{conditionLabel}</Text>
          </View>
          <View
            style={[
              styles.wxIconRing,
              { backgroundColor: conditionColor + '14', borderColor: conditionColor + '28' },
            ]}
          >
            {condition === 'rain' || condition === 'storm' ? (
              <CloudRain size={44} color={conditionColor} strokeWidth={1.5} />
            ) : condition === 'cloud' ? (
              <Cloud size={44} color={conditionColor} strokeWidth={1.5} />
            ) : (
              <Sun size={44} color={conditionColor} strokeWidth={1.5} />
            )}
          </View>
        </View>

        {/* Gradient Range Bar */}
        <View style={styles.wxBarWrap}>
          <LinearGradient
            colors={['#2e7d32', '#a3e635', '#f59e0b', '#ef4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.wxBar}
          />
          <View
            style={[
              styles.wxBarThumb,
              { left: `${thumbPct}%` as any, borderColor: colors.primary },
            ]}
          />
        </View>

        {/* Hourly Timeline */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16 }}
          contentContainerStyle={{ gap: 4, paddingHorizontal: 2 }}
        >
          {hourlyData.map((h, i) => (
            <View
              key={i}
              style={[
                styles.wxHour,
                i === 0 && { backgroundColor: colors.primaryLight, borderRadius: 14 },
              ]}
            >
              <Text
                style={[styles.wxHourTime, { color: i === 0 ? colors.primary : colors.textMute }]}
              >
                {h.label}
              </Text>
              {h.isRain ? (
                <CloudRain size={15} color="#60a5fa" strokeWidth={1.8} />
              ) : h.isCloud ? (
                <Cloud size={15} color="#94a3b8" strokeWidth={1.8} />
              ) : (
                <Sun size={15} color="#F59E0B" strokeWidth={1.8} />
              )}
              <Text style={[styles.wxHourTemp, { color: colors.text }]}>{h.temp}°</Text>
            </View>
          ))}
        </ScrollView>

        {/* Stats Row */}
        <View style={[styles.wxStats, { borderTopColor: colors.border }]}>
          {[
            {
              icon: <Droplets size={13} color="#3b82f6" />,
              val: `${humidity}%`,
              lbl: language === 'sw' ? 'Unyevu' : 'Humidity',
            },
            { icon: <Sun size={13} color="#F59E0B" />, val: '05', lbl: 'UV Index' },
            {
              icon: <Thermometer size={13} color={colors.primary} />,
              val: `${feelsLike}°`,
              lbl: language === 'sw' ? 'Hisi' : 'Feels like',
            },
            {
              icon: <Wind size={13} color="#94a3b8" />,
              val: '12 km/h',
              lbl: language === 'sw' ? 'Upepo' : 'Wind',
            },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[styles.wxStatDiv, { backgroundColor: colors.border }]} />}
              <View style={styles.wxStat}>
                {s.icon}
                <Text style={[styles.wxStatVal, { color: colors.text }]}>{s.val}</Text>
                <Text style={[styles.wxStatLbl, { color: colors.textMute }]}>{s.lbl}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { colors, isDark, radius, shadows } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const agroId = useKilimoStore((s) => s.agroId);
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const syncQueue = useKilimoStore((s) => s.syncQueue);
  const farmVitals = useKilimoStore((s) => s.farmVitals);
  const weather = useWeather();
  const wallet = useKilimoStore((s) => s.wallet);
  const unreadCount = useKilimoStore((s) => s.unreadCount);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const language = useKilimoStore((s) => s.language);
  const addNotification = useKilimoStore((s) => s.addNotification);
  const { createTask } = useTasks();

  const [activatingHome, setActivatingHome] = useState(false);
  const [activationFinished, setActivationFinished] = useState(false);
  // Activation is a prompt, not a wall — the user can dismiss it and use the app.
  // (Also prevents a permanent trap when the server mint can't complete, e.g. in
  // the web simulator / offline, which would otherwise keep status != 'verified'.)
  const [dismissedActivation, setDismissedActivation] = useState(false);
  const progress = useSharedValue(0);
  const sweepY = useSharedValue(-100);

  const handleActivateHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setActivatingHome(true);
    progress.value = 0;

    // Start scanning line animation
    sweepY.value = withRepeat(
      withSequence(withTiming(260, { duration: 1500 }), withTiming(0, { duration: 0 })),
      -1,
      false
    );

    progress.value = withTiming(1, { duration: 1500 });

    setTimeout(async () => {
      // The Agro-ID is embedded in a PUBLIC verification QR, so it must be
      // high-entropy and must NOT encode identifying document numbers. Keep a
      // readable doc-type tag; the unique part is minted server-side (or via a
      // local CSPRNG fallback when offline) so IDs cannot be enumerated and no
      // national-ID/TIN digits ever leak into the URL.
      const docTag = agroId?.nationalId
        ? 'NIDA'
        : agroId?.tinNumber
          ? 'TIN'
          : agroId?.businessLicense
            ? 'LIC'
            : 'REG';
      const { id: newId, serverMinted } = await mintAgroId(docTag);

      // Only a server-minted id is authoritative/verifiable; a local offline
      // fallback is provisional and marked 'pending' so we don't claim a fake
      // 'verified' state. A later activation while online re-mints (idempotent)
      // and upgrades it to the authoritative id.
      updateAgroId({
        verificationStatus: serverMinted ? 'verified' : 'pending',
        id: newId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActivationFinished(true);

      setTimeout(() => {
        setActivatingHome(false);
        setActivationFinished(false);
        setDismissedActivation(true); // proceed into the app even if mint was provisional
        progress.value = 0;
        sweepY.value = -100;
      }, 1000);
    }, 1500);
  };

  const animatedLaserStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sweepY.value }],
    };
  });

  // Guide Modal State
  const [activeGuideModal, setActiveGuideModal] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(0);

  // RAG Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [ragFocused, setRagFocused] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<{ summary: string; source: string } | null>(null);

  // Ask Kilimo AI Chat Widget State
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReply, setChatReply] = useState<string | null>(null);

  // Weekly Insights State
  const [weeklyInsight, setWeeklyInsight] = useState<{
    title: string;
    body: string;
    source: string;
  } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Crop Slideshow Selection
  const primaryCrops = useMemo(() => {
    return farmProfile?.primaryCrops || [];
  }, [farmProfile]);

  const [activeCropIndex, setActiveCropIndex] = useState(0);

  // Slide carousel effect
  useEffect(() => {
    if (primaryCrops.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCropIndex((prev) => (prev + 1) % primaryCrops.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [primaryCrops]);

  const activeCrop = primaryCrops[activeCropIndex] || '';
  const cropMeta = useMemo(() => getCropMetadata(activeCrop, language), [activeCrop, language]);

  // Translate Bento Stats
  const FARM_STATS = [
    {
      id: 'soil',
      label: language === 'sw' ? 'Afya ya Udongo' : 'Soil Health',
      value: `${farmVitals.soilHealth}%`,
      chart: <SoilHealthChart color={colors.primary} />,
      icon: <Leaf size={18} color={colors.primary} />,
      color: colors.primary,
      trend: language === 'sw' ? 'Nzuri' : 'Optimal',
    },
    {
      id: 'moisture',
      label: language === 'sw' ? 'Unyevu' : 'Moisture',
      value: `${farmVitals.moisture}%`,
      chart: <MoistureChart />,
      icon: <Droplets size={18} color="#2563EB" />,
      color: '#2563EB',
      trend: language === 'sw' ? 'Kawaida' : 'Optimal',
    },
    {
      id: 'weather',
      label: language === 'sw' ? 'Joto' : 'Temperature',
      value: `${Math.round(weather.current?.temp ?? farmVitals.temperature)}°C`,
      chart: <TemperatureChart />,
      icon: <Sun size={18} color="#F59E0B" />,
      color: '#F59E0B',
      trend: weather.current?.conditionLabel ?? (language === 'sw' ? 'Imara' : 'Optimal'),
    },
    {
      id: 'yield',
      label: language === 'sw' ? 'Kadirio Mavuno' : 'Yield Est.',
      value: `${farmVitals.yieldEstimate}t`,
      chart: <YieldChart />,
      icon: <TrendingUp size={18} color="#8b5cf6" />,
      color: '#8b5cf6',
      trend: language === 'sw' ? 'Kawaida' : 'Optimal',
    },
  ];

  const quickActions = useMemo(
    () => [
      {
        id: 'scan',
        label: language === 'sw' ? 'Uchunguzi' : 'Scan',
        icon: <Camera size={22} color="#fff" />,
        color: colors.primary,
        desc: language === 'sw' ? 'Chunguza Ugonjwa' : 'AI Crop Scan',
      },
      {
        id: 'calendar',
        label: language === 'sw' ? 'Kalenda' : 'Calendar',
        icon: <Calendar size={22} color="#fff" />,
        color: '#3A8D52',
        desc: language === 'sw' ? 'Ratiba ya Shamba' : 'Farm Schedule',
      },
      {
        id: 'tasks',
        label: language === 'sw' ? 'Kazi' : 'Tasks',
        icon: <LayoutGrid size={22} color="#fff" />,
        color: colors.primary,
        desc: language === 'sw' ? 'Kazi za Shamba' : 'Farm Tasks',
      },
      {
        id: 'market',
        label: language === 'sw' ? 'Soko' : 'Market',
        icon: <TrendingUp size={22} color="#fff" />,
        color: '#256035',
        desc: language === 'sw' ? 'Bei za Mazao' : 'Market Prices',
      },
      {
        id: 'crop-planning',
        label: language === 'sw' ? 'Upangaji' : 'Planning',
        icon: <Leaf size={22} color="#fff" />,
        color: '#1C4A29',
        desc: language === 'sw' ? 'Upangaji wa Mazao' : 'AI Crop Planning',
      },
      {
        id: 'contracts',
        label: language === 'sw' ? 'Mikataba' : 'Contracts',
        icon: <BarChart3 size={22} color="#fff" />,
        color: '#13351D',
        desc: language === 'sw' ? 'Kilimo cha Mkataba' : 'Contract Farming',
      },
    ],
    [language]
  );

  const recommendations = useMemo(
    () => generateRecommendations({ profile: farmProfile, vitals: farmVitals, language }),
    [farmProfile, farmVitals, language]
  );

  const setLastSyncedAt = useKilimoStore((s) => s.setLastSyncedAt);
  const { forceSync } = useSyncEngine();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await forceSync();
    setLastSyncedAt(new Date().toISOString());
    setRefreshing(false);
  }, [setLastSyncedAt, forceSync]);

  // Execute RAG Search
  const handleRagSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setRagLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (aiConfigured()) {
        const prompt = `Act as an agricultural search RAG system. Answer the following search query: "${query}" in ${language === 'sw' ? 'Kiswahili' : 'English'}.
        Keep the answer very brief (max 3 sentences). 
        You MUST output a clean JSON object ONLY, with no markdown styling:
        {
          "summary": "AI summary text here...",
          "source": "realistic source citation, e.g. TARI (2024) or FAO guidelines"
        }`;
        const resText = await chat([{ role: 'user', content: prompt }]);
        const parsed = JSON.parse(resText.replace(/```json\s*|\s*```/g, '').trim());
        setRagResult(parsed);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        const queryLower = query.toLowerCase();
        if (
          queryLower.includes('mbeya') ||
          queryLower.includes('maize') ||
          queryLower.includes('mahindi')
        ) {
          if (language === 'sw') {
            setRagResult({
              summary:
                'Uzalishaji wa mahindi mkoani Mbeya hufaidika na udongo wa kichanga wenye pH ya 6.2. Mavuno bora hutokea kati ya Juni na Agosti. Inashauriwa kuvuna wakati unyevu wa nafaka uko chini ya 15% ili kuzuia kuvu.',
              source: 'Mwongozo wa Kilimo Tanzania (TARI Mbeya, 2024)',
            });
          } else {
            setRagResult({
              summary:
                'Maize production in Mbeya benefit from fertile loam soil with pH 6.2. The optimal harvest window is between June and August. It is recommended to harvest when grain moisture is below 15% to prevent aflatoxin.',
              source: 'Tanzania Agriculture Research Institute (TARI, 2024)',
            });
          }
        } else if (queryLower.includes('nitrogen') || queryLower.includes('nitrojeni')) {
          if (language === 'sw') {
            setRagResult({
              summary:
                'Nitrojeni ya chini kwenye Zone 42 inasababishwa na kilimo cha mara kwa mara bila mzunguko wa mazao ya kunde. Inashauriwa kuongeza mbolea ya Urea (kilo 50/ekari) au kupanda maharage ili kurejesha rutuba ya nitrojeni.',
              source: 'Ripoti ya Udongo ya Kilimo AI (Zone 42 Soil Report)',
            });
          } else {
            setRagResult({
              summary:
                'Low nitrogen in Zone 42 is caused by continuous cropping without legume rotation. We recommend applying Urea (50kg/acre) or intercropping with beans to naturally restore nitrogen levels.',
              source: 'Kilimo AI Sensor Analytics (Zone 42 Soil Report)',
            });
          }
        } else {
          if (language === 'sw') {
            setRagResult({
              summary: `Majibu ya utafutaji wa "${query}": Mazao ya shamba lako yanahitaji mbolea sahihi na umwagiliaji kwa wakati. Tafadhali wasiliana na afisa ugani kwa maelezo zaidi.`,
              source: 'Kitabu cha Kilimo cha Taifa',
            });
          } else {
            setRagResult({
              summary: `Search results for "${query}": Your farm crops require proper fertilization and scheduled irrigation. Please consult your local extension officer for crop-specific actions.`,
              source: 'National Agricultural Handbook',
            });
          }
        }
      }
    } catch {
      setRagResult({
        summary:
          language === 'sw'
            ? 'Imeshindwa kupata majibu kwa sasa.'
            : 'Unable to retrieve search context right now.',
        source: 'System Error',
      });
    } finally {
      setRagLoading(false);
    }
  };

  // Submit chat widget query
  const handleChatWidgetSubmit = async (queryText?: string) => {
    const query = (queryText || chatInput).trim();
    if (!query) return;
    setChatLoading(true);
    setChatInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (aiConfigured()) {
        const promptText = `Wewe ni msaidizi wa Kilimo AI. Jibu kwa kifupi swali hili kwa ${language === 'sw' ? 'Kiswahili' : 'English'}: "${query}"`;
        const reply = await chat([{ role: 'user', content: promptText }]);
        setChatReply(reply);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        const queryLower = query.toLowerCase();
        if (queryLower.includes('nitrogen') || queryLower.includes('nitrojeni')) {
          setChatReply(
            language === 'sw'
              ? 'Nitrojeni iko chini kwa sababu ya kilimo cha mfululizo. Kupanda maharage au kuweka mbolea ya Urea kutarudisha rutuba.'
              : 'Low nitrogen is usually caused by repeated mono-cropping. Intercropping with beans or applying Urea fertilizer will restore soil nutrients.'
          );
        } else if (
          queryLower.includes('bei') ||
          queryLower.includes('market') ||
          queryLower.includes('price')
        ) {
          setChatReply(
            language === 'sw'
              ? 'Bei ya Mahindi soko la Tandale imepanda hadi TZS 85,000 kwa gunia la kilo 100 leo. Hii ni ongezeko la 2.4%.'
              : 'Maize prices at Tandale market increased to TZS 85,000 per 100kg bag today. That is a 2.4% increase.'
          );
        } else {
          setChatReply(
            language === 'sw'
              ? 'Sankofa AI imepokea swali lako. Mwagilia mmea asubuhi kabla ya jua kali na uhakikishe mifereji iko wazi shambani.'
              : 'Sankofa AI has received your query. Please irrigate your crops early in the morning and verify field drainage is optimal.'
          );
        }
      }
    } catch {
      setChatReply(
        language === 'sw'
          ? 'Kuna hitilafu ya mtandao, jaribu tena.'
          : 'Network error. Please try again.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  // Fetch LLM weekly insight
  useEffect(() => {
    let active = true;
    const fetchWeeklyInsight = async () => {
      setInsightLoading(true);
      try {
        const cropsList = primaryCrops.join(', ');
        const prompt = `Generate a human-like, actionable weekly farming recommendation for a farmer in ${farmProfile?.region || 'Mbeya'}, Tanzania growing ${cropsList}. 
        Write the response in ${language === 'sw' ? 'Kiswahili' : 'English'}.
        Respond with a clean JSON format ONLY, with no markdown code blocks:
        {
          "title": "short catchy title",
          "body": "actionable 2-sentence recommendation detail",
          "source": "realistic source citation, e.g. TARI (2024)"
        }`;

        let insightText = '';
        if (aiConfigured()) {
          insightText = await chat([{ role: 'user', content: prompt }]);
        } else {
          await new Promise((r) => setTimeout(r, 1200));
          if (language === 'sw') {
            insightText = JSON.stringify({
              title: 'Muda wa Kupalilia na Kuweka Urea',
              body: `Kwa kuwa mahindi yako yana wiki 4 sasa mkoani ${farmProfile?.region || 'Mbeya'}, weka mbolea ya Urea (kilo 50 kwa ekari) baada ya kupalilia. Hii itaongeza ukuaji wa majani kwa haraka.`,
              source: 'Afisa Ugani (TARI, 2024)',
            });
          } else {
            insightText = JSON.stringify({
              title: 'Weeding and Urea Application',
              body: `Since your maize is at week 4 in ${farmProfile?.region || 'Mbeya'}, apply Urea fertilizer (50kg/acre) immediately after weeding. This boosts leafy vegetative growth.`,
              source: 'Extension Officer (TARI, 2024)',
            });
          }
        }

        if (!active) return;
        try {
          const parsed = JSON.parse(insightText.replace(/```json\s*|\s*```/g, '').trim());
          setWeeklyInsight(parsed);
        } catch {
          setWeeklyInsight({
            title: language === 'sw' ? 'Ushauri wa Mbolea' : 'Fertilization Advice',
            body: insightText.slice(0, 150),
            source: 'Kilimo AI',
          });
        }
      } catch (err) {
        if (active) {
          setWeeklyInsight({
            title: language === 'sw' ? 'Dhibiti Unyevu wa Udongo' : 'Manage Soil Moisture',
            body:
              language === 'sw'
                ? 'Mwagilia asubuhi na jioni ili kulinda mimea dhidi ya ukame unaotarajiwa.'
                : 'Water your crops in the morning and evening to protect against the expected dry spell.',
            source: 'Kilimo AI',
          });
        }
      } finally {
        if (active) setInsightLoading(false);
      }
    };

    fetchWeeklyInsight();
    return () => {
      active = false;
    };
  }, [farmProfile, language, primaryCrops]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Immersive Hero Header */}
        <View style={styles.heroWrapper}>
          <Image source={cropMeta.image} style={styles.heroImage} />
          <LinearGradient
            colors={['#040e07f2', '#0a2010c0', '#0d2b1540', colors.background]}
            locations={[0, 0.28, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Svg
            width={200}
            height={200}
            style={{ position: 'absolute', top: -20, right: -20, opacity: 0.09 }}
          >
            <Circle cx={180} cy={20} r={60} stroke={colors.primary} strokeWidth={1} fill="none" />
            <Circle
              cx={180}
              cy={20}
              r={92}
              stroke={colors.primary}
              strokeWidth={0.75}
              fill="none"
            />
            <Circle
              cx={180}
              cy={20}
              r={124}
              stroke={colors.primary}
              strokeWidth={0.5}
              fill="none"
            />
          </Svg>

          {/* Crop Overlay Visual Telemetry Markers */}
          {primaryCrops.length > 0 && (
            <View style={StyleSheet.absoluteFill}>
              {/* Left Marker */}
              <View
                style={[
                  styles.markerLabelContainer,
                  {
                    left: cropMeta.markers.left.left as any,
                    top: cropMeta.markers.left.top,
                  } as any,
                ]}
              >
                <Text style={styles.markerLabelTitle}>{cropMeta.markers.left.title}</Text>
                <Text style={styles.markerLabelSub}>{cropMeta.markers.left.sub}</Text>
              </View>
              <View
                style={[
                  styles.markerLineH,
                  {
                    left: '26%',
                    top: cropMeta.markers.left.top + 12,
                    width: cropMeta.markers.left.lineW as any,
                  } as any,
                ]}
              />
              <View
                style={[
                  styles.markerLineV,
                  {
                    left: '46%',
                    top: cropMeta.markers.left.top + 12,
                    height: cropMeta.markers.left.lineH,
                  } as any,
                ]}
              />
              <View
                style={[
                  styles.markerDot,
                  {
                    left: '45%',
                    top: cropMeta.markers.left.dotTop,
                    borderColor: colors.primary,
                  } as any,
                ]}
              />

              {/* Right Marker */}
              <View
                style={[
                  styles.markerLabelContainer,
                  {
                    right: cropMeta.markers.right.right as any,
                    top: cropMeta.markers.right.top,
                    alignItems: 'flex-end',
                  } as any,
                ]}
              >
                <Text style={styles.markerLabelTitle}>{cropMeta.markers.right.title}</Text>
                <Text style={styles.markerLabelSub}>{cropMeta.markers.right.sub}</Text>
              </View>
              <View
                style={[
                  styles.markerLineH,
                  {
                    right: '28%',
                    top: cropMeta.markers.right.top + 12,
                    width: cropMeta.markers.right.lineW as any,
                  } as any,
                ]}
              />
              <View
                style={[
                  styles.markerLineV,
                  {
                    right: '46%',
                    top: cropMeta.markers.right.top + 12,
                    height: cropMeta.markers.right.lineH,
                  } as any,
                ]}
              />
              <View
                style={[
                  styles.markerDot,
                  {
                    right: '45.1%',
                    top: cropMeta.markers.right.dotTop,
                    borderColor: colors.primary,
                  } as any,
                ]}
              />
            </View>
          )}

          <SafeAreaView
            style={[
              styles.heroHeader,
              { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 0 },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* Left Profile Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Svg width={56} height={56} style={{ position: 'absolute' }}>
                      <Circle
                        cx={28}
                        cy={28}
                        r={26}
                        stroke={colors.primary}
                        strokeWidth={1.5}
                        fill="none"
                        strokeDasharray="9 5"
                        strokeLinecap="round"
                      />
                    </Svg>
                    {agroId?.avatarUrl ? (
                      <Image
                        source={{ uri: agroId.avatarUrl }}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                      />
                    ) : (
                      <View
                        style={{
                          backgroundColor: colors.primary,
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{ fontSize: 18, color: '#fff', fontFamily: 'Inter_800ExtraBold' }}
                        >
                          {agroId?.name?.[0]?.toUpperCase() || 'K'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.55)',
                      fontFamily: 'Inter_500Medium',
                    }}
                  >
                    {language === 'sw' ? 'Habari,' : 'Hello,'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 21,
                      color: '#fff',
                      fontFamily: 'InstrumentSerif_400Regular',
                      letterSpacing: 0.1,
                    }}
                  >
                    {agroId?.name
                      ? agroId.name.split(' ')[0]
                      : language === 'sw'
                        ? 'Mkulima'
                        : 'Farmer'}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: colors.primary,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.45)',
                        fontFamily: 'Inter_700Bold',
                        letterSpacing: 0.9,
                      }}
                    >
                      {((agroId?.role as string) || 'MKULIMA').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right Action Section */}
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/forecast' as any);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.18)',
                    borderWidth: 1,
                    paddingHorizontal: 13,
                    paddingVertical: 7,
                    borderRadius: 14,
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {weather.current?.condition === 'cloud' ? (
                      <Cloud size={13} color="#94a3b8" />
                    ) : weather.current?.condition === 'rain' ||
                      weather.current?.condition === 'storm' ? (
                      <CloudRain size={13} color="#7dd3fc" />
                    ) : (
                      <Sun size={13} color="#fcd34d" />
                    )}
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 20,
                        fontFamily: 'InstrumentSerif_400Regular',
                        lineHeight: 24,
                      }}
                    >
                      {Math.round(weather.current?.temp ?? farmVitals.temperature)}°
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 8,
                      fontFamily: 'Inter_700Bold',
                      letterSpacing: 0.7,
                    }}
                  >
                    {language === 'sw' ? 'HALI YA HEWA' : 'FORECAST'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/notifications' as any);
                  }}
                  style={[
                    styles.heroActionCircle,
                    {
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderWidth: 1,
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                  accessibilityLabel="Notifications"
                  accessibilityRole="button"
                >
                  <Bell size={18} color="#fff" />
                  {unreadCount > 0 && !isOffline && (
                    <View style={[styles.heroNotificationDot, { top: 10, right: 12 }]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Contextual Sub-header / Status */}
            {isOffline && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  marginTop: 12,
                }}
              >
                <WifiOff size={12} color="#fff" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 11,
                    fontFamily: 'Inter_800ExtraBold',
                    marginLeft: 4,
                  }}
                >
                  OFFLINE ({syncQueue.length} Q)
                </Text>
              </View>
            )}
          </SafeAreaView>

          {/* Crop Telemetry Info Overlay */}
          <View style={styles.heroCropPanel}>
            {primaryCrops.length === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/edit-profile' as any);
                }}
                style={[
                  styles.noCropCard,
                  {
                    borderColor: colors.primary + '30',
                    backgroundColor: isDark ? colors.primary + '40' : colors.primary + '0D',
                  },
                ]}
              >
                <View style={[styles.noCropWarningBadge, { backgroundColor: '#F59E0B' }]}>
                  <Sparkles size={12} color="#000" />
                  <Text style={styles.noCropWarningBadgeText}>
                    {language === 'sw' ? 'MIPANGILIO INAHITAJIKA' : 'SETUP REQUIRED'}
                  </Text>
                </View>
                <Text style={[styles.noCropTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Bado Haujasajili Mazao Yako' : 'No Crops Registered Yet'}
                </Text>
                <Text style={[styles.noCropDesc, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Bofya hapa ili kuongeza mazao kwenye wasifu wako ili kupata miongozo na uchambuzi wa AI.'
                    : 'Click here to configure your primary crops in Settings and unlock guides & AI analysis.'}
                </Text>
                <View style={[styles.noCropActionBtn, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.noCropActionBtnText, { color: '#FCFBF7' }]}>
                    {language === 'sw' ? 'Kamilisha Wasifu' : 'Complete Profile'}
                  </Text>
                  <ArrowRight size={14} color="#FCFBF7" />
                </View>
              </TouchableOpacity>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={styles.cropLabel}>
                    {language === 'sw' ? 'MAZAO YAKO YA KILIMO' : 'YOUR AGRICULTURAL CROPS'}
                  </Text>
                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: 'rgba(239,68,68,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(239,68,68,0.3)',
                      },
                    ]}
                  >
                    <PulsingDot />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.11)',
                    borderRadius: 18,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={styles.cropName}>{cropMeta.displayName}</Text>
                      {primaryCrops.length > 1 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Previous crop"
                            onPress={() =>
                              setActiveCropIndex(
                                (prev) => (prev - 1 + primaryCrops.length) % primaryCrops.length
                              )
                            }
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
                          </TouchableOpacity>
                          <Text
                            style={{
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: 10,
                              fontFamily: 'Inter_700Bold',
                            }}
                          >
                            {activeCropIndex + 1}/{primaryCrops.length}
                          </Text>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Next crop"
                            onPress={() =>
                              setActiveCropIndex((prev) => (prev + 1) % primaryCrops.length)
                            }
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 3, marginBottom: 5 }}>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const filled =
                          i < Math.round((cropMeta.currentDay / cropMeta.harvestDays) * 12);
                        return (
                          <View
                            key={i}
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: filled ? colors.primary : 'rgba(255,255,255,0.15)',
                            }}
                          />
                        );
                      })}
                    </View>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: 9,
                        fontFamily: 'Inter_600SemiBold',
                        letterSpacing: 0.3,
                      }}
                    >
                      {language === 'sw' ? 'KUVUNA' : 'HARVEST'} ·{' '}
                      {cropMeta.harvestDays - cropMeta.currentDay}{' '}
                      {language === 'sw' ? 'SIKU ZILIZO' : 'DAYS LEFT'}
                    </Text>
                  </View>

                  <View style={{ gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: colors.primary + '2E',
                        borderWidth: 1,
                        borderColor: colors.primary + '4D',
                        borderRadius: 12,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 18,
                          fontFamily: 'InstrumentSerif_400Regular',
                          lineHeight: 21,
                        }}
                      >
                        {Math.round((cropMeta.currentDay / cropMeta.harvestDays) * 100)}%
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: 7,
                          fontFamily: 'Inter_700Bold',
                          letterSpacing: 0.5,
                        }}
                      >
                        {language === 'sw' ? 'UKUAJI' : 'GROWTH'}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.13)',
                        borderRadius: 12,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 17,
                          fontFamily: 'InstrumentSerif_400Regular',
                          lineHeight: 20,
                        }}
                      >
                        {cropMeta.currentDay}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: 7,
                          fontFamily: 'Inter_700Bold',
                          letterSpacing: 0.5,
                        }}
                      >
                        {language === 'sw' ? 'SIKU' : 'DAY'}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Content body below the Hero */}
        <View style={styles.mainContent}>
          {/* RAG SEARCH BAR */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 10 }}>
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : colors.card,
                  borderColor: ragFocused ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.searchBarLeft}>
                <View style={[styles.searchAiBadge, { backgroundColor: colors.primary + '1A' }]}>
                  <Sparkles size={10} color={colors.primary} />
                  <Text style={[styles.searchAiBadgeText, { color: colors.primary }]}>AI</Text>
                </View>
                <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
                <Search size={16} color={ragFocused ? colors.primary : colors.textMute} />
              </View>
              <TextInput
                style={[styles.searchBarInput, { color: colors.text }]}
                placeholder={
                  language === 'sw'
                    ? 'Tafuta miongozo ya mazao, udongo au masoko...'
                    : 'Search crop guides, soil, or markets...'
                }
                placeholderTextColor={colors.textMute}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (!text.trim()) setRagResult(null);
                }}
                onSubmitEditing={handleRagSearch}
                onFocus={() => setRagFocused(true)}
                onBlur={() => setRagFocused(false)}
                accessibilityLabel="RAG Search"
                accessibilityHint="Query agricultural guides and get cited source cards"
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setRagResult(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear Search"
                >
                  <View
                    style={[styles.searchClearBtn, { backgroundColor: colors.textMute + '22' }]}
                  >
                    <X size={12} color={colors.textMute} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.searchReturnHint, { borderColor: colors.border }]}>
                  <Text style={[styles.searchReturnHintText, { color: colors.textMute }]}>↵</Text>
                </View>
              )}
            </View>

            {ragLoading && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.searchLoadingText, { color: colors.textMute }]}>
                  {language === 'sw' ? 'Inatafuta nyaraka...' : 'Retrieving context...'}
                </Text>
              </View>
            )}

            {ragResult && (
              <Animated.View
                entering={FadeInDown}
                style={[
                  styles.searchResultCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.searchResultHeader}>
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={[styles.searchResultTitle, { color: colors.primary }]}>
                    {language === 'sw' ? 'Jibu la AI (RAG)' : 'AI Synthesis (RAG)'}
                  </Text>
                </View>
                <Text style={[styles.searchResultBody, { color: colors.text }]}>
                  {ragResult.summary}
                </Text>

                {/* Cited Source Card */}
                <View
                  style={[
                    styles.citedCard,
                    {
                      backgroundColor: isDark ? '#171D15' : '#EAF0E8',
                      borderColor: colors.primary + '30',
                    },
                  ]}
                >
                  <Globe size={12} color={colors.primary} />
                  <Text style={[styles.citedText, { color: colors.primary }]}>
                    {language === 'sw'
                      ? `Kumbukumbu: ${ragResult.source}`
                      : `Cited Source: ${ragResult.source}`}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Horizontal Track Records timeline stepper */}
          <TrackRecords colors={colors} isDark={isDark} language={language} />

          {/* Crop Value Dashboard — est. yield, market value, harvest countdown */}
          <CropValueCard colors={colors} isDark={isDark} language={language} />

          {/* Weather Widget */}
          <WeatherWidget
            weather={weather}
            language={language}
            colors={colors}
            isDark={isDark}
            router={router}
          />

          {/* Quick Actions — compact icon-tile grid */}
          <View style={{ marginVertical: 12 }}>
            <Text style={[styles.bentoSectionTitle, { color: colors.textMute, marginLeft: 4 }]}>
              {language === 'sw' ? 'NJIA ZA HARAKA' : 'QUICK ACTIONS'}
            </Text>
            <View style={styles.tileGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (action.id === 'contracts' && agroId?.tier === 'Free') {
                      router.push('/upgrade' as any);
                    } else {
                      router.push(`/${action.id}` as any);
                    }
                  }}
                  style={styles.tile}
                  accessibilityLabel={`${action.label}. ${action.desc}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.tileIcon, { backgroundColor: action.color + '1F' }]}>
                    {React.cloneElement(action.icon, { color: action.color })}
                  </View>
                  <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Farming Guides / Miongozo ya Kilimo */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginVertical: 8 }}>
            <Text style={[styles.bentoSectionTitle, { color: colors.textMute, marginLeft: 4 }]}>
              {language === 'sw' ? 'MIONGOZO YA KILIMO' : 'FARMING GUIDES'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setActiveGuideStep(0);
                setActiveGuideModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'sw' ? 'Mwongozo wa Kupanda Mahindi' : 'Maize Planting Guide'
              }
              style={[
                styles.guideCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Image
                source={require('../../assets/images/maize_planting_guide.png')}
                style={styles.guideCardImage}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.guideCardContent}>
                <View style={[styles.guideBadge, { backgroundColor: colors.primary }]}>
                  <Sparkles size={10} color="#FCFBF7" />
                  <Text style={styles.guideBadgeText}>TARI RECOMMENDED</Text>
                </View>
                <Text style={styles.guideCardTitle}>
                  {language === 'sw' ? 'Jinsi ya Kupanda Mahindi' : 'How to Plant Maize'}
                </Text>
                <Text style={styles.guideCardDesc}>
                  {language === 'sw'
                    ? 'Mwongozo kamili wa nafasi, kina, mbolea na maandalizi ya udongo.'
                    : 'Full step-by-step guide on spacing, depth, fertilizing and soil prep.'}
                </Text>
                <View style={styles.showStepsBtn}>
                  <Text style={styles.showStepsBtnText}>
                    {language === 'sw' ? 'Onyesha Hatua' : 'Show steps'}
                  </Text>
                  <ArrowRight size={12} color="#000" />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Growth Rate Chart */}
          <GrowthChart colors={colors} isDark={isDark} language={language} />

          {/* Wallet Card - Replaced with Olive Premium card */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Card
              variant="solid"
              style={[
                styles.walletCard,
                { backgroundColor: '#0F4D2A', borderColor: '#0F4D2A', ...shadows.premium },
              ]}
            >
              <View style={styles.walletHeader}>
                <View
                  style={[styles.agroIdBadge, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
                >
                  <Fingerprint size={12} color="#FCFBF7" />
                  <Text style={[styles.agroIdText, { color: '#FCFBF7' }]}>AGRO ID SECURED</Text>
                </View>
                <View style={[styles.mobileMoneyTag, { backgroundColor: colors.primary }]}>
                  <Text style={styles.mobileMoneyText}>
                    {agroId?.mpesaLinked ? 'M-PESA LINKED' : 'LINK M-PESA'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.balanceLabel, { color: 'rgba(252, 251, 247, 0.6)' }]}>
                {language === 'sw' ? 'Akiba Yako (TZS)' : 'Your Savings (TZS)'}
              </Text>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceAmount, { color: '#FCFBF7' }]}>
                  {wallet.balanceTZS.toLocaleString()}
                </Text>
                <Text style={[styles.balanceDecimals, { color: 'rgba(252, 251, 247, 0.6)' }]}>
                  .00
                </Text>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity
                  style={[styles.walletBtn, { backgroundColor: '#FCFBF7' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/agro-id' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Deposit funds"
                >
                  <ArrowDownLeft size={16} color="#080A08" />
                  <Text style={[styles.walletBtnText, { color: '#080A08' }]}>
                    {language === 'sw' ? 'Weka Pesa' : 'Deposit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.walletBtn,
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/wallet-admin' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Pay cooperative dues"
                >
                  <ArrowUpRight size={16} color="#FCFBF7" />
                  <Text style={[styles.walletBtnText, { color: '#FCFBF7' }]}>
                    {language === 'sw' ? 'Lipa Co-op' : 'Pay Co-op'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* Bento Vitals Grid */}
          <View style={styles.bentoSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Afya ya Shamba' : 'Farm Vitals'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/analytics' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="View farm sensors"
              >
                <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>
                  {language === 'sw' ? 'DENSORI →' : 'SENSORS →'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              {FARM_STATS.map((stat) => (
                <View key={stat.id} style={styles.statCardContainer}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (stat.id === 'weather') {
                        router.push('/forecast' as any);
                      } else {
                        router.push('/analytics' as any);
                      }
                    }}
                  >
                    <Card
                      variant="solid"
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: radius.lg,
                          ...shadows.sm,
                        },
                      ]}
                    >
                      <View style={styles.statHeaderRow}>
                        <View style={[styles.statIconBg, { backgroundColor: stat.color + '12' }]}>
                          {stat.icon}
                        </View>
                        <View
                          onTouchStart={() =>
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          }
                        >
                          <MoreHorizontal size={16} color={colors.textMute} />
                        </View>
                      </View>
                      <View style={styles.statMainBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.statValueText, { color: colors.text }]}>
                            {stat.value}
                          </Text>
                          <Text style={[styles.statLabelText, { color: colors.textMute }]}>
                            {stat.label}
                          </Text>
                        </View>
                        {/* Embed Sparklines / mini graphs here */}
                        {stat.chart}
                      </View>
                      <View style={styles.statTrendRow}>
                        <ArrowUpRight size={12} color={colors.primary} />
                        <Text style={[styles.statTrendLabel, { color: colors.primary }]}>
                          {stat.trend}
                        </Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* ASK KILIMO AI LLM WIDGET */}
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={[
              styles.chatWidgetCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.chatWidgetHeader}>
              <BrainCircuit size={20} color={colors.primary} />
              <Text style={[styles.chatWidgetTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Uliza Kilimo AI' : 'Ask Kilimo AI'}
              </Text>
              <Sparkles size={16} color={colors.primary} style={styles.chatWidgetSparkle} />
            </View>

            <Text style={[styles.chatWidgetDesc, { color: colors.textMute }]}>
              {language === 'sw'
                ? 'Uliza lolote kuhusu nitrojeni, wadudu au masoko ya karibu.'
                : 'Ask about Nitrogen levels, disease control, or localized markets.'}
            </Text>

            <View style={styles.suggestionsWrapper}>
              {[
                language === 'sw'
                  ? 'Mbona nitrogen iko chini Zone 42?'
                  : 'Why is Nitrogen low in Zone 42?',
                language === 'sw' ? 'Bei ya mahindi Mbeya?' : 'Maize market price in Mbeya?',
              ].map((query, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setChatInput(query);
                    handleChatWidgetSubmit(query);
                  }}
                  style={[
                    styles.suggestionPill,
                    { backgroundColor: isDark ? '#1C221A' : '#EDF1EC' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask suggestion: ${query}`}
                >
                  <Text style={[styles.suggestionTextText, { color: colors.text }]}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={[
                styles.chatWidgetInputContainer,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <TextInput
                style={[styles.chatWidgetInput, { color: colors.text }]}
                placeholder={language === 'sw' ? 'Uliza Kilimo AI...' : 'Ask Kilimo AI...'}
                placeholderTextColor={colors.textMute}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleChatWidgetSubmit()}
                accessibilityLabel="Ask Kilimo AI Input"
              />
              <TouchableOpacity
                onPress={() => handleChatWidgetSubmit()}
                disabled={chatLoading || !chatInput.trim()}
                style={[
                  styles.chatWidgetSendBtn,
                  { backgroundColor: chatInput.trim() ? colors.primary : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ArrowRight size={18} color={chatInput.trim() ? '#fff' : colors.textMute} />
                )}
              </TouchableOpacity>
            </View>

            {chatReply && (
              <Animated.View
                entering={FadeInDown}
                style={[
                  styles.chatWidgetReply,
                  {
                    backgroundColor: isDark ? '#121711' : '#F6F9F5',
                    borderColor: colors.primary + '20',
                  },
                ]}
              >
                <Text style={[styles.chatWidgetReplyHeader, { color: colors.primary }]}>
                  Kilimo AI:
                </Text>
                <Text style={[styles.chatWidgetReplyText, { color: colors.text }]}>
                  {chatReply}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(tabs)/ai' as any);
                  }}
                  style={styles.chatWidgetReplyAction}
                  accessibilityRole="button"
                  accessibilityLabel="Open in full screen chat"
                >
                  <Text style={[styles.chatWidgetReplyActionText, { color: colors.primary }]}>
                    {language === 'sw' ? 'Fungua Mazungumzo Kamili →' : 'Open Full Chat →'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Daily Organizer — today's tasks at a glance */}
          <DailyOrganizerStrip colors={colors} isDark={isDark} language={language} />

          {/* AI Recommendations */}
          <View style={styles.recSection}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Mapendekezo ya AI' : 'Sankofa AI'}
                </Text>
              </View>
              <Text style={{ color: colors.textMute, fontFamily: 'Inter_700Bold', fontSize: 11 }}>
                {recommendations.length + (weeklyInsight ? 1 : 0)} NEW
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {/* Dynamic Weekly Insights Powered by LLM */}
              {insightLoading && (
                <Card
                  variant="solid"
                  style={[
                    styles.recCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      alignItems: 'center',
                      padding: 20,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={{
                      color: colors.textMute,
                      marginTop: 8,
                      fontSize: 12,
                      fontFamily: 'Inter_500Medium',
                    }}
                  >
                    {language === 'sw'
                      ? 'Inapakia Ushauri wa AI...'
                      : 'Generating Weekly Insights...'}
                  </Text>
                </Card>
              )}

              {weeklyInsight && !insightLoading && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/crop-planning' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Weekly Insight: ${weeklyInsight.title}`}
                  accessibilityHint={weeklyInsight.body}
                >
                  <View style={styles.weeklyHeroCard}>
                    <LinearGradient
                      colors={['#0a2e12', '#063d18', '#022b10']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.weeklyHeroBubble1} />
                    <View style={styles.weeklyHeroBubble2} />
                    <View style={styles.weeklyHeroBadgeRow}>
                      <View style={styles.weeklyHeroAiBadge}>
                        <Sparkles size={10} color={colors.primary} />
                        <Text style={styles.weeklyHeroAiBadgeText}>AI ENGINE V4.5</Text>
                      </View>
                      <View style={styles.weeklyHeroLivePill}>
                        <Text style={styles.weeklyHeroLiveText}>LIVE</Text>
                      </View>
                    </View>
                    <Text style={styles.weeklyHeroTitle}>{weeklyInsight.title}</Text>
                    <Text style={styles.weeklyHeroBody}>{weeklyInsight.body}</Text>
                    <View style={styles.weeklyHeroFooter}>
                      <Text style={styles.weeklyHeroSource} numberOfLines={1}>
                        {language === 'sw'
                          ? `Chanzo: ${weeklyInsight.source}`
                          : `Source: ${weeklyInsight.source}`}
                      </Text>
                      <View style={styles.weeklyHeroCtaBtn}>
                        <Text style={styles.weeklyHeroCtaText}>
                          {language === 'sw' ? 'Angalia' : 'Explore'}
                        </Text>
                        <ArrowUpRight size={12} color={colors.primary} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}

              {/* Regular Static/Rule-based recommendations */}
              {recommendations.map((rec) => {
                const col = severityColor(rec.severity);
                const CatIcon = (() => {
                  switch (rec.category) {
                    case 'irrigation':
                      return Droplets;
                    case 'market':
                      return TrendingUp;
                    case 'pest':
                      return ShieldAlert;
                    case 'soil':
                      return Leaf;
                    case 'finance':
                      return BarChart3;
                    case 'weather':
                      return Cloud;
                    case 'planning':
                      return Target;
                    default:
                      return Lightbulb;
                  }
                })();
                const sevLabel =
                  rec.severity === 'urgent'
                    ? language === 'sw'
                      ? 'DHARURA'
                      : 'URGENT'
                    : rec.severity === 'opportunity'
                      ? language === 'sw'
                        ? 'FURSA'
                        : 'OPP'
                      : language === 'sw'
                        ? 'HABARI'
                        : 'INFO';
                return (
                  <Pressable
                    key={rec.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(rec.cta.route as any);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={rec.title}
                    accessibilityHint={rec.cta.label}
                  >
                    <View
                      style={[
                        styles.recCardNew,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <LinearGradient
                        colors={[col + '22', col + '08', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      />
                      <View style={styles.recCardTopRow}>
                        <View style={[styles.recIconSquare, { backgroundColor: col + '25' }]}>
                          <CatIcon size={16} color={col} />
                        </View>
                        <Text style={[styles.recCatNew, { color: col }]}>
                          {rec.category.toUpperCase()}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <View
                          style={[
                            styles.recSeverityPill,
                            { backgroundColor: col + '18', borderColor: col + '35' },
                          ]}
                        >
                          <Text style={[styles.recSeverityText, { color: col }]}>{sevLabel}</Text>
                        </View>
                      </View>
                      <Text style={[styles.recTitleNew, { color: colors.text }]}>{rec.title}</Text>
                      <Text style={[styles.recBodyNew, { color: colors.textMute }]}>
                        {rec.body}
                      </Text>
                      <View style={styles.recCtaRow}>
                        <View style={{ flex: 1 }} />
                        <View
                          style={[
                            styles.recCtaChip,
                            { backgroundColor: col + '18', borderColor: col + '35' },
                          ]}
                        >
                          <Text style={[styles.recCtaLabel, { color: col }]}>{rec.cta.label}</Text>
                          <ChevronRight size={11} color={col} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Farming Guide Modal ────────────────────────────── */}
      <Modal
        visible={activeGuideModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveGuideModal(false)}
      >
        <View style={styles.guideModalContainer}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          <View
            style={[
              styles.guideModalContent,
              { backgroundColor: isDark ? '#0c0f0a' : '#FCFBF7', borderColor: colors.border },
            ]}
          >
            {/* Header */}
            <View style={styles.guideModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Leaf size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.guideModalTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Kupanda Mahindi' : 'Maize Planting Guide'}
                  </Text>
                  <Text style={[styles.guideModalSub, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Mwongozo wa Kilimo wa TARI' : 'TARI Agronomy Guideline'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setActiveGuideModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close Guide"
                style={[styles.guideModalCloseBtn, { borderColor: colors.border }]}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Steps Progress Indicator */}
            <View style={styles.guideStepIndicatorRow}>
              {[0, 1, 2, 3].map((step) => {
                const isCompleted = activeGuideStep > step;
                const isActive = activeGuideStep === step;
                return (
                  <View
                    key={step}
                    style={[
                      styles.guideStepDot,
                      {
                        backgroundColor: isCompleted
                          ? colors.primary
                          : isActive
                            ? colors.primary
                            : isDark
                              ? '#2D352B'
                              : '#E2E8DF',
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        marginHorizontal: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Active Step Panel */}
            <View style={styles.guideStepContent}>
              {activeGuideStep === 0 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.guideStepSlide}
                >
                  {/* Visual animation - compost pile pulsing */}
                  <Step1SoilPrepAnimation />
                  <Text style={[styles.guideStepNumText, { color: colors.primary }]}>
                    HATUA YA 1: MAANDALIZI YA UDONGO
                  </Text>
                  <Text style={[styles.guideStepTitle, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Kutayarisha Udongo & Rutuba'
                      : 'Soil Preparation & Tillage'}
                  </Text>
                  <Text style={[styles.guideStepBody, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Tayarisha shamba lako wiki 2-3 kabla ya msimu wa mvua kuanza ili kuruhusu udongo kupumua. Palilia na utishe udongo vizuri kwa kina cha kutosha. Changanya samadi au mboji tani 8-16 kwa hekta kuboresha unyevu na muundo wa udongo.'
                      : 'Tillage and prepare your field 2-3 weeks before the onset of rains to allow aeration. Weed and loosen the soil. Incorporate 8-16 tonnes of compost or farmyard manure per hectare to enhance organic content.'}
                  </Text>
                </Animated.View>
              )}

              {activeGuideStep === 1 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.guideStepSlide}
                >
                  {/* Visual animation - seed dropping */}
                  <Step2SpacingAnimation />
                  <Text style={[styles.guideStepNumText, { color: colors.primary }]}>
                    HATUA YA 2: NAFASI NA KINA YA UPANDAJI
                  </Text>
                  <Text style={[styles.guideStepTitle, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Nafasi ya Kupanda & Mbegu'
                      : 'Planting Spacing & Seed Rate'}
                  </Text>
                  <Text style={[styles.guideStepBody, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Chimba mashimo yenye kina cha sm 2-5. Weka nafasi ya sm 75 kati ya mistari ya mashimo na sm 25-30 kutoka shimo hadi shimo ndani ya mstari mmoja. Panda mbegu 2 kwa kila shimo; baadaye utapunguza na kubakiza mmea mmoja wenye nguvu.'
                      : 'Dig planting holes at a depth of 2-5 cm. Space them exactly 75 cm between rows and 25-30 cm between plants within each row. Place 2 seeds per hole, then thin to 1 strong plant after germination.'}
                  </Text>
                </Animated.View>
              )}

              {activeGuideStep === 2 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.guideStepSlide}
                >
                  {/* Visual animation - fertilizer placement */}
                  <Step3BasalFertilizerAnimation />
                  <Text style={[styles.guideStepNumText, { color: colors.primary }]}>
                    HATUA YA 3: MBOLEA YA AWALI (BASAL)
                  </Text>
                  <Text style={[styles.guideStepTitle, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Uwekaji wa Mbolea ya Kwanza'
                      : 'Basal Fertilizer Placement'}
                  </Text>
                  <Text style={[styles.guideStepBody, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Weka mbolea yenye Fosforasi (kama DAP, NPK 17-17-17, au Minjingu Nafaka) wakati wa kupanda. Weka kwenye shimo umbali wa sm 5 pembeni mwa mbegu na ufunike kwa udongo kabla ya kuweka mbegu ili kuzuia mizizi kuungua.'
                      : 'Apply a phosphorus-rich fertilizer (like DAP, NPK 17-17-17, or Minjingu Nafaka) at planting. Place the fertilizer in a hole 5 cm away from the seed and cover with soil first to prevent direct seed contact.'}
                  </Text>
                </Animated.View>
              )}

              {activeGuideStep === 3 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.guideStepSlide}
                >
                  {/* Visual animation - growing maize shoot */}
                  <Step4GrowingSproutAnimation />
                  <Text style={[styles.guideStepNumText, { color: colors.primary }]}>
                    HATUA YA 4: PALIZI NA MBOLEA YA JUU
                  </Text>
                  <Text style={[styles.guideStepTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Kupalilia & Uwekaji wa Urea' : 'Weeding & Top-Dressing'}
                  </Text>
                  <Text style={[styles.guideStepBody, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Palilia shamba ndani ya wiki 2-3 baada ya kuota ili kuzuia magugu. Wiki ya 4-6 (urefu wa goti), weka mbolea ya Nitrojeni kama Urea au CAN (kilo 50 kwa ekari). Weka wakati udongo una unyevu na baada tu ya kupalilia.'
                      : 'Weed the field 2-3 weeks post-germination. At week 4-6 (knee-high stage), apply nitrogen top-dressing such as Urea or CAN (50kg/acre). Ensure application is done immediately after weeding on moist soils.'}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.guideModalFooter}>
              {activeGuideStep > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveGuideStep((prev) => prev - 1);
                  }}
                  style={[styles.guideFooterBtnSec, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Text style={[styles.guideFooterBtnTextSec, { color: colors.text }]}>
                    {language === 'sw' ? 'Nyuma' : 'Back'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {activeGuideStep < 3 ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveGuideStep((prev) => prev + 1);
                  }}
                  style={[styles.guideFooterBtnPrim, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                >
                  <Text
                    style={[styles.guideFooterBtnTextPrim, { color: isDark ? '#000' : '#FCFBF7' }]}
                  >
                    {language === 'sw' ? 'Mbele' : 'Next'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    // Add planting tasks to task list!
                    createTask({
                      title: 'Maize Planting: Land Preparation (TARI Guide)',
                      titleSw: 'Upandaji Mahindi: Maandalizi ya Udongo',
                      category: 'planting',
                      priority: 'high',
                      status: 'pending',
                      xpReward: 25,
                      dueDate: new Date(Date.now() + 24 * 3600_000).toISOString(),
                    });
                    createTask({
                      title: 'Maize Planting: Basal DAP/NPK Application',
                      titleSw: 'Upandaji Mahindi: Kuweka Mbolea ya DAP/NPK',
                      category: 'planting',
                      priority: 'high',
                      status: 'pending',
                      xpReward: 30,
                      dueDate: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
                    });
                    createTask({
                      title: 'Maize Care: Weed Field and Apply Urea/CAN (Week 4)',
                      titleSw: 'Matunzo ya Mahindi: Palizi na Urea/CAN',
                      category: 'scouting',
                      priority: 'critical',
                      status: 'pending',
                      xpReward: 40,
                      dueDate: new Date(Date.now() + 28 * 24 * 3600_000).toISOString(),
                    });

                    addNotification({
                      title:
                        language === 'sw'
                          ? '📅 Ratiba ya Mahindi Imewekwa'
                          : '📅 Maize Schedule Configured',
                      body:
                        language === 'sw'
                          ? 'Kazi 3 za miongozo ya TARI zimeongezwa kwenye ratiba yako!'
                          : '3 tasks from TARI planting guides have been added to your schedule!',
                      type: 'success',
                    });

                    setActiveGuideModal(false);
                    Alert.alert(
                      language === 'sw' ? 'Kazi Zimeongezwa!' : 'Tasks Scheduled!',
                      language === 'sw'
                        ? 'Ratiba ya kazi za kupanda mahindi kulingana na TARI imeongezwa kwenye ukurasa wako wa Kazi.'
                        : 'A schedule of maize planting tasks matching TARI guidelines has been added to your Tasks tab.',
                      [{ text: 'Sawa' }]
                    );
                  }}
                  style={[styles.guideFooterBtnPrim, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add to Tasks"
                >
                  <Text
                    style={[styles.guideFooterBtnTextPrim, { color: isDark ? '#000' : '#FCFBF7' }]}
                  >
                    {language === 'sw' ? 'Weka Kazi' : 'Schedule Tasks'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Gate Overlay */}
      {agroId?.verificationStatus !== 'verified' && !dismissedActivation && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
              zIndex: 1000,
              backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
            },
          ]}
        >
          {/* Card containing the scanner and details */}
          <Card
            variant="solid"
            style={{
              width: '100%',
              maxWidth: 360,
              padding: 24,
              borderColor: colors.border,
              backgroundColor: colors.card,
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Holographic Laser Scanner Line (only active when activatingHome is true) */}
            {activatingHome && (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: '#22c55e',
                    shadowColor: '#22c55e',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 5,
                    zIndex: 10,
                  },
                  animatedLaserStyle,
                ]}
              />
            )}

            <View style={{ marginBottom: 20, alignItems: 'center', width: '100%' }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: colors.primary + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Fingerprint size={36} color={colors.primary} />
              </View>
              <Text
                style={{
                  fontFamily: 'Inter_800ExtraBold',
                  fontSize: 20,
                  color: colors.text,
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {language === 'sw' ? 'Uhakiki wa Kitambulisho' : 'Identity Verification'}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: colors.textMute,
                  textAlign: 'center',
                  lineHeight: 18,
                }}
              >
                {language === 'sw'
                  ? 'Akaunti yako haijawashwa. Tafadhali bonyeza kitufe hapa chini ili kukagua na kuamsha Kitambulisho chako cha Agro ID.'
                  : 'Your account is pending activation. Click below to scan and activate your digital Agro ID.'}
              </Text>
            </View>

            {/* Spinner or progress */}
            {activatingHome ? (
              <View style={{ alignItems: 'center', marginVertical: 20, width: '100%' }}>
                {activationFinished ? (
                  <Animated.View
                    entering={FadeInDown}
                    style={{ alignItems: 'center', width: '100%' }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#22c55e20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Check size={28} color="#22c55e" />
                    </View>
                    <Text
                      style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 14,
                        color: '#22c55e',
                        textAlign: 'center',
                      }}
                    >
                      {language === 'sw' ? 'Imewezeshwa!' : 'Activated Successfully!'}
                    </Text>
                  </Animated.View>
                ) : (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 13,
                        color: colors.textMute,
                        marginTop: 12,
                        textAlign: 'center',
                      }}
                    >
                      {language === 'sw' ? 'Kuhakiki kitambulisho...' : 'Verifying credentials...'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ width: '100%', gap: 12 }}>
                {/* Show details of their entered document */}
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 11,
                      color: colors.textMute,
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {language === 'sw' ? 'Hati Iliyosajiliwa' : 'Registered Document'}
                  </Text>
                  <Text
                    style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: colors.text }}
                  >
                    {agroId?.nationalId
                      ? `NIDA: ${agroId.nationalId}`
                      : agroId?.tinNumber
                        ? `TIN: ${agroId.tinNumber}`
                        : agroId?.businessLicense
                          ? `LICENSE: ${agroId.businessLicense}`
                          : 'NO ID REGISTERED'}
                  </Text>
                </View>

                <Button
                  label={language === 'sw' ? 'Anza Uhakiki wa Agro ID' : 'Begin Agro ID Activation'}
                  onPress={handleActivateHome}
                  style={{ width: '100%' }}
                />
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDismissedActivation(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'sw' ? 'Baadaye' : 'Later'}
                  style={{ marginTop: 14, paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 14,
                      color: colors.textMute,
                      textAlign: 'center',
                    }}
                  >
                    {language === 'sw' ? 'Baadaye' : 'Later'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guideStepDot: {},
  scrollContent: { paddingTop: 0, paddingBottom: 120 },

  // Hero Styles
  heroWrapper: {
    height: 390,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  markerLabelContainer: {
    position: 'absolute',
    zIndex: 2,
  },
  markerLabelTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  markerLabelSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  markerLineH: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 1,
  },
  markerLineV: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 1,
  },
  markerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    zIndex: 3,
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 36,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroActionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNotificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
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
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  offlineText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },

  // Crop overlay panel
  heroCropPanel: {
    paddingHorizontal: 16,
  },
  cropTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cropLabel: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  dotContainer: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveOuterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    position: 'absolute',
  },
  liveInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  cropSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cropName: {
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  slideshowIndicator: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  slideshowIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  harvestTimeline: {
    marginTop: 2,
  },
  timelineTexts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineLeft: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  timelineRight: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FFFFFF',
  },
  timelineProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  timelineProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Main scroll content below header
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  // RAG Search Bar Styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    height: 56,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  searchBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  searchAiBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  searchDivider: {
    width: 1,
    height: 16,
    opacity: 0.5,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  searchClearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchReturnHint: {
    width: 26,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchReturnHintText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  searchLoadingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  searchResultCard: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    gap: 8,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchResultTitle: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  searchResultBody: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  citedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  citedText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },

  // Track Records Stepper Styles — redesigned
  trackCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 0,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.2,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.25)',
  },
  trackProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 12,
    overflow: 'hidden',
  },
  trackProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2E6F40',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trackRowLeft: {
    width: 36,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  trackRowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  trackRowLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginTop: 6,
    minHeight: 16,
  },
  trackRowContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
    gap: 4,
  },
  trackRowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  trackRowDateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackRowDateText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  trackRowStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  trackRowStatusText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  trackRowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  trackRowSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  trackExpanded: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  trackExpandedBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  trackExpandedBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
  },

  // ── Crop Value Card Styles ─────────────────────────────────────────────────
  cropValueCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    marginTop: 10,
  },
  cropValueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cropValueTitle: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
  },
  cropValueFieldBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  cropValueFieldText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  cropHealthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  cropHealthText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  cropValueStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 14,
    gap: 12,
  },
  cropValueStatCol: {
    flex: 1,
  },
  cropValueDivider: {
    width: 1,
    borderRadius: 1,
  },
  cropValueStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cropValueStatBig: {
    fontSize: 28,
    fontFamily: 'InstrumentSerif_400Regular',
    lineHeight: 30,
  },
  cropValueStatUnit: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 32,
  },
  cropValueStatSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  cropValueCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cropValueCountdownLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cropValueCountdownNum: {
    fontSize: 34,
    fontFamily: 'InstrumentSerif_400Regular',
    lineHeight: 38,
  },
  cropValueCountdownLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  cropValueCountdownSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  cropValueLaborBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  cropValueLaborText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  cropValueTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  cropValueTipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  cropValueFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  cropValueCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  cropValueCtaText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
  },

  // ── Daily Organizer Strip Styles ───────────────────────────────────────────
  organizerCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 10,
  },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 10,
  },
  organizerTitle: {
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  organizerBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  organizerBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  organizerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    paddingTop: 6,
  },
  organizerEmptyText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  organizerList: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  organizerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerTaskTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  organizerTaskSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  organizerPriorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  organizerDueText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  organizerFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    margin: 12,
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  organizerFooterText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
  },

  // Quick Action List Styles
  bentoSectionTitle: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 88,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },

  // Growth Chart Styles
  chartCard: {
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartSub: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  chartValue: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  chartUnit: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  rangeSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rangeText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    marginTop: 8,
  },
  chartBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarBackground: {
    width: 8,
    height: 86,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
  },

  // Wallet Card Styles
  walletCard: {
    padding: 18,
    borderRadius: 28,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  agroIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  agroIdText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  mobileMoneyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mobileMoneyText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  balanceDecimals: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 10,
  },
  walletBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  walletBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },

  // Bento Stats Styles
  bentoSection: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCardContainer: {
    width: (SCREEN_WIDTH - 42) / 2,
  },
  statCard: {
    padding: 14,
    borderWidth: 1,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statMainBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValueText: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  statLabelText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  statTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
  },
  statTrendLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  miniChartContainer: {
    width: 60,
    height: 30,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 6,
  },
  miniBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 50,
    height: 30,
    paddingHorizontal: 2,
    marginLeft: 6,
  },

  // Ask Kilimo AI Widget Styles
  chatWidgetCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  chatWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatWidgetTitle: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.2,
  },
  chatWidgetSparkle: {
    marginLeft: 'auto',
  },
  chatWidgetDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  suggestionTextText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  chatWidgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    height: 48,
    marginTop: 4,
  },
  chatWidgetInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  chatWidgetSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatWidgetReply: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
    gap: 6,
  },
  chatWidgetReplyHeader: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  chatWidgetReplyText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  chatWidgetReplyAction: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatWidgetReplyActionText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },

  // AI Recs Styles
  recSection: {
    marginTop: 4,
  },
  recCard: {
    padding: 14,
    paddingLeft: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  weeklyInsightBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weeklyInsightSource: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#8b5cf6',
    marginTop: 8,
  },
  recCat: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 2,
  },
  recTitle: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 2,
  },
  recBody: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  // ── Weekly Insight Hero Card ──────────────────────────────
  weeklyHeroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
    paddingBottom: 16,
    minHeight: 210,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  weeklyHeroBubble1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 111, 64,0.07)',
    top: -70,
    right: -50,
  },
  weeklyHeroBubble2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(46, 111, 64,0.05)',
    bottom: -40,
    left: 10,
  },
  weeklyHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weeklyHeroAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46, 111, 64,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  weeklyHeroAiBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
    letterSpacing: 0.8,
  },
  weeklyHeroLivePill: {
    backgroundColor: '#2E6F40',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  weeklyHeroLiveText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 1.2,
  },
  weeklyHeroTitle: {
    fontSize: 22,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
  },
  weeklyHeroBody: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
    marginBottom: 18,
  },
  weeklyHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyHeroSource: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.35)',
    flex: 1,
  },
  weeklyHeroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 111, 64,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.32)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  weeklyHeroCtaText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
    letterSpacing: 0.4,
  },
  // ── Regular Rec Card Redesign ─────────────────────────────
  recCardNew: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recIconSquare: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recCatNew: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.1,
  },
  recSeverityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  recSeverityText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.9,
  },
  recTitleNew: {
    fontSize: 17,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 6,
    lineHeight: 22,
  },
  recBodyNew: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
    marginBottom: 14,
  },
  recCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recCtaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  recCtaLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },

  // Guide Card Styles
  guideCard: {
    borderRadius: 24,
    height: 220,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  guideCardImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  guideCardContent: {
    zIndex: 2,
    gap: 6,
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  guideBadgeText: {
    color: '#FCFBF7',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  guideCardTitle: {
    color: '#FCFBF7',
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  guideCardDesc: {
    color: 'rgba(252,251,247,0.8)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },

  // Guide Modal Styles
  guideModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideModalContent: {
    width: SCREEN_WIDTH * 0.9,
    borderRadius: 36,
    borderWidth: 1.5,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  guideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideModalTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  guideModalSub: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  guideModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideStepIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginVertical: 4,
  },
  guideStepContent: {
    minHeight: 280,
    justifyContent: 'center',
  },
  guideStepSlide: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  animationContainer: {
    height: 100,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  animatedCompostCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedSoilLayer: {
    height: 60,
    width: 200,
    borderBottomWidth: 4,
    borderColor: '#8B5A2B',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacingIndicatorLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    height: 2,
    backgroundColor: '#3b82f6',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  spacingIndicatorText: {
    position: 'absolute',
    bottom: 26,
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  animatedSeed: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    bottom: 10,
  },
  fertilizerPlacementDiagram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 200,
    borderBottomWidth: 4,
    borderColor: '#8B5A2B',
    position: 'relative',
  },
  animatedSeedStatic: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 40,
  },
  animatedFertilizerStatic: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fertilizerOffsetLine: {
    position: 'absolute',
    left: 88,
    right: 76,
    bottom: 14,
    height: 1,
    backgroundColor: '#ef4444',
  },
  fertilizerOffsetText: {
    position: 'absolute',
    bottom: 20,
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  growingMaizeContainer: {
    height: 80,
    width: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  maizeShootStem: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  maizeShootLeaf1: {
    position: 'absolute',
    width: 20,
    height: 8,
    borderRadius: 4,
    transform: [{ rotate: '-30deg' }],
    bottom: 28,
    left: 18,
  },
  maizeShootLeaf2: {
    position: 'absolute',
    width: 20,
    height: 8,
    borderRadius: 4,
    transform: [{ rotate: '30deg' }],
    bottom: 34,
    right: 18,
  },
  guideStepNumText: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1,
  },
  guideStepTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  guideStepBody: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.85,
  },
  guideModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  guideFooterBtnPrim: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  guideFooterBtnTextPrim: {
    fontSize: 14,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  guideFooterBtnSec: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  guideFooterBtnTextSec: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  scanOuterRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  noCropCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 10,
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 8,
  },
  noCropWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  noCropWarningBadgeText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0.5,
  },
  noCropTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
  },
  noCropDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  noCropActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    marginTop: 4,
  },
  noCropActionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  showStepsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FCFBF7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  showStepsBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },

  // ── Weather Widget ──
  wxCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  wxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wxLoc: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wxLocText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  wxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 3,
  },
  wxBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wxTempRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wxBigTemp: {
    fontSize: 60,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -2,
    lineHeight: 64,
  },
  wxDeg: { fontSize: 24, fontFamily: 'InstrumentSerif_400Regular', marginTop: 8, marginLeft: 2 },
  wxCond: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 4 },
  wxIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  wxBarWrap: {
    height: 10,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 2,
  },
  wxBar: { height: 10, borderRadius: 5 },
  wxBarThumb: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
    marginLeft: -8,
  },
  wxHour: { alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  wxHourTime: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  wxHourTemp: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  wxStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  wxStat: { flex: 1, alignItems: 'center', gap: 3 },
  wxStatDiv: { width: 1, height: 32, marginHorizontal: 2 },
  wxStatVal: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  wxStatLbl: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 12 },
});
