import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  Check,
  Target,
  LayoutGrid,
  WifiOff,
  CloudLightning,
  Users,
  X,
  Droplets,
  Leaf,
  Wheat,
  Eye,
  Wallet,
  MapPin,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useKilimoStore } from '../store/useKilimoStore';
import { useTasks, TaskCategory, TaskPriority, AssignedRole } from '../hooks/useTasks';
import { GlassCard } from '../components/PageScaffold';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
];
const DAY_HEADERS = ['J', 'T', 'K', 'A', 'Al', 'Ij', 'S'];

const CATEGORIES: TaskCategory[] = [
  'irrigation',
  'planting',
  'harvest',
  'scouting',
  'finance',
  'general',
];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

const CAT_LABEL: Record<TaskCategory, string> = {
  irrigation: 'Umwagiliaji',
  planting: 'Upanzi',
  harvest: 'Mavuno',
  scouting: 'Uchunguzi',
  finance: 'Fedha',
  general: 'Jumla',
};

const CAT_COLOR: Record<TaskCategory, string> = {
  irrigation: '#3b82f6',
  planting: '#2E6F40',
  harvest: '#f59e0b',
  scouting: '#a855f7',
  finance: '#10b981',
  general: '#94a3b8',
};

const CAT_ICON: Record<TaskCategory, React.ReactNode> = {
  irrigation: <Droplets size={14} color="#3b82f6" />,
  planting: <Leaf size={14} color="#2E6F40" />,
  harvest: <Wheat size={14} color="#f59e0b" />,
  scouting: <Eye size={14} color="#a855f7" />,
  finance: <Wallet size={14} color="#10b981" />,
  general: <LayoutGrid size={14} color="#94a3b8" />,
};

const PRI_COLOR: Record<TaskPriority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  done: '#2E6F40',
  cancelled: '#94a3b8',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'INASUBIRI',
  in_progress: 'INAENDELEA',
  done: 'IMEKAMILIKA',
  cancelled: 'IMEFUTWA',
};

const formatDue = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.round(diff / 3_600_000);
  if (hours < 0) return 'Imepita';
  if (hours < 1) return 'Hivi sasa';
  if (hours < 24) return `Saa ${hours} zijazo`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Kesho';
  return `Siku ${days} zijazo`;
};

export default function TasksScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const isOffline = useKilimoStore((s) => s.isOffline);
  const language = useKilimoStore((s) => s.language);
  const { tasks, pendingTasks, completedTasks, totalXP, completeTask, createTask } = useTasks();

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleSw, setNewTitleSw] = useState('');
  const [newCat, setNewCat] = useState<TaskCategory>('general');
  const [newPri, setNewPri] = useState<TaskPriority>('medium');
  const [newRole, setNewRole] = useState<AssignedRole>('employee');
  const [newBlock, setNewBlock] = useState('');
  const [newDueDays, setNewDueDays] = useState(1);

  // Filters & layout state
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'vet' | 'mechanic' | 'employee'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const prevMonth = () => {
    Haptics.selectionAsync();
    setSelectedDay(null);
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    Haptics.selectionAsync();
    setSelectedDay(null);
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const displayTasks = (() => {
    let base = filter === 'pending' ? pendingTasks : filter === 'done' ? completedTasks : tasks;

    // Role filter
    if (roleFilter !== 'all') {
      base = base.filter((t) => t.assignedRole === roleFilter);
    }

    if (viewMode === 'calendar' && selectedDay !== null) {
      return base.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return (
          d.getDate() === selectedDay && d.getMonth() === calMonth && d.getFullYear() === calYear
        );
      });
    }
    return base;
  })();

  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const handleToggleTask = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(id);
  };

  function handleCreate() {
    if (!newTitle.trim()) {
      Alert.alert('Jaza jina la kazi');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createTask({
      title: newTitle.trim(),
      titleSw: newTitleSw.trim() || undefined,
      category: newCat,
      priority: newPri,
      status: 'pending',
      xpReward: newPri === 'critical' ? 40 : newPri === 'high' ? 25 : newPri === 'medium' ? 15 : 10,
      farmBlock: newBlock.trim() || undefined,
      dueDate: new Date(Date.now() + newDueDays * 86_400_000).toISOString(),
      assignedRole: newRole,
    });
    setShowCreate(false);
    setNewTitle('');
    setNewTitleSw('');
    setNewBlock('');
    setNewCat('general');
    setNewPri('medium');
    setNewRole('employee');
    setNewDueDays(1);
  }

  // Generate date tasks index
  const tasksByDay: Record<number, typeof tasks> = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(t);
    }
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[st.glowTR, Platform.OS === 'web' && ({ filter: 'blur(90px)' } as any)]} />
        <View style={[st.glowBL, Platform.OS === 'web' && ({ filter: 'blur(70px)' } as any)]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={st.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Rudi Nyuma' : 'Go Back'}
          >
            <ChevronLeft size={22} color={isDark ? 'rgba(255,255,255,0.8)' : colors.text} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={st.commandBadge}>
              <Target size={12} color={colors.primary} />
              <Text style={st.commandText}>OPERESHENI</Text>
            </View>
            <Text style={[st.headerTitle, { color: colors.text }]}>Kazi za Shamba</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (isOffline) Alert.alert('Nje ya Mtandao', 'Kazi itahifadhiwa na kutumwa baadaye.');
              setShowCreate(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={[st.iconBtn, isOffline && { borderColor: '#ef444450' }]}
            accessibilityRole="button"
            accessibilityLabel={language === 'sw' ? 'Ongeza kazi mpya' : 'Add new task'}
          >
            {isOffline ? (
              <WifiOff size={18} color="#ef4444" />
            ) : (
              <Plus size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
          {/* Progress dashboard */}
          <View
            style={[
              st.dashCard,
              {
                backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                borderColor: colors.primary + '26',
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary + '1A', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={st.dashRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.dashLabel}>UFANISI WA LEO</Text>
                <Text style={[st.dashTitle, { color: colors.text }]}>Maendeleo ya Kazi</Text>
                <Text style={[st.dashSub, { color: colors.textMute }]}>
                  {completedTasks.length} / {tasks.length} zimekamilika
                </Text>
              </View>
              <View style={st.dashCircle}>
                <Text style={st.dashPct}>{progress}%</Text>
              </View>
            </View>
            <View style={st.xpRow}>
              <Zap size={13} color="#f59e0b" />
              <Text style={st.xpText}>{totalXP} XP iliyopatikana</Text>
            </View>
            <View
              style={[
                st.barTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, '#1C4A29']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[st.barFill, { width: `${progress}%` as any }]}
              />
            </View>
          </View>

          {/* IoT Alerts Simulator Trigger */}
          <GlassCard style={st.iotAlertsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#f59e0b" />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.text }}>
                {language === 'sw'
                  ? 'Jaribu Simulizi za IoT (Alarms)'
                  : 'Simulate IoT Sensor Alarms'}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: 10 }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  createTask({
                    title: 'Check Cow TZ-1234 (Fever detected)',
                    titleSw: "Mchunguze Ng'ombe TZ-1234 (Homa Kali)",
                    category: 'scouting',
                    priority: 'critical',
                    status: 'pending',
                    xpReward: 40,
                    farmBlock: 'Pasture 1',
                    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                    assignedRole: 'vet',
                  });
                }}
                style={[st.iotTriggerBtn, { borderColor: '#ef4444' }]}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? "Simulate Homa ya Ng'ombe" : 'Simulate Cow Fever Alert'
                }
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#ef4444' }}>
                  {language === 'sw' ? "Homa Ng'ombe" : 'Cow Fever'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  createTask({
                    title: 'Repair Water Pump Zone 2 (Offline)',
                    titleSw: 'Tengeneza Bomba la Maji Zone 2 (Nje ya Mtandao)',
                    category: 'irrigation',
                    priority: 'high',
                    status: 'pending',
                    xpReward: 30,
                    farmBlock: 'Zone 2 Pump',
                    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    assignedRole: 'mechanic',
                  });
                }}
                style={[st.iotTriggerBtn, { borderColor: '#f59e0b' }]}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Simulate Itilafu ya Bomba' : 'Simulate Pump Failure Alert'
                }
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#f59e0b' }}>
                  {language === 'sw' ? 'Itilafu ya Bomba' : 'Pump Failure'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  createTask({
                    title: 'Apply Lime to Block A (Soil pH dropped to 5.2)',
                    titleSw: 'Weka Chokaa Block A (pH ya Udongo imeshuka kufikia 5.2)',
                    category: 'planting',
                    priority: 'high',
                    status: 'pending',
                    xpReward: 25,
                    farmBlock: 'Block A',
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    assignedRole: 'employee',
                  });
                }}
                style={[st.iotTriggerBtn, { borderColor: '#3b82f6' }]}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Simulate pH imeshuka' : 'Simulate pH Drop Alert'
                }
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#3b82f6' }}>
                  {language === 'sw' ? 'pH imeshuka' : 'pH Drop'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </GlassCard>

          {/* Offline Banner */}
          {isOffline && (
            <View style={[st.offlineCard]}>
              <AlertCircle size={18} color="#ef4444" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.offlineTitle}>Nje ya Mtandao</Text>
                <Text style={st.offlineDesc}>Kazi zitahifadhiwa na kutumwa baadaye.</Text>
              </View>
            </View>
          )}

          {/* Section Header */}
          <View style={st.sectionRow}>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Orodha ya Kazi</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  setViewMode((v) => (v === 'list' ? 'calendar' : 'list'));
                  setSelectedDay(null);
                  Haptics.selectionAsync();
                }}
                style={[
                  st.filterBtn,
                  {
                    backgroundColor:
                      viewMode === 'calendar'
                        ? colors.primary + '1F'
                        : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.04)',
                    borderColor: viewMode === 'calendar' ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw'
                    ? 'Badilisha mtazamo wa kalenda na orodha'
                    : 'Toggle calendar and list view'
                }
                accessibilityState={{ checked: viewMode === 'calendar' }}
              >
                {viewMode === 'calendar' ? (
                  <LayoutGrid size={17} color={colors.primary} />
                ) : (
                  <CalendarIcon size={17} color={colors.textMute} />
                )}
              </TouchableOpacity>
              {(['all', 'pending', 'done'] as const).map((f) => {
                const isSelected = filter === f;
                const label =
                  f === 'all'
                    ? language === 'sw'
                      ? 'Kazi zote'
                      : 'All tasks'
                    : f === 'pending'
                      ? language === 'sw'
                        ? 'Kazi zinazoendelea'
                        : 'Pending tasks'
                      : language === 'sw'
                        ? 'Kazi zilizokamilika'
                        : 'Completed tasks';
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => {
                      setFilter(f);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      st.filterBtn,
                      {
                        backgroundColor:
                          filter === f
                            ? colors.primary
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.04)',
                        borderColor: filter === f ? colors.primary : colors.border,
                        paddingHorizontal: 10,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 12,
                        color: filter === f ? '#000' : colors.textMute,
                      }}
                    >
                      {f === 'all' ? 'ZOTE' : f === 'pending' ? 'ZINAZO' : 'ZIMEKAM'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Role Filter Tabs */}
          <View style={st.roleFilterRow}>
            {[
              { id: 'all', label: language === 'sw' ? 'Wafanyakazi Wote' : 'All Roles' },
              { id: 'employee', label: language === 'sw' ? 'Vibarua' : 'Employee' },
              { id: 'vet', label: language === 'sw' ? 'Vet (Daktari)' : 'Vet' },
              { id: 'mechanic', label: language === 'sw' ? 'Mfundi' : 'Mechanic' },
            ].map((role) => {
              const selected = roleFilter === role.id;
              return (
                <TouchableOpacity
                  key={role.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRoleFilter(role.id as any);
                  }}
                  style={[
                    st.roleFilterPill,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '15' : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={role.label}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      st.roleFilterText,
                      { color: selected ? colors.primary : colors.textMute },
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <View style={{ marginBottom: 20 }}>
              <View
                style={[
                  st.calCard,
                  {
                    backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
                ]}
              >
                <LinearGradient
                  colors={[colors.primary + '12', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 48,
                    borderTopLeftRadius: 22,
                    borderTopRightRadius: 22,
                  }}
                  pointerEvents="none"
                />

                <View style={st.calNav}>
                  <TouchableOpacity
                    onPress={prevMonth}
                    style={st.calNavBtn}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Mwezi uliopita' : 'Previous month'}
                  >
                    <ChevronLeft size={18} color={isDark ? 'rgba(255,255,255,0.6)' : colors.text} />
                  </TouchableOpacity>
                  <Text style={[st.calMonthLabel, { color: colors.text }]}>
                    {MONTH_NAMES[calMonth]} {calYear}
                  </Text>
                  <TouchableOpacity
                    onPress={nextMonth}
                    style={st.calNavBtn}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Mwezi ujao' : 'Next month'}
                  >
                    <ChevronRight
                      size={18}
                      color={isDark ? 'rgba(255,255,255,0.6)' : colors.text}
                    />
                  </TouchableOpacity>
                </View>

                <View style={st.calDayHdrRow}>
                  {DAY_HEADERS.map((d, i) => (
                    <Text key={i} style={[st.calDayHdr, { color: colors.textMute }]}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={st.calGrid}>
                  {calCells.map((day, i) => {
                    if (!day) return <View key={`e${i}`} style={st.calCell} />;
                    const isToday =
                      day === today.getDate() &&
                      calMonth === today.getMonth() &&
                      calYear === today.getFullYear();
                    const isSel = day === selectedDay;
                    const dayTasks = tasksByDay[day] ?? [];
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => {
                          setSelectedDay(isSel ? null : day);
                          Haptics.selectionAsync();
                        }}
                        style={st.calCell}
                        accessibilityRole="button"
                        accessibilityLabel={`${day} ${MONTH_NAMES[calMonth]} ${calYear}`}
                        accessibilityState={{ selected: isSel }}
                      >
                        <View
                          style={[
                            st.calDayNum,
                            isToday && { backgroundColor: colors.primary + '33' },
                            isSel && { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: isToday ? 'Inter_700Bold' : 'Inter_500Medium',
                              color: isSel
                                ? '#000'
                                : isToday
                                  ? colors.primary
                                  : isDark
                                    ? 'rgba(255,255,255,0.8)'
                                    : colors.text,
                            }}
                          >
                            {day}
                          </Text>
                        </View>
                        {dayTasks.length > 0 && (
                          <View style={st.calDots}>
                            {dayTasks.slice(0, 3).map((t, ti) => (
                              <View
                                key={ti}
                                style={[
                                  st.calDot,
                                  {
                                    backgroundColor:
                                      PRI_COLOR[t.priority as TaskPriority] ?? colors.primary,
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedDay !== null && (
                  <View
                    style={[
                      st.calSelBanner,
                      {
                        backgroundColor: colors.primary + '1A',
                        borderColor: colors.primary + '33',
                      },
                    ]}
                  >
                    <CalendarIcon size={13} color={colors.primary} />
                    <Text style={[st.calSelText, { color: colors.primary }]}>
                      {selectedDay} {MONTH_NAMES[calMonth]} — kazi {displayTasks.length}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() => {
                        setShowCreate(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      style={st.calAddBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        language === 'sw' ? 'Ongeza kazi kwa siku hii' : 'Add task for this day'
                      }
                    >
                      <Plus size={11} color={colors.primary} />
                      <Text style={st.calAddText}>Ongeza</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedDay(null)}
                      style={{ marginLeft: 8 }}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        language === 'sw'
                          ? 'Funga mabango ya kuchagua'
                          : 'Close selected day banner'
                      }
                    >
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Task cards list */}
          <View style={{ gap: 14 }}>
            {displayTasks.length === 0 && (
              <View
                style={[
                  st.emptyCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <CalendarIcon size={28} color={colors.textMute} />
                <Text style={[st.emptyText, { color: colors.textMute }]}>
                  Hakuna kazi zinazolingana
                </Text>
              </View>
            )}
            {displayTasks.map((task, idx) => {
              const priColor = PRI_COLOR[task.priority as TaskPriority] ?? '#94a3b8';
              const catColor = CAT_COLOR[task.category] ?? '#94a3b8';
              const statusColor = STATUS_COLOR[task.status] ?? '#94a3b8';
              const isDone = task.status === 'done';
              const isProgress = task.status === 'in_progress';

              const roleColor =
                task.assignedRole === 'vet'
                  ? '#ef4444'
                  : task.assignedRole === 'mechanic'
                    ? '#f59e0b'
                    : '#3b82f6';
              const roleLabel =
                task.assignedRole === 'vet'
                  ? 'DAKTARI (VET)'
                  : task.assignedRole === 'mechanic'
                    ? 'MFUNDI (MECHANIC)'
                    : 'KIBARUA (STAFF)';

              return (
                <Animated.View key={task.id} entering={FadeInDown.delay(idx * 50).springify()}>
                  <View
                    style={[
                      st.taskCard,
                      {
                        backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
                        borderLeftColor: isDone ? colors.primary : priColor,
                        opacity: isDone ? 0.72 : 1,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[`${isDone ? colors.primary : priColor}1a`, 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />

                    {/* Header: category + priority */}
                    <View style={st.cardHeader}>
                      <View style={[st.catIconBox, { backgroundColor: `${catColor}18` }]}>
                        {CAT_ICON[task.category]}
                      </View>
                      <Text style={[st.catLabel, { color: catColor }]}>
                        {CAT_LABEL[task.category].toUpperCase()}
                      </Text>

                      {task.assignedRole && (
                        <View style={[st.roleBadge, { borderColor: roleColor }]}>
                          <Text style={[st.roleText, { color: roleColor }]}>{roleLabel}</Text>
                        </View>
                      )}

                      {task.coopId && (
                        <View style={st.coopBadge}>
                          <Users size={9} color="#3b82f6" />
                          <Text style={st.coopText}>AMCOS</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <View
                        style={[
                          st.priPill,
                          { backgroundColor: `${priColor}18`, borderColor: `${priColor}45` },
                        ]}
                      >
                        <View style={[st.priDot, { backgroundColor: priColor }]} />
                        <Text style={[st.priText, { color: priColor }]}>
                          {task.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Body: checkbox + title */}
                    <View style={st.cardBody}>
                      <TouchableOpacity
                        onPress={() => handleToggleTask(task.id)}
                        style={[
                          st.checkBtn,
                          {
                            backgroundColor: isDone ? colors.primary : 'transparent',
                            borderColor: isDone
                              ? colors.primary
                              : isDark
                                ? 'rgba(255,255,255,0.18)'
                                : colors.border,
                          },
                        ]}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        accessibilityRole="checkbox"
                        accessibilityLabel={
                          language === 'sw'
                            ? `Kamilisha kazi: ${task.titleSw ?? task.title}`
                            : `Complete task: ${task.title}`
                        }
                        accessibilityState={{ checked: isDone }}
                      >
                        {isDone && <Check size={12} color="#000" strokeWidth={3} />}
                      </TouchableOpacity>
                      <Text
                        style={[
                          st.taskTitle,
                          {
                            color: isDone ? colors.textMute : isDark ? '#fff' : colors.text,
                            textDecorationLine: isDone ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {task.titleSw ?? task.title}
                      </Text>
                    </View>

                    {/* Footer chips */}
                    <View style={st.cardFooter}>
                      {task.farmBlock && (
                        <View style={st.chip}>
                          <MapPin size={9} color={colors.primary} />
                          <Text style={st.chipText}>{task.farmBlock}</Text>
                        </View>
                      )}
                      {task.dueDate && (
                        <View style={st.chip}>
                          <Clock size={9} color={colors.primary} />
                          <Text style={st.chipText}>{formatDue(task.dueDate)}</Text>
                        </View>
                      )}
                      <View
                        style={[
                          st.chip,
                          {
                            backgroundColor: 'rgba(245,158,11,0.1)',
                            borderColor: 'rgba(245,158,11,0.3)',
                          },
                        ]}
                      >
                        <Sparkles size={9} color="#f59e0b" />
                        <Text style={[st.chipText, { color: '#f59e0b' }]}>+{task.xpReward} XP</Text>
                      </View>
                      <View
                        style={[
                          st.chip,
                          { backgroundColor: `${statusColor}14`, borderColor: `${statusColor}38` },
                        ]}
                      >
                        <Text style={[st.chipText, { color: statusColor }]}>
                          {STATUS_LABEL[task.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Create Task Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={[st.modalSheet, { backgroundColor: isDark ? '#0a140a' : '#fff' }]}>
            <View style={st.modalHandle} />

            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Kazi Mpya</Text>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={st.modalClose}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Funga dirisha la kuongeza kazi' : 'Close create task modal'
                }
              >
                <X size={20} color={colors.textMute} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Jina la kazi (English)"
              placeholderTextColor={colors.textMute}
              style={[
                st.modalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                },
              ]}
              accessibilityLabel={
                language === 'sw' ? 'Jina la kazi kwa Kiingereza' : 'Task title in English'
              }
              accessibilityHint={
                language === 'sw'
                  ? 'Weka jina la kazi kwa Kiingereza'
                  : 'Enter the task title in English'
              }
            />
            <TextInput
              value={newTitleSw}
              onChangeText={setNewTitleSw}
              placeholder="Jina kwa Kiswahili (hiari)"
              placeholderTextColor={colors.textMute}
              style={[
                st.modalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                },
              ]}
              accessibilityLabel={
                language === 'sw' ? 'Jina la kazi kwa Kiswahili' : 'Task title in Swahili'
              }
              accessibilityHint={
                language === 'sw'
                  ? 'Weka jina la kazi kwa Kiswahili, hii ni hiari'
                  : 'Enter the task title in Swahili, optional'
              }
            />
            <TextInput
              value={newBlock}
              onChangeText={setNewBlock}
              placeholder="Eneo la shamba (mfano: Block A)"
              placeholderTextColor={colors.textMute}
              style={[
                st.modalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                },
              ]}
              accessibilityLabel={language === 'sw' ? 'Eneo la shamba' : 'Farm block location'}
              accessibilityHint={
                language === 'sw'
                  ? 'Weka jina la eneo la shamba kama Block A'
                  : 'Enter the farm block location, e.g. Block A'
              }
            />

            {/* Stepper */}
            <Text style={[st.modalSection, { color: colors.textMute }]}>SIKU ZA KUKAMILISHA</Text>
            <View style={st.dueStepper}>
              <TouchableOpacity
                onPress={() => setNewDueDays((d) => Math.max(1, d - 1))}
                style={[
                  st.stepBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Punguza siku' : 'Decrease days'}
                accessibilityHint={
                  language === 'sw'
                    ? 'Inapunguza muda wa kukamilisha kwa siku moja'
                    : 'Decreases due date by one day'
                }
              >
                <Text style={{ fontSize: 18, color: colors.text, fontFamily: 'Inter_700Bold' }}>
                  −
                </Text>
              </TouchableOpacity>
              <View
                style={[
                  st.stepVal,
                  { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' },
                ]}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: 'InstrumentSerif_400Regular',
                    color: colors.primary,
                  }}
                >
                  {newDueDays}
                </Text>
                <Text
                  style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.primary }}
                >
                  siku
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNewDueDays((d) => Math.min(90, d + 1))}
                style={[
                  st.stepBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={language === 'sw' ? 'Ongeza siku' : 'Increase days'}
                accessibilityHint={
                  language === 'sw'
                    ? 'Inaongeza muda wa kukamilisha kwa siku moja'
                    : 'Increases due date by one day'
                }
              >
                <Text style={{ fontSize: 18, color: colors.text, fontFamily: 'Inter_700Bold' }}>
                  +
                </Text>
              </TouchableOpacity>
            </View>

            {/* Assigned Role */}
            <Text style={[st.modalSection, { color: colors.textMute }]}>
              MGAWANYO WA KAZI (ASSIGNED ROLE)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  { id: 'employee', label: 'Staff' },
                  { id: 'vet', label: 'Vet' },
                  { id: 'mechanic', label: 'Mechanic' },
                ] as const
              ).map((role) => (
                <TouchableOpacity
                  key={role.id}
                  onPress={() => setNewRole(role.id)}
                  style={[
                    st.priBtn,
                    {
                      flex: 1,
                      backgroundColor: newRole === role.id ? colors.primary + '1F' : 'transparent',
                      borderColor: newRole === role.id ? colors.primary : colors.border,
                      height: 44,
                      justifyContent: 'center',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      alignItems: 'center',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={role.label}
                  accessibilityState={{ selected: newRole === role.id }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 12,
                      color: newRole === role.id ? colors.primary : colors.textMute,
                    }}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={[st.modalSection, { color: colors.textMute }]}>AINA YA KAZI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewCat(c)}
                    style={[
                      st.catPill,
                      {
                        backgroundColor: newCat === c ? `${CAT_COLOR[c]}20` : 'transparent',
                        borderColor: newCat === c ? CAT_COLOR[c] : colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={CAT_LABEL[c]}
                    accessibilityState={{ selected: newCat === c }}
                  >
                    {CAT_ICON[c]}
                    <Text
                      style={[
                        st.catPillText,
                        { color: newCat === c ? CAT_COLOR[c] : colors.textMute },
                      ]}
                    >
                      {CAT_LABEL[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Priority */}
            <Text style={[st.modalSection, { color: colors.textMute }]}>KIPAUMBELE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setNewPri(p)}
                  style={[
                    st.priBtn,
                    {
                      flex: 1,
                      backgroundColor: newPri === p ? `${PRI_COLOR[p]}20` : 'transparent',
                      borderColor: newPri === p ? PRI_COLOR[p] : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={p.toUpperCase()}
                  accessibilityState={{ selected: newPri === p }}
                >
                  <View
                    style={[
                      {
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: PRI_COLOR[p],
                        marginBottom: 4,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      st.priBtn2Text,
                      { color: newPri === p ? PRI_COLOR[p] : colors.textMute },
                    ]}
                  >
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              style={st.createBtn}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Ongeza Kazi mpya' : 'Add Task'}
            >
              <LinearGradient
                colors={[colors.primary, '#1C4A29']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.createBtnGrad}
              >
                <Plus size={18} color="#fff" />
                <Text style={st.createBtnText}>Ongeza Kazi</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1 },
  glowTR: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(46, 111, 64,0.08)',
  },
  glowBL: {
    position: 'absolute',
    bottom: 80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(46, 111, 64,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    marginBottom: 4,
  },
  commandText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#2E6F40', letterSpacing: 1 },
  headerTitle: { fontSize: 21, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.5 },
  scrollContent: { padding: 16, gap: 14 },
  dashCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 20 },
  dashRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dashLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#2E6F40',
    letterSpacing: 1,
    marginBottom: 6,
  },
  dashTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  dashSub: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  dashCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(46, 111, 64,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashPct: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular', color: '#2E6F40' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  xpText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#f59e0b' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  offlineTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#ef4444', marginBottom: 2 },
  offlineDesc: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#fca5a5' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  filterBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  calCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 16 },
  calNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calNavBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  calMonthLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  calDayHdrRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calDayHdr: { width: '13.5%', textAlign: 'center', fontSize: 12, fontFamily: 'Inter_700Bold' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  calCell: { width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' },
  calDayNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calSelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  calSelText: { fontSize: 12, fontFamily: 'Inter_700Bold', marginLeft: 6 },
  calAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
  },
  calAddText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#2E6F40' },
  emptyCard: { padding: 32, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  taskCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  catIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
  coopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coopText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#3b82f6' },
  priPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priDot: { width: 5, height: 5, borderRadius: 2.5 },
  priText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkBtn: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  progressBar: { height: 3, borderRadius: 1.5, overflow: 'hidden', marginTop: 10 },

  // Role Badges
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  roleText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },

  // Role Filter row
  roleFilterRow: { flexDirection: 'row', gap: 8, marginVertical: 4, flexWrap: 'wrap' },
  roleFilterPill: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  roleFilterText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  // IoT alerts trigger style
  iotAlertsCard: { padding: 14, gap: 4 },
  iotTriggerBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
  },

  // Modal
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  modalClose: { padding: 4 },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  modalSection: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1, marginTop: 10 },
  dueStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catPillText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  priBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 44,
  },
  priBtn2Text: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  createBtn: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  createBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_800ExtraBold' },
});
