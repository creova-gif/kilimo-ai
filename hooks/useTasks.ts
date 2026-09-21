/**
 * Kilimo AI — Tasks Hook (Offline-First)
 *
 * Full task management with:
 * - Supabase persistence
 * - Offline queue integration
 * - Co-op shared tasks via coop_id
 * - XP gamification
 * - Optimistic UI updates
 * - Assigned roles (vet, mechanic, employee)
 */

import { getSupabase } from '../lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { useKilimoStore } from '../store/useKilimoStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskCategory =
  | 'irrigation'
  | 'planting'
  | 'harvest'
  | 'scouting'
  | 'finance'
  | 'general';
export type AssignedRole = 'vet' | 'mechanic' | 'employee';

export interface Task {
  id: string;
  title: string;
  titleSw?: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  xpReward: number;
  farmBlock?: string;
  coopId?: string;
  syncedOffline: boolean;
  createdAt: string;
  assignedRole?: AssignedRole;
}

export function useTasks() {
  // Shared client (lib/supabase.ts); null when the backend is not configured. Resolved per call
  // (a cheap singleton lookup) rather than at import time, so it is testable.
  const supabase: any = getSupabase();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const agroId = useKilimoStore((s) => s.agroId);
  const addToSyncQueue = useKilimoStore((s) => s.addToSyncQueue);

  // No seed data: a farmer sees only tasks that really exist (created by them, or fetched from
  // the backend). An empty list is a valid, honest state — screens render an empty state.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalXP, setTotalXP] = useState(0);

  // Compute XP from completed tasks
  useEffect(() => {
    const xp = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.xpReward, 0);
    setTotalXP(xp);
  }, [tasks]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (isOffline || !supabase) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (dbError) {
        setError(dbError.message);
      } else {
        // Replace local state with the server's truth — including an empty list.
        setTasks((data ?? []).map(mapDbToTask));
        setError(null);
        setLoaded(true);
      }
    } catch (err: any) {
      console.warn('[Tasks] Fetch failed:', err);
      setError(err?.message ?? 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    fetchTasks();
  }, []);

  // ── Complete a task (offline-aware) ───────────────────────────────────────
  const completeTask = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'done', completedAt: now } : t))
      );

      if (isOffline) {
        addToSyncQueue({
          type: 'task_complete',
          payload: { taskId: id, completedAt: now, userId: agroId?.id },
        });
        return;
      }

      if (supabase) {
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'done', completed_at: now })
          .eq('id', id);
        if (error) console.warn('[Tasks] Complete failed:', error);
      }
    },
    [isOffline, addToSyncQueue, agroId]
  );

  // ── Create task (offline-aware) ───────────────────────────────────────────
  const createTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt' | 'syncedOffline'>) => {
      const newTask: Task = {
        ...task,
        id: `local_${Date.now()}`,
        syncedOffline: isOffline,
        createdAt: new Date().toISOString(),
      };

      // Optimistic add
      setTasks((prev) => [newTask, ...prev]);

      if (isOffline) {
        addToSyncQueue({ type: 'task_complete', payload: newTask as any });
        return;
      }

      if (supabase) {
        const { error } = await supabase.from('tasks').insert({
          title: task.title,
          title_sw: task.titleSw,
          category: task.category,
          priority: task.priority,
          status: task.status,
          due_date: task.dueDate,
          xp_reward: task.xpReward,
          farm_block: task.farmBlock,
          coop_id: task.coopId,
          synced_offline: false,
          assigned_role: task.assignedRole,
        });
        if (error) console.warn('[Tasks] Create failed:', error);
      }
    },
    [isOffline, addToSyncQueue]
  );

  // ── Delete / cancel task ──────────────────────────────────────────────────
  const cancelTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)));
      if (!isOffline && supabase) {
        await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', id);
      }
    },
    [isOffline]
  );

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  return {
    tasks,
    pendingTasks,
    completedTasks,
    totalXP,
    loading,
    loaded,
    error,
    completeTask,
    createTask,
    cancelTask,
    refresh: fetchTasks,
  };
}

function mapDbToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    titleSw: row.title_sw,
    description: row.description,
    category: row.category ?? 'general',
    priority: row.priority ?? 'medium',
    status: row.status ?? 'pending',
    dueDate: row.due_date,
    completedAt: row.completed_at,
    xpReward: row.xp_reward ?? 10,
    farmBlock: row.farm_block,
    coopId: row.coop_id,
    syncedOffline: row.synced_offline ?? false,
    createdAt: row.created_at,
    assignedRole: row.assigned_role,
  };
}
