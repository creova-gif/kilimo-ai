import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
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
import { useKilimoStore } from '../store/useKilimoStore';

const PH_MIN_HEALTHY = 6.0;
const PH_MAX_HEALTHY = 7.0;

export default function SoilAnalysis() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const farmVitals = useKilimoStore((s) => s.farmVitals);

  // Real per-user reading — no historical soil-pH tracking exists anywhere
  // in this app (no sensor/lab-report intake flow), so this page previously
  // fabricated a fake 6-month "6.8 → 5.2" drop and an unconditional "CRITICAL
  // pH ANOMALY" alert for every single user, regardless of their actual soil
  // — including a prescriptive "apply 1.5 tonnes of lime" recommendation.
  // Now grounded in the one real data point that does exist.
  const soilPh = farmVitals.soilPh;
  const isAcidic = soilPh < PH_MIN_HEALTHY;
  const isAlkaline = soilPh > PH_MAX_HEALTHY;
  const isOffOptimal = isAcidic || isAlkaline;

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
                  {language === 'sw' ? 'Afya ya Udongo' : 'Overall Soil Health'}
                </Text>
                <View style={styles.statusRow}>
                  <Text
                    style={[styles.statusMain, { color: isOffOptimal ? '#ef4444' : colors.primary }]}
                  >
                    {isAcidic
                      ? language === 'sw'
                        ? 'Tishio la Asidi'
                        : 'Acidic Alert'
                      : isAlkaline
                        ? language === 'sw'
                          ? 'pH ya Juu'
                          : 'Alkaline Alert'
                        : language === 'sw'
                          ? 'pH ni Sawa'
                          : 'pH is Healthy'}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoIcon, { backgroundColor: colors.background }]}>
                <Info size={20} color={colors.textMute} />
              </View>
            </View>

            {/* Current pH reading — the one real per-user data point this
                app has. N-P-K breakdown below is illustrative (no nutrient
                sensor or lab-report intake exists yet), labeled honestly. */}
            <View style={styles.phReadingRow}>
              <Text style={[styles.phReadingValue, { color: colors.text }]}>
                {soilPh.toFixed(1)}
              </Text>
              <Text style={[styles.phReadingLabel, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'pH ya sasa · lengo 6.0–7.0'
                  : 'current pH · target 6.0–7.0'}
              </Text>
            </View>

            {/* Bars */}
            <View style={styles.barsContainer}>
              <View style={styles.sampleTagRow}>
                <Text style={[styles.sampleTag, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'MFANO — hakuna kipimo cha virutubisho bado'
                    : 'SAMPLE — no nutrient sensor data yet'}
                </Text>
              </View>
              <NutrientBar label="Nitrogen (N)" value={85} color={colors.primary} />
              <NutrientBar label="Phosphorus (P)" value={70} color="#F59E0B" />
              <NutrientBar label="Potassium (K)" value={60} color="#3b82f6" />
            </View>
          </View>

          {/* Soil pH Alert Banner — only shown when the real reading is
              actually off the healthy range, referencing the real value. */}
          {isOffOptimal && (
            <View
              style={[
                styles.anomalyAlert,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                },
              ]}
            >
              <ShieldAlert size={20} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.anomalyTitle}>
                  {language === 'sw' ? 'TAHADHARI YA pH YA UDONGO' : 'SOIL pH OUT OF RANGE'}
                </Text>
                <Text style={styles.anomalyDesc}>
                  {isAcidic
                    ? language === 'sw'
                      ? `pH ya udongo wako ni ${soilPh.toFixed(1)}, chini ya kiwango kinachopendekezwa (6.0–7.0). Udongo ni asidi.`
                      : `Your soil pH is ${soilPh.toFixed(1)}, below the recommended range (6.0–7.0). Soil is acidic.`
                    : language === 'sw'
                      ? `pH ya udongo wako ni ${soilPh.toFixed(1)}, juu ya kiwango kinachopendekezwa (6.0–7.0). Udongo ni alkali.`
                      : `Your soil pH is ${soilPh.toFixed(1)}, above the recommended range (6.0–7.0). Soil is alkaline.`}
                </Text>
              </View>
            </View>
          )}

          {!isOffOptimal && (
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_500Medium',
                color: colors.textMute,
                marginTop: 4,
              }}
            >
              {language === 'sw'
                ? 'Ufuatiliaji wa mwenendo wa pH kwa muda haujapatikana bado — thamani hii ni kipimo cha sasa pekee.'
                : 'Historical pH trend tracking isn’t available yet — this is your current reading only.'}
            </Text>
          )}

          {/* Recommendations */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isOffOptimal
              ? language === 'sw'
                ? 'Mapendekezo ya Haraka'
                : 'Urgent Recommendations'
              : language === 'sw'
                ? 'Endelea Kudumisha'
                : 'Keep It Up'}
          </Text>

          {isAcidic && (
            <>
              <RecommendationItem
                title={
                  language === 'sw'
                    ? 'Weka Chokaa cha Kilimo (Agri-Lime)'
                    : 'Apply Agriculture Agri-Lime'
                }
                desc={
                  language === 'sw'
                    ? 'Chokaa cha kilimo (agri-lime) hupunguza asidi ya udongo. Kiasi halisi kinachohitajika hutegemea kina cha udongo wako — muulize mtaalamu wa kilimo kabla ya kuweka.'
                    : 'Agricultural lime reduces soil acidity. The exact rate needed depends on your specific soil — confirm with a local agronomist before applying.'
                }
                imageUri="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=300&auto=format&fit=crop"
                onPress={() => router.push('/consultations' as any)}
                btnText={language === 'sw' ? 'Ongea na Mtaalamu' : 'Ask Agronomist'}
              />

              <RecommendationItem
                title={
                  language === 'sw'
                    ? 'Badilisha Mazao yanayohimili Asidi'
                    : 'Shift to Acid-Tolerant Crops'
                }
                desc={
                  language === 'sw'
                    ? 'Chai, muhogo, na viazi vitamu huvumilia udongo wenye asidi zaidi ya mazao mengine.'
                    : 'Tea, cassava, and sweet potatoes tolerate acidic soil better than many staple crops.'
                }
                imageUri="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=300&auto=format&fit=crop"
                onPress={() => router.push('/crop-library' as any)}
                btnText={language === 'sw' ? 'Maktaba ya Mazao' : 'Crop Library'}
              />

              <RecommendationItem
                title={
                  language === 'sw' ? 'Epuka Mbolea zenye Ammonium' : 'Avoid Ammonium Fertilizers'
                }
                desc={
                  language === 'sw'
                    ? 'Mbolea zenye ammonium (mfano Ammonium Sulphate) huongeza zaidi asidi kwenye udongo.'
                    : 'Ammonium-based fertilizers (e.g. Ammonium Sulphate) can further acidify soil that is already acidic.'
                }
                imageUri="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=300&auto=format&fit=crop"
                onPress={() => router.push('/consultations' as any)}
                btnText={language === 'sw' ? 'Ongea na Mtaalamu' : 'Ask Agronomist'}
              />
            </>
          )}

          {isAlkaline && (
            <RecommendationItem
              title={language === 'sw' ? 'Punguza Alkali ya Udongo' : 'Lower Soil Alkalinity'}
              desc={
                language === 'sw'
                  ? 'Kiwango cha pH kilicho juu kinaweza kuzuia mimea kunyonya baadhi ya virutubisho. Muulize mtaalamu wa kilimo kwa hatua zinazofaa eneo lako.'
                  : 'A high pH can block plants from absorbing certain nutrients. Ask a local agronomist for corrective steps suited to your area.'
              }
              imageUri="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=300&auto=format&fit=crop"
              onPress={() => router.push('/consultations' as any)}
              btnText={language === 'sw' ? 'Ongea na Mtaalamu' : 'Ask Agronomist'}
            />
          )}

          {!isOffOptimal && (
            <View
              style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {language === 'sw'
                  ? 'pH ya udongo wako iko ndani ya kiwango kinachopendekezwa. Endelea kufuatilia mara kwa mara.'
                  : 'Your soil pH is within the recommended range. Keep monitoring it periodically.'}
              </Text>
            </View>
          )}
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
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phReadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  phReadingValue: {
    fontSize: 32,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  phReadingLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  sampleTagRow: {
    marginBottom: 2,
  },
  sampleTag: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
