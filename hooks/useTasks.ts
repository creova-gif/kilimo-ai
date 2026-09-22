/**
 * Kilimo AI — Tasks Hook (Offline-First)
 *
 * Full task management with:
 * - Supabase persistence
 * - Every write goes through the offline outbox (lib/offline.ts), online or not, so writes are
 *   ordered, retried with backoff and never silently lost. Tasks get a client-generated uuid that
 *   is also the server row id, so a retry can never create a duplicate and a task completed before
 *   it has synced still refers to the right row.
 * - Co-op shared tasks via coop_id
 * - XP gamification
 * - Optimistic UI updates (reconciled with the queue when the list is re-fetched)
 * - Assigned roles (vet, mechanic, employee)
 */

import { getSupabase } from '../lib/supabase';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useKilimoStore, type SyncQueueItem } from '../store/useKilimoStore';
import { enqueueAction, generateId } from '../lib/offline';

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
  const syncQueue = useKilimoStore((s) => s.syncQueue);

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
        // Replace local state with the server's truth — including an empty list — then lay the
        // still-unsynced local writes on top so a task saved on this phone does not vanish.
        setTasks(
          overlayPendingTasks(
            (data ?? []).map(mapDbToTask),
            useKilimoStore.getState().syncQueue
          )
        );
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

  // Load on mount, and again when connectivity returns (an app opened offline has nothing to show
  // until it is online).
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // When the last queued task write has synced, re-fetch once so local state matches the server.
  const queuedTaskWrites = syncQueue.filter(
    (i) => i.type.startsWith('task_') && i.status !== 'failed'
  ).length;
  const prevQueued = useRef(queuedTaskWrites);
  useEffect(() => {
    if (prevQueued.current > 0 && queuedTaskWrites === 0) fetchTasks();
    prevQueued.current = queuedTaskWrites;
  }, [queuedTaskWrites, fetchTasks]);

  // ── Complete a task (offline-aware) ───────────────────────────────────────
  const completeTask = useCallback(async (id: string) => {
    const now = new Date().toISOString();

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'done', completedAt: now } : t))
    );

    enqueueAction({
      type: 'task_complete',
      table: 'tasks',
      op: 'update',
      payload: { match: { id }, values: { status: 'done', completed_at: now } },
    });
  }, []);

  // ── Create task (offline-aware) ───────────────────────────────────────────
  const createTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt' | 'syncedOffline'>) => {
      const newTask: Task = {
        ...task,
        // A real uuid, generated here: it is the local id AND the server row id.
        id: generateId(),
        syncedOffline: isOffline,
        createdAt: new Date().toISOString(),
      };

      // Optimistic add
      setTasks((prev) => [newTask, ...prev]);

      enqueueAction({
        type: 'task_create',
        table: 'tasks',
        op: 'insert',
        payload: taskToRow(newTask),
      });
    },
    [isOffline]
  );

  // ── Delete / cancel task ──────────────────────────────────────────────────
  const cancelTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)));
    enqueueAction({
      type: 'task_cancel',
      table: 'tasks',
      op: 'update',
      payload: { match: { id }, values: { status: 'cancelled' } },
    });
  }, []);

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

/** Server-shaped row for a new task. `id` doubles as the idempotency key. */
export function taskToRow(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    title_sw: task.titleSw,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    due_date: task.dueDate,
    xp_reward: task.xpReward,
    farm_block: task.farmBlock,
    coop_id: task.coopId,
    synced_offline: task.syncedOffline,
    assigned_role: task.assignedRole,
  };
}

/**
 * Lay writes that are still in the outbox on top of a server list, so an unsynced create/complete/
 * cancel stays visible after a refresh. Pure; exported for tests.
 */
export function overlayPendingTasks(server: Task[], queue: readonly SyncQueueItem[]): Task[] {
  let list = [...server];
  for (const item of queue) {
    const p = item.payload as any;
    if (item.type === 'task_create' && p && typeof p.id === 'string') {
      if (!list.some((t) => t.id === p.id)) {
        list = [
          mapDbToTask({ ...p, created_at: item.createdAt, synced_offline: true }),
          ...list,
        ];
      }
    } else if (item.type === 'task_complete' && p?.match?.id) {
      list = list.map((t) =>
        t.id === p.match.id
          ? { ...t, status: 'done', completedAt: p.values?.completed_at ?? t.completedAt }
          : t
      );
    } else if (item.type === 'task_cancel' && p?.match?.id) {
      list = list.map((t) => (t.id === p.match.id ? { ...t, status: 'cancelled' } : t));
    }
  }
  return list;
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
