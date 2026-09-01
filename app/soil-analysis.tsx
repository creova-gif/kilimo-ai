import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Info,
  Sprout,
  ArrowUpRight,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
} from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Polyline,
  Circle as SvgCircle,
  Rect,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';
import { useKilimoStore } from '../store/useKilimoStore';

// `|| 360` guards against Dimensions.get('window').width reading 0 on first
// web hydration (0 is never a real device width, and a destructure default
// wouldn't catch it since 0 is defined) — an unguarded 0 here flowed into
// negative <Svg>/<Rect> widths downstream (real console error + broken flash).
const SW = Dimensions.get('window').width || 360;

// ─── Soil pH Trend SVG Chart ───────────────────────────────────────────────────
function SoilPHTrendChart({
  data,
  months,
  colors,
}: {
  data: number[];
  months: string[];
  colors: any;
}) {
  // Clamp: window width can read 0 on first web hydration, which fed a
  // negative width into the SVG chart (console error + broken flash).
  const chartW = Math.max(1, SW - 80);
  const chartH = 80;
  const max = 7.5;
  const min = 4.5;
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * (chartW - 20) + 10;
      const y = chartH - ((val - min) / (max - min || 1)) * (chartH - 20) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ marginVertical: 12, height: chartH }}>
      <Svg width={chartW} height={chartH}>
        <Rect width={chartW} height={chartH} fill="rgba(0,0,0,0.02)" rx={8} />

        {/* pH Reference Lines */}
        <SvgLine
          x1="10"
          y1={chartH - ((6.5 - min) / (max - min)) * (chartH - 20) - 15}
          x2={chartW - 10}
          y2={chartH - ((6.5 - min) / (max - min)) * (chartH - 20) - 15}
          stroke={colors.primary}
          strokeDasharray="3,3"
          strokeWidth="1"
        />
        <SvgText
          x={chartW - 35}
          y={chartH - ((6.5 - min) / (max - min)) * (chartH - 20) - 18}
          fontSize="7"
          fill={colors.primary}
          fontFamily="Inter_700Bold"
        >
          Optimum (6.5)
        </SvgText>

        <Polyline fill="none" stroke="#ef4444" strokeWidth="2.5" points={points} />
        {data.map((val, index) => {
          const x = (index / (data.length - 1)) * (chartW - 20) + 10;
          const y = chartH - ((val - min) / (max - min || 1)) * (chartH - 20) - 15;
          return (
            <React.Fragment key={index}>
              <SvgCircle
                cx={x}
                cy={y}
                r="3.5"
                fill={val < 5.5 ? '#ef4444' : colors.primary}
                stroke="#FFF"
                strokeWidth="1.5"
              />
              <SvgText
                x={x}
                y={y - 6}
                fontSize="7.5"
                fontFamily="Inter_700Bold"
                fill={colors.text}
                textAnchor="middle"
              >
                {val}
              </SvgText>
              <SvgText
                x={x}
                y={chartH - 2}
                fontSize="7"
                fontFamily="Inter_600SemiBold"
                fill={colors.textMute}
                textAnchor="middle"
              >
                {months[index]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export default function SoilAnalysis() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#0a2010', '#0c1a08', '#071205'] : ['#1a4a22', '#0d2e12', '#082009']}
          style={styles.heroBackground}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
              >
                <ChevronLeft color="#FFF" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Sprout size={11} color={colors.primary} />
                <Text style={styles.heroBadgeText}>
                  {language === 'sw' ? 'UCHAMBUZI' : 'ANALYSIS'}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {language === 'sw' ? 'Uchunguzi wa Udongo' : 'Soil Nutrient Analysis'}
              </Text>
              <Text style={styles.heroSub}>
                {language === 'sw' ? 'Tathmini afya ya udongo wako' : 'Assess your soil health'}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* N-P-K Status Card */}
        <View style={styles.contentPadding}>
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.statusHeader}>
              <View>
                <Text style={[styles.statusLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'Matokeo ya Udongo' : 'Soil Results'}
                </Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusMain, { color: '#ef4444' }]}>
                    {language === 'sw' ? 'Hakuna kipimo kilichounganishwa' : 'No test connected'}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoIcon, { backgroundColor: colors.background }]}>
                <Info size={20} color={colors.textMute} />
              </View>
            </View>

            <Text style={[styles.noResultsBody, { color: colors.textMute }]}>
              {language === 'sw'
                ? 'Unganisha chanzo cha kipimo cha udongo au weka matokeo ya maabara ili kuona N, P, K na pH hapa.'
                : 'Connect a soil-test source or enter laboratory results to view N, P, K, and pH here.'}
            </Text>
          </View>

          {/* Soil pH Anomaly Alert Banner */}
          <View
            style={[
              styles.anomalyAlert,
              { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' },
            ]}
          >
            <ShieldAlert size={20} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.anomalyTitle}>
                {language === 'sw' ? 'KIPIMO CHA pH KINAHITAJIKA' : 'SOIL pH TEST REQUIRED'}
              </Text>
              <Text style={styles.anomalyDesc}>
                {language === 'sw'
                  ? 'Hakuna historia ya pH au kipimo cha Block A kilichounganishwa kwenye app.'
                  : 'No pH history or Block A test result is connected to the app.'}
              </Text>
            </View>
          </View>

          {/* Soil pH History Line Chart Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'sw'
              ? 'Historia ya pH'
              : 'pH History'}
          </Text>
          <View
            style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_500Medium',
                color: colors.textMute,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {language === 'sw'
                ? 'Historia itapatikana baada ya vipimo vya udongo kuhifadhiwa. Viwango sahihi hutegemea zao na aina ya udongo.'
                : 'History will appear after soil tests are saved. Suitable ranges depend on the crop and soil type.'}
            </Text>
          </View>

          {/* Urgent Recommendations */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'sw' ? 'Mapendekezo ya Haraka' : 'Urgent Recommendations'}
          </Text>

          <RecommendationItem
            title={
              language === 'sw'
                ? 'Weka Chokaa cha Kilimo (Agri-Lime)'
                : 'Apply Agriculture Agri-Lime'
            }
            desc={
              language === 'sw'
                ? 'Weka tani 1.5 za Minjingu Agri-Lime kwa hekta ili kupunguza asidi na kupandisha pH.'
                : 'Apply 1.5 Tonnes of Minjingu Agri-Lime per hectare to raise pH back to optimum.'
            }
            imageUri="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=300&auto=format&fit=crop"
            onPress={() => router.push('/tasks' as any)}
            btnText={language === 'sw' ? 'Tengeneza Kazi' : 'Create Task'}
          />

          <RecommendationItem
            title={
              language === 'sw'
                ? 'Badilisha Mazao yanayohimili Asidi'
                : 'Shift to Acid-Tolerant Crops'
            }
            desc={
              language === 'sw'
                ? 'Hustawisha chai, muhogo, au viazi vitamu ambavyo vinaweza kuhimili pH ya chini hadi 5.0.'
                : 'Plant acid-tolerant crops like tea, cassava, or sweet potatoes if soil pH remains low.'
            }
            imageUri="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=300&auto=format&fit=crop"
            onPress={() => router.push('/crop-library' as any)}
            btnText={language === 'sw' ? 'Maktaba ya Mazao' : 'Crop Library'}
          />

          <RecommendationItem
            title={language === 'sw' ? 'Epuka Mbolea zenye Ammonium' : 'Avoid Ammonium Fertilizers'}
            desc={
              language === 'sw'
                ? 'Mbolea zenye ammonium (e.g. Ammonium Sulphate) huongeza zaidi asidi kwenye udongo.'
                : 'Avoid acidifying ammonium-based fertilizers. Prefer nitrate-based nitrogen sources.'
            }
            imageUri="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=300&auto=format&fit=crop"
            onPress={() => router.push('/consultations' as any)}
            btnText={language === 'sw' ? 'Ongea na Mtaalamu' : 'Ask Agronomist'}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function NutrientBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.barItem}>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabelText, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.barValueText, { color: colors.textMute }]}>{value}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RecommendationItem({
  title,
  desc,
  imageUri,
  onPress,
  btnText,
}: {
  title: string;
  desc: string;
  imageUri: string;
  onPress: () => void;
  btnText: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: imageUri }} style={styles.recImage} />
      <View style={styles.recContent}>
        <Text style={[styles.recTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.recDesc, { color: colors.textMute }]} numberOfLines={3}>
          {desc}
        </Text>
        <TouchableOpacity
          style={styles.recAction}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={btnText}
        >
          <Text style={styles.recActionText}>{btnText}</Text>
          <ChevronLeft
            color={colors.primary}
            size={14}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroBackground: {
    width: '100%',
    height: 230,
    justifyContent: 'flex-start',
  },
  headerSafe: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46, 111, 64,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#2E6F40',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: -30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusMain: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
  },
  noResultsBody: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    gap: 16,
  },
  barItem: {
    width: '100%',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabelText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  barValueText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  barTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  anomalyAlert: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  anomalyTitle: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#ef4444',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  anomalyDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 24,
    marginBottom: 4,
  },
  chartCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  recCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 124,
  },
  recImage: {
    width: 100,
    height: '100%',
  },
  recContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  recTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  recDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 15,
  },
  recAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46, 111, 64, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginTop: 2,
  },
  recActionText: {
    color: '#2E6F40',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
