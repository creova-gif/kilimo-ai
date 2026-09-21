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

// ─── Seed tasks ───────────────────────────────────────────────────────────────
const SEED_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Irrigate Block B',
    titleSw: 'Mwagilia Sehemu B',
    category: 'irrigation',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    xpReward: 25,
    farmBlock: 'Block B',
    syncedOffline: false,
    createdAt: new Date().toISOString(),
    assignedRole: 'employee',
  },
  {
    id: 't2',
    title: 'Scout for Pests',
    titleSw: 'Kagua Wadudu',
    category: 'scouting',
    priority: 'medium',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    xpReward: 15,
    farmBlock: 'Block A',
    syncedOffline: false,
    createdAt: new Date().toISOString(),
    assignedRole: 'employee',
  },
  {
    id: 't3',
    title: 'Apply Fertilizer',
    titleSw: 'Weka Mbolea',
    category: 'planting',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    xpReward: 20,
    farmBlock: 'Block C',
    syncedOffline: false,
    createdAt: new Date().toISOString(),
    assignedRole: 'employee',
  },
  {
    id: 't4',
    title: 'Co-op Payment Due',
    titleSw: 'Malipo ya AMCOS',
    category: 'finance',
    priority: 'critical',
    status: 'pending',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    xpReward: 30,
    coopId: 'AMCOS-KIL-001',
    syncedOffline: false,
    createdAt: new Date().toISOString(),
    assignedRole: 'employee',
  },
];

// Shared client (lib/supabase.ts); null when the backend is not configured.
const supabase: any = getSupabase();

export function useTasks() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const agroId = useKilimoStore((s) => s.agroId);
  const addToSyncQueue = useKilimoStore((s) => s.addToSyncQueue);

  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [loading, setLoading] = useState(false);
  const [totalXP, setTotalXP] = useState(0);

  // Compute XP from completed tasks
  useEffect(() => {
    const xp = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.xpReward, 0);
    setTotalXP(xp);
  }, [tasks]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (isOffline || !supabase || !process.env.EXPO_PUBLIC_SUPABASE_URL) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        setTasks(data.map(mapDbToTask));
      }
    } catch (err) {
      console.warn('[Tasks] Fetch failed, using cache:', err);
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
