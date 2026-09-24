/**
 * Digital Farm Twin — Scenario editor + results
 *
 * Full what-if simulator for a single scenario. Inputs drive the parametric
 * yield model in real-time (recalculated on every change). Results panel shows
 * yield, revenue, cost breakdown, risk breakdown, and Swahili advisory tips.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Droplets,
  Thermometer,
  Sprout,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronLeft,
  Save,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import PageScaffold, { GlassCard, SectionHeader } from '../../components/PageScaffold';
import {
  useDigitalFarmTwinStore,
  TwinInputs,
  Crop,
  SoilType,
} from '../../store/useDigitalFarmTwinStore';
import { runTwinModel, CROPS, SOIL_TYPES } from '../../lib/farmtwin/model';

const fmtTZS = (n: number) =>
  `TSh ${new Intl.NumberFormat('en-US').format(Math.round(Math.abs(n)))}`;
const fmtN = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

// ── Stepper (replaces Slider for cross-platform reliability) ─────────────────
function Stepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={st.row}>
      <View style={{ flex: 1 }}>
        <Text style={[st.label, { color: colors.textMute }]}>{label}</Text>
        <Text style={[st.value, { color: colors.text }]}>
          {value} {unit}
        </Text>
      </View>
      <View style={st.controls}>
        <TouchableOpacity
          onPress={() => {
            if (value > min) {
              onDec();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          style={[
            st.btn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: value <= min ? 0.4 : 1,
            },
          ]}
        >
          <Text style={[st.btnText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (value < max) {
              onInc();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          style={[
            st.btn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: value >= max ? 0.4 : 1,
            },
          ]}
        >
          <Text style={[st.btnText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.3 },
  value: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 2 },
  controls: { flexDirection: 'row', gap: 8 },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, lineHeight: 22 },
});

// ── Pill selector ─────────────────────────────────────────────────────────────
function PillRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
        {options.map((o) => {
          const active = o === value;
          return (
            <TouchableOpacity
              key={o}
              onPress={() => {
                onChange(o);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                pill.btn,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[pill.text, { color: active ? '#000' : colors.text }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
const pill = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontFamily: 'Inter_700Bold', fontSize: 11 },
});

// ── Horizontal bar chart ──────────────────────────────────────────────────────
function HorizBar({
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
  const { colors } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={hb.row}>
      <Text style={[hb.label, { color: colors.textMute }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[hb.track, { backgroundColor: colors.card }]}>
        <View style={[hb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[hb.val, { color }]}>{fmtTZS(value)}</Text>
    </View>
  );
}
const hb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, width: 72 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  val: { fontFamily: 'Inter_700Bold', fontSize: 11, width: 88, textAlign: 'right' },
});

// ── Risk gauge ────────────────────────────────────────────────────────────────
function RiskPill({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? '#ef4444' : score >= 45 ? '#f97316' : score >= 25 ? '#f59e0b' : '#22c55e';
  return (
    <View style={[rg.pill, { backgroundColor: `${color}22` }]}>
      <Text style={[rg.label, { color }]}>{label}</Text>
      <Text style={[rg.val, { color }]}>{score}</Text>
    </View>
  );
}
const rg = StyleSheet.create({
  pill: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center', gap: 4 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  val: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ScenarioEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const scenario = useDigitalFarmTwinStore((s) => s.scenarios.find((sc) => sc.id === id));
  const updateInputs = useDigitalFarmTwinStore((s) => s.updateInputs);

  const [inputs, setInputs] = useState<TwinInputs>(
    scenario?.inputs ?? {
      crop: 'Mahindi',
      areaHa: 2,
      rainfallMm: 600,
      fertilizerKgHa: 100,
      irrigated: false,
      soilHealth: 75,
      plantingDensityPct: 100,
      soilType: 'Tifutifu (Loam)',
    }
  );

  // Live model output — recomputed on every render (pure, fast)
  const output = runTwinModel(inputs);

  function patch(partial: Partial<TwinInputs>) {
    setInputs((prev) => ({ ...prev, ...partial }));
  }

  function handleSave() {
    if (!id) return;
    updateInputs(id, inputs);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (router.canGoBack()) router.back();
    else router.replace('/farm-twin');
  }

  if (!scenario) return null;

  const maxCost = Math.max(
    output.costBreakdown.seed,
    output.costBreakdown.fertilizer,
    output.costBreakdown.labor,
    output.costBreakdown.irrigation,
    output.costBreakdown.overhead,
    1
  );
  const profit = output.netProfitTZS;

  return (
    <PageScaffold
      title={scenario.name}
      subtitle="Hali ya Shamba Dijiti"
      badge="SIMULATOR"
      headerRight={
        <TouchableOpacity
          onPress={handleSave}
          style={[se.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Save size={16} color="#000" />
          <Text style={se.saveBtnText}>Hifadhi</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}
      >
        {/* ── INPUTS ─────────────────────────────────────── */}
        <SectionHeader title="INGIZO (WHAT-IF)" />
        <GlassCard style={{ padding: 14, gap: 4 }}>
          <Text style={[se.groupLabel, { color: colors.textMute }]}>ZAO</Text>
          <PillRow options={CROPS} value={inputs.crop} onChange={(v) => patch({ crop: v })} />

          <Text style={[se.groupLabel, { color: colors.textMute, marginTop: 8 }]}>
            AINA YA UDONGO
          </Text>
          <PillRow
            options={SOIL_TYPES}
            value={inputs.soilType}
            onChange={(v) => patch({ soilType: v })}
          />

          <View style={se.divider} />

          <Stepper
            label="Eneo la Shamba"
            value={inputs.areaHa}
            min={0.5}
            max={50}
            step={0.5}
            unit="ha"
            onDec={() => patch({ areaHa: Math.max(0.5, +(inputs.areaHa - 0.5).toFixed(1)) })}
            onInc={() => patch({ areaHa: Math.min(50, +(inputs.areaHa + 0.5).toFixed(1)) })}
          />
          <Stepper
            label="Mvua ya Msimu"
            value={inputs.rainfallMm}
            min={100}
            max={2000}
            step={50}
            unit="mm"
            onDec={() => patch({ rainfallMm: Math.max(100, inputs.rainfallMm - 50) })}
            onInc={() => patch({ rainfallMm: Math.min(2000, inputs.rainfallMm + 50) })}
          />
          <Stepper
            label="Mbolea"
            value={inputs.fertilizerKgHa}
            min={0}
            max={400}
            step={20}
            unit="kg/ha"
            onDec={() => patch({ fertilizerKgHa: Math.max(0, inputs.fertilizerKgHa - 20) })}
            onInc={() => patch({ fertilizerKgHa: Math.min(400, inputs.fertilizerKgHa + 20) })}
          />
          <Stepper
            label="Msongamano wa Mimea"
            value={inputs.plantingDensityPct}
            min={50}
            max={150}
            step={10}
            unit="%"
            onDec={() =>
              patch({ plantingDensityPct: Math.max(50, inputs.plantingDensityPct - 10) })
            }
            onInc={() =>
              patch({ plantingDensityPct: Math.min(150, inputs.plantingDensityPct + 10) })
            }
          />
          <Stepper
            label="Afya ya Udongo"
            value={inputs.soilHealth}
            min={10}
            max={100}
            step={5}
            unit="/100"
            onDec={() => patch({ soilHealth: Math.max(10, inputs.soilHealth - 5) })}
            onInc={() => patch({ soilHealth: Math.min(100, inputs.soilHealth + 5) })}
          />

          <View style={[se.switchRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[se.switchLabel, { color: colors.text }]}>Umwagiliaji</Text>
              <Text style={[se.switchSub, { color: colors.textMute }]}>
                {inputs.irrigated
                  ? 'Imewashwa — maji ya ziada yanashughulikiwa'
                  : 'Imezimwa — mvua pekee'}
              </Text>
            </View>
            <Switch
              value={inputs.irrigated}
              onValueChange={(v) => {
                patch({ irrigated: v });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </GlassCard>

        {/* ── RESULTS ────────────────────────────────────── */}
        <SectionHeader title="MATOKEO YA MFANO" />

        {/* Hero stat */}
        <GlassCard style={se.heroCard}>
          <View style={se.heroRow}>
            <View style={se.heroStat}>
              <Text style={[se.heroLabel, { color: colors.textMute }]}>MAVUNO JUMLA</Text>
              <Text style={[se.heroVal, { color: '#3C4A2A' }]}>{output.totalYieldTonnes}t</Text>
              <Text style={[se.heroSub, { color: colors.textMute }]}>
                {output.yieldTonnesHa}t/ha
              </Text>
            </View>
            <View style={se.heroDivider} />
            <View style={se.heroStat}>
              <Text style={[se.heroLabel, { color: colors.textMute }]}>FAIDA HALISI</Text>
              <Text style={[se.heroVal, { color: profit >= 0 ? '#3b82f6' : '#ef4444' }]}>
                {profit < 0 ? '-' : ''}
                {fmtTZS(profit)}
              </Text>
              <Text style={[se.heroSub, { color: colors.textMute }]}>ROI {output.roi}%</Text>
            </View>
          </View>
          <View style={[se.revRow, { borderTopColor: colors.border }]}>
            <Text style={[se.revLabel, { color: colors.textMute }]}>Mapato ya mauzo</Text>
            <Text style={[se.revVal, { color: colors.text }]}>{fmtTZS(output.revenuesTZS)}</Text>
          </View>
          {inputs.irrigated && (
            <View style={se.revRow}>
              <Text style={[se.revLabel, { color: colors.textMute }]}>Maji yanayotumika</Text>
              <Text style={[se.revVal, { color: '#38bdf8' }]}>{fmtN(output.waterUsageM3)} m³</Text>
            </View>
          )}
        </GlassCard>

        {/* Cost breakdown */}
        <SectionHeader title="MGAWANYO WA GHARAMA" />
        <GlassCard style={{ padding: 14 }}>
          <HorizBar label="Mbegu" value={output.costBreakdown.seed} max={maxCost} color="#f59e0b" />
          <HorizBar
            label="Mbolea"
            value={output.costBreakdown.fertilizer}
            max={maxCost}
            color="#a78bfa"
          />
          <HorizBar label="Kazi" value={output.costBreakdown.labor} max={maxCost} color="#38bdf8" />
          {output.costBreakdown.irrigation > 0 && (
            <HorizBar
              label="Maji"
              value={output.costBreakdown.irrigation}
              max={maxCost}
              color="#34d399"
            />
          )}
          <HorizBar
            label="Mengine"
            value={output.costBreakdown.overhead}
            max={maxCost}
            color="#94a3b8"
          />
          <View style={[se.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[se.totalLabel, { color: colors.textMute }]}>JUMLA YA GHARAMA</Text>
            <Text style={[se.totalVal, { color: colors.text }]}>{fmtTZS(output.totalCostTZS)}</Text>
          </View>
        </GlassCard>

        {/* Risk breakdown */}
        <SectionHeader title="TATHMINI YA HATARI" />
        <GlassCard style={{ padding: 14 }}>
          <View style={se.riskRow}>
            <RiskPill label="Ukame" score={output.riskBreakdown.drought} />
            <RiskPill label="Wadudu" score={output.riskBreakdown.pest} />
            <RiskPill label="Soko" score={output.riskBreakdown.market} />
          </View>
          <View style={[se.overallRisk, { borderTopColor: colors.border }]}>
            <Text style={[se.overallLabel, { color: colors.textMute }]}>HATARI YA JUMLA</Text>
            <Text
              style={[
                se.overallVal,
                {
                  color:
                    output.riskScore >= 70
                      ? '#ef4444'
                      : output.riskScore >= 45
                        ? '#f97316'
                        : output.riskScore >= 25
                          ? '#f59e0b'
                          : '#22c55e',
                },
              ]}
            >
              {output.riskScore}/100
            </Text>
          </View>
        </GlassCard>

        {/* Swahili advisory tips */}
        <SectionHeader title="USHAURI WA SANKOFA AI" />
        <GlassCard style={{ padding: 14, gap: 10 }}>
          {output.advice.map((tip, i) => (
            <View key={i} style={se.tipRow}>
              <Lightbulb size={16} color="#f59e0b" style={{ marginTop: 2 }} />
              <Text style={[se.tipText, { color: colors.text }]}>{tip}</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </PageScaffold>
  );
}

const se = StyleSheet.create({
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveBtnText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#000' },
  groupLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#ffffff18', marginVertical: 6 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  switchLabel: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  switchSub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  heroCard: { padding: 16 },
  heroRow: { flexDirection: 'row', gap: 0 },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  heroVal: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 },
  heroSub: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  heroDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#ffffff22' },
  revRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  revLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  revVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  totalVal: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 14 },
  riskRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  overallRisk: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  overallLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  overallVal: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20 },
});
