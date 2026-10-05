import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Minus,
  Droplets,
  AlertTriangle,
  Target,
  Menu,
  Bell,
  Info,
  Check,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react-native';
import MapView, {
  Polygon as MapPolygon,
  Marker,
  PROVIDER_GOOGLE,
} from '../../components/MapViewWrapper';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

// Data representing the farm zones (fields)
import { ZoneData, ZONES } from '../../constants/FarmData';

type MapFilter = 'productivity' | 'ndvi' | 'ph';

export default function FarmHub() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const agroId = useKilimoStore((s) => s.agroId);

  const [activeZoneId, setActiveZoneId] = useState<number>(42);
  const [activeFilter, setActiveFilter] = useState<MapFilter>('productivity');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldSearchFocused, setFieldSearchFocused] = useState(false);

  // Pulsing Warnings Shared Values
  const pulseVal = useSharedValue(0.9);
  const pulseOpacity = useSharedValue(0.7);

  React.useEffect(() => {
    pulseVal.value = withRepeat(
      withSequence(withTiming(1.25, { duration: 900 }), withTiming(0.9, { duration: 900 })),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 900 }), withTiming(0.7, { duration: 900 })),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseVal.value }],
    opacity: pulseOpacity.value,
  }));

  // Localized Farm Name
  const farmName = useMemo(() => {
    if (agroId?.name) {
      return language === 'sw' ? `Shamba la ${agroId.name}` : `${agroId.name} Farm`;
    }
    return language === 'sw' ? 'Shamba la North Valleya' : 'North Valleya Farm';
  }, [agroId, language]);

  // Zoom configuration coordinates
  const viewBox = useMemo(() => {
    // Find bounding box for active zone to frame it perfectly
    const activeZone = ZONES.find((z) => z.id === activeZoneId);
    let lat = -6.828;
    let lng = 37.6695;
    if (activeZone && zoomLevel > 1.0) {
      lat = activeZone.centerLat;
      lng = activeZone.centerLng;
    }
    // Return Region
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005 / zoomLevel,
      longitudeDelta: 0.005 / zoomLevel,
    };
  }, [zoomLevel, activeZoneId]);

  const activeZone = useMemo(() => {
    return ZONES.find((z) => z.id === activeZoneId) || ZONES[0];
  }, [activeZoneId]);

  // Filtered zones based on search query
  const filteredZones = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ZONES;
    return ZONES.filter(
      (z) =>
        z.nameEn.toLowerCase().includes(query) ||
        z.nameSw.toLowerCase().includes(query) ||
        z.cropEn.toLowerCase().includes(query) ||
        z.cropSw.toLowerCase().includes(query) ||
        z.id.toString() === query
    );
  }, [searchQuery]);

  // Function to determine polygon color depending on active filter and zone values
  const getZoneColor = (zone: ZoneData) => {
    if (activeFilter === 'productivity') {
      if (zone.productivity === 'High') return colors.primary;
      if (zone.productivity === 'Average') return '#3D7A29';
      return '#F59E0B'; // Low
    }
    if (activeFilter === 'ndvi') {
      if (zone.ndvi >= 0.8) return '#0D3807';
      if (zone.ndvi >= 0.6) return '#246219';
      if (zone.ndvi >= 0.5) return '#4B8D3D';
      return '#8EBD81';
    }
    // Soil pH
    if (zone.ph < 6.0) return '#EA580C'; // Acidic (Orange)
    if (zone.ph <= 7.0) return colors.primary; // Optimal (Green)
    return '#0891B2'; // Alkaline (Teal)
  };

  const handleZoneSelect = (id: number) => {
    Haptics.selectionAsync();
    setActiveZoneId(id);
  };

  const handleZoom = (type: 'in' | 'out') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel((prev) => {
      if (type === 'in') return Math.min(2.5, prev + 0.3);
      return Math.max(1.0, prev - 0.3);
    });
  };

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safe}>
          {/* ── Top Header ───────────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Menu"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Menu size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{farmName}</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Bell size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.mainContent}>
            {/* ── Search Input overlay ────────────────────────────── */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card,
                  borderColor: fieldSearchFocused ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.searchIconWrap,
                  {
                    backgroundColor: (fieldSearchFocused ? colors.primary : colors.textMute) + '18',
                  },
                ]}
              >
                <Search size={16} color={fieldSearchFocused ? colors.primary : colors.textMute} />
              </View>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={
                  language === 'sw'
                    ? 'Tafuta maeneo, ukanda au sensa..'
                    : 'Search fields, zone or sensor..'
                }
                placeholderTextColor={colors.textMute}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setFieldSearchFocused(true)}
                onBlur={() => setFieldSearchFocused(false)}
                accessibilityLabel="Search Fields"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear"
                >
                  <View
                    style={[styles.searchClearBtn, { backgroundColor: colors.textMute + '20' }]}
                  >
                    <X size={12} color={colors.textMute} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── SVG Map Visualizer ───────────────────────────────── */}
            <View
              style={[
                styles.mapContainer,
                {
                  borderRadius: 0,
                  marginHorizontal: -16,
                  marginTop: -8,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <MapView style={StyleSheet.absoluteFillObject} mapType="satellite" region={viewBox}>
                {filteredZones.map((zone) => {
                  const isSelected = activeZoneId === zone.id;
                  const fillColor = getZoneColor(zone);

                  return (
                    <MapPolygon
                      key={zone.id}
                      coordinates={(zone as any).coordinates}
                      fillColor={isSelected ? fillColor + '80' : fillColor + '30'}
                      strokeColor={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isSelected ? 3 : 1}
                      tappable={true}
                      onPress={() => handleZoneSelect(zone.id)}
                    />
                  );
                })}

                {/* Markers for specific zones */}
                {filteredZones.some((z) => z.id === 8) && (
                  <Marker coordinate={{ latitude: -6.829, longitude: 37.6688 }}>
                    <View style={[styles.hudBadge, { position: 'relative', left: 0, top: 0 }]}>
                      <Droplets size={10} color="#3b82f6" />
                      <Text style={styles.hudBadgeText}>
                        {language === 'sw' ? 'Unyevu 82%' : '82% Humidity'}
                      </Text>
                    </View>
                  </Marker>
                )}

                {filteredZones.some((z) => z.id === 12) && (
                  <Marker coordinate={{ latitude: -6.8268, longitude: 37.6705 }}>
                    <View style={[styles.hudLabel, { position: 'relative', left: 0, top: 0 }]}>
                      <Text style={styles.hudLabelText}>
                        {language === 'sw' ? 'Nitrojeni Chini' : 'Low Nitrogen'}
                      </Text>
                    </View>
                  </Marker>
                )}
              </MapView>

              {/* Filter selectors floating over map */}
              <View
                style={[
                  styles.filterContainer,
                  { position: 'absolute', top: 10, left: 16, right: 16, zIndex: 10 },
                ]}
              >
                {(['productivity', 'ndvi', 'ph'] as MapFilter[]).map((filter) => {
                  const active = activeFilter === filter;
                  let label = '';
                  if (filter === 'productivity')
                    label = language === 'sw' ? 'Uzalishaji' : 'Productivity';
                  if (filter === 'ndvi') label = 'NDVI Index';
                  if (filter === 'ph') label = 'Soil pH';

                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setActiveFilter(filter);
                      }}
                      style={[
                        styles.filterPill,
                        { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.9)' },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          active && styles.filterTextActive,
                          { color: active ? '#FCFBF7' : colors.primary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Active Selection Bottom Details Card ────────────── */}
            <View style={styles.bottomSheetContainer}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/field/${activeZone.id}`);
                }}
              >
                {/* Card shell */}
                <View
                  style={[
                    styles.bottomSheet,
                    {
                      backgroundColor: isDark ? '#0b150d' : '#ffffff',
                      borderColor:
                        activeZone.alertType === 'warning'
                          ? 'rgba(245,158,11,0.35)'
                          : isDark
                            ? colors.primary + '33'
                            : colors.primary + '40',
                      padding: 0,
                      flexDirection: 'row',
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {/* ── Left accent strip ── */}
                  <LinearGradient
                    colors={
                      activeZone.alertType === 'warning'
                        ? ['#F59E0B', '#D97706']
                        : [colors.primary, '#1C4A29']
                    }
                    style={{ width: 4, alignSelf: 'stretch' }}
                  />

                  {/* ── Main content ── */}
                  <View style={{ flex: 1, padding: 15 }}>
                    {/* Header row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        {/* Micro label + live dot */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            marginBottom: 3,
                          }}
                        >
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor:
                                activeZone.alertType === 'warning' ? '#F59E0B' : colors.primary,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 8.5,
                              fontFamily: 'Inter_700Bold',
                              color:
                                activeZone.alertType === 'warning' ? '#F59E0B' : colors.primary,
                              letterSpacing: 1.6,
                              textTransform: 'uppercase',
                            }}
                          >
                            {language === 'sw' ? 'UCHAGUZI WA SASA' : 'ACTIVE SELECTION'}
                          </Text>
                        </View>
                        {/* Zone title — editorial serif */}
                        <Text
                          style={{
                            fontFamily: 'InstrumentSerif_400Regular',
                            fontSize: 20,
                            lineHeight: 23,
                            color: colors.text,
                          }}
                        >
                          {language === 'sw' ? activeZone.nameSw : activeZone.nameEn}
                        </Text>
                        {/* Status message */}
                        <Text
                          style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 11,
                            color: colors.textMute,
                            marginTop: 3,
                          }}
                        >
                          {language === 'sw' ? activeZone.messageSw : activeZone.messageEn}
                        </Text>
                      </View>

                      {/* Recenter pill button */}
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setZoomLevel(1.5);
                        }}
                        style={[styles.recenterBtn, { backgroundColor: colors.primaryLight }]}
                        accessibilityRole="button"
                        accessibilityLabel="Recenter map"
                      >
                        <Target size={15} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Thin rule */}
                    <View
                      style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }}
                    />

                    {/* ── Metrics grid ── */}
                    <View style={{ flexDirection: 'row', gap: 7 }}>
                      {(
                        [
                          {
                            key: 'size',
                            label: language === 'sw' ? 'UKUBWA' : 'SIZE',
                            value: activeZone.area,
                            pct: 0.45,
                            barColor: colors.primary,
                          },
                          {
                            key: 'ndvi',
                            label: 'NDVI',
                            value: String(activeZone.ndvi),
                            pct: activeZone.ndvi,
                            barColor: colors.primary,
                          },
                          {
                            key: 'ph',
                            label: 'PH',
                            value: String(activeZone.ph),
                            pct: activeZone.ph / 14,
                            barColor:
                              activeZone.ph < 6.0
                                ? '#EA580C'
                                : activeZone.ph <= 7.0
                                  ? colors.primary
                                  : '#0891B2',
                          },
                          {
                            key: 'moisture',
                            label: language === 'sw' ? 'UNYEVU' : 'MOIST.',
                            value: activeZone.moisture,
                            pct: parseInt(activeZone.moisture) / 100,
                            barColor: '#3B82F6',
                          },
                        ] as {
                          key: string;
                          label: string;
                          value: string;
                          pct: number;
                          barColor: string;
                        }[]
                      ).map((m) => (
                        <View
                          key={m.key}
                          style={{
                            flex: 1,
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.025)',
                            borderRadius: 11,
                            padding: 9,
                            borderWidth: 1,
                            borderColor: colors.border,
                            overflow: 'hidden',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 7,
                              fontFamily: 'Inter_700Bold',
                              color: colors.textMute,
                              letterSpacing: 0.8,
                              marginBottom: 5,
                            }}
                          >
                            {m.label}
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'InstrumentSerif_400Regular',
                              fontSize: 15,
                              color: colors.text,
                            }}
                          >
                            {m.value}
                          </Text>
                          {/* Percentage fill bar */}
                          <View
                            style={{
                              height: 2,
                              backgroundColor: colors.border,
                              borderRadius: 1,
                              marginTop: 8,
                            }}
                          >
                            <View
                              style={{
                                height: 2,
                                borderRadius: 1,
                                backgroundColor: m.barColor,
                                width: `${Math.min(Math.round(m.pct * 100), 100)}%`,
                              }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* ── Nutrient section ── */}
                    <View
                      style={{
                        marginTop: 10,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderRadius: 13,
                        padding: 11,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      {/* Section header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          marginBottom: 10,
                        }}
                      >
                        <Sparkles size={11} color={colors.primary} />
                        <Text
                          style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 10,
                            color: colors.text,
                            letterSpacing: 0.3,
                          }}
                        >
                          {language === 'sw'
                            ? 'Uchambuzi wa Virutubisho'
                            : 'Soil Nutrient Analysis'}
                        </Text>
                      </View>

                      {/* N / P / K rows */}
                      {(
                        [
                          {
                            key: 'n',
                            symbol: 'N',
                            name: language === 'sw' ? 'Nitrojeni' : 'Nitrogen',
                            data: activeZone.nitrogen,
                          },
                          {
                            key: 'p',
                            symbol: 'P',
                            name: language === 'sw' ? 'Fosforasi' : 'Phosphorus',
                            data: activeZone.phosphorus,
                          },
                          {
                            key: 'k',
                            symbol: 'K',
                            name: language === 'sw' ? 'Potasiamu' : 'Potassium',
                            data: activeZone.potassium,
                          },
                        ] as {
                          key: string;
                          symbol: string;
                          name: string;
                          data: {
                            statusEn: string;
                            statusSw: string;
                            value: string;
                            color: string;
                          };
                        }[]
                      ).map((n, i) => (
                        <View key={n.key} style={{ marginBottom: i < 2 ? 8 : 0 }}>
                          {/* Label row */}
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {/* Symbol badge */}
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 5,
                                  backgroundColor: n.data.color + '22',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontFamily: 'Inter_800ExtraBold',
                                    fontSize: 8.5,
                                    color: n.data.color,
                                  }}
                                >
                                  {n.symbol}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontFamily: 'Inter_600SemiBold',
                                  fontSize: 10,
                                  color: colors.textMute,
                                }}
                              >
                                {n.name}
                              </Text>
                            </View>
                            {/* Status pill */}
                            <View
                              style={{
                                backgroundColor: n.data.color + '18',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 20,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: 'Inter_700Bold',
                                  fontSize: 9,
                                  color: n.data.color,
                                }}
                              >
                                {language === 'sw' ? n.data.statusSw : n.data.statusEn}
                              </Text>
                            </View>
                          </View>
                          {/* Progress bar */}
                          <View
                            style={{ height: 3, backgroundColor: colors.border, borderRadius: 1.5 }}
                          >
                            <LinearGradient
                              colors={
                                // Zone nutrient data (constants/FarmData.ts) marks "Optimal"
                                // readings with '#22d15a', a green distinct from the theme's
                                // colors.primary — matching against colors.primary here made
                                // every optimal N/P/K bar fall through to the red gradient.
                                n.data.color === '#22d15a' || n.data.color === colors.primary
                                  ? [colors.primary, '#1C4A29']
                                  : n.data.color === '#D97706'
                                    ? ['#FBBF24', '#D97706']
                                    : ['#F87171', '#DC2626']
                              }
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{ height: 3, borderRadius: 1.5, width: n.data.value as any }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Tap hint */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 9,
                        gap: 3,
                        opacity: 0.38,
                      }}
                    >
                      <ChevronRight size={9} color={colors.textMute} />
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 9,
                          color: colors.textMute,
                        }}
                      >
                        {language === 'sw' ? 'Gusa kwa maelezo zaidi' : 'Tap for full details'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating circular Add (+) button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/crop-planning');
            }}
            activeOpacity={0.85}
            style={styles.floatingAddBtn}
            accessibilityRole="button"
            accessibilityLabel="Add Field"
          >
            <Plus size={24} color="#FCFBF7" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 54,
    marginTop: 8,
    gap: 10,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    height: '100%',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  filterTextActive: {
    color: '#FCFBF7',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 20,
    position: 'relative',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  zoomBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: 1,
  },
  hudBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hudBadgeIcon: {
    marginRight: 2,
  },
  hudBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  hudLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(217, 119, 6, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hudLabelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Inter_800ExtraBold',
  },
  hudWarningDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bottomSheet: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeSelectionLabel: {
    fontSize: 9,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#2E6F40',
    letterSpacing: 1.2,
  },
  activeZoneTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 2,
  },
  recenterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricName: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 4,
  },
  nutrientsBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  nutrientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  nutrientsTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  nutrientsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  nutrientElem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutrientLabel: {
    fontSize: 11,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  nutrientVal: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
  },
  elemDivider: {
    width: 1,
    marginVertical: 2,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: '#2E6F40',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 30,
  },

  // Map HUD Pulsing Indicator Styles
  hudLabelPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
  },
  hudWarningDotContainer: {
    position: 'absolute',
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudWarningRingPulse: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#EA580C',
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
  },
});
