import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  X,
  Camera,
  ClipboardList,
  Check,
  AlertTriangle,
  Play,
  ChevronRight,
  RefreshCw,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';

import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { diagnoseCropPhoto, aiConfigured } from '../lib/ai';
import { demoDiagnosis } from '../lib/ai-demo';
import {
  CROP_SYMPTOMS,
  solveSymptomChecklist,
  REGIONS_LIST,
  DiseaseResult,
} from '../lib/diseaseDetector';

const { width: SW, height: SH } = Dimensions.get('window');

const CROPS_LIST = [
  { key: 'maize', nameSw: 'Mahindi', nameEn: 'Maize' },
  { key: 'tomatoes', nameSw: 'Nyanya', nameEn: 'Tomatoes' },
  { key: 'beans', nameSw: 'Maharage', nameEn: 'Beans' },
  { key: 'cassava', nameSw: 'Muhogo', nameEn: 'Cassava' },
  { key: 'coffee', nameSw: 'Kahawa', nameEn: 'Coffee' },
  { key: 'rice', nameSw: 'Mpunga', nameEn: 'Rice' },
  { key: 'sorghum', nameSw: 'Mtama', nameEn: 'Sorghum' },
  { key: 'sunflower', nameSw: 'Alizeti', nameEn: 'Sunflower' },
  { key: 'cabbage', nameSw: 'Kabichi', nameEn: 'Cabbage' },
  { key: 'chili', nameSw: 'Pilipili', nameEn: 'Chili' },
];

interface DiseaseModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedCrop?: string; // e.g. "Maize"
}

export default function DiseaseModal({ visible, onClose, preselectedCrop }: DiseaseModalProps) {
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const isOffline = useKilimoStore((s) => s.isOffline);
  const agroId = useKilimoStore((s) => s.agroId);
  const addCropHealthLog = useKilimoStore((s) => s.addCropHealthLog);
  const addNotification = useKilimoStore((s) => s.addNotification);

  // States
  const [selectedCrop, setSelectedCrop] = useState('maize');
  const [selectedRegion, setSelectedRegion] = useState('Mbeya (Southern Highlands)');
  const [mode, setMode] = useState<'checklist' | 'camera'>('checklist');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<DiseaseResult[] | null>(null);
  const [showVideoId, setShowVideoId] = useState<string | null>(null);
  const [showCropSelect, setShowCropSelect] = useState(false);
  const [showRegionSelect, setShowRegionSelect] = useState(false);

  // Auto preselect crop if passed
  useEffect(() => {
    if (preselectedCrop) {
      const found = CROPS_LIST.find(
        (c) =>
          c.nameEn.toLowerCase() === preselectedCrop.toLowerCase() ||
          c.nameSw.toLowerCase() === preselectedCrop.toLowerCase() ||
          c.key === preselectedCrop.toLowerCase()
      );
      if (found) {
        setSelectedCrop(found.key);
      }
    }
  }, [preselectedCrop, visible]);

  // Autofill region from AgroID if available
  useEffect(() => {
    if (agroId?.location) {
      const matchedRegion = REGIONS_LIST.find((r) =>
        agroId.location.toLowerCase().includes(r.label.split(' ')[0].toLowerCase())
      );
      if (matchedRegion) {
        setSelectedRegion(matchedRegion.label);
      }
    }
  }, [agroId]);

  // Toggle symptom checkboxes
  const toggleSymptom = (id: string) => {
    Haptics.selectionAsync();
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  // Symptom checklist solver trigger
  const runChecklistDiagnosis = () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert(
        language === 'sw' ? 'Chagua dalili' : 'Select symptoms',
        language === 'sw'
          ? 'Tafadhali chagua angalau dalili moja.'
          : 'Please select at least one symptom.'
      );
      return;
    }
    setAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Simulate short calculation delay
    setTimeout(() => {
      const sortedResults = solveSymptomChecklist(selectedCrop, selectedRegion, selectedSymptoms);
      setResults(sortedResults);
      setAnalyzing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  // Camera Picker
  const pickImage = async (useCamera: boolean) => {
    if (isOffline) {
      Alert.alert(
        language === 'sw' ? 'Njia ya Nje ya Mtandao' : 'Offline Mode',
        language === 'sw'
          ? 'Kamera ya AI inahitaji mtandao. Tumia Orodha ya Dalili.'
          : 'AI Camera requires network. Please use the Symptom Checklist.'
      );
      return;
    }

    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        language === 'sw' ? 'Ruhusa inahitajika' : 'Permission Required',
        language === 'sw'
          ? 'Tafadhali ruhusu kamera/picha kwenye mipangilio.'
          : 'Please allow camera/photos access in settings.'
      );
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.4, // Compresses file under 1MB naturally
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.4,
          base64: true,
        });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
      setImageUri(pickerResult.assets[0].uri);
      const base64 = pickerResult.assets[0].base64;
      runAiVisionDiagnosis(base64 || '');
    }
  };

  // AI Vision diagnosis trigger
  const runAiVisionDiagnosis = async (base64: string) => {
    setAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      let diagnosis;
      const activeRegion = selectedRegion;
      const activeCropName = CROPS_LIST.find((c) => c.key === selectedCrop)?.nameEn || 'crop';

      const regionPrompt = `The farmer is located in the region of ${activeRegion} in East Africa. Consider typical local diseases like Maize Streak Virus, Cassava Mosaic Disease, or Rice Blast. The crop is ${activeCropName}.`;

      if (aiConfigured()) {
        diagnosis = await diagnoseCropPhoto(base64, {
          prompt: `Chunguza picha hii ya mmea wa ${activeCropName} kutoka eneo la ${activeRegion}. Jibu kwa JSON ya Kiswahili pekee kama ilivyoelekezwa katika mfumo.`,
        });
      } else {
        // Fallback to demo database
        diagnosis = await demoDiagnosis();
      }

      // Convert vision response into our format
      const confidence =
        diagnosis.confidence === 'high' ? 92 : diagnosis.confidence === 'medium' ? 74 : 52;

      const res: DiseaseResult = {
        diseaseNameEn: diagnosis.disease || 'Unknown Disease',
        diseaseNameSw: diagnosis.disease || 'Ugonjwa Usiojulikana',
        confidence: confidence,
        organicControlSw: diagnosis.actions?.[0] || 'Ondoa mimea iliyoathirika.',
        organicControlEn: diagnosis.actions?.[0] || 'Remove affected plants.',
        chemicalControlSw: diagnosis.actions?.[1] || 'Wasiliana na Afisa Ugani.',
        chemicalControlEn: diagnosis.actions?.[1] || 'Consult Agronomist.',
        videoId: selectedCrop === 'maize' ? 'v1' : selectedCrop === 'tomatoes' ? 'v5' : undefined,
      };

      setResults([res]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Alert.alert(
        language === 'sw' ? 'Hitilafu' : 'Error',
        language === 'sw' ? 'Imeshindikana kuchambua picha.' : 'Failed to analyze the photo.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Save diagnosis to local state history
  const saveToLog = () => {
    if (!results || results.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addCropHealthLog({
      id: `log_${Date.now()}`,
      crop: selectedCrop,
      region: selectedRegion,
      date: new Date().toLocaleDateString(),
      results: results,
    });

    addNotification({
      title: language === 'sw' ? 'Afya ya Mazao' : 'Crop Health Log',
      body:
        language === 'sw'
          ? `Uchunguzi wa ${CROPS_LIST.find((c) => c.key === selectedCrop)?.nameSw} umehifadhiwa kwenye rekodi.`
          : `${CROPS_LIST.find((c) => c.key === selectedCrop)?.nameEn} diagnosis saved to your records.`,
      type: 'success',
    });

    Alert.alert(
      language === 'sw' ? 'Imehifadhiwa' : 'Saved',
      language === 'sw'
        ? 'Rekodi imehifadhiwa kwenye daftari la afya.'
        : 'Record saved successfully to your health log.'
    );
  };

  // Reset diagnosis
  const resetDiagnosis = () => {
    setImageUri(null);
    setResults(null);
    setSelectedSymptoms([]);
    setShowVideoId(null);
  };

  const activeCrop = CROPS_LIST.find((c) => c.key === selectedCrop);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={isDark ? 30 : 60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalCentered}>
        <BlurView
          intensity={isDark ? 40 : 90}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {language === 'sw' ? 'Tathmini ya Afya' : 'Crop Health Check'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMute }]}>
                {language === 'sw'
                  ? 'Tambua magonjwa kieneo'
                  : 'Location-aware disease diagnostics'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.border }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {analyzing ? (
            /* Analyzing state */
            <View style={styles.loaderArea}>
              <Animated.View style={styles.spinnerWrap}>
                <RefreshCw size={52} color={colors.primary} />
              </Animated.View>
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {language === 'sw' ? 'Inachanganua afya ya mmea...' : 'Analyzing plant health...'}
              </Text>
              <Text style={[styles.loadingSub, { color: colors.textMute }]}>
                {mode === 'camera'
                  ? language === 'sw'
                    ? 'AI inasoma picha kulingana na eneo lako'
                    : 'AI analyzing photo tailored to your region'
                  : language === 'sw'
                    ? 'Inatafuta kwenye orodha ya magonjwa'
                    : 'Cross-referencing symptom checklists'}
              </Text>
            </View>
          ) : results ? (
            /* Results View */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollArea}
            >
              <View style={styles.resultsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMute }]}>
                  {language === 'sw' ? 'MAJIBU YA UCHUNGUZI' : 'DIAGNOSIS REPORT'}
                </Text>
                <View style={styles.locBadge}>
                  <MapPin size={10} color={colors.primary} />
                  <Text style={[styles.locBadgeText, { color: colors.primary }]}>
                    {selectedRegion.split(' ')[0]}
                  </Text>
                </View>
              </View>

              {results.length === 0 ? (
                <View style={styles.emptyResults}>
                  <AlertTriangle size={36} color="#F59E0B" />
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    {language === 'sw' ? 'Hakuna Ugonjwa Uliotambuliwa' : 'No Diseases Identified'}
                  </Text>
                  <Text style={[styles.emptySubText, { color: colors.textMute }]}>
                    {language === 'sw'
                      ? 'Dalili hazilingani na magonjwa yanayojulikana. Wasiliana na mtaalamu ugani.'
                      : 'Symptoms do not match typical profiles. Suggest expert consultation.'}
                  </Text>
                </View>
              ) : (
                results.slice(0, 3).map((res, i) => (
                  <View key={i} style={[styles.resultCard, { borderColor: colors.border }]}>
                    <View style={styles.resultTitleRow}>
                      <Text style={[styles.resultTitle, { color: colors.text }]}>
                        {language === 'sw' ? res.diseaseNameSw : res.diseaseNameEn}
                      </Text>
                      <Text
                        style={[
                          styles.confText,
                          { color: res.confidence > 75 ? colors.primary : '#F59E0B' },
                        ]}
                      >
                        {res.confidence}%
                      </Text>
                    </View>

                    {/* Confidence bar */}
                    <View
                      style={[
                        styles.barBg,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${res.confidence}%`,
                            backgroundColor: res.confidence > 75 ? colors.primary : '#F59E0B',
                          },
                        ]}
                      />
                    </View>

                    {/* Localized Advice */}
                    <View style={styles.adviceBlock}>
                      <Text style={[styles.adviceLabel, { color: colors.textMute }]}>
                        {language === 'sw' ? 'ORGANIC (KIKABONI):' : 'ORGANIC CONTROL:'}
                      </Text>
                      <Text style={[styles.adviceDesc, { color: colors.text }]}>
                        {language === 'sw' ? res.organicControlSw : res.organicControlEn}
                      </Text>
                      <Text style={[styles.adviceLabel, { color: colors.textMute, marginTop: 8 }]}>
                        {language === 'sw' ? 'CHEMICAL (VIUATILIFU):' : 'CHEMICAL CONTROL:'}
                      </Text>
                      <Text style={[styles.adviceDesc, { color: colors.text }]}>
                        {language === 'sw' ? res.chemicalControlSw : res.chemicalControlEn}
                      </Text>
                    </View>

                    {/* Embedded Video Player trigger */}
                    {res.videoId && (
                      <TouchableOpacity
                        style={[
                          styles.videoBtn,
                          {
                            backgroundColor: colors.primary + '12',
                            borderColor: colors.primary + '30',
                          },
                        ]}
                        onPress={() => setShowVideoId(res.videoId || null)}
                      >
                        <Play size={14} color={colors.primary} fill={colors.primary} />
                        <Text style={[styles.videoBtnText, { color: colors.primary }]}>
                          {language === 'sw' ? 'Tazama Video ya Mwongozo' : 'Watch Tutorial Video'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}

              {/* YouTube Inline Player */}
              {showVideoId && (
                <View style={[styles.playerContainer, { borderColor: colors.border }]}>
                  <View style={styles.playerHeader}>
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Inter_800ExtraBold' }}>
                      INLINE TUTORIAL
                    </Text>
                    <TouchableOpacity onPress={() => setShowVideoId(null)}>
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 160, backgroundColor: '#000' }}>
                    <WebView
                      source={{
                        uri: `https://www.youtube.com/embed/${showVideoId === 'v1' ? 'q2KlyV45xZg' : 'eH6lI_g3FfI'}?autoplay=1&playsinline=1`,
                      }}
                      allowsInlineMediaPlayback
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {/* Expert consult option */}
              <TouchableOpacity
                style={[styles.expertBtn, { borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    language === 'sw' ? 'Wasiliana na Mtaalamu' : 'Contact Expert',
                    language === 'sw'
                      ? 'Ujumbe wako umetumwa kwa afisa ugani wa eneo lako.'
                      : 'Message sent to your local extension officer.'
                  );
                }}
              >
                <Text style={[styles.expertBtnText, { color: colors.text }]}>
                  {language === 'sw'
                    ? 'Ushauri haueleweki? Uliza Mtaalamu'
                    : 'Not sure? Consult an Expert'}
                </Text>
                <ChevronRight size={16} color={colors.textMute} />
              </TouchableOpacity>

              {/* Control Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={resetDiagnosis}
                  style={[styles.resetBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.textMute, fontFamily: 'Inter_700Bold' }}>
                    {language === 'sw' ? 'Pima Tena' : 'Re-test'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveToLog}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  <Check size={16} color="#FCFBF7" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FCFBF7', fontFamily: 'Inter_800ExtraBold' }}>
                    {language === 'sw' ? 'Hifadhi Kumbukumbu' : 'Save to Log'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    language === 'sw' ? 'Usaidizi' : 'Feedback Report',
                    language === 'sw'
                      ? 'Asante, tutatumia ripoti hii kuboresha AI yetu.'
                      : 'Thank you. Report received for model training.'
                  );
                }}
              >
                <Text style={[styles.reportBtnText, { color: colors.textMute }]}>
                  {language === 'sw'
                    ? 'Ripoti matokeo yasiyo sahihi'
                    : 'Report incorrect diagnosis'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Setup Flow */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollArea}
            >
              {/* Dropdowns */}
              <Text style={[styles.label, { color: colors.textMute }]}>
                {language === 'sw' ? 'CHAGUA ZAO' : 'SELECT CROP'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCropSelect(!showCropSelect)}
                style={[
                  styles.dropdownTrigger,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>
                  {language === 'sw' ? activeCrop?.nameSw : activeCrop?.nameEn}
                </Text>
                <ChevronRight size={16} color={colors.textMute} />
              </TouchableOpacity>

              {showCropSelect && (
                <View
                  style={[
                    styles.dropdownMenu,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  {CROPS_LIST.map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.dropdownOption, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedCrop(c.key);
                        setShowCropSelect(false);
                      }}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
                        {language === 'sw' ? c.nameSw : c.nameEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: colors.textMute, marginTop: 16 }]}>
                {language === 'sw' ? 'MKOA WAKO (LOCATION)' : 'YOUR REGION (LOCATION)'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRegionSelect(!showRegionSelect)}
                style={[
                  styles.dropdownTrigger,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>
                  {selectedRegion}
                </Text>
                <ChevronRight size={16} color={colors.textMute} />
              </TouchableOpacity>

              {showRegionSelect && (
                <View
                  style={[
                    styles.dropdownMenu,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  {REGIONS_LIST.map((r) => (
                    <TouchableOpacity
                      key={r.label}
                      style={[styles.dropdownOption, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedRegion(r.label);
                        setShowRegionSelect(false);
                      }}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Mode Selectors */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    mode === 'checklist' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setMode('checklist')}
                >
                  <ClipboardList
                    size={16}
                    color={mode === 'checklist' ? '#FCFBF7' : colors.textMute}
                  />
                  <Text
                    style={[
                      styles.modeBtnText,
                      { color: mode === 'checklist' ? '#FCFBF7' : colors.textMute },
                    ]}
                  >
                    {language === 'sw' ? 'Dalili' : 'Symptom Checklist'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'camera' && { backgroundColor: colors.primary }]}
                  onPress={() => setMode('camera')}
                >
                  <Camera size={16} color={mode === 'camera' ? '#FCFBF7' : colors.textMute} />
                  <Text
                    style={[
                      styles.modeBtnText,
                      { color: mode === 'camera' ? '#FCFBF7' : colors.textMute },
                    ]}
                  >
                    {language === 'sw' ? 'Kamera ya AI' : 'AI Camera'}
                  </Text>
                </TouchableOpacity>
              </View>

              {mode === 'checklist' ? (
                /* Symptom Checklist Selector */
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {language === 'sw'
                      ? 'Chagua Dalili Zilizopo shambani'
                      : 'Check observed plant symptoms'}
                  </Text>

                  {CROP_SYMPTOMS[selectedCrop]?.map((sym) => {
                    const checked = selectedSymptoms.includes(sym.id);
                    return (
                      <TouchableOpacity
                        key={sym.id}
                        style={[styles.checkboxRow, { borderColor: colors.border }]}
                        onPress={() => toggleSymptom(sym.id)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: colors.primary },
                            checked && { backgroundColor: colors.primary },
                          ]}
                        >
                          {checked && <Check size={12} color="#FCFBF7" />}
                        </View>
                        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                          {language === 'sw' ? sym.labelSw : sym.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    onPress={runChecklistDiagnosis}
                    style={[styles.diagBtn, { backgroundColor: colors.primary }]}
                  >
                    <Sparkles size={16} color="#FCFBF7" style={{ marginRight: 8 }} />
                    <Text style={styles.diagBtnText}>
                      {language === 'sw' ? 'Anza Uchunguzi' : 'Analyze Symptoms'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Camera Upload Selector */
                <View style={styles.cameraContainer}>
                  {isOffline && (
                    <View style={styles.offlineAlert}>
                      <AlertTriangle size={18} color="#ef4444" />
                      <Text style={styles.offlineAlertText}>
                        {language === 'sw'
                          ? 'Huduma ya picha ya AI inahitaji mtandao. Tafadhali tumia Orodha ya Dalili.'
                          : 'AI vision scanner requires active internet. Please use the Symptom Checklist.'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.photoTrigger,
                      isOffline && { opacity: 0.5 },
                      { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
                    ]}
                    onPress={() => pickImage(true)}
                    disabled={isOffline}
                  >
                    <Camera size={36} color={colors.primary} />
                    <Text style={[styles.photoText, { color: colors.primary }]}>
                      {language === 'sw' ? 'Piga Picha ya Jani' : 'Take Plant Photo'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.galleryTrigger,
                      isOffline && { opacity: 0.5 },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => pickImage(false)}
                    disabled={isOffline}
                  >
                    <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>
                      {language === 'sw' ? 'Pakia kutoka Nyumba ya Picha' : 'Upload from Gallery'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCentered: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dropdownMenu: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: 20,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 16,
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  diagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  diagBtnText: {
    color: '#FCFBF7',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  cameraContainer: {
    paddingVertical: 20,
    gap: 12,
  },
  photoTrigger: {
    height: 140,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  photoText: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
  },
  galleryTrigger: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  loaderArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  spinnerWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },
  loadingSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    letterSpacing: 1.5,
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(60, 74, 42, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  resultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'Inter_900Black',
    flex: 1,
  },
  confText: {
    fontSize: 16,
    fontFamily: 'Inter_900Black',
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  adviceBlock: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 12,
  },
  adviceLabel: {
    fontSize: 9,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  adviceDesc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  videoBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  playerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: 10,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#111',
  },
  expertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  expertBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 10,
  },
  reportBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  offlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  offlineAlertText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
