/**
 * One task in a list (Tasks + Calendar screens): 44pt checkbox, title, category / due / block
 * line, priority + sync badges, and a 44pt cancel button. Sync state comes from the real outbox.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Check, X, Users } from 'lucide-react-native';

import { useTheme } from '../../constants/Theme';
import { useT, type TranslationKey } from '../../lib/i18n';
import { AppText, Badge, type BadgeVariant } from '../ui';
import type { Task, TaskPriority } from '../../hooks/useTasks';
import { dueLabel, taskTitle, type TaskSyncState } from '../../lib/scheduleFormat';

const PRIORITY_BADGE: Record<TaskPriority, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

export interface TaskRowProps {
  task: Task;
  syncState?: TaskSyncState;
  onComplete: (task: Task) => void;
  onCancel: (task: Task) => void;
  divider?: boolean;
}

export function TaskRow({ task, syncState, onComplete, onCancel, divider }: TaskRowProps) {
  const { colors, spacing, borderWidth } = useTheme();
  const { t, lang } = useT();
  const title = taskTitle(task, lang);
  const done = task.status === 'done';

  const meta = [
    t(`schedule.category.${task.category}` as TranslationKey),
    done ? t('schedule.status.done') : dueLabel(t, task.dueDate),
    task.farmBlock,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.sm },
        divider && { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border },
      ]}
      testID={`task-row-${task.id}`}
    >
      <Pressable
        onPress={() => !done && onComplete(task)}
        disabled={done}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: done }}
        accessibilityLabel={
          done ? t('schedule.tasks.isDone', { title }) : t('schedule.tasks.markDone', { title })
        }
        style={styles.hit}
        testID={`task-check-${task.id}`}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: colors.primary,
              backgroundColor: done ? colors.primary : 'transparent',
            },
          ]}
        >
          {done ? <Check size={14} color={colors.textOnPrimary} strokeWidth={3} /> : null}
        </View>
      </Pressable>

      <View style={styles.body}>
        <AppText
          variant="label"
          tone={done ? 'muted' : 'default'}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
          numberOfLines={2}
        >
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }} numberOfLines={2}>
          {meta}
        </AppText>
        <View style={styles.badges}>
          {!done ? (
            <Badge
              label={t(`schedule.priority.${task.priority}` as TranslationKey)}
              variant={PRIORITY_BADGE[task.priority] ?? 'neutral'}
            />
          ) : null}
          {task.assignedRole ? (
            <Badge label={t(`schedule.role.${task.assignedRole}` as TranslationKey)} />
          ) : null}
          {task.coopId ? (
            <Badge
              label={t('schedule.coop')}
              variant="info"
              icon={<Users size={10} color={colors.infoText} />}
            />
          ) : null}
          {syncState === 'pending' ? (
            <Badge label={t('schedule.sync.pending')} variant="warning" testID="sync-pending" />
          ) : null}
          {syncState === 'failed' ? (
            <Badge label={t('schedule.sync.failed')} variant="error" testID="sync-failed" />
          ) : null}
        </View>
      </View>

      {!done ? (
        <Pressable
          onPress={() => onCancel(task)}
          accessibilityRole="button"
          accessibilityLabel={t('schedule.tasks.cancel', { title })}
          style={styles.hit}
          testID={`task-cancel-${task.id}`}
        >
          <X size={18} color={colors.textMute} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 8 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  box: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingTop: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});
