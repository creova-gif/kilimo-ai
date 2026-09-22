/**
 * Kilimo AI — offline sync queue: pure core (no React, no store, no network library).
 *
 * The persisted queue in `useKilimoStore.syncQueue` is an OUTBOX of writes made on this phone.
 * There is exactly ONE drainer of that queue (`drainQueue` in lib/offline.ts, which runs the
 * `drainOnce` algorithm below). This file holds everything that does not need the store or the
 * network stack, so it is unit-tested in isolation:
 *
 *  - the item shape, and a registry of supported action types (`registerSyncType`);
 *  - client-generated ids: every item carries an `idempotencyKey` that becomes the server row id on
 *    inserts (`upsert … ignoreDuplicates`), so a retry after a lost response never duplicates a row;
 *  - one definition of "online" (`isOnlineState`);
 *  - error classification (transient vs permanent) and exponential backoff;
 *  - the drain pass: strict FIFO, head-of-line blocking on transient failures, permanent failures
 *    kept visible as `failed` (never silently discarded), success removes the item;
 *  - migration of items persisted by earlier builds (`migrateSyncQueue`).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncOp = 'insert' | 'update' | 'delete';
export type SyncQueueStatus = 'pending' | 'failed';

export interface SyncQueueItem {
  /** Queue-item id (local). */
  id: string;
  /** Action type, e.g. `task_create`. Must be registered (see `registerSyncType`) to be processed. */
  type: string;
  /** Target table. Defaults from the registered type. */
  table?: string;
  /** Operation. Defaults from the registered type. */
  op?: SyncOp;
  /**
   * insert: the row to write (server column names).
   * update: `{ match: { column: value }, values: { column: value } }`.
   * delete: `{ match: { column: value } }`.
   */
  payload: Record<string, unknown>;
  createdAt: string;
  /** Failed attempts so far. */
  retries: number;
  status: SyncQueueStatus;
  /** UUID generated on the device. Used as the row id on inserts so retries cannot duplicate. */
  idempotencyKey: string;
  /** Epoch ms before which this item must not be retried (exponential backoff). */
  nextAttemptAt?: number;
  /** Machine code or message of the last failure. */
  lastError?: string;
  failedAt?: string;
}

export interface NewSyncAction {
  type: string;
  table?: string;
  op?: SyncOp;
  payload: Record<string, unknown>;
}

export interface SyncTypeConfig {
  table: string;
  /** Operations this type may perform. The first is the default. */
  ops: SyncOp[];
  /** Primary-key column used for insert idempotency. Default `id`. */
  idColumn?: string;
  /**
   * Column set to the signed-in user's id on inserts (for tables whose RLS pins a row to its owner
   * but which have no `default auth.uid()`; e.g. `market_listings.seller_id`).
   */
  ownerColumn?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** After this many failed attempts an item is marked `failed` and kept until retried or discarded. */
export const MAX_ATTEMPTS = 6;
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 60_000;
/** A synced item older than this counts as "was waiting" (worth a notification). */
export const DELAYED_SYNC_MS = 10_000;

// ─── Ids ──────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** RFC-4122 v4 UUID. Uses expo-crypto / Web Crypto when available, Math.random otherwise. */
export function generateId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const c = require('expo-crypto');
    if (typeof c?.randomUUID === 'function') {
      const id = c.randomUUID();
      if (isUuid(id)) return id;
    }
  } catch {
    /* fall through */
  }
  try {
    const id = (globalThis as any).crypto?.randomUUID?.();
    if (isUuid(id)) return id;
  } catch {
    /* fall through */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Connectivity ─────────────────────────────────────────────────────────────

/**
 * THE definition of "online" for the whole app. `isInternetReachable` is `null` while NetInfo has
 * not probed yet; that is treated as online (the write is attempted, and a failure is retried with
 * backoff) rather than as offline, which would strand the queue on devices that never report it.
 */
export function isOnlineState(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

// ─── Type registry ────────────────────────────────────────────────────────────

const registry = new Map<string, SyncTypeConfig>();

/**
 * Declare an action type the drainer is allowed to execute. Future features (farms, finance, …)
 * register their own types; an item whose type is not registered is kept as `failed` with
 * `lastError: 'unsupported_type'` and surfaced — it is never faked as synced.
 */
export function registerSyncType(type: string, config: SyncTypeConfig): void {
  registry.set(type, config);
}
export function getSyncTypeConfig(type: string): SyncTypeConfig | undefined {
  return registry.get(type);
}

registerSyncType('task_create', { table: 'tasks', ops: ['insert'] });
registerSyncType('task_complete', { table: 'tasks', ops: ['update'] });
registerSyncType('task_cancel', { table: 'tasks', ops: ['update'] });
// Escrow / smart-contract flags are never sent; the server rejects them (see market_listings RLS).
registerSyncType('market_listing_create', {
  table: 'market_listings',
  ops: ['insert'],
  ownerColumn: 'seller_id',
});

// ─── Items ────────────────────────────────────────────────────────────────────

export function createSyncQueueItem(action: NewSyncAction, now: Date = new Date()): SyncQueueItem {
  const cfg = getSyncTypeConfig(action.type);
  const key = generateId();
  return {
    id: key,
    idempotencyKey: key,
    type: action.type,
    table: action.table ?? cfg?.table,
    op: action.op ?? cfg?.ops[0],
    payload: action.payload ?? {},
    createdAt: now.toISOString(),
    retries: 0,
    status: 'pending',
  };
}

export function summarizeQueue(items: readonly SyncQueueItem[]) {
  let pending = 0;
  let failed = 0;
  for (const i of items) {
    if (i.status === 'failed') failed++;
    else pending++;
  }
  return { pending, failed, total: items.length };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SyncError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly permanent: boolean
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export interface ClassifiedError {
  permanent: boolean;
  code: string;
  message: string;
}

/**
 * Permanent = retrying the identical request cannot succeed (bad data, RLS denial, missing table or
 * column). Everything else — no network, timeouts, 5xx, 429, expired JWT — is transient.
 */
export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof SyncError) {
    return { permanent: err.permanent, code: err.code, message: err.message };
  }
  const e = (err ?? {}) as { code?: unknown; message?: unknown; status?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : 0;
  const message =
    typeof e.message === 'string' && e.message ? e.message : code || 'sync_failed';

  // Postgres: 22 data exception, 23 integrity violation, 42 syntax / access rule (incl. 42501 RLS).
  if (/^(22|23|42)/.test(code)) return { permanent: true, code: code || 'db_error', message };
  // PostgREST request/schema errors (PGRST1xx, PGRST2xx). PGRST3xx = JWT problems: transient.
  if (/^PGRST[12]/.test(code)) return { permanent: true, code, message };
  if ([400, 403, 404, 405, 406, 409, 413, 415, 422].includes(status)) {
    return { permanent: true, code: code || `http_${status}`, message };
  }
  return { permanent: false, code: code || (status ? `http_${status}` : 'network'), message };
}

/** Delay before the next attempt, after `attempts` failures (1-based): 2s, 4s, 8s … capped at 60s. */
export function backoffDelayMs(attempts: number): number {
  const n = Math.max(1, Math.floor(attempts));
  return Math.min(BACKOFF_BASE_MS * 2 ** (n - 1), BACKOFF_MAX_MS);
}

// ─── Execution ────────────────────────────────────────────────────────────────

export interface SyncClient {
  from(table: string): any;
}

export interface ExecContext {
  client: SyncClient;
  userId: string;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

function readMatch(payload: Record<string, unknown>): Record<string, string | number> {
  const match = payload.match;
  if (!isPlainObject(match) || Object.keys(match).length === 0) {
    throw new SyncError('invalid_payload', 'payload.match is required', true);
  }
  for (const v of Object.values(match)) {
    if (typeof v !== 'string' && typeof v !== 'number') {
      throw new SyncError('invalid_payload', 'payload.match values must be string or number', true);
    }
  }
  return match as Record<string, string | number>;
}

/**
 * Perform one queued write. Idempotent: inserts are `upsert … ignoreDuplicates` keyed by the
 * client-generated id (a unique violation on retry is success); updates/deletes re-apply harmlessly.
 * Throws on failure.
 */
export async function executeItem(
  item: SyncQueueItem,
  cfg: SyncTypeConfig,
  ctx: ExecContext
): Promise<void> {
  const table = cfg.table;
  const op = item.op ?? cfg.ops[0];

  if (op === 'insert') {
    const idColumn = cfg.idColumn ?? 'id';
    const row: Record<string, unknown> = { ...item.payload };
    if (row[idColumn] == null) row[idColumn] = item.idempotencyKey;
    if (cfg.ownerColumn) row[cfg.ownerColumn] = ctx.userId;
    const { error } = await ctx.client
      .from(table)
      .upsert(row, { onConflict: idColumn, ignoreDuplicates: true });
    // 23505 = the row is already there (an earlier attempt landed): the goal is met.
    if (error && (error as any).code !== '23505') throw error;
    return;
  }

  const match = readMatch(item.payload);
  const idColumn = cfg.idColumn ?? 'id';

  if (op === 'update') {
    const values = item.payload.values;
    if (!isPlainObject(values) || Object.keys(values).length === 0) {
      throw new SyncError('invalid_payload', 'payload.values is required', true);
    }
    let q = ctx.client.from(table).update(values);
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { data, error } = await q.select(idColumn);
    if (error) throw error;
    if (!data || data.length === 0) {
      // Nothing matched: the row does not exist for this user (deleted, or its create failed).
      throw new SyncError('no_rows', 'No matching row to update', true);
    }
    return;
  }

  if (op === 'delete') {
    let q = ctx.client.from(table).delete();
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { error } = await q;
    if (error) throw error;
    return;
  }

  throw new SyncError('unsupported_op', `Unsupported operation: ${String(op)}`, true);
}

/** Why an item cannot be executed at all (kept as failed, never faked), or null when it can. */
export function unsupportedReason(item: SyncQueueItem): string | null {
  const cfg = getSyncTypeConfig(item.type);
  if (!cfg) return 'unsupported_type';
  if (item.table && item.table !== cfg.table) return 'unsupported_table';
  if (item.op && !cfg.ops.includes(item.op)) return 'unsupported_op';
  return null;
}

// ─── Drain pass ───────────────────────────────────────────────────────────────

export interface DrainDeps {
  now: () => number;
  isOnline: () => boolean;
  getClient: () => SyncClient | null;
  /** Current signed-in user id from the local session, or null. Must not throw for "no session". */
  getUserId: (client: SyncClient) => Promise<string | null>;
  getQueue: () => readonly SyncQueueItem[];
  patchItem: (id: string, patch: Partial<SyncQueueItem>) => void;
  removeItem: (id: string) => void;
  /** Best-effort audit hook; a failure here must never affect the queue. */
  audit?: (item: SyncQueueItem, outcome: 'synced' | 'failed', detail: string | null) => void;
  /** Ignore `nextAttemptAt` (a user pressed "sync now"). */
  ignoreBackoff?: boolean;
}

export type DrainSkip = 'offline' | 'no_backend' | 'no_session' | 'empty';

export interface DrainResult {
  synced: number;
  /** Items newly marked failed in this pass. */
  failed: number;
  /** Synced items that had been waiting (retried, or older than DELAYED_SYNC_MS). */
  syncedDelayed: number;
  /** Earliest epoch ms at which a retry is due, or null. */
  retryAt: number | null;
  skipped: DrainSkip | null;
}

/**
 * One ordered pass over the queue.
 *  - FIFO. `failed` items are skipped (they wait for an explicit retry) so one poisoned item cannot
 *    block everything behind it.
 *  - A TRANSIENT failure (or an item still in backoff) stops the pass: later items may depend on
 *    this one (e.g. a task_complete after its task_create), so order is never violated.
 *  - A PERMANENT failure, an unsupported type, or exhausting MAX_ATTEMPTS marks the item `failed`
 *    and keeps it. Nothing is dropped except by success or an explicit user discard.
 */
export async function drainOnce(deps: DrainDeps): Promise<DrainResult> {
  const result: DrainResult = {
    synced: 0,
    failed: 0,
    syncedDelayed: 0,
    retryAt: null,
    skipped: null,
  };

  if (!deps.getQueue().some((i) => i.status !== 'failed')) return { ...result, skipped: 'empty' };
  if (!deps.isOnline()) return { ...result, skipped: 'offline' };
  const client = deps.getClient();
  if (!client) return { ...result, skipped: 'no_backend' };

  let userId: string | null;
  try {
    userId = await deps.getUserId(client);
  } catch {
    userId = null;
  }
  // No session: RLS would reject every write permanently. Leave everything pending instead.
  if (!userId) return { ...result, skipped: 'no_session' };

  const order = deps.getQueue().map((i) => i.id);
  for (const id of order) {
    const item = deps.getQueue().find((i) => i.id === id);
    if (!item || item.status === 'failed') continue; // removed mid-pass, or awaiting explicit retry

    const now = deps.now();
    if (!deps.ignoreBackoff && item.nextAttemptAt && item.nextAttemptAt > now) {
      result.retryAt = Math.min(result.retryAt ?? Infinity, item.nextAttemptAt);
      break;
    }

    const markFailed = (code: string, retries: number) => {
      deps.patchItem(item.id, {
        status: 'failed',
        retries,
        lastError: code,
        failedAt: new Date(now).toISOString(),
        nextAttemptAt: undefined,
      });
      result.failed++;
      safeAudit(deps, { ...item, retries }, 'failed', code);
    };

    const unsupported = unsupportedReason(item);
    if (unsupported) {
      markFailed(unsupported, item.retries);
      continue;
    }

    try {
      await executeItem(item, getSyncTypeConfig(item.type)!, { client, userId });
      deps.removeItem(item.id);
      result.synced++;
      if (item.retries > 0 || now - new Date(item.createdAt).getTime() > DELAYED_SYNC_MS) {
        result.syncedDelayed++;
      }
      safeAudit(deps, item, 'synced', null);
    } catch (err) {
      const c = classifyError(err);
      const attempts = item.retries + 1;
      if (c.permanent || attempts >= MAX_ATTEMPTS) {
        markFailed(c.permanent ? c.code : `${c.code}: ${c.message}`.slice(0, 200), attempts);
        continue; // a failed item does not block the ones behind it
      }
      const next = now + backoffDelayMs(attempts);
      deps.patchItem(item.id, {
        retries: attempts,
        nextAttemptAt: next,
        lastError: c.message.slice(0, 200),
      });
      result.retryAt = Math.min(result.retryAt ?? Infinity, next);
      break; // preserve order: do not run later items ahead of this one
    }
  }
  return result;
}

function safeAudit(
  deps: DrainDeps,
  item: SyncQueueItem,
  outcome: 'synced' | 'failed',
  detail: string | null
) {
  try {
    deps.audit?.(item, outcome, detail);
  } catch {
    /* audit is best-effort */
  }
}

// ─── Migration of items persisted by earlier builds ───────────────────────────

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

function legacyTaskRow(p: Record<string, unknown>): Record<string, unknown> {
  return {
    title: p.title,
    title_sw: p.titleSw,
    category: p.category,
    priority: p.priority,
    status: p.status,
    due_date: p.dueDate,
    xp_reward: p.xpReward,
    farm_block: p.farmBlock,
    coop_id: p.coopId,
    synced_offline: true,
    assigned_role: p.assignedRole,
  };
}

/**
 * Normalise a persisted queue to the current shape. Idempotent. Earlier builds stored
 * `{ id, type, payload, createdAt, retries }` with three problems this repairs without losing data:
 *  - `task_complete` was used for BOTH creating and completing a task (told apart by payload shape)
 *    -> split into `task_create` / `task_complete`;
 *  - `market_order` held a camelCase listing -> `market_listing_create` with a server-shaped row;
 *  - `scan_result` / `irrigation_log` / `voice_note` were never executable -> kept as `failed`
 *    with `lastError: 'unsupported_type'` so they stay visible rather than vanish.
 */
export function migrateSyncQueue(raw: unknown): SyncQueueItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SyncQueueItem[] = [];
  for (const r of raw) {
    if (!isPlainObject(r) || typeof r.type !== 'string') continue;
    const createdAt = str(r.createdAt) ?? new Date().toISOString();
    const retries = typeof r.retries === 'number' && r.retries >= 0 ? r.retries : 0;
    const id = str(r.id) ?? generateId();
    const payload = isPlainObject(r.payload) ? r.payload : {};

    // Already current.
    if (isUuid(r.idempotencyKey) && (r.status === 'pending' || r.status === 'failed')) {
      out.push({ ...(r as unknown as SyncQueueItem), id, payload, createdAt, retries });
      continue;
    }

    const base = {
      id,
      idempotencyKey: generateId(),
      createdAt,
      retries,
      status: 'pending' as SyncQueueStatus,
    };

    if (r.type === 'market_order') {
      out.push({
        ...base,
        type: 'market_listing_create',
        table: 'market_listings',
        op: 'insert',
        payload: {
          crop_name: payload.cropName,
          crop_name_sw: payload.cropNameSw ?? null,
          quantity_kg: payload.quantityKg,
          price_per_kg: payload.pricePerKg,
          currency: payload.currency ?? 'TZS',
          location: payload.location ?? null,
          quality_grade: payload.qualityGrade ?? null,
          status: 'active',
          notes: payload.notes ?? null,
        },
      });
    } else if (r.type === 'task_complete' && typeof payload.taskId === 'string') {
      out.push({
        ...base,
        type: 'task_complete',
        table: 'tasks',
        op: 'update',
        payload: {
          match: { id: payload.taskId },
          values: { status: 'done', completed_at: payload.completedAt },
        },
      });
    } else if (r.type === 'task_complete') {
      out.push({
        ...base,
        type: 'task_create',
        table: 'tasks',
        op: 'insert',
        payload: legacyTaskRow(payload),
      });
    } else {
      out.push({
        ...base,
        type: r.type,
        table: str(r.table),
        op: (str(r.op) as SyncOp | undefined) ?? undefined,
        payload,
        status: 'failed',
        lastError: getSyncTypeConfig(r.type) ? 'invalid_payload' : 'unsupported_type',
        failedAt: new Date().toISOString(),
      });
    }
  }
  return out;
}
