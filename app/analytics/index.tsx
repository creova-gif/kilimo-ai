/**
 * Kilimo AI — Predictive Analytics Dashboard
 *
 * Two deterministic estimates run against the farm vitals stored on the device:
 *  1. Yield Forecast    — weighted vitals adjustment + seasonal factor
 *  2. Pest Risk Score   — weighted threshold (moisture × temp × crop sensitivity)
 *
 * All models are client-side (no server round-trip), deterministic, and update
 * every time the user navigates to this screen.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Bug, ArrowRight, ShieldCheck } from 'lucide-react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import PageScaffold, { GlassCard, SectionHeader } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate } from '../../lib/access';
import { useKilimoStore } from '../../store/useKilimoStore';
import { runAnalytics } from '../../lib/analytics/predictions';

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration — an unguarded 0 here flowed into negative <Svg>/<Rect>
// widths downstream (real console error + broken chart flash).
const SCREEN_W = Dimensions.get('window').width || 360;

// Full-width projection chart with axes, gridlines, labels and legend
function YieldProjectionChart({
  current,
  forecast,
  color,
}: {
  current: number;
  forecast: number;
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

  const projectionPts = [0, 1, 2, 3].map((i) => {
    const t = i / 3;
    return {
      x: PAD_LEFT + t * chartW,
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

  const projectionLine = buildCurve(projectionPts);
  const lastPt = projectionPts[projectionPts.length - 1];
  const areaPath = `${projectionLine} L${lastPt.x.toFixed(1)} ${PAD_TOP + chartH} L${PAD_LEFT} ${PAD_TOP + chartH} Z`;

  // Y-axis gridlines at 3 levels
  const gridPcts = [0.25, 0.55, 0.85];
  const axisBaseY = PAD_TOP + chartH;

  const xLabels = [
    { x: projectionPts[0].x, label: 'Sasa' },
    { x: lastPt.x, label: 'Makadirio' },
  ];

  return (
    <View style={{ marginTop: 8 }}>
      {/* This chart shows a model projection, not historical measurements. */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6, paddingHorizontal: PAD_LEFT }}>
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

        {/* Model projection */}
        <Path
          d={projectionLine}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5,4"
        />

        {/* Endpoint dots */}
        <Circle
          cx={projectionPts[0].x.toFixed(1)}
          cy={projectionPts[0].y.toFixed(1)}
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

        {xLabels.map((lbl, i) => (
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
export default function AnalyticsDashboard() {
  const { colors } = useTheme();
  const vitals = useKilimoStore((s) => s.farmVitals);
  const profile = useKilimoStore((s) => s.farmProfile);

  const { yieldForecast, pestRisk } = useMemo(
    () => runAnalytics(vitals, profile),
    [vitals, profile]
  );

  const confColor: Record<typeof yieldForecast.confidence, string> = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#ef4444',
  };
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
          <GlassCard style={[s.notice, { borderColor: colors.border }]}>
            <Text style={[s.noticeText, { color: colors.textMute }]}>
              Haya ni makadirio ya mfano yanayotumia viashiria vya shamba vilivyohifadhiwa kwenye app.
              Muunganisho wa sensa na data ya bei za soko haujawezeshwa; thibitisha hali ya shamba na
              bei ya eneo lako kabla ya kufanya maamuzi.
            </Text>
          </GlassCard>

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
          <SectionHeader title="MWELEKEO WA BEI" />
          <GlassCard style={s.unavailableCard}>
            <Text style={[s.unavailableTitle, { color: colors.text }]}>Data ya bei haipatikani</Text>
            <Text style={[s.unavailableBody, { color: colors.textMute }]}>
              Kilimo AI bado haijaunganishwa na chanzo cha bei za soko. Hakuna pendekezo la
              kuuza, kusubiri, au kuhifadhi linalotolewa hapa.
            </Text>
          </GlassCard>

          {/* Disclaimer */}
          <Text style={[s.disclaimer, { color: colors.textMute }]}>
            * Makadirio haya ni ya mwongozo pekee, si kipimo cha sensa wala ushauri wa kilimo au
            kifedha.
          </Text>
        </ScrollView>
      </PageScaffold>
    </Gate>
  );
}

const s = StyleSheet.create({
  fallbackTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 12 },
  fallbackBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 6, textAlign: 'center' },
  notice: { padding: 12, borderWidth: StyleSheet.hairlineWidth },
  noticeText: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17 },

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

  unavailableCard: { padding: 14, gap: 6 },
  unavailableTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  unavailableBody: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },

  disclaimer: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
