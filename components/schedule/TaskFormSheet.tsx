/**
 * New-task sheet shared by the Tasks and Calendar screens. It only collects input and hands a
 * task to `onSubmit` (which calls useTasks().createTask — queued through the offline outbox).
 * With `fixedDate` the due day is the calendar day the farmer picked; otherwise a day stepper.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import { AppText, Button, Chip, TextField } from '../ui';
import type { AssignedRole, Task, TaskCategory, TaskPriority } from '../../hooks/useTasks';
import { formatDayMonth, noonIso, xpForPriority } from '../../lib/scheduleFormat';

export type NewTaskInput = Omit<Task, 'id' | 'createdAt' | 'syncedOffline'>;

const CATEGORIES: TaskCategory[] = [
  'general',
  'planting',
  'irrigation',
  'scouting',
  'harvest',
  'finance',
];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const ROLES: AssignedRole[] = ['employee', 'vet', 'mechanic'];

export interface TaskFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: NewTaskInput) => void;
  /** Due on this calendar day (Calendar screen). When absent, the farmer picks days-from-today. */
  fixedDate?: Date;
  isOffline?: boolean;
}

export function TaskFormSheet({
  visible,
  onClose,
  onSubmit,
  fixedDate,
  isOffline,
}: TaskFormSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useT();

  const [title, setTitle] = useState('');
  const [titleSw, setTitleSw] = useState('');
  const [block, setBlock] = useState('');
  const [category, setCategory] = useState<TaskCategory>('general');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [role, setRole] = useState<AssignedRole>('employee');
  const [dueDays, setDueDays] = useState(1);
  const [showError, setShowError] = useState(false);

  // Fresh form every time it opens.
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setTitleSw('');
    setBlock('');
    setCategory('general');
    setPriority('medium');
    setRole('employee');
    setDueDays(1);
    setShowError(false);
  }, [visible]);

  const submit = () => {
    if (!title.trim()) {
      setShowError(true);
      return;
    }
    const due = fixedDate ?? new Date(Date.now() + dueDays * 86_400_000);
    onSubmit({
      title: title.trim(),
      titleSw: titleSw.trim() || undefined,
      farmBlock: block.trim() || undefined,
      category,
      priority,
      status: 'pending',
      xpReward: xpForPriority(priority),
      dueDate: noonIso(due),
      assignedRole: role,
    });
  };

  const section = (key: TranslationKey) => (
    <AppText variant="label" style={{ marginBottom: spacing.sm, marginTop: spacing.sm }}>
      {t(key)}
    </AppText>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" accessibilityRole="header">
                {t('schedule.form.title')}
              </AppText>
              {fixedDate ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {t('schedule.form.dueFixed', { date: formatDayMonth(t, fixedDate) })}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.iconBtn}
              testID="task-form-close"
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            {isOffline ? (
              <AppText variant="small" tone="warning" style={{ marginBottom: spacing.md }}>
                {t('schedule.form.offlineNote')}
              </AppText>
            ) : null}

            <TextField
              label={t('schedule.form.name')}
              placeholder={t('schedule.form.name.ph')}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (v.trim()) setShowError(false);
              }}
              error={showError ? t('schedule.form.name.error') : undefined}
              testID="task-form-title"
              autoFocus
            />
            <TextField
              label={t('schedule.form.nameSw')}
              placeholder={t('schedule.form.nameSw.ph')}
              value={titleSw}
              onChangeText={setTitleSw}
              testID="task-form-title-sw"
            />
            <TextField
              label={t('schedule.form.block')}
              placeholder={t('schedule.form.block.ph')}
              value={block}
              onChangeText={setBlock}
              testID="task-form-block"
            />

            {section('schedule.form.category')}
            <View style={styles.wrap}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={t(`schedule.category.${c}` as TranslationKey)}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>

            {section('schedule.form.priority')}
            <View style={styles.wrap}>
              {PRIORITIES.map((p) => (
                <Chip
                  key={p}
                  label={t(`schedule.priority.${p}` as TranslationKey)}
                  selected={priority === p}
                  onPress={() => setPriority(p)}
                />
              ))}
            </View>

            {section('schedule.form.role')}
            <View style={styles.wrap}>
              {ROLES.map((r) => (
                <Chip
                  key={r}
                  label={t(`schedule.role.${r}` as TranslationKey)}
                  selected={role === r}
                  onPress={() => setRole(r)}
                />
              ))}
            </View>

            {!fixedDate ? (
              <>
                {section('schedule.form.due')}
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => setDueDays((d) => Math.max(0, d - 1))}
                    accessibilityRole="button"
                    accessibilityLabel={t('schedule.form.decrease')}
                    style={[styles.stepBtn, { borderColor: colors.border, borderRadius: radius.sm }]}
                  >
                    <Minus size={18} color={colors.text} />
                  </Pressable>
                  <AppText variant="label" style={styles.stepValue} accessibilityLiveRegion="polite">
                    {dueDays === 0
                      ? t('schedule.due.today')
                      : dueDays === 1
                        ? t('schedule.due.tomorrow')
                        : t('schedule.form.dueIn', { count: dueDays })}
                  </AppText>
                  <Pressable
                    onPress={() => setDueDays((d) => Math.min(365, d + 1))}
                    accessibilityRole="button"
                    accessibilityLabel={t('schedule.form.increase')}
                    style={[styles.stepBtn, { borderColor: colors.border, borderRadius: radius.sm }]}
                  >
                    <Plus size={18} color={colors.text} />
                  </Pressable>
                </View>
              </>
            ) : null}

            <Button
              label={t('schedule.form.save')}
              onPress={submit}
              style={{ marginTop: spacing.xl }}
              testID="task-form-save"
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '92%', paddingTop: 8, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { flex: 1, textAlign: 'center' },
});
