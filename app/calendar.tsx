import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Sparkles,
  BrainCircuit,
  Droplets,
  Leaf,
  Target,
  BarChart3,
  Microscope,
  ArrowRight,
  Send,
  CheckCircle2,
  Calendar,
  Flag,
  Clock,
  Trash2,
  LayoutGrid,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useTasks, Task, TaskPriority, TaskCategory } from '../hooks/useTasks';
import { chat, aiConfigured } from '../lib/ai';

const { width: SW } = Dimensions.get('window');

// ── Locale data ────────────────────────────────────────────────────────────────
const MONTHS_SW = [
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
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS_SW = ['J', 'A', 'J', 'A', 'A', 'I', 'J'];
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3C4A2A',
  low: '#94a3b8',
};
const PRIORITY_LABEL_SW: Record<string, string> = {
  critical: 'DHARURA',
  high: 'JUU',
  medium: 'KATI',
  low: 'CHINI',
};
const PRIORITY_LABEL_EN: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};
const CATEGORIES: { id: TaskCategory; labelSw: string; labelEn: string }[] = [
  { id: 'irrigation', labelSw: 'Umwagiliaji', labelEn: 'Irrigation' },
  { id: 'planting', labelSw: 'Upandaji', labelEn: 'Planting' },
  { id: 'harvest', labelSw: 'Mavuno', labelEn: 'Harvest' },
  { id: 'scouting', labelSw: 'Ukaguzi', labelEn: 'Scouting' },
  { id: 'finance', labelSw: 'Fedha', labelEn: 'Finance' },
  { id: 'general', labelSw: 'Mengineyo', labelEn: 'General' },
];

// ── Date utilities ─────────────────────────────────────────────────────────────
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
const toDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const generateGrid = (y: number, m: number): (number | null)[] => {
  const grid: (number | null)[] = Array(firstDay(y, m)).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
};

// ── Offline NLP parser ─────────────────────────────────────────────────────────
const PRIORITY_WORDS: Record<string, TaskPriority> = {
  dharura: 'critical',
  urgent: 'critical',
  critical: 'critical',
  haraka: 'high',
  high: 'high',
  juu: 'high',
  kawaida: 'medium',
  normal: 'medium',
  medium: 'medium',
  baadaye: 'low',
  low: 'low',
  chini: 'low',
};
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  jumapili: 0,
  monday: 1,
  jumatatu: 1,
  tuesday: 2,
  jumanne: 2,
  wednesday: 3,
  jumatano: 3,
  thursday: 4,
  alhamisi: 4,
  friday: 5,
  ijumaa: 5,
  saturday: 6,
  jumamosi: 6,
};

interface ParsedTask {
  title: string;
  date: Date;
  priority: TaskPriority;
  category: TaskCategory;
}

function parseNLTask(input: string): ParsedTask | null {
  const lower = input.toLowerCase();
  const now = new Date();
  let date = new Date();
  let priority: TaskPriority = 'medium';

  // Priority detection
  for (const [word, p] of Object.entries(PRIORITY_WORDS)) {
    if (lower.includes(word)) {
      priority = p;
      break;
    }
  }

  // Date detection
  if (lower.includes('leo') || lower.includes('today')) {
    date = new Date();
  } else if (lower.includes('kesho') || lower.includes('tomorrow')) {
    date = new Date(now.getTime() + 86400000);
  } else if (lower.includes('wiki ijayo') || lower.includes('next week')) {
    date = new Date(now.getTime() + 7 * 86400000);
  } else if (lower.includes('wiki hii') || lower.includes('this week')) {
    date = new Date(now.getTime() + 2 * 86400000);
  } else {
    for (const [name, num] of Object.entries(DAY_MAP)) {
      if (lower.includes(name)) {
        const diff = (num - now.getDay() + 7) % 7 || 7;
        date = new Date(now.getTime() + diff * 86400000);
        break;
      }
    }
  }

  // Category detection
  let category: TaskCategory = 'general';
  if (/mwagili|irrigat|water/i.test(lower)) category = 'irrigation';
  else if (/pand|plant|mbegu|seed/i.test(lower)) category = 'planting';
  else if (/vun|harvest/i.test(lower)) category = 'harvest';
  else if (/kagua|scout|wadudu|pest/i.test(lower)) category = 'scouting';
  else if (/lipa|payment|fedha|financ/i.test(lower)) category = 'finance';

  // Clean title
  let title = input
    .replace(/^(add|ongeza|schedule|weka|set|remind me to|niuk?umbusha)\s*/i, '')
    .replace(/\b(today|leo|tomorrow|kesho|next week|wiki ijayo|this week|wiki hii)\b/gi, '')
    .replace(new RegExp(Object.keys(DAY_MAP).join('|'), 'gi'), '')
    .replace(new RegExp(Object.keys(PRIORITY_WORDS).join('|'), 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!title) return null;
  return { title, date, priority, category };
}

// ── Category icon helper ───────────────────────────────────────────────────────
const CatIcon = ({ cat, size, color }: { cat: string; size: number; color: string }) => {
  switch (cat) {
    case 'irrigation':
      return <Droplets size={size} color={color} />;
    case 'planting':
      return <Leaf size={size} color={color} />;
    case 'harvest':
      return <Sparkles size={size} color={color} />;
    case 'scouting':
      return <Microscope size={size} color={color} />;
    case 'finance':
      return <BarChart3 size={size} color={color} />;
    default:
      return <Target size={size} color={color} />;
  }
};

// ── Completion checkmark animation ────────────────────────────────────────────
const CompletionBurst = ({ onDone }: { onDone: () => void }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withSpring(1.4, { damping: 8 }), withTiming(1, { duration: 150 }));
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 400 })
    );
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center', zIndex: 99 },
        style,
      ]}
    >
      <View style={{ backgroundColor: '#3C4A2A', borderRadius: 20, padding: 10 }}>
        <Check size={20} color="#000" strokeWidth={3} />
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
type FilterType = 'all' | 'tasks' | 'deadlines' | 'ai';

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const addNotification = useKilimoStore((s) => s.addNotification);

  const { tasks, createTask, completeTask, cancelTask } = useTasks();

  const today = useMemo(() => new Date(), []);
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [filter, setFilter] = useState<FilterType>('all');

  // Add task modal
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState<TaskCategory>('general');
  const [newDate, setNewDate] = useState<Date>(today);
  const [saving, setSaving] = useState(false);

  // AI panel
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAIInput] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiHistory, setAIHistory] = useState<{ role: string; text: string }[]>([
    {
      role: 'ai',
      text:
        language === 'sw'
          ? 'Habari! Mimi ni Sankofa AI. Ninaweza kukusaidia kuongeza kazi, kupanga ratiba, au kukufundisha jinsi ya kutumia kalenda. Sema tu!'
          : "Hi! I'm Sankofa AI. I can help you add tasks, plan your schedule, or guide you through the calendar. Just ask!",
    },
  ]);
  const aiScrollRef = useRef<ScrollView>(null);

  // Completing animation
  const [completingId, setCompletingId] = useState<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const calGrid = useMemo(() => generateGrid(curYear, curMonth), [curYear, curMonth]);

  const tasksByKey = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const dayTasks = useMemo(() => {
    const all = tasksByKey[toDateKey(selected)] || [];
    if (filter === 'all') return all;
    if (filter === 'tasks') return all.filter((t) => t.status !== 'done');
    if (filter === 'deadlines')
      return all.filter((t) => t.priority === 'critical' || t.priority === 'high');
    if (filter === 'ai') return all.filter((t) => t.coopId === 'ai-suggested');
    return all;
  }, [tasksByKey, selected, filter]);

  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
    [tasks]
  );

  // ── Month navigation ─────────────────────────────────────────────────────────
  const prevMonth = () => {
    Haptics.selectionAsync();
    if (curMonth === 0) {
      setCurYear((y) => y - 1);
      setCurMonth(11);
    } else setCurMonth((m) => m - 1);
  };
  const nextMonth = () => {
    Haptics.selectionAsync();
    if (curMonth === 11) {
      setCurYear((y) => y + 1);
      setCurMonth(0);
    } else setCurMonth((m) => m + 1);
  };

  // ── Tap on calendar cell ─────────────────────────────────────────────────────
  const onDayPress = (day: number) => {
    Haptics.selectionAsync();
    setSelected(new Date(curYear, curMonth, day));
  };

  // ── Save new task ────────────────────────────────────────────────────────────
  const handleSaveTask = useCallback(async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: 'pending',
      dueDate: newDate.toISOString(),
      xpReward: newPriority === 'critical' ? 40 : newPriority === 'high' ? 25 : 15,
    });
    addNotification({
      type: 'info',
      title: language === 'sw' ? 'Kazi Mpya Imeongezwa' : 'Task Added',
      body: newTitle.trim(),
    });
    setNewTitle('');
    setNewPriority('medium');
    setNewCategory('general');
    setSaving(false);
    setShowAdd(false);
  }, [newTitle, newPriority, newCategory, newDate, createTask, addNotification, language]);

  // ── Complete task with animation ─────────────────────────────────────────────
  const handleComplete = useCallback(
    (task: Task) => {
      if (task.status === 'done') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCompletingId(task.id);
      setTimeout(() => {
        completeTask(task.id);
        setCompletingId(null);
        addNotification({
          type: 'success',
          title: language === 'sw' ? '✓ Kazi Imekamilika!' : '✓ Task Completed!',
          body: language === 'sw' ? task.titleSw || task.title : task.title,
        });
      }, 700);
    },
    [completeTask, addNotification, language]
  );

  // ── AI handler ───────────────────────────────────────────────────────────────
  const handleAI = useCallback(
    async (queryOverride?: string) => {
      const query = (queryOverride || aiInput).trim();
      if (!query) return;
      setAILoading(true);
      setAIInput('');
      const userMsg = { role: 'user', text: query };
      setAIHistory((h) => [...h, userMsg]);
      setTimeout(() => aiScrollRef.current?.scrollToEnd({ animated: true }), 100);

      try {
        // Detect if it's a task creation request
        const isCreate = /ongeza|add|weka|schedule|remind|niuk?umbusha/i.test(query);
        const isBulk = /songa.*zote|move.*all|reschedule.*all|hamisha.*kazi/i.test(query);
        const isGuide = /jinsi|how|nifundishe|teach|help|saidia.*kutumia/i.test(query);

        let replyText = '';

        if (isBulk) {
          // Bulk reschedule: move all today's pending to tomorrow
          const todayKey = toDateKey(today);
          const todayPending = tasks.filter(
            (t) =>
              t.dueDate &&
              toDateKey(new Date(t.dueDate)) === todayKey &&
              (t.status === 'pending' || t.status === 'in_progress')
          );
          for (const t of todayPending) {
            const { id, createdAt, syncedOffline, ...rest } = t;
            await cancelTask(t.id);
            await createTask({
              ...rest,
              status: 'pending',
              dueDate: new Date(today.getTime() + 86400000).toISOString(),
            });
          }
          replyText =
            language === 'sw'
              ? `Nimesonga kazi ${todayPending.length} kutoka leo hadi kesho. ✓`
              : `Moved ${todayPending.length} task(s) from today to tomorrow. ✓`;
        } else if (isCreate) {
          const parsed = parseNLTask(query);
          if (parsed) {
            await createTask({
              title: parsed.title,
              category: parsed.category,
              priority: parsed.priority,
              status: 'pending',
              dueDate: parsed.date.toISOString(),
              xpReward: 20,
            });
            setSelected(parsed.date);
            setCurYear(parsed.date.getFullYear());
            setCurMonth(parsed.date.getMonth());
            const months = language === 'sw' ? MONTHS_SW : MONTHS_EN;
            replyText =
              language === 'sw'
                ? `Nimeweka kazi "${parsed.title}" kwa tarehe ${parsed.date.getDate()} ${months[parsed.date.getMonth()]}. ✓`
                : `Added "${parsed.title}" for ${months[parsed.date.getMonth()]} ${parsed.date.getDate()}. ✓`;
          } else {
            replyText =
              language === 'sw'
                ? 'Samahani, sijapata kichwa cha kazi. Jaribu mfano: "Ongeza kupanda mbegu Ijumaa"'
                : 'Sorry, I could not parse a task title. Try: "Add irrigate Block B on Friday"';
          }
        } else if (isGuide) {
          replyText =
            language === 'sw'
              ? 'Ili kuongeza kazi:\n1. Bonyeza kitufe cha "+" chini ya skrini\n2. Au bonyeza tarehe yoyote kwenye kalenda\n3. Au niambie hapa: "Ongeza [kazi] [tarehe]"\n\nKukamilisha kazi: Bonyeza ✓ kwenye kazi yoyote kwenye orodha.'
              : 'To add a task:\n1. Tap the "+" button at the bottom\n2. Or tap any date on the calendar\n3. Or tell me here: "Add [task] [date]"\n\nTo complete a task: Tap ✓ on any task in the day list.';
        } else if (aiConfigured()) {
          // Use real AI
          const monthName = (language === 'sw' ? MONTHS_SW : MONTHS_EN)[curMonth];
          const pendingForDay = dayTasks.filter((t) => t.status !== 'done').length;
          const prompt = `You are Sankofa AI, an agricultural calendar assistant for Kilimo AI.
Current calendar view: ${monthName} ${curYear}.
Selected date: ${selected.getDate()} ${monthName}.
Pending tasks on selected date: ${pendingForDay}.
Total pending tasks: ${pendingCount}.
User language: ${language === 'sw' ? 'Kiswahili' : 'English'}.
User message: "${query}"

Respond helpfully and concisely about the calendar or farming schedule.
If suggesting task changes, be specific. Max 3 sentences.`;
          replyText = await chat([{ role: 'user', content: prompt }]);
        } else {
          // Offline fallback
          const overloaded = Object.entries(tasksByKey).filter(
            ([, ts]) => ts.filter((t) => t.status !== 'done').length > 2
          ).length;
          replyText =
            language === 'sw'
              ? overloaded > 0
                ? `Una siku ${overloaded} zenye kazi nyingi wiki hii. Ningependa kukusaidia kuzisambaza vizuri. Niambie "Songa kazi zote leo kesho" ili nihamisha kazi za siku moja.`
                : `Ratiba yako inaonekana nzuri! Una kazi ${pendingCount} zinazongoja. Bonyeza tarehe yoyote kuongeza kazi mpya, au niambie: "Ongeza [kazi] [tarehe]".`
              : overloaded > 0
                ? `You have ${overloaded} overloaded days this week. Tell me "Move all today's tasks to tomorrow" and I will reschedule them for you.`
                : `Your schedule looks good! You have ${pendingCount} pending tasks. Tap any date to add a task, or tell me: "Add [task] [date]".`;
        }

        setAIHistory((h) => [...h, { role: 'ai', text: replyText }]);
      } catch {
        setAIHistory((h) => [
          ...h,
          {
            role: 'ai',
            text:
              language === 'sw' ? 'Kuna tatizo. Jaribu tena.' : 'Something went wrong. Try again.',
          },
        ]);
      } finally {
        setAILoading(false);
        setTimeout(() => aiScrollRef.current?.scrollToEnd({ animated: true }), 150);
      }
    },
    [
      aiInput,
      tasks,
      dayTasks,
      tasksByKey,
      pendingCount,
      curMonth,
      curYear,
      selected,
      today,
      language,
      createTask,
      cancelTask,
    ]
  );

  // ── Open add modal pre-filled for selected date ──────────────────────────────
  const openAdd = (date?: Date) => {
    setNewDate(date || selected);
    setNewTitle('');
    setNewPriority('medium');
    setNewCategory('general');
    setShowAdd(true);
  };

  // ── Render: calendar grid ─────────────────────────────────────────────────────
  const renderGrid = () => {
    const months = language === 'sw' ? MONTHS_SW : MONTHS_EN;
    const days = language === 'sw' ? DAYS_SW : DAYS_EN;
    const CELL = (SW - 48) / 7;

    return (
      <View
        style={[
          styles.gridCard,
          {
            backgroundColor: isDark ? 'rgba(6,14,8,0.98)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary + '12', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={prevMonth}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.monthTitle, { color: isDark ? '#fff' : colors.text }]}>
              {months[curMonth]}
            </Text>
            <Text style={[styles.yearLabel, { color: colors.textMute }]}>{curYear}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={nextMonth}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronRight size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {days.map((d, i) => (
            <View key={i} style={{ width: CELL, alignItems: 'center' }}>
              <Text style={[styles.dayLabel, { color: colors.textMute }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar cells */}
        <View style={styles.gridWrap}>
          {calGrid.map((day, i) => {
            if (!day) return <View key={i} style={{ width: CELL, height: CELL + 10 }} />;
            const cellDate = new Date(curYear, curMonth, day);
            const isToday = isSameDay(cellDate, today);
            const isSel = isSameDay(cellDate, selected);
            const isPast = cellDate < today && !isToday;
            const key = toDateKey(cellDate);
            const cellTasks = tasksByKey[key] || [];
            const pending = cellTasks.filter((t) => t.status !== 'done');
            const dots = pending.slice(0, 3);

            return (
              <TouchableOpacity
                key={i}
                onPress={() => onDayPress(day)}
                activeOpacity={0.75}
                style={[
                  styles.cell,
                  { width: CELL, height: CELL + 10 },
                  isSel && styles.cellSelected,
                  isToday && !isSel && styles.cellToday,
                ]}
              >
                <Text
                  style={[
                    styles.cellNum,
                    {
                      color: isSel
                        ? '#000'
                        : isToday
                          ? colors.primary
                          : isPast
                            ? colors.textMute + '60'
                            : isDark
                              ? '#fff'
                              : colors.text,
                    },
                    isSel && { fontFamily: 'Inter_700Bold' },
                  ]}
                >
                  {day}
                </Text>
                {dots.length > 0 && (
                  <View style={styles.dotRow}>
                    {dots.map((t, di) => (
                      <View
                        key={di}
                        style={[
                          styles.taskDot,
                          { backgroundColor: PRIORITY_COLOR[t.priority] || colors.primary },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Render: filter pills ──────────────────────────────────────────────────────
  const renderFilters = () => {
    const filters: { id: FilterType; sw: string; en: string }[] = [
      { id: 'all', sw: 'Zote', en: 'All' },
      { id: 'tasks', sw: 'Kazi', en: 'Tasks' },
      { id: 'deadlines', sw: 'Mwisho', en: 'Deadlines' },
      { id: 'ai', sw: 'AI', en: 'AI' },
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f.id);
            }}
            style={[
              styles.filterPill,
              filter === f.id && { backgroundColor: colors.primary, borderColor: colors.primary },
              filter !== f.id && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <Text
              style={[styles.filterText, { color: filter === f.id ? '#000' : colors.textMute }]}
            >
              {language === 'sw' ? f.sw : f.en}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // ── Render: day task list ─────────────────────────────────────────────────────
  const renderDayList = () => {
    const months = language === 'sw' ? MONTHS_SW : MONTHS_EN;
    const isToday = isSameDay(selected, today);
    const dateLabel = `${selected.getDate()} ${months[selected.getMonth()]}${isToday ? (language === 'sw' ? ' · Leo' : ' · Today') : ''}`;

    return (
      <View style={{ flex: 1 }}>
        {/* Day header */}
        <View style={styles.dayHeader}>
          <View>
            <Text style={[styles.dayHeaderTitle, { color: isDark ? '#fff' : colors.text }]}>
              {dateLabel}
            </Text>
            <Text style={[styles.dayHeaderSub, { color: colors.textMute }]}>
              {dayTasks.length} {language === 'sw' ? 'kazi' : 'tasks'} ·{' '}
              {dayTasks.filter((t) => t.status === 'done').length}{' '}
              {language === 'sw' ? 'zilizokamilika' : 'done'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openAdd()}
            style={[
              styles.addDayBtn,
              { backgroundColor: colors.primary + '1F', borderColor: colors.primary + '40' },
            ]}
          >
            <Plus size={14} color={colors.primary} />
            <Text style={styles.addDayBtnText}>{language === 'sw' ? 'Ongeza' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Task rows */}
        {dayTasks.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.emptyDay}>
            <Calendar size={28} color={colors.textMute + '60'} />
            <Text style={[styles.emptyDayText, { color: colors.textMute }]}>
              {language === 'sw' ? 'Hakuna kazi kwa tarehe hii' : 'No tasks for this date'}
            </Text>
            <TouchableOpacity
              onPress={() => openAdd()}
              style={[styles.emptyDayBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={13} color="#000" />
              <Text style={styles.emptyDayBtnText}>
                {language === 'sw' ? 'Ongeza Kazi' : 'Add a Task'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 120 }}
          >
            {dayTasks.map((task, idx) => {
              const pc = PRIORITY_COLOR[task.priority] || colors.primary;
              const isDone = task.status === 'done';
              const isCompleting = completingId === task.id;

              return (
                <Animated.View key={task.id} entering={FadeInDown.delay(idx * 40).springify()}>
                  <View
                    style={[
                      styles.taskRow,
                      {
                        backgroundColor: isDark
                          ? isDone
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(255,255,255,0.04)'
                          : isDone
                            ? 'rgba(0,0,0,0.02)'
                            : colors.card,
                        borderColor: isDone
                          ? 'transparent'
                          : isDark
                            ? 'rgba(255,255,255,0.07)'
                            : colors.border,
                        opacity: isDone ? 0.55 : 1,
                      },
                    ]}
                  >
                    {isCompleting && <CompletionBurst onDone={() => {}} />}

                    {/* Left: icon */}
                    <View style={[styles.taskIcon, { backgroundColor: pc + '18' }]}>
                      <CatIcon cat={task.category} size={15} color={pc} />
                    </View>

                    {/* Middle: title + badges */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.taskTitle,
                          {
                            color: isDone ? colors.textMute : isDark ? '#fff' : colors.text,
                            textDecorationLine: isDone ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {language === 'sw' && task.titleSw ? task.titleSw : task.title}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}
                      >
                        <View
                          style={[
                            styles.priBadge,
                            { backgroundColor: pc + '18', borderColor: pc + '35' },
                          ]}
                        >
                          <Text style={[styles.priBadgeText, { color: pc }]}>
                            {language === 'sw'
                              ? PRIORITY_LABEL_SW[task.priority]
                              : PRIORITY_LABEL_EN[task.priority]}
                          </Text>
                        </View>
                        {task.farmBlock && (
                          <Text style={[styles.taskBlock, { color: colors.textMute }]}>
                            {task.farmBlock}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Right: actions */}
                    <View style={{ gap: 6 }}>
                      {!isDone && (
                        <TouchableOpacity
                          onPress={() => handleComplete(task)}
                          style={[
                            styles.completeBtn,
                            {
                              backgroundColor: colors.primary + '1F',
                              borderColor: colors.primary + '40',
                            },
                          ]}
                        >
                          <Check size={13} color={colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          cancelTask(task.id);
                        }}
                        style={[
                          styles.deleteBtn,
                          {
                            backgroundColor: 'rgba(239,68,68,0.08)',
                            borderColor: 'rgba(239,68,68,0.2)',
                          },
                        ]}
                      >
                        <Trash2 size={11} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  // ── Render: add task modal ────────────────────────────────────────────────────
  const renderAddModal = () => (
    <Modal
      visible={showAdd}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAdd(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            entering={SlideInUp.springify()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#0a130b' : colors.card,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary + '14', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : colors.text }]}>
                  {language === 'sw' ? 'Ongeza Kazi' : 'Add Task'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMute }]}>
                  {newDate.getDate()}{' '}
                  {(language === 'sw' ? MONTHS_SW : MONTHS_EN)[newDate.getMonth()]}{' '}
                  {newDate.getFullYear()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAdd(false)}
                style={[
                  styles.closeBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
                ]}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Title input */}
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.background,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.taskInput, { color: isDark ? '#fff' : colors.text }]}
                placeholder={language === 'sw' ? 'Jina la kazi...' : 'Task title...'}
                placeholderTextColor={colors.textMute}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />
            </View>

            {/* Priority row */}
            <Text style={[styles.fieldLabel, { color: colors.textMute }]}>
              {language === 'sw' ? 'KIPAUMBELE' : 'PRIORITY'}
            </Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setNewPriority(p);
                  }}
                  style={[
                    styles.priBtn,
                    {
                      backgroundColor: newPriority === p ? PRIORITY_COLOR[p] : 'transparent',
                      borderColor: PRIORITY_COLOR[p],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priBtnText,
                      { color: newPriority === p ? '#000' : PRIORITY_COLOR[p] },
                    ]}
                  >
                    {language === 'sw' ? PRIORITY_LABEL_SW[p] : PRIORITY_LABEL_EN[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category row */}
            <Text style={[styles.fieldLabel, { color: colors.textMute }]}>
              {language === 'sw' ? 'AINA' : 'CATEGORY'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNewCategory(c.id);
                    }}
                    style={[
                      styles.catBtn,
                      {
                        backgroundColor:
                          newCategory === c.id ? colors.primary + '26' : 'transparent',
                        borderColor:
                          newCategory === c.id
                            ? colors.primary
                            : isDark
                              ? 'rgba(255,255,255,0.1)'
                              : colors.border,
                      },
                    ]}
                  >
                    <CatIcon
                      cat={c.id}
                      size={14}
                      color={newCategory === c.id ? colors.primary : colors.textMute}
                    />
                    <Text
                      style={[
                        styles.catBtnText,
                        { color: newCategory === c.id ? colors.primary : colors.textMute },
                      ]}
                    >
                      {language === 'sw' ? c.labelSw : c.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* AI quick-add hint */}
            <TouchableOpacity
              onPress={() => {
                setShowAdd(false);
                setShowAI(true);
              }}
              style={[
                styles.aiHint,
                { backgroundColor: colors.primary + '12', borderColor: colors.primary + '33' },
              ]}
            >
              <BrainCircuit size={13} color={colors.primary} />
              <Text style={[styles.aiHintText, { color: colors.primary }]}>
                {language === 'sw'
                  ? 'Tumia Sankofa AI kuongeza kazi kwa lugha ya kawaida →'
                  : 'Use Sankofa AI to add tasks in plain language →'}
              </Text>
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowAdd(false)}
                style={[
                  styles.cancelBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
                ]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMute }]}>
                  {language === 'sw' ? 'Futa' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTask}
                disabled={!newTitle.trim() || saving}
                style={[
                  styles.saveBtn,
                  { backgroundColor: newTitle.trim() ? colors.primary : colors.textMute + '40' },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Check size={14} color="#000" strokeWidth={3} />
                    <Text style={styles.saveBtnText}>{language === 'sw' ? 'Hifadhi' : 'Save'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  // ── Render: Sankofa AI panel ──────────────────────────────────────────────────
  const QUICK_PROMPTS =
    language === 'sw'
      ? [
          'Ongeza kazi leo',
          'Songa kazi zote leo kesho',
          'Nionyeshe kazi nyingi',
          'Jinsi ya kutumia kalenda?',
        ]
      : [
          'Add task for today',
          "Move all today's tasks to tomorrow",
          'Which days are overloaded?',
          'How do I use the calendar?',
        ];

  const renderAIPanel = () => (
    <Modal
      visible={showAI}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAI(false)}
    >
      <View style={styles.aiOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAI(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            entering={SlideInUp.springify()}
            style={[
              styles.aiSheet,
              {
                backgroundColor: isDark ? '#08110a' : colors.card,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary + '1A', colors.primary + '08', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* AI header */}
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.aiAvatar}>
                  <BrainCircuit size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.aiTitle, { color: isDark ? '#fff' : colors.text }]}>
                    Sankofa AI
                  </Text>
                  <Text style={[styles.aiSub, { color: colors.textMute }]}>
                    {language === 'sw' ? 'Msaidizi wa Kalenda' : 'Calendar Assistant'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.aiLiveDot,
                    { backgroundColor: colors.primary + '26', borderColor: colors.primary + '4D' },
                  ]}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: colors.primary,
                    }}
                  />
                  <Text style={{ fontSize: 8, fontFamily: 'Inter_700Bold', color: colors.primary }}>
                    LIVE
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAI(false)}
                style={[
                  styles.closeBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
                ]}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quick prompts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPrompts}
            >
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAI(p)}
                  style={[
                    styles.quickPill,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.quickPillText, { color: colors.textMute }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Chat history */}
            <ScrollView
              ref={aiScrollRef}
              style={styles.chatHistory}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            >
              {aiHistory.map((msg, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i === aiHistory.length - 1 ? 0 : 0).springify()}
                >
                  <View
                    style={[
                      styles.chatBubble,
                      msg.role === 'user'
                        ? [styles.chatUser, { backgroundColor: colors.primary }]
                        : [
                            styles.chatAI,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.05)',
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatText,
                        { color: msg.role === 'user' ? '#000' : isDark ? '#fff' : colors.text },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </Animated.View>
              ))}
              {aiLoading && (
                <View
                  style={[
                    styles.chatAI,
                    styles.chatBubble,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </ScrollView>

            {/* Input row */}
            <View
              style={[
                styles.aiInputRow,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.background,
                },
              ]}
            >
              <TextInput
                style={[styles.aiInput, { color: isDark ? '#fff' : colors.text }]}
                placeholder={language === 'sw' ? 'Uliza au ongeza kazi...' : 'Ask or add a task...'}
                placeholderTextColor={colors.textMute}
                value={aiInput}
                onChangeText={setAIInput}
                onSubmitEditing={() => handleAI()}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => handleAI()}
                disabled={!aiInput.trim() || aiLoading}
                style={[
                  styles.aiSendBtn,
                  { backgroundColor: aiInput.trim() ? colors.primary : 'transparent' },
                ]}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Send size={16} color={aiInput.trim() ? '#000' : colors.textMute} />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={isDark ? '#fff' : colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : colors.text }]}>
              {language === 'sw' ? 'Kalenda ya Shamba' : 'Farm Calendar'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMute }]}>
              {pendingCount} {language === 'sw' ? 'kazi zingooja' : 'tasks pending'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAI(true)}
            style={[
              styles.aiHeaderBtn,
              { backgroundColor: colors.primary + '1F', borderColor: colors.primary + '40' },
            ]}
          >
            <BrainCircuit size={16} color={colors.primary} />
            <Text style={styles.aiHeaderBtnText}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openAdd()}
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={16} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        {renderFilters()}

        {/* Calendar grid */}
        <View style={{ paddingHorizontal: 16 }}>{renderGrid()}</View>

        {/* Day view */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>{renderDayList()}</View>
      </SafeAreaView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => openAdd()}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#000" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Modals */}
      {renderAddModal()}
      {renderAIPanel()}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular', lineHeight: 22 },
  headerSub: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiHeaderBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#3C4A2A' },
  addHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  gridCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
    marginBottom: 10,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  yearLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  dayLabels: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    borderRadius: 10,
  },
  cellSelected: { backgroundColor: '#3C4A2A' },
  cellToday: { borderWidth: 1.5, borderColor: '#3C4A2A', borderRadius: 10 },
  cellNum: { fontSize: 13, fontFamily: 'InstrumentSerif_400Regular' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  taskDot: { width: 4, height: 4, borderRadius: 2 },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayHeaderTitle: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular' },
  dayHeaderSub: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 1 },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  addDayBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#3C4A2A' },

  emptyDay: { alignItems: 'center', paddingTop: 32, gap: 10 },
  emptyDayText: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  emptyDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyDayBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#000' },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  taskIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 18 },
  taskBlock: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  priBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  priBadgeText: { fontSize: 7, fontFamily: 'Inter_700Bold' },
  completeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C4A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Add modal ──────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular' },
  modalSub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  taskInput: { fontSize: 15, fontFamily: 'Inter_500Medium', minHeight: 40 },
  fieldLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, marginBottom: 8 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  priBtnText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  catBtnText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiHintText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#000' },

  // ── AI panel ──────────────────────────────────────────────────────────────
  aiOverlay: { flex: 1, justifyContent: 'flex-end' },
  aiSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 10,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 74, 42,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(60, 74, 42,0.3)',
  },
  aiTitle: { fontSize: 15, fontFamily: 'InstrumentSerif_400Regular' },
  aiSub: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  aiLiveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  quickPrompts: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickPillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  chatHistory: { maxHeight: 260, paddingHorizontal: 16 },
  chatBubble: { borderRadius: 16, padding: 12, maxWidth: '85%' },
  chatUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  chatAI: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  chatText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    margin: 12,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  aiInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', minHeight: 36 },
  aiSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
