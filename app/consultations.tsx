/**
 * Wataalamu Directory — certified agricultural professionals, agronomists, vets, and mechanics
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import {
  Video,
  MessageSquare,
  Star,
  GraduationCap,
  Calendar,
  X,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../components/PageScaffold';
import { useTheme } from '../constants/Theme';
import { useFarmDataStore, Expert } from '../store/useFarmDataStore';
import { useKilimoStore } from '../store/useKilimoStore';
import { Gate } from '../lib/access';

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

// Regional list of Tanzania
const REGIONS = ['Yote', 'Arusha', 'Mbeya', 'Dodoma', 'Morogoro', 'Kilimanjaro'];

// Category specialties
const SPECIALTIES = [
  'Yote',
  'Soil & Fertility',
  'Pest & Disease',
  'Livestock Health',
  'Mechanization',
];

const STATUS_META = {
  requested: { color: '#f59e0b', label: 'Imeombwa' },
  scheduled: { color: '#3b82f6', label: 'Imepangwa' },
  completed: { color: '#3C4A2A', label: 'Imekamilika' },
  cancelled: { color: '#ef4444', label: 'Imefutwa' },
  available: { color: '#94a3b8', label: 'Inapatikana' },
};

// Custom Tanzanian Experts metadata (extends the store structure)
const EXPERT_METADATA: Record<
  string,
  {
    phone: string;
    email: string;
    affiliation: string;
    region: string;
    bio: string;
    reviews: { author: string; rating: number; text: string; date: string }[];
  }
> = {
  e1: {
    phone: '+255 765 123 456',
    email: 'esther.mushi@tari.go.tz',
    affiliation: 'Tanzania Agricultural Research Institute (TARI)',
    region: 'Arusha',
    bio: 'Soil scientist specializing in soil tests, acidity diagnostics, and micro-nutrient recommendations for cereals and horticultural crops.',
    reviews: [
      {
        author: 'John K.',
        rating: 5,
        text: 'Ushauri wake wa kupima pH uliniokoa kununua mbolea isiyo sahihi.',
        date: '12/04/2026',
      },
      {
        author: 'Asha M.',
        rating: 4.8,
        text: 'Mtaalamu mzuri sana wa rutuba ya udongo wa kaskazini.',
        date: '02/05/2026',
      },
    ],
  },
  e2: {
    phone: '+255 624 888 111',
    email: 'daudi.kileo@kilimo.go.tz',
    region: 'Dodoma',
    affiliation: 'Ministry of Agriculture Extension Service',
    bio: 'Extension officer with 9+ years controlling crop pests. Expert in Fall Armyworm management and biopesticide applications.',
    reviews: [
      {
        author: 'Juma S.',
        rating: 4.7,
        text: 'Tulimaliza funza wa mahindi chini ya wiki moja kwa ushauri wake.',
        date: '28/03/2026',
      },
    ],
  },
  e3: {
    phone: '+255 754 999 222',
    email: 'neema.kessy@sua.ac.tz',
    region: 'Mbeya',
    affiliation: 'Sokoine University of Agriculture (SUA)',
    bio: 'Veterinary surgeon specializing in dairy cattle reproduction, herd health plans, and African Swine Fever bio-security protocols.',
    reviews: [
      {
        author: 'Bahati P.',
        rating: 5,
        text: 'Daktari makini, alisaidia ng’ombe wangu kujifungua salama.',
        date: '15/04/2026',
      },
      {
        author: 'Kassim L.',
        rating: 4.9,
        text: 'Tiba na kinga bora sana za chanjo.',
        date: '10/05/2026',
      },
    ],
  },
};

export default function ConsultationsScreen() {
  const { colors, isDark } = useTheme();

  // Zustand State
  const experts = useFarmDataStore((s) => s.experts);
  const consultations = useFarmDataStore((s) => s.consultations);
  const requestConsultation = useFarmDataStore((s) => s.requestConsultation);
  const cancelConsultation = useFarmDataStore((s) => s.cancelConsultation);
  const language = useKilimoStore((s) => s.language);

  // Directory UI filters
  const [selectedRegion, setSelectedRegion] = useState('Yote');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Yote');
  const [searchQuery, setSearchQuery] = useState('');

  // Collapsible reviews tracker (by expert ID)
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  const upcoming = consultations.filter(
    (c) => c.status === 'scheduled' || c.status === 'requested'
  );

  function handleRequest(expert: Expert, channel: 'video' | 'chat') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.prompt(
      language === 'sw' ? 'Mada ya Ushauri' : 'Consultation Topic',
      language === 'sw'
        ? `Andika mada unayotaka kuongea na ${expert.name}:`
        : `Enter the topic you want to discuss with ${expert.name}:`,
      [
        { text: 'Ghairi · Cancel', style: 'cancel' },
        {
          text: 'Agiza · Request',
          onPress: (text) => {
            const topic = text || `Consultation on ${expert.specialty}`;
            requestConsultation(expert.id, topic, channel);
            Alert.alert(
              language === 'sw' ? 'Ombi Limewasilishwa' : 'Request Submitted',
              language === 'sw'
                ? `Ombi lako la kupiga ${channel === 'video' ? 'video' : 'chat'} limetumwa kwa ${expert.name}.`
                : `Your ${channel} consultation request has been sent to ${expert.name}.`
            );
          },
        },
      ],
      'plain-text'
    );
  }

  function handleDirectCall(phone: string, name: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      language === 'sw' ? 'Piga Simu' : 'Call Professional',
      language === 'sw'
        ? `Unataka kumpigia simu ${name}?`
        : `Do you want to place a call to ${name}?`,
      [
        { text: 'Hapana', style: 'cancel' },
        { text: 'Ndiyo', onPress: () => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`) },
      ]
    );
  }

  function handleDirectEmail(email: string, name: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      language === 'sw' ? 'Tuma Barua Pepe' : 'Send Email',
      language === 'sw'
        ? `Unataka kumtumia barua pepe ${name}?`
        : `Do you want to send an email to ${name}?`,
      [
        { text: 'Hapana', style: 'cancel' },
        { text: 'Ndiyo', onPress: () => Linking.openURL(`mailto:${email}`) },
      ]
    );
  }

  function toggleReviews(expertId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedReviews((prev) => ({
      ...prev,
      [expertId]: !prev[expertId],
    }));
  }

  // Filter Logic
  const filteredExperts = experts.filter((e) => {
    const meta = EXPERT_METADATA[e.id];

    // Search query matches name or bio or specialty
    const matchesSearch =
      searchQuery.trim() === '' ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta && meta.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    // Region match
    const matchesRegion =
      selectedRegion === 'Yote' ||
      (meta && meta.region.toLowerCase() === selectedRegion.toLowerCase());

    // Specialty match
    const matchesSpecialty =
      selectedSpecialty === 'Yote' ||
      e.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
      (selectedSpecialty === 'Mechanization' && e.specialty.toLowerCase().includes('mechanic'));

    return matchesSearch && matchesRegion && matchesSpecialty;
  });

  return (
    <Gate
      feature="expert_consultations"
      fallback={
        <PageScaffold title="Wataalamu" badge="EXPERTS">
          <AccessDenied />
        </PageScaffold>
      }
    >
      <PageScaffold
        title="Wataalamu wa Kilimo"
        subtitle="Certified agronomists & vets database"
        badge="CONSULTATIONS"
      >
        {upcoming.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <SectionHeader
              title={language === 'sw' ? 'Vinavyongoja · Upcoming Sessions' : 'Upcoming Sessions'}
            />
            <View style={{ paddingHorizontal: 24, gap: 10 }}>
              {upcoming.map((c) => {
                const e = experts.find((x) => x.id === c.expertId);
                const meta = STATUS_META[c.status];
                return (
                  <GlassCard key={c.id} style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {c.channel === 'video' ? (
                        <Video size={20} color={colors.primary} />
                      ) : (
                        <MessageSquare size={20} color={colors.primary} />
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[s.topic, { color: colors.text }]} numberOfLines={1}>
                          {c.topic}
                        </Text>
                        <Text style={[s.expert, { color: colors.textMute }]}>
                          {e?.name ?? 'Unknown expert'}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: meta.color + '25' }]}>
                        <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    {c.scheduledFor ? (
                      <View style={[s.schedRow, { borderTopColor: colors.border }]}>
                        <Calendar size={11} color={colors.textMute} />
                        <Text style={[s.schedText, { color: colors.textMute }]}>
                          {new Date(c.scheduledFor).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            cancelConsultation(c.id);
                          }}
                          style={s.cancelBtn}
                        >
                          <X size={11} color="#ef4444" />
                          <Text style={[s.cancelText, { color: '#ef4444' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[s.schedRow, { borderTopColor: colors.border }]}>
                        <Clock size={11} color={colors.textMute} />
                        <Text style={[s.schedText, { color: colors.textMute }]}>
                          Waiting for expert response...
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            cancelConsultation(c.id);
                          }}
                          style={s.cancelBtn}
                        >
                          <X size={11} color="#ef4444" />
                          <Text style={[s.cancelText, { color: '#ef4444' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
          <View
            style={[s.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Search size={16} color={colors.textMute} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder={
                language === 'sw'
                  ? 'Tafuta kwa jina au utaalamu...'
                  : 'Search by name or specialty...'
              }
              placeholderTextColor={colors.textMute}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textMute} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Region Filters */}
        <View style={{ marginBottom: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          >
            {REGIONS.map((r) => {
              const active = selectedRegion === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedRegion(r);
                  }}
                  style={[
                    s.filterPill,
                    {
                      backgroundColor: active ? colors.primary + '15' : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[s.filterText, { color: active ? colors.primary : colors.textMute }]}
                  >
                    {r === 'Yote' ? (language === 'sw' ? 'Mikoa Yote' : 'All Regions') : r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Specialty Filters */}
        <View style={{ marginBottom: 14 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          >
            {SPECIALTIES.map((sp) => {
              const active = selectedSpecialty === sp;
              return (
                <TouchableOpacity
                  key={sp}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedSpecialty(sp);
                  }}
                  style={[
                    s.filterPill,
                    {
                      backgroundColor: active ? colors.primary + '15' : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[s.filterText, { color: active ? colors.primary : colors.textMute }]}
                  >
                    {sp === 'Yote' ? (language === 'sw' ? 'Utaalamu Wote' : 'All Specialties') : sp}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <SectionHeader
          title={
            language === 'sw' ? 'Orodha ya Wataalamu · Experts list' : 'Verified Professionals'
          }
        />
        <View style={{ paddingHorizontal: 24, gap: 12, paddingBottom: 100 }}>
          {filteredExperts.length === 0 ? (
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <AlertTriangle size={24} color={colors.textMute} style={{ opacity: 0.7 }} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_700Bold',
                  color: colors.textMute,
                  marginTop: 8,
                }}
              >
                Hakuna wataalamu wanaolingana na uchaguzi wako.
              </Text>
            </GlassCard>
          ) : (
            filteredExperts.map((e) => {
              const meta = EXPERT_METADATA[e.id];
              const isExpanded = expandedReviews[e.id] || false;

              return (
                <GlassCard key={e.id} style={{ padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {e.avatarUrl ? (
                      <Image
                        source={{ uri: e.avatarUrl }}
                        style={[s.avatar, { borderColor: colors.primary + '40' }]}
                      />
                    ) : (
                      <View
                        style={[
                          s.avatar,
                          {
                            backgroundColor: colors.primary + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                      >
                        <GraduationCap size={22} color={colors.primary} />
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[s.expName, { color: colors.text }]}>{e.name}</Text>
                      <Text style={[s.specialty, { color: colors.primary }]}>{e.specialty}</Text>

                      {meta && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Briefcase size={10} color={colors.textMute} />
                          <Text
                            style={{
                              fontSize: 9.5,
                              fontFamily: 'Inter_600SemiBold',
                              color: colors.textMute,
                            }}
                            numberOfLines={1}
                          >
                            {meta.affiliation}
                          </Text>
                        </View>
                      )}

                      <View style={s.metaRow}>
                        <Star size={11} color="#f59e0b" fill="#f59e0b" />
                        <Text style={[s.metaText, { color: colors.text }]}>
                          {e.rating.toFixed(2)}
                        </Text>
                        <Text style={[s.metaText, { color: colors.textMute }]}>
                          · {e.yearsExperience}+ yrs
                        </Text>
                        {meta && (
                          <Text style={[s.metaText, { color: colors.textMute }]}>
                            · {meta.region}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Biography */}
                  {meta && <Text style={[s.bioText, { color: colors.text }]}>{meta.bio}</Text>}

                  {/* Direct Contact Options */}
                  {meta && (
                    <View style={[s.contactRow, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => handleDirectCall(meta.phone, e.name)}
                        style={s.contactItem}
                      >
                        <Phone size={12} color={colors.primary} />
                        <Text style={[s.contactText, { color: colors.text }]} numberOfLines={1}>
                          {meta.phone}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDirectEmail(meta.email, e.name)}
                        style={s.contactItem}
                      >
                        <Mail size={12} color={colors.primary} />
                        <Text style={[s.contactText, { color: colors.text }]} numberOfLines={1}>
                          {meta.email}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Collapsible Reviews */}
                  {meta && meta.reviews && (
                    <View style={{ marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => toggleReviews(e.id)}
                        style={[s.reviewsHeader, { borderTopColor: colors.border }]}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontFamily: 'Inter_700Bold',
                            color: colors.textMute,
                          }}
                        >
                          {language === 'sw' ? 'Maoni ya Wakulima' : 'Farmer Reviews'} (
                          {meta.reviews.length})
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={13} color={colors.textMute} />
                        ) : (
                          <ChevronDown size={13} color={colors.textMute} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={s.reviewsList}>
                          {meta.reviews.map((r, idx) => (
                            <View key={idx} style={s.reviewCard}>
                              <View style={s.reviewMeta}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontFamily: 'Inter_700Bold',
                                    color: colors.text,
                                  }}
                                >
                                  {r.author}
                                </Text>
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                                >
                                  <Star size={9} color="#f59e0b" fill="#f59e0b" />
                                  <Text
                                    style={{
                                      fontSize: 9.5,
                                      fontFamily: 'Inter_800ExtraBold',
                                      color: colors.text,
                                    }}
                                  >
                                    {r.rating}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={{
                                  fontSize: 11.5,
                                  color: colors.textMute,
                                  fontStyle: 'italic',
                                  marginTop: 2,
                                  fontFamily: 'Inter_500Medium',
                                }}
                              >
                                "{r.text}"
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Call and Chat booking action bar */}
                  <View style={[s.rateRow, { borderTopColor: colors.border }]}>
                    <Text style={[s.rate, { color: colors.text }]}>
                      TZS {fmt(e.ratePerHourTZS)}
                      <Text style={[s.rateUnit, { color: colors.textMute }]}>/hr</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleRequest(e, 'chat')}
                        style={[
                          s.actBtn,
                          { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                        ]}
                      >
                        <MessageSquare size={12} color={colors.primary} />
                        <Text style={[s.actText, { color: colors.primary }]}>Chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRequest(e, 'video')}
                        style={[s.actBtn, { backgroundColor: colors.primary }]}
                      >
                        <Video size={12} color="#fff" />
                        <Text style={[s.actText, { color: '#fff' }]}>Video</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
        </View>
      </PageScaffold>
    </Gate>
  );
}

function AccessDenied() {
  const language = useKilimoStore((s) => s.language);
  return (
    <EmptyState
      icon={<AlertTriangle size={36} color="#f59e0b" />}
      title="Haipatikani"
      body={
        language === 'sw'
          ? 'Upatikanaji wa wataalamu haupatikani kwa jukumu lako.'
          : 'Expert consultations are not accessible for your role.'
      }
    />
  );
}

const s = StyleSheet.create({
  topic: { fontSize: 14, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  expert: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  schedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', flex: 1 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cancelText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
  avatar: { width: 56, height: 56, borderRadius: 18, borderWidth: 2 },
  expName: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  specialty: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rate: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', fontWeight: '600' },
  rateUnit: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },

  // Custom redesign elements
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  bioText: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18, marginTop: 12 },

  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 140 },
  contactText: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },

  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reviewsList: { gap: 8, marginTop: 8 },
  reviewCard: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.02)' },
  reviewMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
