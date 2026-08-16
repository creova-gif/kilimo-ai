import React, { useState } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Bot,
  ArrowLeft,
  Sliders,
  Database,
  Cpu,
  Layers,
  FileText,
  Upload,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Award,
  MessageSquare,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useKilimoStore } from '../store/useKilimoStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_SYSTEM_PROMPT = `Wewe ni Sankofa AI — mshauri mkuu wa kilimo wa KILIMO AI, ukihudumia wakulima wa Tanzania na Afrika Mashariki.

KANUNI ZA LAZIMA (zifuatwe KILA wakati bila ubaguzi):

1. UKWELI KWANZA — Kamwe usifabrike bei za soko, utabiri wa hali ya hewa, mavuno, au takwimu yoyote halisi. Ukiulizwa "bei ya mahindi kesho ni ngapi?" jibu: "Sijui bei halisi — angalia soko la Kariakoo au wasiliana na mnunuzi." Usikadirie kwa uhakika ambao hauko nazo.

2. USALAMA WA KEMIKALI — Usipendekeze dozi maalum za viuatilifu au dawa za wadudu. Sema aina ya kemikali TU, kisha: "Wasiliana na Afisa Ugani kwa dozi sahihi." Dawa mbaya inaweza kuua mazao, wanyama, na watu.

3. LUGHA — Gundua lugha ya mtumiaji na jibu kwa LUGHA HIYO HIYO. Ikiwa mtumiaji anaandika kwa Kiingereza, jibu Kiingereza. Swahili → Swahili. Endelea bila kuuliza.`;

export default function AIAdminScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const language = useKilimoStore((s) => s.language);

  // Zustand Store values
  const customSystemPrompt = useKilimoStore((s) => s.customSystemPrompt);
  const seededDocuments = useKilimoStore((s) => s.seededDocuments);
  const aiAccuracy = useKilimoStore((s) => s.aiAccuracy);
  const setCustomSystemPrompt = useKilimoStore((s) => s.setCustomSystemPrompt);
  const addSeededDocument = useKilimoStore((s) => s.addSeededDocument);
  const removeSeededDocument = useKilimoStore((s) => s.removeSeededDocument);
  const setAiAccuracy = useKilimoStore((s) => s.setAiAccuracy);

  // Local state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'prompt' | 'rag' | 'pipeline' | 'feedback'
  >('overview');
  const [promptText, setPromptText] = useState(customSystemPrompt || DEFAULT_SYSTEM_PROMPT);
  const [newDocName, setNewDocName] = useState('');

  // Pipeline local states
  const [isRetraining, setIsRetraining] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState('');
  const [logs, setLogs] = useState<string[]>([
    'System initialized on 2026-05-20',
    'Pre-loaded TARI Maize Guide v2.pdf',
    'Base model accuracy verified: 95.8%',
  ]);

  // Feedback local states
  const [feedbacks, setFeedbacks] = useState([
    {
      id: 'f1',
      farmer: 'Juma K.',
      crop: 'Mahindi / Maize',
      location: 'Mbeya',
      type: 'positive',
      commentSw:
        'Ushauri wa kupanda mahindi mwezi wa tatu ulikuwa sahihi sana na nimepata mazao mengi.',
      commentEn: 'The advice to plant maize in March was very accurate and I got a high yield.',
      timestamp: 'Leo (Today)',
      resolved: false,
    },
    {
      id: 'f2',
      farmer: 'Mariam S.',
      crop: 'Nyanya / Tomatoes',
      location: 'Iringa',
      type: 'negative',
      commentSw:
        'AI ilisema niweke dawa ya wadudu lakini haikutaja vipimo maalum, ilibidi nitafute Afisa Ugani.',
      commentEn:
        'AI told me to apply pesticide but did not specify dosage, I had to contact the Extension Officer.',
      timestamp: 'Jana (Yesterday)',
      resolved: false,
    },
    {
      id: 'f3',
      farmer: 'Aloyce M.',
      crop: 'Mpunga / Rice',
      location: 'Shinyanga',
      type: 'positive',
      commentSw:
        'Picha ya wadudu wa mpunga ilitambuliwa haraka sana kama Rice Blast. Nilifuata maelekezo ikasaidia.',
      commentEn:
        'Rice Blast photo identified very quickly. Followed the instructions and it helped.',
      timestamp: 'Siku 2 zilizopita (2 days ago)',
      resolved: false,
    },
  ]);

  const handleResolveFeedback = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true } : f)));
  };

  // Tab configurations
  const tabs = [
    {
      id: 'overview',
      labelSw: 'Ufupisho',
      labelEn: 'Overview',
      icon: (color: string) => <Layers size={18} color={color} />,
    },
    {
      id: 'prompt',
      labelSw: 'Prompt ya Mfumo',
      labelEn: 'System Prompt',
      icon: (color: string) => <Sliders size={18} color={color} />,
    },
    {
      id: 'rag',
      labelSw: 'RAG / Nyaraka',
      labelEn: 'Knowledge Base',
      icon: (color: string) => <Database size={18} color={color} />,
    },
    {
      id: 'pipeline',
      labelSw: 'Mifereji ya Mafunzo',
      labelEn: 'Retraining',
      icon: (color: string) => <Cpu size={18} color={color} />,
    },
    {
      id: 'feedback',
      labelSw: 'Maoni ya Wakulima',
      labelEn: 'Feedback Reviewer',
      icon: (color: string) => <MessageSquare size={18} color={color} />,
    },
  ] as const;

  // Handle system prompt save
  // NOTE: customSystemPrompt is local-device Zustand state only (see
  // store/useKilimoStore.ts). Nothing in the real chat pipeline
  // (app/(tabs)/ai.tsx, lib/ai.ts's chat(), or the openai-proxy/rag-chat
  // edge functions) ever reads it — the alert below used to claim this
  // took effect "immediately," which was never true. openai-proxy also
  // explicitly strips any client-supplied system prompt server-side by
  // design, so wiring this up as-is would be a defense-in-depth violation,
  // not just a missing connection. Left honestly labeled rather than wired
  // in — a real prompt-management surface needs to be a properly
  // authenticated, server-side, staff-only capability, not a value any
  // client can set for itself.
  const handleSavePrompt = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomSystemPrompt(promptText);
    Alert.alert(
      language === 'sw' ? 'Imehifadhiwa kwenye Kifaa Hiki' : 'Saved On This Device Only',
      language === 'sw'
        ? 'Hii ni onyesho la mfano — bado halijaunganishwa na mfumo halisi wa Sankofa AI.'
        : 'This is a prototype view — it is not yet connected to the live Sankofa AI system.'
    );
  };

  // Reset prompt to system default
  const handleResetPrompt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPromptText(DEFAULT_SYSTEM_PROMPT);
    setCustomSystemPrompt(null);
    Alert.alert(
      language === 'sw' ? 'Imerejeshwa!' : 'Reset Successful!',
      language === 'sw'
        ? 'Prompt ya mfumo imerudishwa kwenye hali ya msingi.'
        : 'The system prompt has been reset to defaults.'
    );
  };

  // Add mock seeded document
  const handleAddDocument = () => {
    if (!newDocName.trim()) return;

    // Simple file validation
    const name = newDocName.trim();
    if (!name.endsWith('.pdf') && !name.endsWith('.txt') && !name.endsWith('.docx')) {
      Alert.alert(
        language === 'sw' ? 'Aina ya Faili Isiyo Sahihi' : 'Invalid File Type',
        language === 'sw'
          ? 'Tafadhali tumia faili za (.pdf, .txt, .docx)'
          : 'Please use (.pdf, .txt, or .docx) formats.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addSeededDocument(name);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Seeded context document: ${name}`,
      ...prev,
    ]);
    setNewDocName('');
  };

  // Remove RAG document
  const handleRemoveDocument = (docName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeSeededDocument(docName);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Removed context document: ${docName}`,
      ...prev,
    ]);
  };

  // Quick templates for RAG seeding
  const RAG_TEMPLATES = [
    'Mbeya Soil Quality 2026.txt',
    'East Africa Cassava Pest Control.pdf',
    'Cabbage Irrigation Schedule Arusha.pdf',
  ];

  const handleSeedTemplate = (templateName: string) => {
    if (seededDocuments.includes(templateName)) {
      Alert.alert(language === 'sw' ? 'Ipo Tayari' : 'Already Seeded', templateName);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addSeededDocument(templateName);
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Seeded context document: ${templateName}`,
      ...prev,
    ]);
  };

  // Mock Retraining Pipeline
  const runRetrainingPipeline = () => {
    setIsRetraining(true);
    setPipelineProgress(0.1);
    setPipelineStep(
      language === 'sw'
        ? '1/4: Inachanganua faili za muktadha...'
        : '1/4: Parsing knowledge documents...'
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setPipelineProgress(0.4);
      setPipelineStep(
        language === 'sw'
          ? '2/4: Inatengeneza embeddings...'
          : '2/4: Regenerating vector embeddings...'
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 500);

    setTimeout(() => {
      setPipelineProgress(0.7);
      setPipelineStep(
        language === 'sw'
          ? '3/4: Inapanga vigezo vya mtindo...'
          : '3/4: Fine-tuning prompt weights...'
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1000);

    setTimeout(() => {
      setPipelineProgress(1.0);
      setPipelineStep(
        language === 'sw'
          ? '4/4: Kazi imekamilika! Inapima usahihi...'
          : '4/4: Success! Compiling metrics...'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);

    setTimeout(() => {
      setIsRetraining(false);
      const nextAcc = Math.min(99.9, Number((aiAccuracy + 0.4).toFixed(1)));
      setAiAccuracy(nextAcc);

      const timeStr = new Date().toLocaleTimeString();
      setLogs((prev) => [
        `[${timeStr}] PIPELINE SUCCESS: Model retrained. New Accuracy: ${nextAcc}%`,
        `[${timeStr}] Evaluated on 100+ local farming scenarios`,
        ...prev,
      ]);
    }, 1800);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Cinematic Background */}
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
              {language === 'sw' ? 'Usimamizi wa AI' : 'AI Admin Console'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMute }]}>
              {language === 'sw' ? 'Marekebisho ya Sankofa Chatbot' : 'Sankofa Chatbot Customizer'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Prototype notice — nothing on this screen (system prompt, RAG
            documents, retraining pipeline, feedback triage) is wired to a
            real backend. All of it is local-device state; see the comment
            on handleSavePrompt below for why. This screen was previously
            reachable from every farmer's own Profile menu with no role
            gate at all — removed from that nav in the same change that
            added this notice. Kept in the codebase, honestly labeled,
            rather than deleted, since real internal tooling likely belongs
            here eventually behind proper staff authentication. */}
        <View
          style={[
            styles.protoBanner,
            { backgroundColor: '#f59e0b18', borderColor: '#f59e0b40' },
          ]}
        >
          <Text style={[styles.protoBannerText, { color: '#b45309' }]}>
            {language === 'sw'
              ? 'ONYESHO LA MFANO — hakuna kinachobadilika kwenye Sankofa AI halisi.'
              : 'PROTOTYPE — nothing here changes the live Sankofa AI.'}
          </Text>
        </View>

        {/* Tabs navigation */}
        <View style={styles.tabsContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const label = language === 'sw' ? tab.labelSw : tab.labelEn;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
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
                    setActiveTab(tab.id);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={label}
                >
                  {tab.icon(isActive ? colors.primary : colors.textMute)}
                  <Text
                    style={[styles.tabText, { color: isActive ? colors.text : colors.textMute }]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab content area */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'overview' && (
            /* 📊 OVERVIEW TAB */
            <Animated.View entering={FadeIn}>
              {/* Accuracy Display */}
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.consoleCard, { borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                      : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardHeader}>
                  <TrendingUp size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {language === 'sw' ? 'Kiwango cha Usahihi wa AI' : 'AI Model Accuracy'}
                  </Text>
                </View>

                <View style={styles.accuracyMeterRow}>
                  <View style={styles.meterContainer}>
                    <Text style={[styles.meterNumber, { color: colors.text }]}>{aiAccuracy}%</Text>
                    <Text style={[styles.meterSub, { color: colors.textMute }]}>
                      {language === 'sw' ? 'Katika Mazingira Halisi' : 'Real-world Context'}
                    </Text>
                  </View>
                  <View style={styles.accuracyDetails}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: colors.textMute }]}>
                        {language === 'sw' ? 'Usawazishaji RAG:' : 'Knowledge Sources:'}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        {seededDocuments.length} docs
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: colors.textMute }]}>
                        {language === 'sw' ? 'Muda wa Kufundisha:' : 'Last Retrained:'}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>Today</Text>
                    </View>
                  </View>
                </View>
              </BlurView>

              {/* Status Stats Grid */}
              <View style={styles.statsGrid}>
                <BlurView
                  intensity={isDark ? 20 : 60}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.gridCard, { borderColor: colors.border }]}
                >
                  <Text style={[styles.gridLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Wateja Walioridhika' : 'Customer Satisfaction'}
                  </Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>92.4%</Text>
                  <Text style={styles.gridSubText}>+1.2% this month</Text>
                </BlurView>

                <BlurView
                  intensity={isDark ? 20 : 60}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.gridCard, { borderColor: colors.border }]}
                >
                  <Text style={[styles.gridLabel, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Maswali ya AI Leo' : 'AI Inquiries Today'}
                  </Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>412</Text>
                  <Text style={styles.gridSubText}>Avg response: 1.4s</Text>
                </BlurView>
              </View>

              {/* Quick Prompt Editor Card link */}
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.linkCard, { borderColor: colors.border }]}
              >
                <TouchableOpacity
                  style={styles.linkCardContent}
                  onPress={() => setActiveTab('prompt')}
                  accessibilityRole="button"
                  accessibilityLabel="Manage system prompts"
                >
                  <Bot size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.linkCardTitle, { color: colors.text }]}>
                      {language === 'sw' ? 'Hariri Mfumo wa Prompt' : 'Edit System Prompts'}
                    </Text>
                    <Text style={[styles.linkCardSub, { color: colors.textMute }]}>
                      {customSystemPrompt
                        ? language === 'sw'
                          ? 'Prompt Maalum inatumika sasa'
                          : 'Custom instructions active'
                        : language === 'sw'
                          ? 'Hakuna marekebisho (Chaguo-msingi)'
                          : 'Using standard system model defaults'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textMute} />
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          )}

          {activeTab === 'prompt' && (
            /* 📝 SYSTEM PROMPT TAB */
            <Animated.View entering={FadeIn}>
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.consoleCard, { borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                      : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                  }
                  style={StyleSheet.absoluteFill}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'Kiongozi cha Sankofa AI System Prompt'
                    : 'Sankofa AI System Prompt Override'}
                </Text>
                <Text style={[styles.inputHint, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Marekebisho haya yanabadilisha kanuni za ndani za Sankofa AI kwa maswali yote mapya.'
                    : 'Modifying these rules alters the inner guidelines of Sankofa AI for all future chat sessions.'}
                </Text>

                <TextInput
                  style={[
                    styles.promptTextInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                    },
                  ]}
                  value={promptText}
                  onChangeText={setPromptText}
                  multiline
                  placeholder="System prompt..."
                  placeholderTextColor={colors.textMute}
                  textAlignVertical="top"
                  accessibilityLabel="System Prompt Editor"
                />

                <View style={styles.promptActionsRow}>
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: colors.border }]}
                    onPress={handleResetPrompt}
                    accessibilityRole="button"
                    accessibilityLabel="Reset instructions to default"
                  >
                    <RotateCcw size={16} color={colors.text} />
                    <Text style={[styles.outlineBtnText, { color: colors.text }]}>
                      {language === 'sw' ? 'Rudisha Chaguo-msingi' : 'Reset Default'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSavePrompt}
                    accessibilityRole="button"
                    accessibilityLabel="Save Prompt Changes"
                  >
                    <CheckCircle2 size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {language === 'sw' ? 'Hifadhi Prompt' : 'Save Prompt'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>
          )}

          {activeTab === 'rag' && (
            /* 📂 KNOWLEDGE BASE TAB */
            <Animated.View entering={FadeIn}>
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.consoleCard, { borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                      : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                  }
                  style={StyleSheet.absoluteFill}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'Nyaraka za Muktadha (RAG Seeding)'
                    : 'Context Knowledge Seeding (RAG)'}
                </Text>

                {/* Upload Section */}
                <View style={styles.uploadRow}>
                  <TextInput
                    style={[
                      styles.docInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                      },
                    ]}
                    value={newDocName}
                    onChangeText={setNewDocName}
                    placeholder="Magonjwa ya Alizeti.pdf"
                    placeholderTextColor={colors.textMute}
                    accessibilityLabel="New Document Name"
                  />
                  <TouchableOpacity
                    style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddDocument}
                    accessibilityRole="button"
                    accessibilityLabel="Add Knowledge Document"
                  >
                    <Upload size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Quick seed templates */}
                <Text style={[styles.subLabel, { color: colors.textMute, marginTop: 12 }]}>
                  {language === 'sw' ? 'Violezo vya Haraka:' : 'Quick seed templates:'}
                </Text>
                <View style={styles.templateList}>
                  {RAG_TEMPLATES.map((tpl) => (
                    <TouchableOpacity
                      key={tpl}
                      style={[
                        styles.templateChip,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleSeedTemplate(tpl)}
                      accessibilityRole="button"
                      accessibilityLabel={`Seed ${tpl}`}
                    >
                      <Sparkles size={12} color={colors.primary} />
                      <Text style={[styles.templateChipText, { color: colors.text }]}>{tpl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Seeded files list */}
                <View
                  style={[styles.divider, { backgroundColor: colors.border, marginVertical: 20 }]}
                />

                <Text style={[styles.subLabel, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'Nyaraka Amilifu kwenye Mfumo:'
                    : 'Currently Seeded Context Documents:'}
                </Text>

                <View style={styles.docList}>
                  {seededDocuments.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMute }]}>
                      {language === 'sw'
                        ? 'Hakuna nyaraka zilizowekwa.'
                        : 'No context files seeded yet.'}
                    </Text>
                  ) : (
                    seededDocuments.map((doc) => (
                      <View
                        key={doc}
                        style={[
                          styles.docItem,
                          {
                            borderColor: colors.border,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          },
                        ]}
                      >
                        <FileText size={16} color={colors.primary} />
                        <Text
                          style={[styles.docItemText, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {doc}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleRemoveDocument(doc)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${doc}`}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </BlurView>
            </Animated.View>
          )}

          {activeTab === 'pipeline' && (
            /* ⚙️ RETRAINING PIPELINE TAB */
            <Animated.View entering={FadeIn}>
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.consoleCard, { borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                      : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                  }
                  style={StyleSheet.absoluteFill}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === 'sw' ? 'Fundisha Chatbot Upya' : 'Model Retraining Pipeline'}
                </Text>
                <Text style={[styles.inputHint, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Kuanzisha mifereji kutasawazisha nyaraka zote za RAG kwenye mtindo na kuongeza usahihi wa majibu.'
                    : 'Running the pipeline will align all seeded RAG documents into the AI model vector database.'}
                </Text>

                {isRetraining ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loaderStepText, { color: colors.text }]}>
                      {pipelineStep}
                    </Text>
                    <View
                      style={[
                        styles.progressBarBg,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          marginTop: 12,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${pipelineProgress * 100}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: colors.primary, marginVertical: 20 },
                    ]}
                    onPress={runRetrainingPipeline}
                    accessibilityRole="button"
                    accessibilityLabel="Trigger retraining pipeline"
                  >
                    <Play size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {language === 'sw' ? 'Anza Kufundisha Mfumo' : 'Trigger Pipeline execution'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View
                  style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]}
                />

                <Text style={[styles.subLabel, { color: colors.text, marginBottom: 12 }]}>
                  {language === 'sw'
                    ? 'Kumbukumbu za Utekelezaji (Pipeline Logs):'
                    : 'Pipeline Execution Logs:'}
                </Text>

                <View
                  style={[
                    styles.logConsole,
                    { backgroundColor: '#090d16', borderColor: colors.border },
                  ]}
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    style={{ maxHeight: 200 }}
                  >
                    {logs.map((log, index) => (
                      <Text key={index} style={styles.logLine}>
                        {log}
                      </Text>
                    ))}
                  </ScrollView>
                </View>
              </BlurView>
            </Animated.View>
          )}

          {activeTab === 'feedback' && (
            /* 💬 FEEDBACK REVIEWER TAB */
            <Animated.View entering={FadeIn}>
              <BlurView
                intensity={isDark ? 20 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.consoleCard, { borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.01)', 'rgba(30,41,59,0.3)']
                      : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.9)']
                  }
                  style={StyleSheet.absoluteFill}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === 'sw' ? 'Mkaguzi wa Maoni ya Wakulima' : 'Farmer Feedback Reviewer'}
                </Text>
                <Text style={[styles.inputHint, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Chambua maoni ya wakulima kuhusu majibu ya Sankofa AI ili kuboresha prompt au kuongeza nyaraka za RAG.'
                    : 'Analyze farmer feedback on Sankofa AI replies to optimize system prompts or seed additional RAG documents.'}
                </Text>

                <View style={styles.feedbackList}>
                  {feedbacks.map((f) => (
                    <View
                      key={f.id}
                      style={[
                        styles.feedbackCard,
                        {
                          borderColor: f.resolved ? 'rgba(16,185,129,0.2)' : colors.border,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          opacity: f.resolved ? 0.6 : 1,
                        },
                      ]}
                    >
                      <View style={styles.feedbackCardHeader}>
                        <View style={styles.farmerMeta}>
                          <Text style={[styles.feedbackFarmer, { color: colors.text }]}>
                            {f.farmer}
                          </Text>
                          <Text style={[styles.feedbackSub, { color: colors.textMute }]}>
                            {f.crop} • {f.location}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor:
                                f.type === 'positive'
                                  ? 'rgba(16,185,129,0.1)'
                                  : 'rgba(239,68,68,0.1)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: 'Inter_800ExtraBold',
                              color: f.type === 'positive' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {f.type === 'positive'
                              ? language === 'sw'
                                ? 'IMEPENDWA'
                                : 'HELPFUL'
                              : language === 'sw'
                                ? 'HAIJAPENDWA'
                                : 'UNHELPFUL'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.feedbackComment, { color: colors.text }]}>
                        {language === 'sw' ? f.commentSw : f.commentEn}
                      </Text>

                      <View style={styles.feedbackCardFooter}>
                        <Text style={[styles.feedbackTime, { color: colors.textMute }]}>
                          {f.timestamp}
                        </Text>
                        {!f.resolved ? (
                          <TouchableOpacity
                            style={[styles.resolveBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleResolveFeedback(f.id)}
                            accessibilityRole="button"
                            accessibilityLabel="Mark feedback as resolved"
                          >
                            <Text style={styles.resolveBtnText}>
                              {language === 'sw' ? 'Maliza' : 'Resolve'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.resolvedLabel}>
                            <CheckCircle2 size={14} color="#10b981" />
                            <Text style={styles.resolvedLabelText}>
                              {language === 'sw' ? 'Imeisha' : 'Resolved'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </BlurView>
            </Animated.View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  protoBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  protoBannerText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
    textAlign: 'center',
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
    justifyContent: 'space-between',
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
  tabsContainer: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  tabsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 48,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    padding: 24,
  },
  consoleCard: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  accuracyMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  meterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#10b981',
  },
  meterNumber: {
    fontSize: 22,
    fontFamily: 'InstrumentSerif_400Regular',
  },
  meterSub: {
    fontSize: 8,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    textAlign: 'center',
  },
  accuracyDetails: {
    flex: 1,
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  gridValue: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 4,
  },
  gridSubText: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: '#10b981',
  },
  linkCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    minHeight: 64,
  },
  linkCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  linkCardSub: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  /* Prompt overridden CSS */
  inputLabel: {
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
    marginBottom: 16,
  },
  promptTextInput: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    height: 220,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  promptActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    flex: 1,
    minHeight: 48,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 48,
  },
  outlineBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  /* RAG context CSS */
  uploadRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  docInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
  },
  templateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  templateChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  docList: {
    gap: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    minHeight: 48,
  },
  docItemText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginVertical: 12,
  },
  /* Pipeline CSS */
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loaderStepText: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  progressBarBg: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  logConsole: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  logLine: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#34d399',
    lineHeight: 16,
  },
  /* Feedback review CSS */
  feedbackList: {
    gap: 12,
    marginTop: 10,
  },
  feedbackCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  feedbackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  farmerMeta: {
    flex: 1,
    gap: 2,
  },
  feedbackFarmer: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  feedbackSub: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feedbackComment: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
  },
  feedbackCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  feedbackTime: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  resolveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
  },
  resolvedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resolvedLabelText: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
  },
});
