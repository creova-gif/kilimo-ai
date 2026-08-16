import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Copy,
  Trash2,
  FlaskConical,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Cpu,
  Droplets,
  Lock,
  Unlock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate } from '../../lib/access';
import { useDigitalFarmTwinStore, Scenario } from '../../store/useDigitalFarmTwinStore';
import { useKilimoStore } from '../../store/useKilimoStore';
import Svg, { Rect, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';

const MAX_SCENARIOS = 6;
const fmtTZS = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(Math.round(n))}`;

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={mb.track}>
      <View style={[mb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const mb = StyleSheet.create({
  track: { height: 6, backgroundColor: '#ffffff18', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: 6, borderRadius: 3 },
});

function riskColor(score: number) {
  return score >= 70 ? '#ef4444' : score >= 45 ? '#f97316' : score >= 25 ? '#f59e0b' : '#22c55e';
}

export default function FarmTwinList() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const language = useKilimoStore((s) => s.language);
  const scenarios = useDigitalFarmTwinStore((s) => s.scenarios);
  const createScenario = useDigitalFarmTwinStore((s) => s.createScenario);
  const duplicateScenario = useDigitalFarmTwinStore((s) => s.duplicateScenario);
  const deleteScenario = useDigitalFarmTwinStore((s) => s.deleteScenario);
  const [newName, setNewName] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Live Interactive Twin State
  const [gateOpen, setGateOpen] = useState(false);
  const [pumpActive, setPumpActive] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Custom interactive metrics
  const [pastureMoistures, setPastureMoistures] = useState({
    north: 42,
    south: 65,
    east: 55,
  });

  const maxYield =
    scenarios.length > 0 ? Math.max(...scenarios.map((s) => s.output.totalYieldTonnes), 1) : 1;
  const maxProfit =
    scenarios.length > 0
      ? Math.max(...scenarios.map((s) => Math.max(0, s.output.netProfitTZS)), 1)
      : 1;

  function handleCreate() {
    const name = newName.trim() || `Hali ${scenarios.length + 1}`;
    const id = createScenario(name);
    setNewName('');
    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/farm-twin/${id}`);
  }

  function handleDelete(sc: Scenario) {
    Alert.alert('Futa hali', `Futa "${sc.name}"? Hii haiwezi kutenduliwa.`, [
      { text: 'Ghairi', style: 'cancel' },
      {
        text: 'Futa',
        style: 'destructive',
        onPress: () => {
          deleteScenario(sc.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: Scenario }) => {
    const { output } = item;
    const rc = riskColor(output.riskScore);
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/farm-twin/${item.id}`)}>
        <GlassCard style={s.card}>
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[s.cardSub, { color: colors.textMute }]}>
                {item.inputs.crop} · {item.inputs.areaHa} ha ·{' '}
                {item.inputs.irrigated ? 'Umwagiliaji' : 'Mvua'}
              </Text>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (scenarios.length >= MAX_SCENARIOS) {
                    Alert.alert(
                      'Ukomo',
                      `Unaweza kuwa na hadi ${MAX_SCENARIOS} hali kwa wakati mmoja.`
                    );
                    return;
                  }
                  const id = duplicateScenario(item.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/farm-twin/${id}`);
                }}
                style={s.iconBtn}
              >
                <Copy size={16} color={colors.textMute} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item);
                }}
                style={s.iconBtn}
              >
                <Trash2 size={16} color="#ef444488" />
              </TouchableOpacity>
            </View>
            <ChevronRight size={18} color={colors.textMute} />
          </View>

          {/* Metric rows with mini bars */}
          <View style={s.metricRow}>
            <Text style={[s.metricLabel, { color: colors.textMute }]}>Mavuno</Text>
            <MiniBar value={output.totalYieldTonnes} max={maxYield} color="#2E6F40" />
            <Text style={[s.metricValue, { color: '#2E6F40' }]}>{output.totalYieldTonnes}t</Text>
          </View>
          <View style={s.metricRow}>
            <Text style={[s.metricLabel, { color: colors.textMute }]}>Faida</Text>
            <MiniBar value={Math.max(0, output.netProfitTZS)} max={maxProfit} color="#3b82f6" />
            <Text
              style={[s.metricValue, { color: output.netProfitTZS >= 0 ? '#3b82f6' : '#ef4444' }]}
            >
              {fmtTZS(output.netProfitTZS)}
            </Text>
          </View>
          <View style={s.metricRow}>
            <Text style={[s.metricLabel, { color: colors.textMute }]}>Hatari</Text>
            <MiniBar value={output.riskScore} max={100} color={rc} />
            <Text style={[s.metricValue, { color: rc }]}>{output.riskScore}/100</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const handleZonePress = (zoneId: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedZone(zoneId === selectedZone ? null : zoneId);
  };

  const toggleGate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGateOpen((prev) => !prev);
  };

  const togglePump = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPumpActive((prev) => !prev);
    // Simulating moisture update based on pump activation
    if (!pumpActive) {
      setPastureMoistures((prev) => ({
        ...prev,
        north: Math.min(prev.north + 8, 90),
      }));
    }
  };

  return (
    <Gate
      feature="digital_farm_twin"
      fallback={
        <PageScaffold title="Shamba Dijiti" badge="AI TWIN">
          <View style={{ padding: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <ShieldCheck size={32} color={colors.textMute} />
              <Text style={[s.fallbackTitle, { color: colors.text }]}>Hairuhusiwi</Text>
              <Text style={[s.fallbackBody, { color: colors.textMute }]}>
                Shamba Dijiti inapatikana kwa Wasimamizi wa Shamba, Wakulima wa Biashara, na
                Wasimamizi Wakuu tu.
              </Text>
            </GlassCard>
          </View>
        </PageScaffold>
      }
    >
      <PageScaffold
        title="Shamba Dijiti"
        subtitle="Digital Farm Twin"
        badge="AI TWIN"
        headerRight={
          scenarios.length < MAX_SCENARIOS ? (
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={[s.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={20} color="#000" />
            </TouchableOpacity>
          ) : undefined
        }
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: 2D Interactive Map preview.
              Was labeled "Live 2D Twin" — misleading, since gate/pump/moisture
              state here is local-only useState with no persistence and no
              real IoT/sensor connection anywhere in this codebase (unlike the
              Scenarios section below, which runs a genuinely real, deterministic
              agronomic model). Reworded to describe what this actually is: an
              interactive preview of the farm layout, not a live device link. */}
          <SectionHeader title="Ramani ya Shamba · Onyesho la 2D" />
          <View style={{ paddingHorizontal: 16 }}>
            <GlassCard style={s.twinMapCard}>
              <View style={s.mapContainer}>
                <Svg width="100%" height="240" viewBox="0 0 400 240">
                  {/* Background Grid */}
                  <Rect
                    x="0"
                    y="0"
                    width="400"
                    height="240"
                    fill={isDark ? '#0d150e' : '#f9fbf9'}
                    rx="12"
                  />

                  {/* Pasture 1: North Grazing Zone */}
                  <Polygon
                    points="20,20 180,20 160,110 20,110"
                    fill={
                      pastureMoistures.north < 45
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(46, 111, 64, 0.15)'
                    }
                    stroke={pastureMoistures.north < 45 ? '#ef4444' : '#2E6F40'}
                    strokeWidth={selectedZone === 'north' ? '2.5' : '1.5'}
                    onPress={() => handleZonePress('north', 'Kanda ya Kaskazini')}
                  />
                  <SvgText
                    x="90"
                    y="60"
                    fill={colors.text}
                    fontSize="10"
                    fontFamily="Inter_700Bold"
                    textAnchor="middle"
                  >
                    Kaskazini (North)
                  </SvgText>
                  <SvgText
                    x="90"
                    y="75"
                    fill={colors.textMute}
                    fontSize="9"
                    fontFamily="Inter_500Medium"
                    textAnchor="middle"
                  >
                    Moisture: {pastureMoistures.north}%
                  </SvgText>

                  {/* Pasture 2: South Forage Area */}
                  <Polygon
                    points="20,130 150,130 170,220 20,220"
                    fill="rgba(46, 111, 64, 0.15)"
                    stroke="#2E6F40"
                    strokeWidth={selectedZone === 'south' ? '2.5' : '1.5'}
                    onPress={() => handleZonePress('south', 'Kanda ya Kusini')}
                  />
                  <SvgText
                    x="85"
                    y="170"
                    fill={colors.text}
                    fontSize="10"
                    fontFamily="Inter_700Bold"
                    textAnchor="middle"
                  >
                    Kusini (South)
                  </SvgText>
                  <SvgText
                    x="85"
                    y="185"
                    fill={colors.textMute}
                    fontSize="9"
                    fontFamily="Inter_500Medium"
                    textAnchor="middle"
                  >
                    Moisture: {pastureMoistures.south}%
                  </SvgText>

                  {/* Pasture 3: East Orchard */}
                  <Polygon
                    points="200,20 380,20 380,150 220,150"
                    fill="rgba(46, 111, 64, 0.15)"
                    stroke="#2E6F40"
                    strokeWidth={selectedZone === 'east' ? '2.5' : '1.5'}
                    onPress={() => handleZonePress('east', 'Kanda ya Mashariki')}
                  />
                  <SvgText
                    x="290"
                    y="80"
                    fill={colors.text}
                    fontSize="10"
                    fontFamily="Inter_700Bold"
                    textAnchor="middle"
                  >
                    Mashariki (Orchard)
                  </SvgText>
                  <SvgText
                    x="290"
                    y="95"
                    fill={colors.textMute}
                    fontSize="9"
                    fontFamily="Inter_500Medium"
                    textAnchor="middle"
                  >
                    Moisture: {pastureMoistures.east}%
                  </SvgText>

                  {/* RFID Gate Location */}
                  <G onPress={toggleGate}>
                    <Rect
                      x="165"
                      y="115"
                      width="20"
                      height="20"
                      fill={gateOpen ? 'rgba(46, 111, 64, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
                      rx="4"
                    />
                    <Circle cx="175" cy="125" r="5" fill={gateOpen ? '#2E6F40' : '#f59e0b'} />
                    <SvgText
                      x="175"
                      y="150"
                      fill={colors.textMute}
                      fontSize="8"
                      fontFamily="Inter_600SemiBold"
                      textAnchor="middle"
                    >
                      {gateOpen ? 'GATE OPEN' : 'GATE LOCK'}
                    </SvgText>
                  </G>

                  {/* Water Pump */}
                  <G onPress={togglePump}>
                    <Circle
                      cx="210"
                      cy="180"
                      r="16"
                      fill={pumpActive ? 'rgba(14, 165, 233, 0.15)' : 'rgba(100, 116, 139, 0.15)'}
                    />
                    <Circle cx="210" cy="180" r="6" fill={pumpActive ? '#0ea5e9' : '#64748b'} />
                    <SvgText
                      x="210"
                      y="210"
                      fill={colors.textMute}
                      fontSize="8"
                      fontFamily="Inter_600SemiBold"
                      textAnchor="middle"
                    >
                      PUMP
                    </SvgText>
                  </G>
                </Svg>
              </View>

              {/* Map controls/details indicator */}
              <View style={s.controlPanel}>
                {selectedZone ? (
                  <Animated.View entering={FadeIn} style={s.detailsBlock}>
                    <Text style={[s.detailsTitle, { color: colors.text }]}>
                      {selectedZone === 'north'
                        ? 'Kanda ya Kaskazini (North Zone)'
                        : selectedZone === 'south'
                          ? 'Kanda ya Kusini (South Zone)'
                          : 'Kanda ya Mashariki (East Orchard)'}
                    </Text>
                    <View style={s.detailsTelemetryRow}>
                      <View style={s.telemetryValBox}>
                        <Droplets size={12} color="#2E6F40" />
                        <Text style={[s.telemetryValText, { color: colors.text }]}>
                          Moisture:{' '}
                          {selectedZone === 'north'
                            ? pastureMoistures.north
                            : selectedZone === 'south'
                              ? pastureMoistures.south
                              : pastureMoistures.east}
                          %
                        </Text>
                      </View>
                      <View style={s.telemetryValBox}>
                        <Zap size={12} color="#f59e0b" />
                        <Text style={[s.telemetryValText, { color: colors.text }]}>
                          Soil Temp: 24°C
                        </Text>
                      </View>
                    </View>
                    {selectedZone === 'north' && pastureMoistures.north < 45 && (
                      <View style={s.warningBanner}>
                        <Text style={s.warningText}>
                          {language === 'sw'
                            ? 'Tahadhari: Udongo umekauka sana!'
                            : 'Warning: High soil moisture depletion!'}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                ) : (
                  <Text style={[s.instructText, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Gonga kanda za shamba au vifaa kuchunguza au kuendesha.'
                      : 'Tap pasture zones, gate, or water pump on the map to interact.'}
                  </Text>
                )}

                <View style={s.twinActionsRow}>
                  <TouchableOpacity
                    onPress={toggleGate}
                    style={[s.twinActionBtn, { borderColor: colors.border }]}
                  >
                    {gateOpen ? (
                      <Unlock size={14} color="#2E6F40" />
                    ) : (
                      <Lock size={14} color="#f59e0b" />
                    )}
                    <Text style={[s.twinActionBtnTxt, { color: colors.text }]}>
                      {gateOpen
                        ? language === 'sw'
                          ? 'Funga Lango'
                          : 'Lock Gate'
                        : language === 'sw'
                          ? 'Fungua Lango'
                          : 'Unlock Gate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePump}
                    style={[s.twinActionBtn, { borderColor: colors.border }]}
                  >
                    <Droplets size={14} color={pumpActive ? '#0ea5e9' : colors.textMute} />
                    <Text style={[s.twinActionBtnTxt, { color: colors.text }]}>
                      {pumpActive
                        ? language === 'sw'
                          ? 'Zima Bomba'
                          : 'Deactivate Pump'
                        : language === 'sw'
                          ? 'Washa Bomba'
                          : 'Activate Pump'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Section: Scenarios */}
          {scenarios.length === 0 ? (
            <View style={{ padding: 24 }}>
              <EmptyState
                icon={<FlaskConical size={32} color={colors.textMute} />}
                title="Hakuna hali bado"
                body='Bonyeza "+" kuunda hali yako ya kwanza ya shamba dijiti.'
                cta="Unda Hali"
                onCta={() => setShowModal(true)}
              />
            </View>
          ) : (
            <>
              <SectionHeader
                title={`HALI MBALIMBALI · SCENARIOS (${scenarios.length}/${MAX_SCENARIOS})`}
              />
              <FlatList
                showsVerticalScrollIndicator={false}
                data={scenarios}
                keyExtractor={(i) => i.id}
                renderItem={renderItem}
                scrollEnabled={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 40 }}
              />
            </>
          )}
        </ScrollView>
      </PageScaffold>

      {/* New scenario modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Hali Mpya</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Jina la hali (mfano: Mvua Nyingi)"
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text, borderColor: colors.border }]}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[
                  s.modalBtn,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => {
                  setShowModal(false);
                  setNewName('');
                }}
              >
                <Text style={[s.modalBtnText, { color: colors.text }]}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Text style={[s.modalBtnText, { color: '#000' }]}>Unda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Gate>
  );
}

const s = StyleSheet.create({
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  cardSub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, width: 44 },
  metricValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, width: 80, textAlign: 'right' },
  fallbackTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 12 },
  fallbackBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 6, textAlign: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    padding: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  modalTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },

  // Twin Map Styling
  twinMapCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapContainer: {
    padding: 10,
    width: '100%',
  },
  controlPanel: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  instructText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 16,
  },
  twinActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  twinActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  twinActionBtnTxt: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  detailsBlock: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 6,
  },
  detailsTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  detailsTelemetryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  telemetryValBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryValText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    color: '#ef4444',
    fontSize: 9.5,
    fontFamily: 'Inter_700Bold',
  },
});
