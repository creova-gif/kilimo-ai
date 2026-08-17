import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Droplets, Target, Combine, Check, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { ZONES } from '../constants/FarmData';
import MapView, { Polygon, PROVIDER_GOOGLE } from '../components/MapViewWrapper';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

const { width: SW } = Dimensions.get('window');

// No connection to real farm equipment (ISOBUS/ISO-XML export, a
// spreader/sprayer controller API, or any equipment vendor integration)
// exists anywhere in this codebase. Before this fix, handlePush() faked a
// 2-second "sending" delay and then claimed "Synced Successfully" —
// nothing was ever sent anywhere. Real equipment integration is a genuine
// hardware/business decision (which controllers to support, what export
// format, dealer partnerships) — flagged, not invented here.
const VRA_EQUIPMENT_SYNC_LIVE = false;

const INPUT_TYPES = [
  { id: 'fertilizer', labelEn: 'Fertilizer', labelSw: 'Mbolea', icon: Target },
  { id: 'water', labelEn: 'Irrigation', labelSw: 'Maji', icon: Droplets },
  { id: 'pesticide', labelEn: 'Pesticide', labelSw: 'Dawa', icon: ShieldAlert },
];

export default function VRASetupScreen() {
  const { zoneId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const addNotification = useKilimoStore((s) => s.addNotification);

  const [activeInput, setActiveInput] = useState('fertilizer');
  const [baseRate, setBaseRate] = useState(150); // kg/ha or L/ha
  const [isPushing, setIsPushing] = useState(false);

  const zone = ZONES.find((z) => z.id === Number(zoneId));

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
          Zone Not Found
        </Text>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const minLat = Math.min(...zone.coordinates.map((c) => c.latitude));
  const maxLat = Math.max(...zone.coordinates.map((c) => c.latitude));
  const minLng = Math.min(...zone.coordinates.map((c) => c.longitude));
  const maxLng = Math.max(...zone.coordinates.map((c) => c.longitude));

  const handlePush = () => {
    if (!VRA_EQUIPMENT_SYNC_LIVE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      addNotification({
        title: language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
        body:
          language === 'sw'
            ? 'Kuunganisha moja kwa moja na mtambo bado hakujawezeshwa. Ramani hii ni onyesho tu.'
            : 'Direct equipment sync is not live yet. This map is a preview only.',
        type: 'warning',
      });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsPushing(true);
    setTimeout(() => {
      setIsPushing(false);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 2000);
  };

  // Generate grid cells for VRA map visualization
  const gridCells = [];
  const gridRows = 4;
  const gridCols = 4;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const latStep = (maxLat - minLat) / gridRows;
      const lngStep = (maxLng - minLng) / gridCols;

      const cellMinLat = minLat + r * latStep;
      const cellMaxLat = cellMinLat + latStep;
      const cellMinLng = minLng + c * lngStep;
      const cellMaxLng = cellMinLng + lngStep;

      // Randomize intensity based on active input
      const intensity = Math.random();
      let color: string;

      if (activeInput === 'fertilizer') {
        color = intensity > 0.6 ? '#D97706' : intensity > 0.3 ? '#10B981' : colors.primary;
      } else if (activeInput === 'water') {
        color = intensity > 0.6 ? '#3B82F6' : '#93C5FD';
      } else {
        color = intensity > 0.5 ? '#EF4444' : '#FCA5A5';
      }

      gridCells.push({
        id: `${r}-${c}`,
        color: color + '80', // Add 50% opacity
        coordinates: [
          { latitude: cellMinLat, longitude: cellMinLng },
          { latitude: cellMaxLat, longitude: cellMinLng },
          { latitude: cellMaxLat, longitude: cellMaxLng },
          { latitude: cellMinLat, longitude: cellMaxLng },
        ],
      });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backBtn}
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>VRA Setup</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Input Type</Text>
          <View style={styles.segmentedControl}>
            {INPUT_TYPES.map((input) => {
              const Icon = input.icon;
              const isActive = activeInput === input.id;
              return (
                <TouchableOpacity
                  key={input.id}
                  style={[styles.segmentBtn, isActive && { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveInput(input.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Icon color={isActive ? '#FFF' : colors.text + '80'} size={20} />
                  <Text
                    style={[
                      styles.segmentText,
                      isActive ? { color: '#FFF' } : { color: colors.text + '80' },
                    ]}
                  >
                    {language === 'sw' ? input.labelSw : input.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescription Map</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text + '70' }]}>
            {language === 'sw'
              ? 'Onyesho la mfano — si data ya vihisi vya udongo au setilaiti ya moja kwa moja.'
              : 'Illustrative preview — not derived from live soil sensor or satellite data.'}
          </Text>
          <View style={styles.mapWrapper}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: zone.centerLat,
                longitude: zone.centerLng,
                latitudeDelta: (maxLat - minLat) * 2.5 || 0.005,
                longitudeDelta: (maxLng - minLng) * 2.5 || 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              mapType="satellite"
            >
              {gridCells.map((cell) => (
                <Polygon
                  key={cell.id}
                  coordinates={cell.coordinates}
                  fillColor={cell.color}
                  strokeColor="rgba(255,255,255,0.2)"
                  strokeWidth={1}
                />
              ))}
            </MapView>
          </View>
        </Animated.View>

        <Animated.View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Rate</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: colors.text }]}>Base Rate</Text>
              <Text style={[styles.sliderValue, { color: colors.primary }]}>
                {baseRate} {activeInput === 'water' ? 'L/ha' : 'kg/ha'}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={500}
              step={10}
              value={baseRate}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                setBaseRate(val);
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Footer */}
      <View
        style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      >
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={handlePush}
          disabled={isPushing}
        >
          {isPushing ? <Check color="#FFF" size={24} /> : <Combine color="#FFF" size={24} />}
          <Text style={styles.primaryBtnText}>
            {isPushing
              ? language === 'sw'
                ? 'Imetumwa'
                : 'Synced Successfully'
              : language === 'sw'
                ? 'Tuma Kwenye Mtambo'
                : 'Sync to Equipment'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    marginTop: -12,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  segmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  mapWrapper: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  sliderValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
