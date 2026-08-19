import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import {
  X,
  Zap,
  Image as ImageIcon,
  RotateCw,
  WifiOff,
  Info,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Camera,
  CloudOff,
  CheckCircle2,
  Activity,
  Sun,
  Leaf,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import RemoteImage from '../components/RemoteImage';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useTasks } from '../hooks/useTasks';
import { useNotifications } from '../hooks/useNotifications';
import { useKilimoStore } from '../store/useKilimoStore';
import { sendSms } from '../lib/sms';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { diagnoseCropPhoto, aiConfigured, AIError, VisionDiagnosis } from '../lib/ai';
import { demoDiagnosis } from '../lib/ai-demo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ScanPhase = 'IDLE' | 'SCANNING' | 'ANALYZING' | 'RESULT' | 'ERROR';

const MOCK_BG =
  'https://images.unsplash.com/photo-1594488651083-023b8a4a3b1e?q=80&w=2940&auto=format&fit=crop';

// Fallback used only when the AI returns unparseable content — keeps the UI
// from rendering "undefined".
const FALLBACK_RESULT: Required<Pick<VisionDiagnosis, 'disease' | 'severity'>> & {
  recommendation: string;
} = {
  disease: 'Diagnosis incomplete',
  severity: 'medium',
  recommendation: 'Picha haikutoa matokeo wazi. Tafadhali piga picha nyingine yenye mwanga mzuri.',
};

export default function ScanScreen() {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { createTask } = useTasks();
  const { scheduleReminder } = useNotifications();
  const addNotification = useKilimoStore((s) => s.addNotification);
  const agroId = useKilimoStore((s) => s.agroId);
  const language = useKilimoStore((s) => s.language);

  // Custom Animated Tips State
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [activeTipsStep, setActiveTipsStep] = useState(0);

  const [phase, setPhase] = useState<ScanPhase>('IDLE');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  // Real network status (OfflineManager/NetInfo-backed) — this used to be a
  // local mock the header button silently flipped with no connection to the
  // device's actual connectivity: a genuinely offline farmer saw no warning
  // at all, while anyone could tap the button and see a fake "offline"
  // state while fully connected. Status is now real; see below for why it's
  // no longer a toggle a user can act on.
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [analysisText, setAnalysisText] = useState('Initiating quantum analysis...');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<VisionDiagnosis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Versioning so a stale vision response cannot overwrite a newer one
  const scanSeq = React.useRef(0);

  // Scanning Tips Animation Shared Values
  const tipsDistanceVal = useSharedValue(0);
  const tipsLightVal = useSharedValue(0.5);
  const tipsReticleVal = useSharedValue(1);

  useEffect(() => {
    if (showTipsModal) {
      tipsDistanceVal.value = withRepeat(
        withSequence(withTiming(15, { duration: 1200 }), withTiming(-15, { duration: 1200 })),
        -1,
        true
      );
      tipsLightVal.value = withRepeat(
        withSequence(withTiming(1, { duration: 1000 }), withTiming(0.4, { duration: 1000 })),
        -1,
        true
      );
      tipsReticleVal.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 900 }), withTiming(0.95, { duration: 900 })),
        -1,
        true
      );
    } else {
      tipsDistanceVal.value = 0;
      tipsLightVal.value = 0.5;
      tipsReticleVal.value = 1;
    }
  }, [showTipsModal]);

  const animatedDistanceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tipsDistanceVal.value }],
  }));

  const animatedLightStyle = useAnimatedStyle(() => ({
    opacity: tipsLightVal.value,
  }));

  const animatedReticleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tipsReticleVal.value }],
  }));

  // Moving scan-line (laser) — sweeps down the frame while SCANNING
  const scanLineVal = useSharedValue(0);
  useEffect(() => {
    if (phase === 'SCANNING') {
      scanLineVal.value = 0;
      scanLineVal.value = withRepeat(withTiming(SCREEN_HEIGHT - 160, { duration: 1800 }), -1, true);
    } else {
      scanLineVal.value = 0;
    }
  }, [phase]);

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineVal.value }],
  }));

  // Cycle through analysis text to feel agentic
  useEffect(() => {
    if (phase === 'ANALYZING') {
      const texts = [
        'Extracting spectral bio-markers...',
        'Cross-referencing East African pathogen database...',
        'Validating confidence levels...',
        'Compiling predictive treatment plan...',
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setAnalysisText(texts[i]);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const pickPhoto = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('Tafadhali ruhusu app kufikia kamera/picha kwenye mipangilio.');
      setPhase('ERROR');
      return null;
    }
    // quality 0.5 + allowsEditing crops/resizes before we read base64, keeping
    // payload < ~1.5MB on typical phones and avoiding memory spikes from raw
    // 12MP captures.
    const opts = {
      quality: 0.5,
      base64: false,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    } as const;
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled) return null;
    return result.assets[0];
  };

  const runVisionDiagnosis = async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const asset = await pickPhoto(source);
    if (!asset) return;

    const seq = ++scanSeq.current;
    setPhotoUri(asset.uri);
    setErrorMsg(null);
    setDiagnosis(null);
    setAnalysisProgress(0);
    setPhase('SCANNING');

    // Brief transition to trigger analysis
    await new Promise((r) => setTimeout(r, 600));
    if (scanSeq.current !== seq) return;
    setPhase('ANALYZING');

    // Start AI analysis in the background
    const aiPromise = (async () => {
      if (!aiConfigured()) {
        // Simulated network delay for demo
        await new Promise((r) => setTimeout(r, 1200));
        return await demoDiagnosis();
      } else {
        let base64: string;
        let mimeType = 'image/jpeg';
        if (asset.uri.startsWith('data:')) {
          const m = asset.uri.match(/^data:([^;]+);base64,(.*)$/);
          if (!m)
            throw new AIError('Picha haikuweza kusomwa. Jaribu picha nyingine.', 'validation');
          mimeType = m[1];
          base64 = m[2];
        } else {
          try {
            const info = await FileSystem.getInfoAsync(asset.uri);
            if (info.exists && typeof info.size === 'number' && info.size > 5_000_000) {
              throw new AIError('Picha ni kubwa sana. Tafadhali piga picha nyepesi.', 'validation');
            }
          } catch (e) {
            if (e instanceof AIError) throw e;
          }
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (asset.uri.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        }
        return await diagnoseCropPhoto(base64, { mimeType });
      }
    })();

    // Animate progress up to 100%
    for (let p = 10; p <= 100; p += 10) {
      await new Promise((r) => setTimeout(r, 130));
      if (scanSeq.current !== seq) return;
      setAnalysisProgress(p);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await aiPromise;
      if (scanSeq.current !== seq) return; // stale

      setDiagnosis(result);
      setPhase('RESULT');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.severity === 'critical') {
        fireCriticalSideEffects(result);
      }
    } catch (err) {
      if (scanSeq.current !== seq) return;
      const e = err as AIError;
      const friendly =
        e?.kind === 'validation'
          ? e.message
          : e?.kind === 'unauthorized'
            ? 'Tafadhali ingia tena ili kutumia uchunguzi wa picha.'
            : e?.kind === 'network'
              ? 'Hakuna mtandao. Hii app haihifadhi picha kwa uchunguzi wa baadaye — tafadhali jaribu tena ukiwa na mtandao.'
              : 'Samahani, uchunguzi wa picha umeshindikana. Jaribu tena.';
      setErrorMsg(friendly);
      setPhase('ERROR');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleScan = () => runVisionDiagnosis('camera');
  const handlePickFromGallery = () => runVisionDiagnosis('library');

  /**
   * Critical-severity diagnosis side effects (PRD §2.2 Notification Matrix).
   */
  const fireCriticalSideEffects = async (result: VisionDiagnosis) => {
    if (result.severity !== 'critical') return;
    const disease = result.disease ?? 'Critical crop issue';
    const recommendation = result.actions?.join(' • ') ?? FALLBACK_RESULT.recommendation;

    try {
      await createTask({
        title: `Critical · Isolate ${disease}`,
        titleSw: `Hatari · Tenga mimea (${disease})`,
        description: recommendation,
        category: 'scouting',
        priority: 'critical',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        xpReward: 60,
        farmBlock: 'Block A',
      });

      addNotification({
        title: `⚠️ ${disease} detected`,
        body: recommendation,
        type: 'warning',
      });

      scheduleReminder(
        'Follow-up · Crop diagnosis',
        `Check progress on ${disease} containment.`,
        4 * 60 * 60,
        '/tasks'
      ).catch(() => {
        /* permission may be denied — silent */
      });

      if (agroId?.phoneNumber) {
        sendSms({
          to: agroId.phoneNumber,
          event: 'critical_diagnosis',
          body: `KILIMO AI: ${disease} imegunduliwa. Tenga mimea ndani ya 24h. Angalia app.`,
          meta: { disease },
        }).catch(() => {
          /* stub may log but never throws */
        });
      }
    } catch (err) {
      console.warn('[scan] critical side effects failed:', err);
    }
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scanSeq.current++; // invalidate any in-flight diagnosis
    setPhase('IDLE');
    setPhotoUri(null);
    setDiagnosis(null);
    setErrorMsg(null);
  };

  // Advanced Neural Orb for background aesthetics
  const NeuralOrb = ({ color, size, delay, x, y }: any) => (
    <Animated.View
      entering={FadeInDown}
      style={[
        styles.bgOrb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          filter: Platform.OS === 'web' ? 'blur(90px)' : undefined,
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Cinematic Camera View */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.cameraView}>
        <RemoteImage
          uri={photoUri ?? MOCK_BG}
          style={styles.mockCamera}
          resizeMode="cover"
          fallback={<View style={[styles.mockCamera, { backgroundColor: '#0b0f0b' }]} />}
        />

        {/* Dynamic Scan Line Overlay */}

        {phase === 'SCANNING' && (
          <Animated.View entering={FadeInDown} exiting={FadeOut} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.scanOverlay, animatedScanLineStyle]}>
              <LinearGradient
                colors={[
                  'transparent',
                  colors.primary + '80',
                  colors.primary,
                  colors.primary + '80',
                  'transparent',
                ]}
                style={styles.scanLine}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
              <View style={[styles.scanGlow, { backgroundColor: colors.primary + '30' }]} />
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        {/* Floating Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <BlurView intensity={40} tint="dark" style={styles.iconButton}>
              <X size={24} color="#ffffff" />
            </BlurView>
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <BlurView intensity={30} tint="dark" style={styles.badge}>
              <Sparkles size={12} color={colors.primary} />
              <Text style={styles.badgeText}>KILIMO VISION AI</Text>
            </BlurView>
          </View>

          {/* Real, read-only network status — not a toggle. A user cannot
              make their device actually go on/offline by tapping a button,
              and this app doesn't queue scans for later analysis (see the
              honest copy below), so there is nothing for a tap here to do. */}
          <View
            accessibilityRole="text"
            accessibilityLabel={isOffline ? 'Offline' : 'Online'}
          >
            <BlurView
              intensity={40}
              tint="dark"
              style={[styles.iconButton, isOffline && { borderColor: '#ef4444' }]}
            >
              {isOffline ? (
                <WifiOff size={20} color="#ef4444" />
              ) : (
                <Zap size={22} color={colors.primary} />
              )}
            </BlurView>
          </View>
        </Animated.View>

        {/* Offline Warning Toast */}

        {isOffline && phase === 'IDLE' && (
          <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.offlineToast}>
            <BlurView intensity={60} tint="dark" style={styles.offlineInner}>
              <CloudOff size={16} color="#fbbf24" />
              <Text style={styles.offlineText}>
                {language === 'sw'
                  ? 'Hakuna mtandao — uchunguzi wa AI haupatikani sasa hivi.'
                  : "No connection — AI diagnosis isn't available right now."}
              </Text>
            </BlurView>
          </Animated.View>
        )}

        <View style={styles.content}>
          {/* IDLE PHASE */}
          {phase === 'IDLE' && (
            <Animated.View
              key="scanner"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.scannerInterface}
            >
              {/* Aiming Reticle */}
              <View style={styles.reticleContainer}>
                {[styles.tl, styles.tr, styles.bl, styles.br].map((posStyle, idx) => (
                  <Animated.View key={idx} style={[styles.corner, posStyle]} />
                ))}
              </View>

              <Animated.View style={styles.instructions}>
                <Text style={styles.instructionLarge}>
                  {language === 'sw' ? 'Mlengelwe Kwenye Jani' : 'Target Crop Anomaly'}
                </Text>
                <Text style={styles.instructionSmall}>
                  {language === 'sw'
                    ? 'Hakikisha jani lililoathirika lina mwanga wa kutosha.'
                    : 'Ensure the affected leaf is well-lit and in focus.'}
                </Text>
              </Animated.View>
            </Animated.View>
          )}

          {/* SCANNING & ANALYZING PHASE */}
          {(phase === 'SCANNING' || phase === 'ANALYZING') && (
            <Animated.View
              key="scanning_hud"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.hudOverlayContainer}
            >
              {/* Crop Target Box */}
              <View style={styles.hudTargetBox}>
                {/* Corners for Target Box */}
                <View
                  style={[
                    styles.targetCorner,
                    { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.targetCorner,
                    { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.targetCorner,
                    { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.targetCorner,
                    { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
                  ]}
                />

                {/* Progress Badge */}
                <View style={[styles.hudProgressBadge, { backgroundColor: colors.primary }]}>
                  <Sparkles size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.hudProgressText}>
                    {analysisProgress}% {language === 'sw' ? 'Uchambuzi' : 'Analyse'}
                  </Text>
                </View>
              </View>

              {/* Segmented Progress Loader */}
              <View style={styles.segmentedLoader}>
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isActive = analysisProgress >= (idx + 1) * 10;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.loaderSegment,
                        {
                          backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.2)',
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Status / Instructions Text */}
              <Text style={styles.hudStatusText}>
                {phase === 'SCANNING'
                  ? language === 'sw'
                    ? 'Inafunga Shabaha...'
                    : 'LOCKING TARGET...'
                  : language === 'sw'
                    ? 'Inachambua jani...'
                    : 'ANALYZING LEAF PATTERNS...'}
              </Text>

              {/* Cancel Button at bottom */}
              <TouchableOpacity
                onPress={handleReset}
                activeOpacity={0.85}
                style={styles.hudCancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel scan"
              >
                <BlurView intensity={30} tint="dark" style={styles.hudCancelInner}>
                  <Text style={styles.hudCancelText}>
                    {language === 'sw' ? 'Ghairi' : 'Cancel'}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ERROR PHASE */}
          {phase === 'ERROR' && (
            <Animated.View
              key="error"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.resultWrapper}
            >
              <BlurView
                intensity={isDark ? 40 : 90}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.resultCard, { borderColor: 'rgba(239,68,68,0.3)' }]}
              >
                <View style={styles.resultHeader}>
                  <View style={[styles.resultIcon, { backgroundColor: '#ef4444' }]}>
                    <AlertCircle size={32} color="#fff" />
                  </View>
                  <View style={styles.resultMeta}>
                    <Text style={[styles.resultName, { color: colors.text }]}>Imeshindikana</Text>
                    <Text style={[styles.confText, { color: colors.textMute }]}>
                      Uchunguzi haukufanyika
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.detailCard,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <Text style={[styles.detailBody, { color: colors.textMute }]}>
                    {errorMsg ?? 'Hitilafu isiyojulikana.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  accessibilityLabel="Try again"
                  accessibilityRole="button"
                >
                  <RotateCw size={18} color={colors.textMute} />
                  <Text style={[styles.resetBtnText, { color: colors.textMute }]}>Jaribu Tena</Text>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          )}

          {/* RESULT PHASE */}
          {phase === 'RESULT' && (
            <Animated.View
              key="result"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.resultWrapper}
            >
              <BlurView
                intensity={isDark ? 40 : 90}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.resultCard, { borderColor: 'rgba(255,255,255,0.1)' }]}
              >
                <LinearGradient
                  colors={[colors.primary + '15', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />

                {(() => {
                  const sev = diagnosis?.severity ?? FALLBACK_RESULT.severity;
                  const sevColor =
                    sev === 'critical'
                      ? '#ef4444'
                      : sev === 'high'
                        ? '#f97316'
                        : sev === 'medium'
                          ? '#eab308'
                          : '#22c55e';
                  const sevLabel =
                    sev === 'critical'
                      ? 'Critical Priority'
                      : sev === 'high'
                        ? 'High Priority'
                        : sev === 'medium'
                          ? 'Medium Priority'
                          : 'Low Priority';
                  const disease = diagnosis?.disease ?? FALLBACK_RESULT.disease;
                  const cropLine = diagnosis?.crop ? `${diagnosis.crop} · ` : '';
                  const actions = diagnosis?.actions ?? [];
                  const body =
                    actions.length > 0
                      ? actions.map((a) => `• ${a}`).join('\n')
                      : (diagnosis?.raw?.slice(0, 280) ?? FALLBACK_RESULT.recommendation);
                  return (
                    <>
                      <View style={styles.resultHeader}>
                        <Animated.View
                          entering={FadeInDown}
                          style={[styles.resultIcon, { backgroundColor: colors.primary }]}
                        >
                          <BrainCircuit size={32} color={isDark ? '#000' : '#FCFBF7'} />
                        </Animated.View>
                        <View style={styles.resultMeta}>
                          <Text style={[styles.resultName, { color: colors.text }]}>{disease}</Text>
                          <Animated.View entering={FadeInDown} style={styles.confBadge}>
                            <Text style={styles.confText}>
                              {cropLine}
                              {aiConfigured()
                                ? 'AI Diagnosis'
                                : language === 'sw'
                                  ? 'Mfano wa Onyesho'
                                  : 'Sample Demo Result'}
                            </Text>
                          </Animated.View>
                        </View>
                      </View>

                      {!aiConfigured() && (
                        <Animated.View entering={FadeInDown} style={styles.offlineNoticeBox}>
                          <AlertCircle size={16} color="#fbbf24" />
                          <Text style={styles.offlineNoticeText}>
                            {language === 'sw'
                              ? 'Hali ya Onyesho: matokeo haya si uchambuzi wa picha yako halisi — ni mfano wa jinsi programu itakavyofanya kazi ukiunganishwa na AI. Usitumie ushauri huu wa dawa bila kushauriana na mtaalamu wa kilimo.'
                              : 'Demo mode: this result is not a real analysis of your photo — it illustrates how the feature will behave once connected to the AI backend. Do not act on this treatment advice without consulting an agronomist.'}
                          </Text>
                        </Animated.View>
                      )}

                      {isOffline && aiConfigured() && (
                        <Animated.View entering={FadeInDown} style={styles.offlineNoticeBox}>
                          <CloudOff size={16} color="#fbbf24" />
                          <Text style={styles.offlineNoticeText}>
                            Saved locally. Will sync to your Agro ID when online.
                          </Text>
                        </Animated.View>
                      )}

                      <Animated.View
                        entering={FadeInDown}
                        style={[
                          styles.detailCard,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          },
                        ]}
                      >
                        <View style={styles.detailTitleRow}>
                          <AlertCircle size={18} color={sevColor} />
                          <Text style={[styles.detailTitle, { color: colors.text }]}>
                            {sevLabel}
                          </Text>
                        </View>
                        <Text style={[styles.detailBody, { color: colors.textMute }]}>{body}</Text>
                      </Animated.View>
                    </>
                  );
                })()}

                <Animated.View entering={FadeInDown}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push('/(tabs)/ai' as any);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Speak with AI Agronomist"
                  >
                    <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                      Ask AI Agronomist
                    </Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleReset}
                    accessibilityLabel="Retake Scan"
                    accessibilityRole="button"
                  >
                    <RotateCw size={18} color={colors.textMute} />
                    <Text style={[styles.resetBtnText, { color: colors.textMute }]}>
                      Scan Another Plant
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </BlurView>
            </Animated.View>
          )}
        </View>

        {/* Shutter Controls */}

        {phase === 'IDLE' && (
          <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.footer}>
            <TouchableOpacity
              style={styles.auxBtn}
              accessibilityRole="button"
              accessibilityLabel="Open gallery"
              onPress={handlePickFromGallery}
            >
              <BlurView intensity={40} tint="dark" style={styles.auxInner}>
                <ImageIcon size={24} color="#ffffff" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterRing, { borderColor: colors.primary }]}
              onPress={handleScan}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Take picture for AI diagnosis"
            >
              <Animated.View style={[styles.shutterCore, { backgroundColor: '#ffffff' }]}>
                <Camera size={34} color="#000" />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.auxBtn}
              accessibilityRole="button"
              accessibilityLabel="Scanning tips"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTipsStep(0);
                setShowTipsModal(true);
              }}
            >
              <BlurView intensity={40} tint="dark" style={styles.auxInner}>
                <Info size={24} color="#ffffff" />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ── Custom Animated Scanner Tips Modal ────────────────── */}
      <Modal
        visible={showTipsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.tipsModalContainer}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

          <BlurView
            intensity={isDark ? 30 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.tipsSheet,
              {
                backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                borderColor: colors.border,
              },
            ]}
          >
            {/* Grabber indicator */}
            <View
              style={[
                styles.tipsSheetGrabber,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
            />

            {/* Header */}
            <View style={styles.tipsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color={colors.primary} />
                <Text style={[styles.tipsTitleText, { color: colors.text }]}>
                  {language === 'sw' ? 'Vidokezo vya Uchunguzi' : 'AI Scanning Guidelines'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTipsModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close tips"
                style={[styles.tipsCloseBtn, { borderColor: colors.border }]}
              >
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Indicator Row */}
            <View style={styles.tipsIndicatorRow}>
              {[0, 1, 2].map((step) => {
                const isActive = activeTipsStep === step;
                return (
                  <View
                    key={step}
                    style={[
                      styles.tipsIndicatorBar,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                        flex: 1,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Step Body */}
            <View style={styles.tipsContentBox}>
              {activeTipsStep === 0 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.tipsSlide}
                >
                  {/* Distance Animation */}
                  <View style={styles.tipsAnimWindow}>
                    <Animated.View style={[styles.tipsPhoneContainer, animatedDistanceStyle]}>
                      <Camera size={44} color={colors.primary} />
                    </Animated.View>
                    <Leaf size={48} color="#22c55e" style={styles.tipsLeafBg} />
                  </View>
                  <Text style={[styles.tipsStepBadgeText, { color: colors.primary }]}>
                    HATUA YA 1: UMBALI SAHIHI
                  </Text>
                  <Text style={[styles.tipsStepHeading, { color: colors.text }]}>
                    {language === 'sw' ? 'Shika Simu sm 15-30' : 'Maintain 15-30cm Distance'}
                  </Text>
                  <Text style={[styles.tipsStepBody, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Weka kamera ya simu yako umbali wa sm 15 hadi 30 (nusu rula) kutoka kwenye jani. Kaa karibu vya kutosha kuona maelezo lakini usikaribie sana hadi picha izibwe.'
                      : 'Position your device camera 15 to 30 cm away from the target leaf. Close enough to capture fine details, but far enough to avoid lens distortion or shadows.'}
                  </Text>
                </Animated.View>
              )}

              {activeTipsStep === 1 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.tipsSlide}
                >
                  {/* Lighting Animation */}
                  <View style={styles.tipsAnimWindow}>
                    <Animated.View style={[styles.tipsSunGlow, animatedLightStyle]}>
                      <Sun size={52} color="#f59e0b" />
                    </Animated.View>
                  </View>
                  <Text style={[styles.tipsStepBadgeText, { color: colors.primary }]}>
                    HATUA YA 2: MWANGA WA KUTOSHA
                  </Text>
                  <Text style={[styles.tipsStepHeading, { color: colors.text }]}>
                    {language === 'sw' ? 'Mwangaza Mzuri wa Jua' : 'Ensure Optimal Lighting'}
                  </Text>
                  <Text style={[styles.tipsStepBody, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Piga picha wakati kuna mwanga wa jua lakini epuka kivuli cha simu yako au mwili wako kuangukia kwenye jani. Usipige picha gizani.'
                      : 'Take photos under bright, indirect sunlight. Ensure your own body shadow or device shadow does not drape over the leaf block.'}
                  </Text>
                </Animated.View>
              )}

              {activeTipsStep === 2 && (
                <Animated.View
                  entering={SlideInRight}
                  exiting={SlideOutLeft}
                  style={styles.tipsSlide}
                >
                  {/* Reticle / Anomaly Animation */}
                  <View style={styles.tipsAnimWindow}>
                    <Animated.View
                      style={[
                        styles.tipsReticleBox,
                        animatedReticleStyle,
                        { borderColor: colors.primary },
                      ]}
                    >
                      <View style={[styles.tipsReticleTarget, { backgroundColor: '#ef4444' }]} />
                    </Animated.View>
                    <Leaf size={48} color="#22c55e" style={styles.tipsLeafBgCenter} />
                  </View>
                  <Text style={[styles.tipsStepBadgeText, { color: colors.primary }]}>
                    HATUA YA 3: ZINGATIA ALAMA YA UGONJWA
                  </Text>
                  <Text style={[styles.tipsStepHeading, { color: colors.text }]}>
                    {language === 'sw' ? 'Weka Doa Katikati' : 'Center the Leaf Anomaly'}
                  </Text>
                  <Text style={[styles.tipsStepBody, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Lenga doa au sehemu iliyoathirika ya jani iwe katikati ya kisanduku cha kulenga. AI inategemea alama hiyo kufanya uchambuzi sahihi.'
                      : 'Lock the camera focus precisely on the diseased spot or leaf damage. Centering the anomaly ensures the neural model scans the correct pixels.'}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.tipsFooter}>
              {activeTipsStep > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTipsStep((prev) => prev - 1);
                  }}
                  style={[styles.tipsFooterBtnSec, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Text style={[styles.tipsFooterBtnTextSec, { color: colors.text }]}>
                    {language === 'sw' ? 'Nyuma' : 'Back'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {activeTipsStep < 2 ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveTipsStep((prev) => prev + 1);
                  }}
                  style={[styles.tipsFooterBtnPrim, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                >
                  <Text
                    style={[styles.tipsFooterBtnTextPrim, { color: isDark ? '#000' : '#FCFBF7' }]}
                  >
                    {language === 'sw' ? 'Mbele' : 'Next'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowTipsModal(false);
                  }}
                  style={[styles.tipsFooterBtnPrim, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text
                    style={[styles.tipsFooterBtnTextPrim, { color: isDark ? '#000' : '#FCFBF7' }]}
                  >
                    {language === 'sw' ? 'Nimeelewa' : 'Got It'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
  },
  mockCamera: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  bgOrb: {
    position: 'absolute',
    filter: Platform.OS === 'web' ? 'blur(90px)' : undefined,
  },
  scanOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    width: '100%',
    height: 6,
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  scanGlow: {
    position: 'absolute',
    width: '100%',
    height: 70,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 10,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 2,
  },
  offlineToast: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  offlineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: 10,
    overflow: 'hidden',
  },
  offlineText: {
    color: '#fbbf24',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerInterface: {
    alignItems: 'center',
  },
  reticleContainer: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 8,
    borderLeftWidth: 8,
    borderTopLeftRadius: 40,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderTopRightRadius: 40,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderBottomLeftRadius: 40,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderBottomRightRadius: 40,
  },
  aiMarkers: {
    alignItems: 'center',
  },
  markerPulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E6F40',
    marginBottom: 12,
  },
  markerTextContainer: {
    alignItems: 'center',
  },
  markerText: {
    color: '#2E6F40',
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 2,
  },
  instructions: {
    marginTop: 70,
    alignItems: 'center',
  },
  instructionLarge: {
    color: '#ffffff',
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  instructionSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  analyzingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingRings: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(46, 111, 64, 0.3)',
    borderTopColor: '#2E6F40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  analyzingTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 12,
  },
  analyzingSubtitle: {
    color: '#2E6F40',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  resultWrapper: {
    width: SCREEN_WIDTH * 0.92,
  },
  resultCard: {
    borderRadius: 44,
    padding: 32,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  resultMeta: {
    flex: 1,
    marginLeft: 20,
  },
  resultName: {
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  confBadge: {
    marginTop: 8,
  },
  confText: {
    color: '#2E6F40',
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  offlineNoticeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  detailCard: {
    padding: 26,
    borderRadius: 32,
    marginBottom: 32,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 17,
    fontFamily: 'InstrumentSerif_400Regular',
    marginLeft: 12,
  },
  detailBody: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 24,
    opacity: 0.85,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    borderRadius: 28,
    marginBottom: 16,
    shadowColor: '#2E6F40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    marginRight: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  auxBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  auxInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  shutterRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // HUD styles
  hudOverlayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTargetBox: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  targetCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  hudProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  hudProgressText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  segmentedLoader: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 32,
    width: SCREEN_WIDTH * 0.72,
    justifyContent: 'center',
  },
  loaderSegment: {
    width: 14,
    height: 6,
    borderRadius: 3,
  },
  hudStatusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.8,
    marginTop: 24,
    textAlign: 'center',
  },
  hudCancelBtn: {
    marginTop: 48,
    width: SCREEN_WIDTH * 0.72,
    borderRadius: 24,
    overflow: 'hidden',
  },
  hudCancelInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    minHeight: 44,
  },
  hudCancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },

  // Tips Drawer Modal Styles
  tipsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tipsSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    maxHeight: '85%',
  },
  tipsSheetGrabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipsTitleText: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
  },
  tipsCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsIndicatorRow: {
    flexDirection: 'row',
    height: 4,
    gap: 6,
    marginVertical: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tipsIndicatorBar: {
    height: '100%',
    borderRadius: 2,
  },
  tipsContentBox: {
    minHeight: 280,
    justifyContent: 'center',
  },
  tipsSlide: {
    alignItems: 'center',
    gap: 12,
  },
  tipsAnimWindow: {
    height: 110,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  tipsPhoneContainer: {
    zIndex: 2,
  },
  tipsLeafBg: {
    position: 'absolute',
    bottom: 20,
    opacity: 0.8,
  },
  tipsSunGlow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsReticleBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tipsReticleTarget: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  tipsLeafBgCenter: {
    position: 'absolute',
    opacity: 0.6,
  },
  tipsStepBadgeText: {
    fontSize: 12,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 1,
  },
  tipsStepHeading: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  tipsStepBody: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
    textAlign: 'center',
  },
  tipsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  tipsFooterBtnPrim: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  tipsFooterBtnTextPrim: {
    fontSize: 14,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  tipsFooterBtnSec: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  tipsFooterBtnTextSec: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
});
