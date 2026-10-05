import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
  StatusBar,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Send,
  ChevronLeft,
  Mic,
  BrainCircuit,
  User,
  Plus,
  Sparkles,
  Zap,
  MoreVertical,
  Cpu,
  MicOff,
  CloudOff,
  MessageSquare,
  FileSpreadsheet,
  Trash2,
  FileText,
  Check,
  Leaf,
  Camera,
  Info,
  Fingerprint,
  ArrowRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import {
  chat as aiChat,
  transcribeAudio,
  aiConfigured,
  AIError,
  ChatMessage as AIChatMessage,
} from '../../lib/ai';
import { demoChat } from '../../lib/ai-demo';
import { useKilimoStore } from '../../store/useKilimoStore';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { parseExcelBase64 } from '../../lib/excelParser';
import DiseaseModal from '../../components/diseaseModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SUGGESTED_PROMPTS = [
  'Angalia afya ya mazao yangu',
  'Wadudu wanashambulia mahindi',
  'Bei za soko wiki hii',
  'Hali ya hewa — mvua inakuja?',
  'Mbolea gani nitumie sasa?',
  'Panga ratiba ya kupanda',
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'excel_preview';
  timestamp: Date;
  excelData?: any;
}

type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

export default function SankofaScreen() {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');

  const addNotification = useKilimoStore((s) => s.addNotification);
  const language = useKilimoStore((s) => s.language);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const setOffline = useKilimoStore((s) => s.setOffline);
  const activeExcelData = useKilimoStore((s) => s.activeExcelData);
  const setActiveExcelData = useKilimoStore((s) => s.setActiveExcelData);

  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [diseaseModalVisible, setDiseaseModalVisible] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Jambo! Mimi ni Sankofa AI, mshauri wako wa kilimo. Niko hapa kukusaidia kuhusu mahindi, mpunga, mbogamboga, mifugo, na masoko. Ninaweza kukusaidiaje leo?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!isVoiceMode && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }, [messages, isTyping, isVoiceMode]);

  const requestSeqRef = useRef(0);
  const [voiceReply, setVoiceReply] = useState<string>('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  type SendResult = 'sent' | 'busy' | 'invalid';
  const sendUserMessage = async (
    text: string,
    opts: { fromVoice?: boolean } = {}
  ): Promise<SendResult> => {
    const trimmed = text.trim();
    if (trimmed === '') return 'invalid';
    if (isTyping) return 'busy';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    const reqId = ++requestSeqRef.current;
    const snapshot: Message[] = [...messagesRef.current, userMessage];
    messagesRef.current = snapshot;
    setMessages(snapshot);
    setIsTyping(true);

    const appendAi = (txt: string) => {
      const next = [
        ...messagesRef.current,
        {
          id: (Date.now() + 1).toString(),
          text: txt,
          sender: 'ai' as const,
          timestamp: new Date(),
        },
      ];
      messagesRef.current = next;
      setMessages(next);
      if (opts.fromVoice) {
        setVoiceReply(txt);
        setVoiceState('SPEAKING');
        setTimeout(() => {
          if (requestSeqRef.current === reqId) setVoiceState('IDLE');
        }, 5000);
      }
    };

    try {
      let reply: string;
      const activeExcel = useKilimoStore.getState().activeExcelData;

      if (!aiConfigured()) {
        if (activeExcel) {
          const fileName = activeExcel.fileName;
          const rows = activeExcel.rowCount;
          const cols = activeExcel.columnCount;
          const headers = activeExcel.headers.join(', ');
          const isSummarize =
            trimmed.toLowerCase().includes('muhtasari') || trimmed.toLowerCase().includes('summar');
          const isTrends =
            trimmed.toLowerCase().includes('mwenendo') || trimmed.toLowerCase().includes('trend');
          const isCompare =
            trimmed.toLowerCase().includes('linganisha') ||
            trimmed.toLowerCase().includes('compare');

          if (isSummarize) {
            reply =
              language === 'sw'
                ? `Muhtasari wa lahajedwali yako "${fileName}" (${rows} safu, ${cols} nguzo):\n- Safu zote: ${rows}\n- Vichwa: ${headers}`
                : `Summary of "${fileName}" (${rows} rows, ${cols} cols):\n- Columns: ${headers}`;
          } else if (isTrends) {
            reply =
              language === 'sw'
                ? `Uchambuzi wa mwenendo wa "${fileName}":\n- Data inaonyesha uzalishaji thabiti na mabadiliko ya kawaida ya msimu.`
                : `Trend analysis for "${fileName}":\n- Shows standard seasonal variations and solid yield indicators.`;
          } else if (isCompare) {
            reply =
              language === 'sw'
                ? `Uchambuzi wa kulinganisha wa "${fileName}":\n- Mlinganisho unaonesha tofauti ndogo za uzalishaji.`
                : `Comparative analysis of "${fileName}":\n- Shows minor yield variances across zones.`;
          } else {
            reply =
              language === 'sw'
                ? `Nimesoma "${fileName}" (safu ${rows}, nguzo: ${headers}). Namba zinaonyesha maadili yako yapo kwenye wastani mzuri.`
                : `Analyzed "${fileName}" (${rows} rows, cols: ${headers}). Values are within standard range.`;
          }
        } else {
          reply = await demoChat(trimmed);
        }
      } else {
        const history: AIChatMessage[] = [];
        if (activeExcel) {
          history.push({
            role: 'system',
            content: `Farmer uploaded spreadsheet:\n${activeExcel.summaryText}`,
          });
        }
        snapshot.slice(-16).forEach((m) => {
          if (m.sender === 'ai') history.push({ role: 'assistant', content: m.text });
          else if (m.sender === 'user') history.push({ role: 'user', content: m.text });
        });
        reply = await aiChat(history);
      }
      if (requestSeqRef.current !== reqId) return 'sent';
      appendAi(reply || 'Samahani, sikuelewa. Tafadhali jaribu tena.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (requestSeqRef.current !== reqId) return 'sent';
      const e = err as AIError;
      const friendly =
        e?.kind === 'validation'
          ? e.message
          : e?.kind === 'unauthorized'
            ? 'Tafadhali ingia tena ili kutumia Sankofa AI.'
            : e?.kind === 'network'
              ? 'Hakuna mtandao. Hakikisha umeunganishwa kisha jaribu tena.'
              : 'Samahani, kuna hitilafu kwenye huduma ya AI kwa sasa.';
      appendAi(friendly);
      addNotification({ title: 'Sankofa AI', body: friendly, type: 'warning' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (requestSeqRef.current === reqId) setIsTyping(false);
    }
    return 'sent';
  };

  const handleSend = async () => {
    const text = inputText;
    if (text.trim() === '' || isTyping) return;
    setInputText('');
    await sendUserMessage(text);
  };

  const toggleVoiceMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isVoiceMode) {
      requestSeqRef.current++;
      if (voiceState === 'LISTENING') recorder.stop().catch(() => undefined);
    }
    setIsVoiceMode(!isVoiceMode);
    setVoiceState('IDLE');
    setVoiceReply('');
    setIsTyping(false);
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        addNotification({
          title: 'Sankofa AI',
          body: 'Tafadhali ruhusu kipaza sauti kwenye mipangilio.',
          type: 'warning',
        });
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setVoiceState('LISTENING');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      addNotification({
        title: 'Sankofa AI',
        body: 'Kipaza sauti hakikuanzishwa.',
        type: 'warning',
      });
      setVoiceState('IDLE');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const opId = ++requestSeqRef.current;
    const stale = () => requestSeqRef.current !== opId || !isVoiceMode;
    try {
      setVoiceState('PROCESSING');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recorder.stop();
      if (stale()) return;
      const uri = recorder.uri;
      if (!uri) throw new AIError('Hakuna rekodi iliyopatikana.', 'validation');

      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && typeof info.size === 'number' && info.size > 5_000_000) {
          throw new AIError('Sauti ni ndefu sana. Jaribu kwa muda mfupi.', 'validation');
        }
      } catch (e) {
        if (e instanceof AIError) throw e;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (stale()) return;
      const mimeType = uri.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/m4a';
      const transcript = await transcribeAudio(base64, { mimeType, language: 'sw' });
      if (stale()) return;

      if (!transcript || !transcript.trim()) {
        addNotification({
          title: 'Sankofa AI',
          body: 'Sikukusikia. Jaribu tena.',
          type: 'warning',
        });
        setVoiceState('IDLE');
        return;
      }
      const result = await sendUserMessage(transcript, { fromVoice: true });
      if (result === 'busy') {
        addNotification({
          title: 'Sankofa AI',
          body: 'Subiri jibu la awali kumalizika.',
          type: 'warning',
        });
        setVoiceState('IDLE');
      } else if (result === 'invalid') {
        setVoiceState('IDLE');
      }
    } catch (err) {
      if (stale()) return;
      const e = err as AIError;
      const friendly =
        e?.kind === 'validation'
          ? e.message
          : e?.kind === 'unauthorized'
            ? 'Tafadhali ingia tena ili kutumia sauti.'
            : e?.kind === 'network'
              ? 'Hakuna mtandao. Jaribu tena ukiunganishwa.'
              : 'Samahani, sauti haijachanganuliwa. Jaribu tena.';
      addNotification({ title: 'Sankofa AI', body: friendly, type: 'warning' });
      setVoiceState('IDLE');
    }
  };

  const handleVoiceInteraction = () => {
    if (voiceState === 'IDLE' || voiceState === 'SPEAKING') startRecording();
    else if (voiceState === 'LISTENING') stopRecordingAndTranscribe();
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShortcut = async (type: 'summarize' | 'trends' | 'compare') => {
    const promptText =
      type === 'summarize'
        ? language === 'sw'
          ? 'Tafadhali nisaidie kufanya muhtasari wa data hizi.'
          : 'Please summarize this spreadsheet data.'
        : type === 'trends'
          ? language === 'sw'
            ? 'Tafuta mwenendo muhimu katika data hizi.'
            : 'Find key trends in this data.'
          : language === 'sw'
            ? 'Nisaidie kulinganisha maadili katika data hizi.'
            : 'Help me compare values in this data.';
    if (promptText) await sendUserMessage(promptText);
  };

  const handleExcelPick = async () => {
    setAttachmentMenuVisible(false);
    if (isOffline) {
      Alert.alert(
        language === 'sw' ? 'Nje ya Mtandao' : 'Offline Mode',
        language === 'sw'
          ? 'Kupakia lahajedwali kunahitaji mtandao.'
          : 'Uploading spreadsheets requires internet.'
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert(
          language === 'sw' ? 'Faili ni kubwa sana' : 'File too large',
          language === 'sw' ? 'Ukomo ni 10MB.' : 'Limit is 10MB.'
        );
        return;
      }
      setIsParsingExcel(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const parsed = parseExcelBase64(base64Data, asset.name);
      setActiveExcelData(parsed);
      const excelMsg: Message = {
        id: `excel_${Date.now()}`,
        text:
          language === 'sw'
            ? `Nimepakia faili: ${parsed.fileName}`
            : `Uploaded file: ${parsed.fileName}`,
        sender: 'excel_preview',
        timestamp: new Date(),
        excelData: parsed,
      };
      setMessages((prev) => [...prev, excelMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: language === 'sw' ? 'Lahajedwali Imepakiwa' : 'Spreadsheet Loaded',
        body:
          language === 'sw' ? `"${parsed.fileName}" ipo tayari.` : `"${parsed.fileName}" is ready.`,
        type: 'success',
      });
    } catch (err: any) {
      Alert.alert(language === 'sw' ? 'Hitilafu' : 'Error', err.message || 'Unknown error');
    } finally {
      setIsParsingExcel(false);
    }
  };

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Ambient background glows */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.glowTR} />
          <View style={styles.glowBL} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          {/* ── Header ── */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.iconBtn}
            >
              <ChevronLeft size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View
                style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
              >
                <LinearGradient colors={['#112519', '#060e08']} style={styles.aiAvatar}>
                  <BrainCircuit size={19} color={colors.primary} />
                </LinearGradient>
                <View
                  style={[
                    styles.avatarRing,
                    { borderColor: isOffline ? 'rgba(239,68,68,0.55)' : colors.primary + '80' },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={styles.headerTitle}>Sankofa AI</Text>
                  <View style={styles.engineBadge}>
                    <Text style={styles.engineBadgeText}>v2.1</Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isOffline
                          ? '#ef4444'
                          : !aiConfigured()
                            ? '#f59e0b'
                            : colors.primary,
                      },
                    ]}
                  />
                  <Text style={styles.statusLabel}>
                    {isOffline
                      ? 'SMS Fallback'
                      : !aiConfigured()
                        ? language === 'sw'
                          ? 'Hali ya Onyesho'
                          : 'Demo Mode'
                        : 'Neural Link Active'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setOffline(!isOffline);
              }}
              style={styles.iconBtn}
            >
              {isOffline ? (
                <CloudOff size={20} color="#ef4444" />
              ) : (
                <MoreVertical size={20} color="rgba(255,255,255,0.4)" />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Chat / Voice ── */}
          {!isVoiceMode ? (
            <Animated.View
              key="text"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.chatContent}
            >
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={({ item, index }) => (
                  <ChatMessage
                    item={item}
                    index={index}
                    language={language}
                    activeExcelData={activeExcelData}
                    setActiveExcelData={setActiveExcelData}
                    onShortcut={handleShortcut}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  isTyping ? (
                    <Animated.View entering={FadeInDown} exiting={FadeOut}>
                      <TypingIndicator />
                    </Animated.View>
                  ) : null
                }
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="voice"
              entering={FadeInDown}
              exiting={FadeOut}
              style={styles.voiceModeContainer}
            >
              <View style={styles.voiceHeader}>
                <Text style={[styles.voicePhaseText, { color: colors.text }]}>
                  {voiceState === 'IDLE' && 'Gusa kuongea na Sankofa'}
                  {voiceState === 'LISTENING' && 'Sankofa anakusikiliza…'}
                  {voiceState === 'PROCESSING' && 'Inachanganua sauti…'}
                  {voiceState === 'SPEAKING' && 'Sankofa anajibu'}
                </Text>
                {voiceState === 'SPEAKING' && !!voiceReply && (
                  <Animated.Text
                    entering={FadeInDown}
                    style={[styles.voiceTranscript, { color: colors.textMute }]}
                  >
                    {voiceReply}
                  </Animated.Text>
                )}
              </View>

              <View style={styles.voiceOrbWrapper}>
                <TouchableOpacity
                  onPress={handleVoiceInteraction}
                  activeOpacity={0.85}
                  style={styles.voiceOrbButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    voiceState === 'LISTENING'
                      ? language === 'sw'
                        ? 'Acha kurekodi sauti'
                        : 'Stop voice recording'
                      : voiceState === 'PROCESSING'
                        ? language === 'sw'
                          ? 'Inatafakari sauti'
                          : 'Processing voice'
                        : language === 'sw'
                          ? 'Anza kurekodi sauti'
                          : 'Start voice recording'
                  }
                >
                  {[140, 170, 200].map((sz, i) => (
                    <View
                      key={i}
                      style={[
                        styles.voiceRipple,
                        {
                          width: sz,
                          height: sz,
                          borderRadius: sz / 2,
                          borderColor:
                            voiceState === 'LISTENING'
                              ? `rgba(46, 111, 64,${0.4 - i * 0.12})`
                              : voiceState === 'PROCESSING'
                                ? `rgba(139,92,246,${0.4 - i * 0.12})`
                                : `rgba(46, 111, 64,${0.15 - i * 0.04})`,
                        },
                      ]}
                    />
                  ))}
                  <LinearGradient
                    colors={
                      voiceState === 'LISTENING'
                        ? [colors.primary, '#3A8D52']
                        : voiceState === 'PROCESSING'
                          ? ['rgba(139,92,246,0.4)', 'rgba(139,92,246,0.1)']
                          : [colors.primary + '33', colors.primary + '0D']
                    }
                    style={styles.voiceOrbCore}
                  >
                    {voiceState === 'PROCESSING' ? (
                      <BrainCircuit size={44} color="#a78bfa" />
                    ) : voiceState === 'SPEAKING' ? (
                      <Zap size={44} color={colors.primary} />
                    ) : (
                      <Mic size={44} color={voiceState === 'LISTENING' ? '#fff' : colors.primary} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.exitVoiceBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={toggleVoiceMode}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Rudi kwenye maandishi' : 'Switch to Text'}
              >
                <MessageSquare
                  size={16}
                  color={isDark ? 'rgba(255,255,255,0.5)' : colors.textMute}
                />
                <Text style={[styles.exitVoiceText, { color: colors.textMute }]}>
                  Rudi maandishi
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Input Area ── */}
          {!isVoiceMode && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ marginBottom: Platform.OS === 'ios' ? 96 : 82 }}
            >
              {!isTyping && messages.length < 3 && (
                <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.suggestionBox}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionScroll}
                  >
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.suggestionBtn,
                          { backgroundColor: isDark ? colors.primary + '12' : colors.card },
                        ]}
                        onPress={() => {
                          setInputText(prompt);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw'
                            ? `Uliza pendekezo: ${prompt}`
                            : `Ask suggestion: ${prompt}`
                        }
                      >
                        <Sparkles size={11} color={colors.primary} style={{ marginRight: 5 }} />
                        <Text style={[styles.suggestionText, { color: colors.text }]}>
                          {prompt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              <View
                style={[
                  styles.inputArea,
                  { backgroundColor: isDark ? 'rgba(10,18,10,0.97)' : colors.card },
                ]}
              >
                <View style={styles.inputRow}>
                  <TouchableOpacity
                    style={[
                      styles.plusBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setAttachmentMenuVisible(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'sw' ? 'Fungua zana za ziada' : 'Open additional tools'
                    }
                  >
                    <Plus size={20} color={isDark ? 'rgba(255,255,255,0.5)' : colors.textMute} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.inputContainer,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder={isOffline ? 'Tuma SMS...' : 'Uliza Sankofa...'}
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : colors.textMute}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      onFocus={() => Haptics.selectionAsync()}
                      accessibilityLabel={
                        language === 'sw' ? 'Uwanja wa swali' : 'Question input field'
                      }
                      accessibilityHint={
                        language === 'sw' ? 'Weka ujumbe wako hapa' : 'Type your message here'
                      }
                    />
                    <View style={styles.inputActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={toggleVoiceMode}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw' ? 'Washa kurekodi sauti' : 'Enable voice recording'
                        }
                      >
                        <Mic size={19} color={isDark ? 'rgba(255,255,255,0.4)' : colors.textMute} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          {
                            backgroundColor:
                              inputText.trim() && !isTyping
                                ? colors.primary
                                : isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : colors.border,
                          },
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isTyping}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw' ? 'Tuma ujumbe sasa' : 'Send message now'
                        }
                      >
                        <Send
                          size={15}
                          color={
                            inputText.trim()
                              ? '#fff'
                              : isDark
                                ? 'rgba(255,255,255,0.3)'
                                : colors.textMute
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>

        {/* ── Attachment Modal ── */}
        <Modal
          visible={attachmentMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAttachmentMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAttachmentMenuVisible(false)}
          >
            <View
              style={[
                styles.attachmentSheet,
                { backgroundColor: isDark ? '#111a10' : colors.card },
              ]}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border },
                ]}
              />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Zana za Sankofa' : 'Sankofa Tools'}
              </Text>

              {[
                {
                  icon: <FileSpreadsheet size={22} color={colors.primary} />,
                  title: language === 'sw' ? 'Pakia Lahajedwali' : 'Upload Spreadsheet',
                  sub: 'Excel / CSV → Q&A',
                  onPress: handleExcelPick,
                },
                {
                  icon: <Leaf size={22} color={colors.primary} />,
                  title: language === 'sw' ? 'Tathmini ya Mazao' : 'Crop Assessment',
                  sub: language === 'sw' ? 'Kamera / dalili' : 'Camera / checklist',
                  onPress: () => {
                    setAttachmentMenuVisible(false);
                    setDiseaseModalVisible(true);
                  },
                },
                {
                  icon: <Camera size={22} color={colors.primary} />,
                  title: language === 'sw' ? 'Kamera ya AI' : 'AI Vision Scanner',
                  sub: language === 'sw' ? 'Changanua majani' : 'Scan plant leaves',
                  onPress: () => {
                    setAttachmentMenuVisible(false);
                    router.push('/scan' as any);
                  },
                },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.sheetOption, i < 2 && { borderBottomColor: colors.border }]}
                  onPress={item.onPress}
                >
                  <View style={styles.sheetIconWrap}>{item.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.sheetOptionSub, { color: colors.textMute }]}>
                      {item.sub}
                    </Text>
                  </View>
                  <ArrowRight
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.2)' : colors.textMute}
                  />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.sheetCancel,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card },
                ]}
                onPress={() => setAttachmentMenuVisible(false)}
              >
                <Text style={[styles.sheetCancelText, { color: colors.textMute }]}>
                  {language === 'sw' ? 'Ghairi' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <DiseaseModal visible={diseaseModalVisible} onClose={() => setDiseaseModalVisible(false)} />

        {isParsingExcel && (
          <View style={styles.loaderOverlay}>
            <View
              style={[styles.loaderCard, { backgroundColor: isDark ? '#111a10' : colors.card }]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.text }]}>
                {language === 'sw' ? 'Inasoma lahajedwali…' : 'Parsing spreadsheet…'}
              </Text>
            </View>
          </View>
        )}
      </View>
  );
}

// ─────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────

function ChatMessage({
  item,
  index,
  language,
  activeExcelData,
  setActiveExcelData,
  onShortcut,
}: any) {
  const { colors, isDark } = useTheme();
  const isAi = item.sender === 'ai';
  const isExcel = item.sender === 'excel_preview';

  if (isExcel) {
    const isActive = activeExcelData && activeExcelData.fileName === item.excelData.fileName;
    if (!isActive) {
      return (
        <Animated.View
          entering={FadeInDown}
          style={[
            styles.detachedCard,
            { borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
          ]}
        >
          <FileSpreadsheet size={14} color={isDark ? 'rgba(255,255,255,0.3)' : colors.textMute} />
          <Text style={[styles.detachedText, { color: colors.text }]}>
            {language === 'sw'
              ? `Lahajedwali imetenganishwa: ${item.excelData.fileName}`
              : `Detached: ${item.excelData.fileName}`}
          </Text>
        </Animated.View>
      );
    }
    return (
      <ExcelPreviewCard
        data={item.excelData}
        onClear={() => {
          setActiveExcelData(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
        onShortcut={onShortcut}
        language={language}
      />
    );
  }

  return (
    <Animated.View
      entering={FadeInDown}
      style={[styles.msgRow, isAi ? styles.msgRowAi : styles.msgRowUser]}
    >
      {isAi && (
        <LinearGradient colors={['#112519', '#060e08']} style={styles.avatar}>
          <BrainCircuit size={14} color={colors.primary} />
        </LinearGradient>
      )}

      {isAi ? (
        <View style={styles.aiBubble}>
          <LinearGradient
            colors={[colors.primary + '21', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBubbleShimmer}
          />
          <View style={styles.aiBubbleSourceRow}>
            <BrainCircuit size={9} color={colors.primary} />
            <Text style={styles.aiBubbleSourceText}>SANKOFA</Text>
          </View>
          <Text style={[styles.msgText, styles.aiText]}>{item.text}</Text>
          <Text style={[styles.msgTime, styles.aiTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={['#3A8D52', colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.userBubble]}
        >
          <Text style={[styles.msgText, styles.userText]}>{item.text}</Text>
          <Text style={[styles.msgTime, styles.userTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </LinearGradient>
      )}

      {!isAi && (
        <View style={styles.userAvatar}>
          <User size={14} color="rgba(255,255,255,0.75)" />
        </View>
      )}
    </Animated.View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-7, { duration: 350 }), withTiming(0, { duration: 350 })),
        -1,
        false
      )
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.typingDot, animStyle]} />;
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <LinearGradient colors={['#112519', '#060e08']} style={styles.avatar}>
        <BrainCircuit size={14} color="#2E6F40" />
      </LinearGradient>
      <View>
        <View style={styles.aiBubbleSourceRow}>
          <BrainCircuit size={8} color="#2E6F40" />
          <Text style={styles.aiBubbleSourceText}>SANKOFA</Text>
        </View>
        <View style={styles.typingBubble}>
          <TypingDot delay={0} />
          <TypingDot delay={150} />
          <TypingDot delay={300} />
        </View>
      </View>
    </View>
  );
}

function ExcelPreviewCard({ data, onClear, onShortcut, language }: any) {
  const [expanded, setExpanded] = useState(false);
  const { colors, isDark } = useTheme();

  return (
    <Animated.View entering={FadeInDown} style={styles.excelCard}>
      <View style={styles.excelHeader}>
        <View style={styles.excelIconBox}>
          <FileSpreadsheet size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.excelFileName, { color: colors.text }]} numberOfLines={1}>
            {data.fileName}
          </Text>
          <Text style={[styles.excelMeta, { color: colors.textMute }]}>
            {data.rowCount} rows · {data.columnCount} cols
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Remove uploaded file"
          onPress={onClear}
          style={styles.excelTrash}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {data.headers.map((h: string, i: number) => (
          <View
            key={i}
            style={[
              styles.headerChip,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryLight },
            ]}
          >
            <Text
              style={[
                styles.headerChipText,
                { color: isDark ? 'rgba(255,255,255,0.7)' : colors.text },
              ]}
            >
              {h}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.excelToggle}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        <Text style={styles.excelToggleText}>
          {expanded
            ? language === 'sw'
              ? 'Ficha data'
              : 'Hide preview'
            : language === 'sw'
              ? 'Onyesha data'
              : 'Show preview'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 8 }}>
          <View style={[styles.table, { borderColor: colors.border }]}>
            <View style={styles.tableHeaderRow}>
              {data.headers.map((h: string, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.tableHeaderText,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : colors.textMute },
                    ]}
                    numberOfLines={1}
                  >
                    {h}
                  </Text>
                </View>
              ))}
            </View>
            {data.previewRows.map((row: any, rIdx: number) => (
              <View key={rIdx} style={styles.tableRow}>
                {data.headers.map((h: string, cIdx: number) => (
                  <View key={cIdx} style={[styles.tableCell, { borderBottomColor: colors.border }]}>
                    <Text
                      style={[
                        styles.tableCellText,
                        { color: isDark ? 'rgba(255,255,255,0.6)' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {String(row[h] ?? '')}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.shortcutRow}>
        {[
          { key: 'summarize', label: language === 'sw' ? 'Muhtasari' : 'Summarize' },
          { key: 'trends', label: language === 'sw' ? 'Mwenendo' : 'Trends' },
          { key: 'compare', label: language === 'sw' ? 'Linganisha' : 'Compare' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={styles.shortcutBtn}
            onPress={() => onShortcut(s.key)}
          >
            <Sparkles size={11} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.shortcutText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a120a',
  },

  // Background glows
  glowTR: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(90px)' } as any) : {}),
  },
  glowBL: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(46, 111, 64,0.06)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as any) : {}),
  },

  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 111, 64,0.12)',
    backgroundColor: 'rgba(6,12,7,0.97)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 10,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.35)',
  },
  avatarRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  engineBadge: {
    backgroundColor: 'rgba(46, 111, 64,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.28)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  engineBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#fff',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
  },

  // Chat
  chatContent: { flex: 1 },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },

  // Message row
  msgRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
    maxWidth: '88%',
  },
  msgRowAi: { alignSelf: 'flex-start' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.3)',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  aiBubble: {
    backgroundColor: 'rgba(9,20,11,0.97)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#2E6F40',
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  aiBubbleShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  aiBubbleSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiBubbleSourceText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#2E6F40',
    letterSpacing: 1,
  },
  userBubble: {
    borderRadius: 18,
    borderTopRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.9)',
  },
  userText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  msgTime: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'Inter_500Medium',
  },
  aiTime: { color: 'rgba(255,255,255,0.28)' },
  userTime: { color: 'rgba(255,255,255,0.65)' },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: 'rgba(9,20,11,0.97)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#2E6F40',
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2E6F40',
  },

  // Suggestions
  suggestionBox: {
    paddingVertical: 10,
  },
  suggestionScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 111, 64,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.22)',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.75)',
  },

  // Input
  inputArea: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 111, 64,0.12)',
    backgroundColor: 'rgba(5,10,6,0.99)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 111, 64,0.28)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    maxHeight: 100,
    paddingVertical: 10,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Voice mode
  voiceModeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Platform.OS === 'ios' ? 156 : 142,
  },
  voiceHeader: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  voicePhaseText: {
    fontSize: 26,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  voiceTranscript: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  voiceOrbWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceOrbButton: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceRipple: {
    position: 'absolute',
    borderWidth: 1,
  },
  voiceOrbCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.4)',
  },
  exitVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  exitVoiceText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.4)',
  },

  // Attachment sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  attachmentSheet: {
    backgroundColor: '#111a10',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.12)',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#fff',
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  sheetOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  sheetOptionSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sheetCancelText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.5)',
  },

  // Loader
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  loaderCard: {
    backgroundColor: '#111a10',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
  },
  loaderText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },

  // Excel card
  excelCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
    backgroundColor: 'rgba(46, 111, 64,0.04)',
    padding: 16,
    marginBottom: 20,
  },
  excelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  excelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 111, 64,0.12)',
  },
  excelFileName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  excelMeta: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  excelTrash: {
    padding: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
  },
  headerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 6,
  },
  headerChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  excelToggle: {
    marginTop: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(46, 111, 64,0.05)',
  },
  excelToggleText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
  },
  table: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row' },
  tableCell: {
    width: 100,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  tableHeaderCell: {
    backgroundColor: 'rgba(46, 111, 64,0.08)',
  },
  tableHeaderText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.7)',
  },
  tableCellText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 111, 64,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 64,0.2)',
  },
  shortcutText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
  },

  // Detached
  detachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  detachedText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.3)',
  },
});
