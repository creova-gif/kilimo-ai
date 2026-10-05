import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import {
  ChevronLeft,
  Layers,
  Locate,
  Plus,
  MapPin,
  Settings,
  Maximize2,
  Navigation,
  Target,
  Zap,
  Globe,
  Sun,
  Droplets,
  CloudRain,
  ArrowRight,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import Animated, { FadeIn, FadeOut, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useKilimoStore } from '../store/useKilimoStore';
import MapView from '../components/MapViewWrapper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FIELDS_LIST = [
  { id: '1', title: 'Empty field', area: '15 ha', status: 'Wazi', labelSw: 'Shamba Wazi' },
  { id: '2', title: 'Corn field', area: '12 ha', status: 'Kitalu', labelSw: 'Shamba Mahindi' },
  {
    id: '3',
    title: 'VRA Map for Fertilizing',
    area: 'All zones',
    status: 'Mbolea',
    labelSw: 'Mbolea ya VRA',
  },
];

export default function MapScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const farmProfile = useKilimoStore((s) => s.farmProfile);
  const agroId = useKilimoStore((s) => s.agroId);
  const farmVitals = useKilimoStore((s) => s.farmVitals);

  const [activeLayer, setActiveLayer] = useState<'ndvi' | 'moisture' | 'standard'>('standard');
  const [selectedField, setSelectedField] = useState('2');
  const [voiceText, setVoiceText] = useState('');
  const [voicePlaying, setVoicePlaying] = useState(false);

  const region = {
    latitude: -6.828,
    longitude: 37.6695,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  const LAYER_LABELS = {
    ndvi: language === 'sw' ? 'NDVI (Afya ya Mimea)' : 'NDVI (Plant Health)',
    moisture: language === 'sw' ? 'Unyevu wa Udongo' : 'Soil Moisture',
    standard: language === 'sw' ? 'Ramani ya Kawaida' : 'Standard Map',
  };

  const speak = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoiceText(text);
    setVoicePlaying(true);

    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'sw' ? 'sw-TZ' : 'en-US';
      utterance.onend = () => setVoicePlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setVoicePlaying(false);
      }, 3500);
    }
  };

  const triggerVoiceGuidance = () => {
    const text =
      language === 'sw'
        ? 'Umeingia kwenye eneo lako la mkataba wa kilimo. Udongo hapa una pH ya sita nukta nne, na unyevu ni wa wastani.'
        : 'You have entered your contract farming zone. The soil here has a pH of 6.4, and moisture levels are optimal.';
    speak(text);
  };

  const handleLayers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next =
      activeLayer === 'standard' ? 'ndvi' : activeLayer === 'ndvi' ? 'moisture' : 'standard';
    setSelectedField(next === 'ndvi' ? '3' : next === 'moisture' ? '2' : '1');
    setActiveLayer(next);
    const text =
      language === 'sw'
        ? `Kubadilisha tabaka la ramani kwenda ${LAYER_LABELS[next]}`
        : `Changing map layer to ${LAYER_LABELS[next]}`;
    speak(text);
  };

  // No device geolocation is wired anywhere in this codebase (expo-location
  // isn't even a dependency) — before this fix, this button faked a "GPS
  // position confirmed" claim with hardcoded coordinates (8.9° S, 33.4° E)
  // regardless of where the device actually was. Real GPS requires a new
  // native permission + dependency — a genuine product decision, flagged
  // separately rather than invented here. This just recenters the known
  // farm region pin, honestly.
  const handleLocate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text =
      language === 'sw'
        ? `Eneo la shamba lako: ${farmProfile?.region || 'Tanzania'}.`
        : `Your farm's region: ${farmProfile?.region || 'Tanzania'}.`;
    speak(text);
    Alert.alert(
      language === 'sw' ? 'Eneo la Shamba' : 'Farm Region',
      language === 'sw'
        ? `${farmProfile?.region || 'Tanzania'}\nGPS halisi bado haijawezeshwa kwenye onyesho hili.`
        : `${farmProfile?.region || 'Tanzania'}\nLive GPS is not enabled in this preview yet.`
    );
  };

  const handleFullscreen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      language === 'sw' ? 'Ramani Kamili' : 'Full Map',
      language === 'sw'
        ? 'Fungua KILIMO AI kwenye simu yako ili upate ramani kamili ya mwingiliano.'
        : 'Interactive maps optimized for mobile devices.'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Actual Satellite Map View */}
      <MapView style={StyleSheet.absoluteFillObject} region={region} />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.overlay}>
        <View style={{ flex: 1 }}>
          {/* Header controls */}
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              activeOpacity={0.7}
            >
              <BlurView intensity={30} tint="dark" style={styles.iconBtn}>
                <ChevronLeft size={22} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={[styles.spatialBadge, { backgroundColor: colors.primary + '40' }]}>
                <Globe size={10} color={colors.primary} />
                <Text style={[styles.spatialText, { color: colors.primary }]}>
                  SPATIAL INTELLIGENCE v4.1
                </Text>
              </View>
              <View style={[styles.locationPill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <MapPin size={12} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {farmProfile?.region || agroId?.location || 'Tanzania'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Profile settings"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/edit-profile' as any);
              }}
              activeOpacity={0.7}
            >
              <BlurView intensity={30} tint="dark" style={styles.iconBtn}>
                <Settings size={20} color="#fff" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Voice guidance alerts visualizer overlay */}
          {voicePlaying && (
            <Animated.View entering={FadeInUp} exiting={FadeOut} style={styles.voiceGuidanceCard}>
              <BlurView intensity={70} tint="dark" style={styles.voiceGuidanceInner}>
                <Volume2 size={16} color={colors.primary} style={styles.voiceIconPulse} />
                <Text style={styles.voiceGuidanceText} numberOfLines={2}>
                  {voiceText}
                </Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Floating Weather widget overlay */}
          <Animated.View
            entering={FadeInUp.delay(200)}
            style={[styles.weatherCard, voicePlaying && { top: 180 }]}
          >
            <BlurView intensity={65} tint="dark" style={styles.weatherInner}>
              <View style={styles.weatherRow}>
                <Sun size={18} color="#F59E0B" />
                <Text style={styles.weatherTemp}>+16°C</Text>
              </View>
              <View style={styles.weatherDetails}>
                <View style={styles.detailItem}>
                  <Droplets size={12} color="#3B82F6" />
                  <Text style={styles.detailText}>74% Humidity</Text>
                </View>
                <View style={styles.detailItem}>
                  <CloudRain size={12} color="#60A5FA" />
                  <Text style={styles.detailText}>5 mm Rain</Text>
                </View>
              </View>
              <Text style={styles.weatherDemoLabel}>
                {language === 'sw' ? 'MFANO' : 'EXAMPLE'}
              </Text>
            </BlurView>
          </Animated.View>

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Map layers"
              onPress={handleLayers}
              style={styles.controlItem}
            >
              <BlurView
                intensity={50}
                tint="dark"
                style={[
                  styles.controlInner,
                  activeLayer !== 'standard' && { borderColor: colors.primary },
                ]}
              >
                <Layers size={20} color={activeLayer !== 'standard' ? colors.primary : '#fff'} />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Toggle fullscreen map"
              onPress={handleFullscreen}
              style={styles.controlItem}
            >
              <BlurView intensity={50} tint="dark" style={styles.controlInner}>
                <Maximize2 size={20} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Center on my location"
              onPress={handleLocate}
              style={styles.controlItem}
            >
              <BlurView
                intensity={50}
                tint="dark"
                style={[styles.controlInner, { borderColor: colors.primary }]}
              >
                <Locate size={20} color={colors.primary} />
              </BlurView>
            </TouchableOpacity>
            {/* Trigger Voice guidance manually */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Play voice guidance"
              onPress={triggerVoiceGuidance}
              style={styles.controlItem}
            >
              <BlurView
                intensity={50}
                tint="dark"
                style={[styles.controlInner, voicePlaying && { borderColor: colors.primary }]}
              >
                <Volume2 size={20} color={voicePlaying ? colors.primary : '#fff'} />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Interactive Crop Pin Overlay */}
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={[styles.pin, { top: '38%', left: '46%' }]}
          >
            <View style={styles.pinWrapper}>
              <Animated.View style={[styles.pinPulse, { borderColor: colors.primary }]} />
              <View style={[styles.pinCircle, { backgroundColor: colors.primary }]}>
                <Target size={22} color="#FFFFFF" />
              </View>
            </View>
            <BlurView intensity={40} tint="dark" style={styles.pinLabel}>
              <Text style={styles.pinText}>{farmProfile?.primaryCrops?.[0] || 'Rice Farming'}</Text>
            </BlurView>
          </Animated.View>

          {/* Bottom Sheet holding Fields and Vitals */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.bottomSheet}>
            <BlurView
              intensity={90}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.sheetContent, { borderColor: colors.border }]}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' },
                ]}
              />

              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Mavuno na Tabaka' : 'Field Layers'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Navigation size={12} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.metaText, { color: colors.textMute }]}>
                      {language === 'sw'
                        ? 'Ramani na mchanganuo wa mbolea'
                        : 'Ensuring efficient resource utilization'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addPlotBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push('/tasks' as any);
                  }}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addPlotText}>
                    {language === 'sw' ? 'Kitalu' : 'Add Plot'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal scroll of Fields (mokupoku UI) */}
              <View style={{ marginBottom: 18 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fieldsScroll}
                >
                  {FIELDS_LIST.map((field) => (
                    <TouchableOpacity
                      key={field.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedField(field.id);
                      }}
                      style={[
                        styles.fieldCard,
                        {
                          backgroundColor:
                            selectedField === field.id
                              ? colors.primaryLight
                              : isDark
                                ? '#1F241C'
                                : '#FFFFFF',
                          borderColor: selectedField === field.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.fieldCardHeader}>
                        <Text style={[styles.fieldCardTitle, { color: colors.text }]}>
                          {language === 'sw' ? field.labelSw : field.title}
                        </Text>
                        <ArrowRight size={14} color={colors.textMute} />
                      </View>
                      <Text style={[styles.fieldCardArea, { color: colors.textMute }]}>
                        {field.area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Telemetry data grids */}
              <View
                style={[
                  styles.statsGrid,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                ]}
              >
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>MOISTURE</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {farmVitals.moisture.toFixed(1)}%
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>SOIL HEALTH</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {farmVitals.soilHealth.toFixed(0)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMute }]}>YIELD EST.</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {farmVitals.yieldEstimate.toFixed(1)}T
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.fullAnalysisBtn, { borderColor: colors.primary + '30' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  router.push('/analytics' as any);
                }}
              >
                <Zap size={15} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.fullAnalysisText, { color: colors.primary }]}>
                  {language === 'sw' ? 'Changanua Mbolea na AI' : 'Trigger Full VRA AI Analysis'}
                </Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0D0A' },
  mapImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.8 },
  overlay: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
  spatialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  spatialText: {
    fontSize: 8,
    fontFamily: 'InstrumentSerif_400Regular',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },

  // Weather widget
  weatherCard: {
    position: 'absolute',
    left: 16,
    top: 120,
    width: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  weatherInner: { padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  weatherTemp: { color: '#fff', fontSize: 14, fontFamily: 'InstrumentSerif_400Regular' },
  weatherDetails: { gap: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontFamily: 'Inter_500Medium' },
  weatherDemoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 7,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 6,
  },

  // Controls
  mapControls: { position: 'absolute', right: 16, top: 120, gap: 10 },
  controlItem: { width: 44, height: 44, borderRadius: 16, overflow: 'hidden' },
  controlInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Pin overlay
  pin: { position: 'absolute', alignItems: 'center' },
  pinWrapper: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  pinPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 2 },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  pinLabel: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pinText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0.5,
  },

  // Bottom Sheet
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderWidth: 1,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, fontFamily: 'Inter_500Medium', opacity: 0.6 },
  addPlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addPlotText: { color: '#fff', fontFamily: 'InstrumentSerif_400Regular', fontSize: 12 },

  // Fields Scroll
  fieldsScroll: { gap: 10, paddingRight: 16 },
  fieldCard: { width: 140, padding: 12, borderRadius: 16, borderWidth: 1 },
  fieldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldCardTitle: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  fieldCardArea: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: {
    fontSize: 8,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular' },
  divider: { width: 1, height: '50%', alignSelf: 'center', opacity: 0.2 },

  fullAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  fullAnalysisText: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },

  // Voice Guidance UI
  voiceGuidanceCard: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 80,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 30,
  },
  voiceGuidanceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.3)',
    backgroundColor: 'rgba(10,26,11,0.75)',
  },
  voiceGuidanceText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold', flex: 1 },
  voiceIconPulse: { padding: 4 },
});
