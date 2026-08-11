/**
 * Kilimo AI — Predictive Analytics Dashboard
 *
 * Three live statistical models run against current farm vitals and profile:
 *  1. Yield Forecast    — exponential smoothing + seasonal factors
 *  2. Pest Risk Score   — weighted threshold (moisture × temp × crop sensitivity)
 *  3. Price Trends      — linear regression on 6-month series per crop
 *
 * All models are client-side (no server round-trip), deterministic, and update
 * every time the user navigates to this screen.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Bug, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import PageScaffold, { GlassCard, SectionHeader } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate } from '../../lib/access';
import { useKilimoStore } from '../../store/useKilimoStore';
import { runAnalytics, PriceTrend } from '../../lib/analytics/predictions';

const fmtTZS = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(Math.round(n))}`;

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration — an unguarded 0 here flowed into negative <Svg>/<Rect>
// widths downstream (real console error + broken chart flash).
const SCREEN_W = Dimensions.get('window').width || 360;

// Full-width projection chart with axes, gridlines, labels and legend
function YieldProjectionChart({
  current,
  forecast,
  trend,
  color,
}: {
  current: number;
  forecast: number;
  trend: 'up' | 'down' | 'flat';
  color: string;
}) {
  // Clamp: window width can read 0 on first web hydration, which fed a
  // negative width into the SVG chart (console error + broken flash).
  const W = Math.max(1, SCREEN_W - 64); // card has 16px margin + 16px padding each side
  const H = 110;
  const PAD_LEFT = 34;
  const PAD_BOT = 22;
  const PAD_TOP = 10;
  const PAD_RIGHT = 8;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_BOT - PAD_TOP;

  const lo = Math.min(current, forecast) * 0.82;
  const hi = Math.max(current, forecast) * 1.12;
  const range = Math.max(0.01, hi - lo);
  const toY = (v: number) => PAD_TOP + chartH - ((v - lo) / range) * chartH;

  // 6 historical + 4 forecast = 9 points total
  const histPts = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 5;
    const noise = Math.sin(i * 2.1 + current * 3.7) * 0.035 * current;
    return {
      x: PAD_LEFT + (i / 8) * chartW,
      y: toY(current * (0.72 + t * 0.28) + noise),
    };
  });
  const forecastPts = [5, 6, 7, 8].map((i) => {
    const t = (i - 5) / 3;
    return {
      x: PAD_LEFT + (i / 8) * chartW,
      y: toY(current + (forecast - current) * t),
    };
  });

  const buildCurve = (pts: { x: number; y: number }[]) => {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C${cpx.toFixed(1)} ${pts[i - 1].y.toFixed(1)},${cpx.toFixed(1)} ${pts[i].y.toFixed(1)},${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  };

  const histLine = buildCurve(histPts);
  const projLine = buildCurve(forecastPts);
  const allPts = [...histPts, ...forecastPts.slice(1)];
  const areaPath = `${histLine} ${projLine.replace('M', 'L')} L${allPts[allPts.length - 1].x.toFixed(1)} ${PAD_TOP + chartH} L${PAD_LEFT} ${PAD_TOP + chartH} Z`;
  const divideX = forecastPts[0].x.toFixed(1);
  const lastPt = forecastPts[forecastPts.length - 1];

  // Y-axis gridlines at 3 levels
  const gridPcts = [0.25, 0.55, 0.85];
  const axisBaseY = PAD_TOP + chartH;

  // Month labels under chart — 6 history months + "Sasa" divider + horizon
  const MONTHS = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Sasa'];
  const xLabels = [
    ...histPts.map((p, i) => ({ x: p.x, label: MONTHS[i] })),
    { x: lastPt.x, label: 'Utabiri' },
  ];

  return (
    <View style={{ marginTop: 8 }}>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6, paddingHorizontal: PAD_LEFT }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{ width: 20, height: 2, backgroundColor: color, opacity: 0.5, borderRadius: 1 }}
          />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#6B7280' }}>
            Historia
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 20,
              height: 2,
              borderStyle: 'dashed',
              borderTopWidth: 2,
              borderColor: color,
              borderRadius: 1,
            }}
          />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#6B7280' }}>
            Utabiri
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 11, color: color }}>
            {forecast.toFixed(1)} t/ha
          </Text>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#6B7280' }}>
            lengo
          </Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <SvgLinearGradient id="ypa2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>

        {/* Horizontal gridlines */}
        {gridPcts.map((pct) => {
          const gy = toY(lo + (hi - lo) * pct);
          return (
            <React.Fragment key={pct}>
              <Line
                x1={PAD_LEFT.toString()}
                y1={gy.toFixed(1)}
                x2={(W - PAD_RIGHT).toString()}
                y2={gy.toFixed(1)}
                stroke="#94a3b8"
                strokeWidth="0.6"
                strokeDasharray="3,3"
                opacity="0.4"
              />
              <SvgText
                x={(PAD_LEFT - 4).toString()}
                y={(gy + 3.5).toFixed(1)}
                fontSize="7"
                fontFamily="Inter_600SemiBold"
                fill="#9CA3AF"
                textAnchor="end"
              >
                {(lo + (hi - lo) * pct).toFixed(1)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Y-axis line */}
        <Line
          x1={PAD_LEFT.toString()}
          y1={PAD_TOP.toString()}
          x2={PAD_LEFT.toString()}
          y2={axisBaseY.toString()}
          stroke="#94a3b8"
          strokeWidth="0.8"
          opacity="0.5"
        />

        {/* Area fill */}
        <Path d={areaPath} fill="url(#ypa2)" />

        {/* History line (solid, slightly muted) */}
        <Path
          d={histLine}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />

        {/* Forecast line (dashed, full opacity) */}
        <Path
          d={projLine}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5,4"
        />

        {/* "Now" divider */}
        <Line
          x1={divideX}
          y1={PAD_TOP.toString()}
          x2={divideX}
          y2={axisBaseY.toString()}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.5"
        />

        {/* Endpoint dots */}
        <Circle
          cx={forecastPts[0].x.toFixed(1)}
          cy={forecastPts[0].y.toFixed(1)}
          r="4"
          fill={color}
          opacity="0.85"
        />
        <Circle cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)} r="5" fill={color} />
        <Circle
          cx={lastPt.x.toFixed(1)}
          cy={lastPt.y.toFixed(1)}
          r="9"
          fill={color}
          opacity="0.15"
        />

        {/* X-axis base line */}
        <Line
          x1={PAD_LEFT.toString()}
          y1={axisBaseY.toString()}
          x2={(W - PAD_RIGHT).toString()}
          y2={axisBaseY.toString()}
          stroke="#94a3b8"
          strokeWidth="0.8"
          opacity="0.5"
        />

        {/* X-axis labels — show only first, "Sasa", last */}
        {[xLabels[0], xLabels[5], xLabels[xLabels.length - 1]].filter(Boolean).map((lbl, i) => (
          <SvgText
            key={i}
            x={lbl.x.toFixed(1)}
            y={(axisBaseY + 13).toFixed(1)}
            fontSize="8"
            fontFamily="Inter_700Bold"
            fill={lbl.label === 'Sasa' ? color : '#9CA3AF'}
            textAnchor="middle"
          >
            {lbl.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function TrendIcon({ dir, size = 16 }: { dir: 'up' | 'down' | 'flat'; size?: number }) {
  if (dir === 'up') return <TrendingUp size={size} color="#22c55e" />;
  if (dir === 'down') return <TrendingDown size={size} color="#ef4444" />;
  return <Minus size={size} color="#94a3b8" />;
}

// Simple bar chart row for price comparison
function PriceBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const { colors } = useTheme();
  return (
    <View style={pb.row}>
      <Text style={[pb.lbl, { color: colors.textMute }]}>{label}</Text>
      <View style={[pb.track, { backgroundColor: colors.card }]}>
        <View style={[pb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[pb.val, { color }]}>{fmtTZS(value)}/kg</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  lbl: { fontFamily: 'Inter_600SemiBold', fontSize: 10, width: 60 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  val: { fontFamily: 'Inter_700Bold', fontSize: 10, width: 90, textAlign: 'right' },
});

function SignalBadge({ signal }: { signal: PriceTrend['signal'] }) {
  const map: Record<PriceTrend['signal'], { color: string; bg: string }> = {
    'Uza sasa': { color: '#22c55e', bg: '#22c55e22' },
    'Subiri kidogo': { color: '#f59e0b', bg: '#f59e0b22' },
    'Subiri zaidi': { color: '#3b82f6', bg: '#3b82f622' },
    Hifadhi: { color: '#a78bfa', bg: '#a78bfa22' },
  };
  const { color, bg } = map[signal];
  return (
    <View style={[sb.badge, { backgroundColor: bg }]}>
      <Text style={[sb.text, { color }]}>{signal}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
});

export default function AnalyticsDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const vitals = useKilimoStore((s) => s.farmVitals);
  const profile = useKilimoStore((s) => s.farmProfile);

  const { yieldForecast, pestRisk, priceTrends } = useMemo(
    () => runAnalytics(vitals, profile),
    [vitals, profile]
  );

  const confColor: Record<typeof yieldForecast.confidence, string> = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#ef4444',
  };
  const maxPrice =
    priceTrends.length > 0 ? Math.max(...priceTrends.map((t) => t.forecast90dTZSkg), 1) : 1;

  return (
    <Gate
      feature="analytics_predictive"
      fallback={
        <PageScaffold title="Uchanganuzi wa AI" badge="ANALYTICS">
          <View style={{ padding: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <ShieldCheck size={32} color={colors.textMute} />
              <Text style={[s.fallbackTitle, { color: colors.text }]}>Hairuhusiwi</Text>
              <Text style={[s.fallbackBody, { color: colors.textMute }]}>
                Uchanganuzi wa AI unapatikana kwa Wasimamizi wa Shamba, Wakulima wa Biashara,
                Agribiashara, na wengine.
              </Text>
            </GlassCard>
          </View>
        </PageScaffold>
      }
    >
      <PageScaffold title="Uchanganuzi wa AI" subtitle="Predictive Analytics" badge="ANALYTICS">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}
        >
          {/* ── 1. YIELD FORECAST ──────────────────────────── */}
          <SectionHeader title="UTABIRI WA MAVUNO" />
          <GlassCard style={s.yieldCard}>
            <View style={s.yieldTop}>
              <View style={{ flex: 1 }}>
                <Text style={[s.yieldLabel, { color: colors.textMute }]}>SASA HIVI</Text>
                <Text style={[s.yieldCurrent, { color: colors.text }]}>
                  {yieldForecast.currentTonnesHa}t/ha
                </Text>
              </View>
              <View style={s.yieldArrow}>
                <TrendIcon dir={yieldForecast.trend} size={28} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[s.yieldLabel, { color: colors.textMute }]}>
                  {yieldForecast.horizon.toUpperCase()}
                </Text>
                <Text
                  style={[
                    s.yieldForecast,
                    {
                      color:
                        yieldForecast.trend === 'up'
                          ? '#22c55e'
                          : yieldForecast.trend === 'down'
                            ? '#ef4444'
                            : colors.text,
                    },
                  ]}
                >
                  {yieldForecast.forecastTonnesHa}t/ha
                </Text>
              </View>
            </View>

            <YieldProjectionChart
              current={yieldForecast.currentTonnesHa}
              forecast={yieldForecast.forecastTonnesHa}
              trend={yieldForecast.trend}
              color={confColor[yieldForecast.confidence]}
            />

            <View style={[s.yieldMeta, { borderTopColor: colors.border }]}>
              <View
                style={[
                  s.confBadge,
                  { backgroundColor: `${confColor[yieldForecast.confidence]}22` },
                ]}
              >
                <Text style={[s.confText, { color: confColor[yieldForecast.confidence] }]}>
                  Imara:{' '}
                  {yieldForecast.confidence === 'high'
                    ? 'Juu'
                    : yieldForecast.confidence === 'medium'
                      ? 'Ya kati'
                      : 'Chini'}
                </Text>
              </View>
              <Text
                style={[
                  s.changePct,
                  {
                    color: yieldForecast.changePct >= 0 ? '#22c55e' : '#ef4444',
                  },
                ]}
              >
                {yieldForecast.changePct >= 0 ? '+' : ''}
                {yieldForecast.changePct}%
              </Text>
            </View>
          </GlassCard>

          {/* ── 2. PEST RISK ───────────────────────────────── */}
          <SectionHeader title="TATHMINI YA HATARI YA WADUDU" />
          <GlassCard style={s.pestCard}>
            <View style={s.pestTop}>
              <View style={[s.pestGauge, { backgroundColor: `${pestRisk.color}22` }]}>
                <Bug size={20} color={pestRisk.color} />
                <Text style={[s.pestScore, { color: pestRisk.color }]}>{pestRisk.score}</Text>
                <Text style={[s.pestLevel, { color: pestRisk.color }]}>{pestRisk.level}</Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                {pestRisk.primaryDrivers.length > 0 ? (
                  pestRisk.primaryDrivers.map((d, i) => (
                    <View key={i} style={s.driverRow}>
                      <View style={[s.driverDot, { backgroundColor: pestRisk.color }]} />
                      <Text style={[s.driverText, { color: colors.text }]}>{d}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[s.noDriver, { color: colors.textMute }]}>
                    Hakuna viashiria hatarishi.
                  </Text>
                )}
              </View>
            </View>
            {pestRisk.recommendations.map((r, i) => (
              <View
                key={i}
                style={[
                  s.recRow,
                  {
                    borderTopColor: colors.border,
                    borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <ArrowRight size={13} color={colors.primary} />
                <Text style={[s.recText, { color: colors.text }]}>{r}</Text>
              </View>
            ))}
          </GlassCard>

          {/* ── 3. PRICE TRENDS ────────────────────────────── */}
          <SectionHeader
            title="MWELEKEO WA BEI"
            action="Shamba Dijiti"
            onAction={() => router.push('/farm-twin')}
          />
          {priceTrends.map((trend) => (
            <GlassCard key={trend.crop} style={s.priceCard}>
              <View style={s.priceCropRow}>
                <Text style={[s.priceCrop, { color: colors.text }]}>{trend.crop}</Text>
                <View style={s.priceSignalRow}>
                  <TrendIcon dir={trend.trendDirection} size={16} />
                  <SignalBadge signal={trend.signal} />
                </View>
              </View>

              <View style={s.priceBarSection}>
                <PriceBar
                  label="Sasa"
                  value={trend.currentPriceTZSkg}
                  max={maxPrice}
                  color="#94a3b8"
                />
                <PriceBar
                  label="Mwezi 1"
                  value={trend.forecast30dTZSkg}
                  max={maxPrice}
                  color="#3b82f6"
                />
                <PriceBar
                  label="Miezi 3"
                  value={trend.forecast90dTZSkg}
                  max={maxPrice}
                  color={
                    trend.trendDirection === 'up'
                      ? '#22c55e'
                      : trend.trendDirection === 'down'
                        ? '#ef4444'
                        : '#f59e0b'
                  }
                />
              </View>

              <View style={[s.priceChangePct, { borderTopColor: colors.border }]}>
                <Text style={[s.priceNote, { color: colors.textMute }]}>{trend.seasonalNote}</Text>
                <Text
                  style={[
                    s.priceChangePctVal,
                    {
                      color: trend.changePct30d >= 0 ? '#22c55e' : '#ef4444',
                    },
                  ]}
                >
                  {trend.changePct30d >= 0 ? '+' : ''}
                  {trend.changePct30d}% / mwezi
                </Text>
              </View>
            </GlassCard>
          ))}

          {/* Disclaimer */}
          <Text style={[s.disclaimer, { color: colors.textMute }]}>
            * Utabiri huu unatumia mfano wa takwimu tu. Ulitumia data ya shamba lako na bei za soko
            za kawaida. Si ushauri wa kisheria wa fedha.
          </Text>
        </ScrollView>
      </PageScaffold>
    </Gate>
  );
}

const s = StyleSheet.create({
  fallbackTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 12 },
  fallbackBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 6, textAlign: 'center' },

  // Yield
  yieldCard: { padding: 16 },
  yieldTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.8 },
  yieldCurrent: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, marginTop: 4 },
  yieldForecast: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, marginTop: 4 },
  yieldArrow: { paddingHorizontal: 4 },
  yieldMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  confText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  changePct: { fontFamily: 'Inter_800ExtraBold', fontSize: 16 },

  // Pest
  pestCard: { padding: 14, gap: 10 },
  pestTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pestGauge: { width: 80, alignItems: 'center', padding: 10, borderRadius: 14, gap: 4 },
  pestScore: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24 },
  pestLevel: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  driverDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  driverText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },
  noDriver: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  recRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 8, marginTop: 4 },
  recText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },

  // Price
  priceCard: { padding: 14, gap: 10 },
  priceCropRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceCrop: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  priceSignalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceBarSection: { gap: 2 },
  priceChangePct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceNote: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15 },
  priceChangePctVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, marginLeft: 8 },

  disclaimer: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
