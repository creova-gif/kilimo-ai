import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Play,
  Filter,
  Globe,
  Clock,
  BookOpen,
  Sparkles,
  ChevronRight,
  XCircle,
  Tv,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useKilimoStore } from '../store/useKilimoStore';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Video Data ──────────────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  videoId: string;
  titleSw: string;
  titleEn: string;
  descSw: string;
  descEn: string;
  duration: string;
  category: 'maize' | 'vegetables' | 'irrigation' | 'livestock' | 'soil';
  language: 'sw' | 'en';
  uploader: string;
}

const VIDEOS_CATALOG: VideoItem[] = [
  {
    id: 'v1',
    videoId: 'q2KlyV45xZg', // Real/placeholder farming video ID
    titleSw: 'Mbinu za Kisasa za Kupanda Mahindi',
    titleEn: 'Modern Maize Planting Techniques',
    descSw:
      'Jifunze hatua kwa hatua jinsi ya kuandaa shamba, nafasi kati ya mistari, na matumizi sahihi ya mbolea ya kupandia kwa zao la mahindi.',
    descEn:
      'Learn step-by-step how to prepare your field, spacing guidelines, and proper fertilizer usage for maize planting.',
    duration: '8:45',
    category: 'maize',
    language: 'sw',
    uploader: 'TARI Tanzania',
  },
  {
    id: 'v2',
    videoId: 'jR73qWvW9sI',
    titleSw: 'Ufungaji wa Mifumo ya Umwagiliaji wa Matone',
    titleEn: 'Drip Irrigation Installation Guide',
    descSw:
      'Mwongozo rahisi wa jinsi ya kuweka mfumo wa umwagiliaji wa matone kwenye shamba ndogo ili kuokoa maji na kuongeza unyevu.',
    descEn:
      'A simple guide on how to set up a drip irrigation system on small farms to conserve water and maintain moisture.',
    duration: '12:10',
    category: 'irrigation',
    language: 'sw',
    uploader: 'Kilimo Kwanza',
  },
  {
    id: 'v3',
    videoId: 'dQw4w9WgXcQ',
    titleSw: 'Jinsi ya Kupima pH ya Udongo Nyumbani',
    titleEn: 'How to Test Soil pH at Home',
    descSw:
      'Njia rahisi ya kupima kiwango cha asidi na alkali ya udongo wako ukitumia vifaa vinavyopatikana kirahisi nyumbani.',
    descEn:
      'An easy method to test your soil pH level using simple tools available around the farm.',
    duration: '6:15',
    category: 'soil',
    language: 'en',
    uploader: 'AgriTech Global',
  },
  {
    id: 'v4',
    videoId: '8SgqKxM-6rM',
    titleSw: 'Ufugaji wa Kuku wa Kienyeji kwa Faida',
    titleEn: 'Commercial Free-Range Poultry Farming',
    descSw:
      'Jifunze mbinu bora za ujenzi wa mabanda, ulishaji, na kinga ya magonjwa ili kufanya ufugaji wa kuku kuwa na faida kubwa.',
    descEn:
      'Learn best practices for building coops, feeding, and disease prevention to make free-range poultry highly profitable.',
    duration: '15:30',
    category: 'livestock',
    language: 'sw',
    uploader: 'Mfugaji Bora',
  },
  {
    id: 'v5',
    videoId: 'eH6lI_g3FfI',
    titleSw: 'Kudhibiti Magonjwa ya Nyanya Greenhousini',
    titleEn: 'Greenhouse Tomato Disease Control',
    descSw:
      'Jinsi ya kutambua na kutibu magonjwa ya ukungu na virusi kwenye nyanya zinazozalishwa ndani ya greenhouse.',
    descEn:
      'How to identify and treat fungal and viral infections on tomatoes grown in greenhouse systems.',
    duration: '10:20',
    category: 'vegetables',
    language: 'en',
    uploader: 'HortiCulture Africa',
  },
  {
    id: 'v6',
    videoId: 'P_7lU1S8gJc',
    titleSw: 'Utayarishaji wa Mbolea ya Mboji ya Kikaboni',
    titleEn: 'Organic Compost Preparation Steps',
    descSw:
      'Jinsi ya kutumia mabaki ya mazao na kinyesi cha wanyama kutengeneza mboji yenye rutuba nyingi kwa ajili ya shamba lako.',
    descEn:
      'How to use crop residues and animal manure to create highly fertile compost for your farm fields.',
    duration: '9:05',
    category: 'soil',
    language: 'sw',
    uploader: 'Kilimo Hai',
  },
];

export default function VideoHubScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const language = useKilimoStore((s) => s.language);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'sw' | 'en'>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const categories = [
    { id: 'all', labelSw: 'Zote', labelEn: 'All' },
    { id: 'maize', labelSw: 'Mahindi', labelEn: 'Maize' },
    { id: 'vegetables', labelSw: 'Mbogamboga', labelEn: 'Vegetables' },
    { id: 'irrigation', labelSw: 'Umwagiliaji', labelEn: 'Irrigation' },
    { id: 'livestock', labelSw: 'Mifugo', labelEn: 'Livestock' },
    { id: 'soil', labelSw: 'Udongo', labelEn: 'Soil Health' },
  ];

  // Filtering Logic
  const filteredVideos = useMemo(() => {
    return VIDEOS_CATALOG.filter((vid) => {
      const title = language === 'sw' ? vid.titleSw : vid.titleEn;
      const desc = language === 'sw' ? vid.descSw : vid.descEn;
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        title.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || vid.category === selectedCategory;
      const matchesLanguage = selectedLanguage === 'all' || vid.language === selectedLanguage;

      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [searchQuery, selectedCategory, selectedLanguage, language]);

  const handlePlayVideo = (video: VideoItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedVideo(video);
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(false);
    setSelectedVideo(null);
  };

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Background Gradient */}
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[
              isDark ? colors.slate[950] : '#f1f5f9',
              isDark ? colors.slate[900] + 'ee' : colors.slate[100] + 'ee',
              'transparent',
            ]}
            style={styles.bgGradient}
          />
        </View>

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Maktaba ya Video' : 'Agriculture Video Hub'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'Miongozo rahisi ya picha na sauti'
                  : 'Simple audio-visual tutorials'}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <BlurView
              intensity={isDark ? 20 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.searchBlur, { borderColor: colors.border }]}
            >
              <Search size={18} color={colors.textMute} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                placeholder={
                  language === 'sw' ? 'Tafuta mada ya kilimo...' : 'Search farming topics...'
                }
                placeholderTextColor={colors.textMute}
                accessibilityLabel="Search videos input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search query"
                >
                  <XCircle size={18} color={colors.textMute} />
                </TouchableOpacity>
              )}
            </BlurView>
          </View>

          {/* Category Pills & Language Toggle Row */}
          <View style={styles.filtersSection}>
            {/* Language filters */}
            <View style={styles.langToggleRow}>
              <Globe size={14} color={colors.primary} />
              <Text style={[styles.langLabel, { color: colors.textMute }]}>
                {language === 'sw' ? 'Lugha ya Video:' : 'Video Language:'}
              </Text>
              <View
                style={[
                  styles.langSwitchBg,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                {(['all', 'sw', 'en'] as const).map((lang) => {
                  const isActive = selectedLanguage === lang;
                  const label =
                    lang === 'all' ? (language === 'sw' ? 'Zote' : 'All') : lang.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.langOption, isActive && { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedLanguage(lang);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                    >
                      <Text
                        style={[styles.langOptionText, { color: isActive ? '#fff' : colors.text }]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Category Scroller */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const label = language === 'sw' ? cat.labelSw : cat.labelEn;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      {
                        borderColor: isActive ? colors.primary : colors.border,
                        backgroundColor: isActive
                          ? isDark
                            ? colors.primary + '33'
                            : colors.primary + '0D'
                          : isDark
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat.id);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: isActive ? colors.text : colors.textMute },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Video Cards list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.videosGrid}>
              {filteredVideos.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Tv size={48} color={colors.textMute} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Hakuna Video Zilizopatikana' : 'No Videos Found'}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Jaribu kutafuta kwa kutumia neno lingine.'
                      : 'Try searching for another keyword.'}
                  </Text>
                </View>
              ) : (
                filteredVideos.map((video) => {
                  const title = language === 'sw' ? video.titleSw : video.titleEn;
                  const desc = language === 'sw' ? video.descSw : video.descEn;

                  return (
                    <BlurView
                      key={video.id}
                      intensity={isDark ? 20 : 60}
                      tint={isDark ? 'dark' : 'light'}
                      style={[styles.videoCard, { borderColor: colors.border }]}
                    >
                      <LinearGradient
                        colors={
                          isDark
                            ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                            : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                        }
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Thumbnail placeholder with play button overlay */}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.thumbnailContainer}
                        onPress={() => handlePlayVideo(video)}
                        accessibilityRole="button"
                        accessibilityLabel={`Play video: ${title}`}
                      >
                        <LinearGradient
                          colors={[colors.primary + '66', 'rgba(0,0,0,0.6)']}
                          style={StyleSheet.absoluteFill}
                        />

                        {/* Play overlay button */}
                        <View style={styles.playOverlay}>
                          <View
                            style={[styles.playButtonIconBg, { backgroundColor: colors.primary }]}
                          >
                            <Play size={24} color="#fff" fill="#fff" />
                          </View>
                        </View>

                        {/* Video specs badge */}
                        <View style={styles.durationBadge}>
                          <Clock size={10} color="#fff" />
                          <Text style={styles.durationText}>{video.duration}</Text>
                        </View>

                        <View style={styles.langBadge}>
                          <Globe size={10} color="#fff" />
                          <Text style={styles.langBadgeText}>{video.language.toUpperCase()}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Meta info */}
                      <View style={styles.metaContainer}>
                        <Text style={[styles.videoUploader, { color: colors.primary }]}>
                          {video.uploader}
                        </Text>
                        <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                          {title}
                        </Text>
                        <Text
                          style={[styles.videoDesc, { color: colors.textMute }]}
                          numberOfLines={2}
                        >
                          {desc}
                        </Text>
                      </View>
                    </BlurView>
                  );
                })
              )}
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>

        {/* 🎬 MODAL YOUTUBE VIDEO PLAYER */}
        <Modal
          visible={isPlaying && selectedVideo !== null}
          animationType="slide"
          presentationStyle="overFullScreen"
          transparent
          onRequestClose={handleClosePlayer}
        >
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
            <SafeAreaView style={styles.playerModalContainer}>
              {/* Player Header */}
              <View style={styles.playerHeader}>
                <TouchableOpacity
                  style={styles.playerCloseBtn}
                  onPress={handleClosePlayer}
                  accessibilityRole="button"
                  accessibilityLabel="Close video player"
                >
                  <XCircle size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.playerHeaderTitle} numberOfLines={1}>
                  {selectedVideo
                    ? language === 'sw'
                      ? selectedVideo.titleSw
                      : selectedVideo.titleEn
                    : ''}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Video Box Container */}
              <View style={styles.videoBox}>
                {selectedVideo &&
                  (Platform.OS === 'web' ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <WebView
                      source={{
                        uri: `https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&playsinline=1`,
                      }}
                      allowsFullscreenVideo
                      allowsInlineMediaPlayback
                      javaScriptEnabled
                      domStorageEnabled
                      style={{ flex: 1 }}
                      startInLoadingState
                      renderLoading={() => (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#000',
                            },
                          ]}
                        >
                          <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                      )}
                    />
                  ))}
              </View>

              {/* Video description content */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.playerDetailsScroll}>
                {selectedVideo && (
                  <View style={styles.playerMetaContent}>
                    <Text style={[styles.playerUploader, { color: colors.primary }]}>
                      {selectedVideo.uploader}
                    </Text>
                    <Text style={styles.playerTitle}>
                      {language === 'sw' ? selectedVideo.titleSw : selectedVideo.titleEn}
                    </Text>
                    <Text style={styles.playerDesc}>
                      {language === 'sw' ? selectedVideo.descSw : selectedVideo.descEn}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </BlurView>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    height: '100%',
  },
  filtersSection: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  langToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  langSwitchBg: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langOptionText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
  },
  categoriesScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 4,
  },
  videosGrid: {
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  emptySub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  videoCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  thumbnailContainer: {
    height: 180,
    backgroundColor: '#0c1017',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
  },
  langBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
  },
  metaContainer: {
    padding: 16,
    gap: 6,
  },
  videoUploader: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  videoTitle: {
    fontSize: 14,
    fontFamily: 'InstrumentSerif_400Regular',
    lineHeight: 20,
  },
  videoDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  /* Modal player CSS */
  playerModalContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  playerCloseBtn: {
    padding: 4,
  },
  playerHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    flex: 1,
  },
  videoBox: {
    width: '100%',
    height: SCREEN_WIDTH * (9 / 16), // 16:9 Aspect ratio
    backgroundColor: '#000',
  },
  playerDetailsScroll: {
    flex: 1,
  },
  playerMetaContent: {
    padding: 24,
    gap: 10,
  },
  playerUploader: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  playerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    lineHeight: 26,
  },
  playerDesc: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
});
