/**
 * Peer Groups — region/crop-specific discussion, shared community tasks, and meetup calendar
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  Users,
  Send,
  MessageSquare,
  LogIn,
  LogOut,
  AlertTriangle,
  MessageCircle,
  Calendar,
  CheckSquare,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  MapPin,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../components/PageScaffold';
import { useTheme } from '../constants/Theme';
import { useFarmDataStore } from '../store/useFarmDataStore';
import { useKilimoStore } from '../store/useKilimoStore';
import { Gate } from '../lib/access';

function timeAgo(iso?: string) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Initial Mock Community Tasks
const INITIAL_SHARED_TASKS = [
  {
    id: 't1',
    groupId: 'g1',
    title: 'Palizi ya Pamoja — Block C',
    date: 'Siku ya Jumanne, Juni 02',
    volunteers: 4,
    joined: false,
    desc: 'Kazi ya pamoja ya kupalilia magugu kwenye kitalu cha ushirika cha vijana.',
  },
  {
    id: 't2',
    groupId: 'g1',
    title: 'Kupokea Mbolea ya Ruzuku',
    date: 'Ijumaa, Juni 05',
    volunteers: 8,
    joined: true,
    desc: 'Kusaidiana kupakua na kugawa mbolea ya DAP iliyotolewa na serikali.',
  },
  {
    id: 't3',
    groupId: 'g2',
    title: 'Kusafisha Mifereji ya Maji',
    date: 'Jumatano, Juni 04',
    volunteers: 6,
    joined: false,
    desc: 'Kazi ya kikundi ya kusafisha mfereji mkuu wa umwagiliaji Mbarali.',
  },
];

// Initial Mock Meetups
const INITIAL_GROUP_EVENTS = [
  {
    id: 'e1',
    groupId: 'g1',
    title: 'Semina ya Kilimo Biashara',
    date: 'Juni 10, 2026',
    time: '09:00 - 13:00',
    loc: 'Ukumbi wa AMCOS Arusha',
    attendees: 18,
    rsvp: false,
    desc: 'Mafunzo ya jinsi ya kuongeza tija ya mahindi na kupunguza upotevu wa mavuno.',
  },
  {
    id: 'e2',
    groupId: 'g1',
    title: 'Mkutano Mkuu wa Ushirika',
    date: 'Juni 18, 2026',
    time: '14:00 - 17:00',
    loc: 'Ofisi ya Kijiji, Nduruma',
    attendees: 42,
    rsvp: true,
    desc: 'Kujadili bei elekezi ya msimu huu na ugawaji wa maghala ya kuhifadhia nafaka.',
  },
  {
    id: 'e3',
    groupId: 'g2',
    title: 'Siku ya Shambani ya Mpunga',
    date: 'Juni 15, 2026',
    time: '10:00 - 15:00',
    loc: 'Shamba la Mfano Mbarali',
    attendees: 24,
    rsvp: false,
    desc: 'Kuona matokeo ya mbegu mpya za SARO 5 na matumizi ya vinyunyizio.',
  },
];

export default function PeerGroupsScreen() {
  const { colors, isDark } = useTheme();

  // Zustand States
  const groups = useFarmDataStore((s) => s.groups);
  const posts = useFarmDataStore((s) => s.posts);
  const joinGroup = useFarmDataStore((s) => s.joinGroup);
  const leaveGroup = useFarmDataStore((s) => s.leaveGroup);
  const addPost = useFarmDataStore((s) => s.addPost);
  const author = useKilimoStore((s) => s.agroId?.name ?? 'Mkulima');
  const language = useKilimoStore((s) => s.language);

  // Screen UI States
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    groups.find((g) => g.joined)?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'meetups'>('chat');
  const [draft, setDraft] = useState('');

  // Interactive Lists (Local state for instant feedback)
  const [sharedTasks, setSharedTasks] = useState(INITIAL_SHARED_TASKS);
  const [groupEvents, setGroupEvents] = useState(INITIAL_GROUP_EVENTS);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const groupPosts = posts.filter((p) => p.groupId === activeGroupId);
  const activeTasks = sharedTasks.filter((t) => t.groupId === activeGroupId);
  const activeEvents = groupEvents.filter((e) => e.groupId === activeGroupId);

  function handlePost() {
    if (!activeGroupId || !draft.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addPost(activeGroupId, author, draft.trim());
    setDraft('');
  }

  // Community administrators have not configured verified external group links.
  function handleOpenLink(platform: 'whatsapp' | 'telegram', groupName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      language === 'sw' ? 'Kiungo Hakijapatikana' : 'Link Unavailable',
      language === 'sw'
        ? `Msimamizi wa ${groupName} bado hajaweka kiungo kilichothibitishwa cha ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}.`
        : `${groupName}'s administrator has not configured a verified ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'} link yet.`
    );
  }

  // Volunteer logic
  function toggleVolunteer(taskId: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSharedTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            joined: !t.joined,
            volunteers: t.joined ? t.volunteers - 1 : t.volunteers + 1,
          };
        }
        return t;
      })
    );
  }

  // RSVP logic
  function toggleRsvp(eventId: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGroupEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            rsvp: !e.rsvp,
            attendees: e.rsvp ? e.attendees - 1 : e.attendees + 1,
          };
        }
        return e;
      })
    );
  }

  return (
    <Gate
      feature="peer_groups"
      fallback={
        <PageScaffold title="Vikundi" badge="PEER GROUPS">
          <AccessDenied />
        </PageScaffold>
      }
    >
      <PageScaffold
        title="Vikundi vya Wakulima"
        subtitle="Peer learning & community collaboration"
        badge="PEER GROUPS"
      >
        <SectionHeader title={language === 'sw' ? 'Vikundi Vyangu · My Groups' : 'My Groups'} />
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          {groups.map((g) => {
            const active = g.id === activeGroupId;
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveGroupId(g.id);
                  setActiveTab('chat');
                }}
                activeOpacity={0.85}
              >
                <GlassCard
                  style={[
                    { padding: 16 },
                    active && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.iconBg, { backgroundColor: colors.primary + '15' }]}>
                      <Users size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[s.groupName, { color: colors.text }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={[s.groupMeta, { color: colors.textMute }]}>
                        {g.memberCount} members · {timeAgo(g.lastActivity)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (g.joined) leaveGroup(g.id);
                        else joinGroup(g.id);
                      }}
                      style={[
                        s.joinBtn,
                        {
                          backgroundColor: g.joined ? '#ef444425' : colors.primary,
                          borderColor: g.joined ? '#ef444460' : colors.primary,
                        },
                      ]}
                    >
                      {g.joined ? (
                        <LogOut size={12} color="#ef4444" />
                      ) : (
                        <LogIn size={12} color="#000" />
                      )}
                      <Text style={[s.joinText, { color: g.joined ? '#ef4444' : '#000' }]}>
                        {g.joined ? 'Leave' : 'Join'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeGroup && (
          <View style={{ marginTop: 20 }}>
            {/* Group Title and Social links */}
            <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: 'InstrumentSerif_400Regular',
                  color: colors.text,
                }}
              >
                {activeGroup.name}
              </Text>

              <View style={s.linksRow}>
                <TouchableOpacity
                  style={[s.linkPill, { backgroundColor: '#25D36615', borderColor: '#25D36660' }]}
                  onPress={() => handleOpenLink('whatsapp', activeGroup.name)}
                >
                  <MessageCircle size={12} color="#25D366" />
                  <Text style={[s.linkText, { color: '#25d366' }]}>WhatsApp Group</Text>
                  <ExternalLink size={10} color="#25D366" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.linkPill, { backgroundColor: '#0088cc15', borderColor: '#0088cc60' }]}
                  onPress={() => handleOpenLink('telegram', activeGroup.name)}
                >
                  <Send size={12} color="#0088cc" />
                  <Text style={[s.linkText, { color: '#0088cc' }]}>Telegram Channel</Text>
                  <ExternalLink size={10} color="#0088cc" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sub Tabs */}
            <View style={s.tabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabsScroll}
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('chat');
                  }}
                  style={[
                    s.tabButton,
                    activeTab === 'chat' && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <MessageSquare
                    size={13}
                    color={activeTab === 'chat' ? colors.primary : colors.textMute}
                  />
                  <Text
                    style={[
                      s.tabButtonText,
                      { color: activeTab === 'chat' ? colors.text : colors.textMute },
                    ]}
                  >
                    {language === 'sw' ? 'Majadiliano' : 'Chat Feed'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('tasks');
                  }}
                  style={[
                    s.tabButton,
                    activeTab === 'tasks' && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <CheckSquare
                    size={13}
                    color={activeTab === 'tasks' ? colors.primary : colors.textMute}
                  />
                  <Text
                    style={[
                      s.tabButtonText,
                      { color: activeTab === 'tasks' ? colors.text : colors.textMute },
                    ]}
                  >
                    {language === 'sw' ? 'Bodi ya Kazi' : 'Shared Tasks'}
                  </Text>
                  {activeTasks.length > 0 && (
                    <View style={s.tabBadge}>
                      <Text style={s.tabBadgeText}>{activeTasks.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab('meetups');
                  }}
                  style={[
                    s.tabButton,
                    activeTab === 'meetups' && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <Calendar
                    size={13}
                    color={activeTab === 'meetups' ? colors.primary : colors.textMute}
                  />
                  <Text
                    style={[
                      s.tabButtonText,
                      { color: activeTab === 'meetups' ? colors.text : colors.textMute },
                    ]}
                  >
                    {language === 'sw' ? 'Mikutano & Semina' : 'Meetups'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Tab Contents */}
            <View style={{ paddingHorizontal: 24, gap: 10, marginTop: 12, paddingBottom: 100 }}>
              {/* TAB 1: Chat Feed */}
              {activeTab === 'chat' && (
                <View style={{ gap: 10 }}>
                  {activeGroup.joined ? (
                    <GlassCard
                      style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={
                          language === 'sw'
                            ? 'Andika ujumbe kwa kikundi...'
                            : 'Share something with the group...'
                        }
                        placeholderTextColor={colors.textMute}
                        multiline
                        style={[s.input, { color: colors.text }]}
                      />
                      <TouchableOpacity
                        onPress={handlePost}
                        disabled={!draft.trim()}
                        style={[
                          s.sendBtn,
                          { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 },
                        ]}
                      >
                        <Send size={16} color="#000" />
                      </TouchableOpacity>
                    </GlassCard>
                  ) : (
                    <GlassCard style={{ padding: 16, alignItems: 'center' }}>
                      <Text style={[s.joinPrompt, { color: colors.textMute }]}>
                        {language === 'sw'
                          ? 'Jiunge na kikundi hiki ili kuchangia mada.'
                          : 'Join this group to post and reply.'}
                      </Text>
                    </GlassCard>
                  )}

                  {groupPosts.length === 0 ? (
                    <Text style={[s.noPosts, { color: colors.textMute }]}>
                      {language === 'sw'
                        ? 'Kuwa wa kwanza kutuma ujumbe.'
                        : 'Be the first to post in this group.'}
                    </Text>
                  ) : (
                    groupPosts.map((p) => (
                      <GlassCard key={p.id} style={{ padding: 14 }}>
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                        >
                          <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[s.avatarText, { color: colors.primary }]}>
                              {p.author[0]?.toUpperCase() ?? '?'}
                            </Text>
                          </View>
                          <Text style={[s.postAuthor, { color: colors.text }]}>{p.author}</Text>
                          <Text style={[s.postTime, { color: colors.textMute }]}>
                            {' '}
                            · {timeAgo(p.createdAt)}
                          </Text>
                        </View>
                        <Text style={[s.postBody, { color: colors.text }]}>{p.body}</Text>
                      </GlassCard>
                    ))
                  )}
                </View>
              )}

              {/* TAB 2: Shared Tasks Board */}
              {activeTab === 'tasks' && (
                <View style={{ gap: 12 }}>
                  <View style={s.tabInfoBanner}>
                    <Info size={14} color={colors.primary} />
                    <Text style={s.tabInfoText}>
                      {language === 'sw'
                        ? 'Kazi za pamoja za kijamii kusaidia ushirika wenu kukua.'
                        : 'Collaborative community tasks where members work together.'}
                    </Text>
                  </View>

                  {activeTasks.length === 0 ? (
                    <Text style={[s.noPosts, { color: colors.textMute }]}>
                      No shared tasks scheduled for this group.
                    </Text>
                  ) : (
                    activeTasks.map((t) => (
                      <GlassCard
                        key={t.id}
                        style={{
                          padding: 16,
                          borderColor: t.joined ? colors.primary + '30' : colors.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontFamily: 'Inter_700Bold',
                                color: colors.text,
                              }}
                            >
                              {t.title}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 4,
                              }}
                            >
                              <Clock size={11} color={colors.textMute} />
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: 'Inter_600SemiBold',
                                  color: colors.textMute,
                                }}
                              >
                                {t.date}
                              </Text>
                            </View>
                          </View>

                          <View style={s.volunteerBadge}>
                            <Users size={10} color={colors.textMute} />
                            <Text
                              style={{
                                fontSize: 10,
                                fontFamily: 'Inter_800ExtraBold',
                                color: colors.text,
                              }}
                            >
                              {t.volunteers}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            fontSize: 11.5,
                            color: colors.text,
                            marginTop: 8,
                            lineHeight: 17,
                            fontFamily: 'Inter_500Medium',
                          }}
                        >
                          {t.desc}
                        </Text>

                        {activeGroup.joined ? (
                          <TouchableOpacity
                            onPress={() => toggleVolunteer(t.id)}
                            style={[
                              s.volunteerBtn,
                              {
                                backgroundColor: t.joined ? '#2E6F4020' : colors.primary,
                                borderColor: t.joined ? '#2E6F4070' : 'transparent',
                              },
                            ]}
                          >
                            {t.joined ? (
                              <>
                                <Check size={12} color={colors.primary} />
                                <Text
                                  style={{
                                    fontSize: 11.5,
                                    fontFamily: 'Inter_700Bold',
                                    color: '#1b632e',
                                  }}
                                >
                                  Umejiunga · Joined
                                </Text>
                              </>
                            ) : (
                              <Text
                                style={{
                                  fontSize: 11.5,
                                  fontFamily: 'Inter_700Bold',
                                  color: '#000',
                                }}
                              >
                                Shiriki · Volunteer
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={{ height: 10 }} />
                        )}
                      </GlassCard>
                    ))
                  )}
                </View>
              )}

              {/* TAB 3: Meetups Calendar */}
              {activeTab === 'meetups' && (
                <View style={{ gap: 12 }}>
                  {activeEvents.length === 0 ? (
                    <Text style={[s.noPosts, { color: colors.textMute }]}>
                      No community meetups planned yet.
                    </Text>
                  ) : (
                    activeEvents.map((e) => (
                      <GlassCard
                        key={e.id}
                        style={{
                          padding: 16,
                          borderColor: e.rsvp ? colors.primary + '30' : colors.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text
                              style={{
                                fontSize: 16,
                                fontFamily: 'InstrumentSerif_400Regular',
                                color: colors.text,
                                fontWeight: 'bold',
                              }}
                            >
                              {e.title}
                            </Text>

                            <View style={{ gap: 4, marginTop: 6 }}>
                              <View style={s.metaRow}>
                                <Calendar size={11} color={colors.textMute} />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontFamily: 'Inter_600SemiBold',
                                    color: colors.textMute,
                                  }}
                                >
                                  {e.date} · {e.time}
                                </Text>
                              </View>

                              {e.loc && (
                                <View style={s.metaRow}>
                                  <MapPin size={11} color={colors.textMute} />
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontFamily: 'Inter_600SemiBold',
                                      color: colors.textMute,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {e.loc}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={s.attendeePill}>
                            <Sparkles size={9} color={colors.primary} />
                            <Text
                              style={{
                                fontSize: 9,
                                fontFamily: 'Inter_800ExtraBold',
                                color: colors.text,
                              }}
                            >
                              {e.attendees} RSVP
                            </Text>
                          </View>
                        </View>

                        {e.desc && (
                          <Text
                            style={{
                              fontSize: 11.5,
                              color: colors.text,
                              marginTop: 8,
                              lineHeight: 17,
                              fontFamily: 'Inter_500Medium',
                            }}
                          >
                            {e.desc}
                          </Text>
                        )}

                        {activeGroup.joined ? (
                          <TouchableOpacity
                            onPress={() => toggleRsvp(e.id)}
                            style={[
                              s.rsvpBtn,
                              {
                                backgroundColor: e.rsvp ? '#2E6F4020' : colors.primary,
                                borderColor: e.rsvp ? '#2E6F4070' : 'transparent',
                              },
                            ]}
                          >
                            {e.rsvp ? (
                              <>
                                <Check size={12} color={colors.primary} />
                                <Text
                                  style={{
                                    fontSize: 11.5,
                                    fontFamily: 'Inter_700Bold',
                                    color: '#1b632e',
                                  }}
                                >
                                  Nitakuja · RSVP Yes
                                </Text>
                              </>
                            ) : (
                              <Text
                                style={{
                                  fontSize: 11.5,
                                  fontFamily: 'Inter_700Bold',
                                  color: '#000',
                                }}
                              >
                                Nitakuja · Attend
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={{ height: 10 }} />
                        )}
                      </GlassCard>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        )}
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
          ? 'Vikundi havipatikani kwa jukumu lako.'
          : 'Peer groups are not accessible for your role.'
      }
    />
  );
}

const s = StyleSheet.create({
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  groupMeta: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  joinText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  input: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', minHeight: 48, maxHeight: 120 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinPrompt: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    paddingVertical: 8,
  },
  noPosts: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  postAuthor: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  postTime: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  postBody: { fontSize: 13.5, fontFamily: 'Inter_500Medium', lineHeight: 20 },

  // Custom redesign components
  linksRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  linkText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  tabsWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  tabsScroll: { gap: 16, paddingBottom: 0 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabButtonText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  tabBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_800ExtraBold' },

  tabInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tabInfoText: { fontSize: 12, color: '#4b5563', flex: 1, fontFamily: 'Inter_500Medium' },

  volunteerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  volunteerBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  attendeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
  },
  rsvpBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
