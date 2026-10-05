import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Combine,
  Sprout,
  Droplets,
  FlaskConical,
  Maximize2,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { ZONES } from '../../constants/FarmData';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Polyline,
  Path,
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Polygon as SvgPolygon,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration — an unguarded 0 here flowed into negative <Svg> widths
// downstream (both the gauge size and the chart width derive from SW).
const SW = Dimensions.get('window').width || 360;
const GAUGE_SIZE = Math.min(100, Math.floor((SW - 96) / 3));

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function NutrientGauge({
  letter,
  labelSw,
  labelEn,
  data,
  language,
  colors,
}: {
  letter: string;
  labelSw: string;
  labelEn: string;
  data: { statusEn: string; statusSw: string; value: string; color: string };
  language: string;
  colors: any;
}) {
  const S = GAUGE_SIZE;
  const STROKE = 9;
  const R = (S - STROKE) / 2;
  const CX = S / 2;
  const CY = S / 2;
  const START = 135;
  const SWEEP = 270;
  const pct = parseInt(data.value, 10) / 100;

  const bgStart = polarToXY(CX, CY, R, START);
  const bgEnd = polarToXY(CX, CY, R, START + SWEEP);
  const bgPath = `M ${bgStart.x.toFixed(2)} ${bgStart.y.toFixed(2)} A ${R} ${R} 0 1 1 ${bgEnd.x.toFixed(2)} ${bgEnd.y.toFixed(2)}`;

  const progAngle = START + SWEEP * pct;
  const progEnd = polarToXY(CX, CY, R, progAngle);
  const largeArc = SWEEP * pct > 180 ? 1 : 0;
  const progPath =
    pct > 0.01
      ? `M ${bgStart.x.toFixed(2)} ${bgStart.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${progEnd.x.toFixed(2)} ${progEnd.y.toFixed(2)}`
      : '';

  return (
    <View style={gaugeStyles.wrap}>
      <Svg width={S} height={S}>
        <Path
          d={bgPath}
          stroke={colors.border}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />
        {pct > 0.01 && (
          <Path
            d={progPath}
            stroke={data.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <SvgCircle cx={CX} cy={CY} r={R - STROKE / 2 - 2} fill={data.color + '0e'} />
        <SvgText
          x={CX}
          y={CY - 5}
          textAnchor="middle"
          fontSize={Math.round(S * 0.22)}
          fontFamily="Inter_800ExtraBold"
          fill={data.color}
        >
          {letter}
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 12}
          textAnchor="middle"
          fontSize={Math.round(S * 0.14)}
          fontFamily="Inter_700Bold"
          fill={colors.textMute}
        >
          {data.value}
        </SvgText>
      </Svg>
      <Text style={[gaugeStyles.name, { color: colors.text }]} numberOfLines={1}>
        {language === 'sw' ? labelSw : labelEn}
      </Text>
      <View
        style={[
          gaugeStyles.pill,
          { backgroundColor: data.color + '18', borderColor: data.color + '44' },
        ]}
      >
        <Text style={[gaugeStyles.pillText, { color: data.color }]}>
          {language === 'sw' ? data.statusSw : data.statusEn}
        </Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
});

const HISTORICAL_DATA = [
  { month: 'Jan', val: 0.3 },
  { month: 'Feb', val: 0.45 },
  { month: 'Mar', val: 0.6 },
  { month: 'Apr', val: 0.8 },
  { month: 'May', val: 0.85 },
  { month: 'Jun', val: 0.75 },
];

function NDVIChart({ colors }: { colors: any }) {
  const W = SW - 64;
  const H = 110;
  const PAD = { l: 28, r: 12, t: 12, b: 24 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const pts = HISTORICAL_DATA.map((d, i) => ({
    x: PAD.l + (i / (HISTORICAL_DATA.length - 1)) * innerW,
    y: PAD.t + (1 - d.val) * innerH,
    val: d.val,
    month: d.month,
  }));

  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${pts[0].x},${PAD.t + innerH}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${PAD.t + innerH}`,
  ].join(' ');

  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="ndviArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2E6F40" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#2E6F40" stopOpacity="0.01" />
        </SvgGradient>
      </Defs>
      {[0.25, 0.5, 0.75, 1.0].map((v) => {
        const y = PAD.t + (1 - v) * innerH;
        return (
          <React.Fragment key={v}>
            <SvgLine
              x1={PAD.l}
              y1={y}
              x2={W - PAD.r}
              y2={y}
              stroke={colors.border}
              strokeWidth="0.7"
            />
            <SvgText
              x={PAD.l - 4}
              y={y + 3}
              fontSize="7"
              fill={colors.textMute}
              textAnchor="end"
              fontFamily="Inter_500Medium"
            >
              {v.toFixed(2)}
            </SvgText>
          </React.Fragment>
        );
      })}
      <SvgPolygon points={areaPoints} fill="url(#ndviArea)" />
      <Polyline
        points={linePoints}
        fill="none"
        stroke="#2E6F40"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <SvgCircle cx={p.x} cy={p.y} r="4" fill="#2E6F40" stroke="#FFF" strokeWidth="1.5" />
          <SvgText
            x={p.x}
            y={H - 6}
            fontSize="7.5"
            fill={colors.textMute}
            textAnchor="middle"
            fontFamily="Inter_500Medium"
          >
            {p.month}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

export default function FieldDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);

  const zone = ZONES.find((z) => z.id === Number(id));

  if (!zone) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text
          style={{ color: colors.text, fontFamily: 'InstrumentSerif_400Regular', fontSize: 24 }}
        >
          Field Not Found
        </Text>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Text style={{ color: colors.primary, marginTop: 16, fontFamily: 'Inter_700Bold' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWarning = zone.alertType === 'warning';
  const productivityColor =
    zone.productivity === 'High'
      ? '#2E6F40'
      : zone.productivity === 'Average'
        ? '#F59E0B'
        : '#ef4444';

  const handleVraSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/vra-setup?zoneId=${zone.id}` as any);
  };

  const nutrients = [
    {
      letter: 'N',
      labelEn: 'Nitrogen',
      labelSw: 'Nitrojeni',
      data: zone.nitrogen,
    },
    {
      letter: 'P',
      labelEn: 'Phosphorus',
      labelSw: 'Fosforasi',
      data: zone.phosphorus,
    },
    {
      letter: 'K',
      labelEn: 'Potassium',
      labelSw: 'Potasiamu',
      data: zone.potassium,
    },
  ];

  const stats = [
    {
      icon: <Maximize2 size={14} color={colors.primary} />,
      labelSw: 'UKUSWA',
      labelEn: 'AREA',
      value: zone.area,
    },
    {
      icon: <TrendingUp size={14} color="#3b82f6" />,
      labelSw: 'NDVI',
      labelEn: 'NDVI',
      value: String(zone.ndvi),
    },
    {
      icon: <FlaskConical size={14} color="#F59E0B" />,
      labelSw: 'PH',
      labelEn: 'PH',
      value: String(zone.ph),
    },
    {
      icon: <Droplets size={14} color="#06b6d4" />,
      labelSw: 'UNYEVU',
      labelEn: 'MOISTURE',
      value: zone.moisture,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <LinearGradient
          colors={isDark ? ['#071c0d', '#0d2e14', '#0f3a18'] : ['#0a3d18', '#1a5c28', '#0d2e14']}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']} style={{ width: '100%' }}>
            <View style={styles.heroNav}>
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                style={styles.backBtn}
              >
                <ArrowLeft color="#FFF" size={20} />
              </TouchableOpacity>
              <View style={[styles.productivityRing, { borderColor: productivityColor + '60' }]}>
                <Text style={[styles.productivityPct, { color: productivityColor }]}>
                  {zone.ndvi}
                </Text>
                <Text style={[styles.productivityLabel, { color: productivityColor + 'aa' }]}>
                  NDVI
                </Text>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.heroBody}>
            <View style={styles.heroBadge}>
              <Sprout size={10} color="#2E6F40" />
              <Text style={styles.heroBadgeText}>
                {language === 'sw' ? 'UCHAGUZI WA BASA' : 'FIELD SELECTION'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{language === 'sw' ? zone.nameSw : zone.nameEn}</Text>
            <View style={styles.heroStatusRow}>
              {isWarning ? (
                <AlertTriangle size={12} color="#F59E0B" />
              ) : (
                <Sprout size={12} color="#2E6F40" />
              )}
              <Text style={[styles.heroStatus, { color: isWarning ? '#F59E0B' : '#2E6F40' }]}>
                {language === 'sw' ? zone.messageSw : zone.messageEn}
              </Text>
            </View>
          </View>

          <LinearGradient colors={['transparent', colors.background]} style={styles.heroFade} />
        </LinearGradient>

        {/* ── Stats Strip (overlaps hero) ──────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(80)} style={styles.statsStrip}>
          <View
            style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {stats.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                )}
                <View style={styles.statCell}>
                  <View style={styles.statIcon}>{s.icon}</View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? s.labelSw : s.labelEn}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* ── Nutrient Analysis ─────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(160)}>
            <View style={styles.sectionHeader}>
              <Sprout size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Uchambuzi wa Virutubisho' : 'Nutrient Analysis'}
              </Text>
            </View>

            <View
              style={[
                styles.nutrientCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Gauge header strip */}
              <LinearGradient
                colors={['#2E6F400a', 'transparent']}
                style={styles.nutrientGaugeHeader}
              >
                <Text style={[styles.nutrientHeaderLabel, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Virutubisho vya Udongo — NPK'
                    : 'Soil Nutrient Levels — NPK'}
                </Text>
              </LinearGradient>

              {/* Three arc gauges */}
              <View style={styles.gaugesRow}>
                {nutrients.map((n) => (
                  <NutrientGauge
                    key={n.letter}
                    letter={n.letter}
                    labelSw={n.labelSw}
                    labelEn={n.labelEn}
                    data={n.data}
                    language={language}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Footer link */}
              <TouchableOpacity
                style={[styles.nutrientMore, { borderTopColor: colors.border }]}
                onPress={() => router.push('/soil-analysis' as any)}
              >
                <Text style={[styles.nutrientMoreText, { color: colors.primary }]}>
                  {language === 'sw' ? 'Gusa kwa maelezo zaidi' : 'Tap for full soil analysis'}
                </Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── NDVI Timeline ─────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(240)}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color="#3b82f6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Mwenendo wa NDVI' : 'NDVI Timeline'}
              </Text>
              <View style={[styles.ndviBadge, { backgroundColor: '#3b82f620' }]}>
                <Text style={styles.ndviBadgeText}>6 {language === 'sw' ? 'Miezi' : 'Months'}</Text>
              </View>
            </View>

            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <NDVIChart colors={colors} />
              <Text style={[styles.chartFootnote, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'NDVI inayozidi 0.7 inaonyesha afya bora ya mazao'
                  : 'NDVI above 0.7 indicates excellent crop health'}
              </Text>
            </View>
          </Animated.View>

          {/* ── Crop Info Strip ───────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(320)}>
            <LinearGradient
              colors={['#2E6F4018', '#2E6F4006']}
              style={[styles.cropStrip, { borderColor: '#2E6F4030' }]}
            >
              <Sprout size={20} color="#2E6F40" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cropStripLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'Zao linalolimwa' : 'Current Crop'}
                </Text>
                <Text style={[styles.cropStripValue, { color: colors.text }]}>
                  {language === 'sw' ? zone.cropSw : zone.cropEn}
                </Text>
              </View>
              <View
                style={[
                  styles.productivityChip,
                  {
                    backgroundColor: productivityColor + '22',
                    borderColor: productivityColor + '44',
                  },
                ]}
              >
                <Text style={[styles.productivityChipText, { color: productivityColor }]}>
                  {language === 'sw' ? zone.productivitySw : zone.productivity}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ── Floating CTA ──────────────────────────────────────────── */}
      <View
        style={[
          styles.floatingBar,
          { backgroundColor: colors.background + 'f0', borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85} onPress={handleVraSetup}>
          <LinearGradient
            colors={['#2E6F40', '#18a847']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Combine color="#FFF" size={20} />
            <Text style={styles.ctaBtnText}>
              {language === 'sw' ? 'Sanidi VRA (Matumizi Mbadala)' : 'Set Up VRA Protocol'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    width: '100%',
    minHeight: 260,
    justifyContent: 'flex-end',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productivityRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  productivityPct: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    lineHeight: 16,
  },
  productivityLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  heroBody: {
    paddingHorizontal: 20,
    paddingBottom: 44,
    paddingTop: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46, 111, 64,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#2E6F40',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: '#FFF',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatus: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  // Stats Strip
  statsStrip: {
    marginTop: -24,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    letterSpacing: 0.8,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    flex: 1,
  },
  ndviBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ndviBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#3b82f6',
  },

  // Nutrients
  nutrientCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nutrientGaugeHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  nutrientHeaderLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  nutrientMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nutrientMoreText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    flex: 1,
  },

  // Chart
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  chartFootnote: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },

  // Crop Strip
  cropStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cropStripLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginBottom: 2,
  },
  cropStripValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
  },
  productivityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  productivityChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },

  // Floating CTA
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
    borderRadius: 18,
  },
  ctaBtnText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
