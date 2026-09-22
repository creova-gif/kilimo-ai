/**
 * Community data layer — peer groups + expert consultation requests (KIL-004).
 *
 * Backed by `peer_groups`, `peer_group_members`, `peer_posts` and `consultation_requests`
 * (migration 20260921130000_community.sql). Nothing here invents data: an empty table is an empty
 * community, and a consultation request is only ever a stored request — the status the UI shows is
 * whatever the server says (the client cannot set status/answer, RLS forbids it).
 *
 * The Supabase client is injected (never imported) so every function is unit-testable.
 */

/* ── constants ───────────────────────────────────────────────────────────────────────────── */
export const GROUP_NAME_MIN = 3;
export const GROUP_NAME_MAX = 80;
export const GROUP_DESCRIPTION_MAX = 500;
export const POST_MAX = 2000;
export const CONSULT_TOPIC_MAX = 120;
export const CONSULT_DESCRIPTION_MAX = 2000;

export type FailReason = 'not_configured' | 'invalid' | 'error';

/**
 * Result envelope. Deliberately a flat shape (ok + optional reason + optional payload) rather than a
 * discriminated union: this project compiles with `strict: false`, where TypeScript does not narrow
 * unions on `ok`, so a union would make every `r.reason` / `r.post` access a type error.
 * Convention: `ok === true` means the payload is present; `ok === false` means `reason` is set.
 */
export type Res<T = object> = { ok: boolean; reason?: FailReason; message?: string } & Partial<T>;

const errMsg = (e: unknown) => (e as { message?: string } | null)?.message ?? String(e);

/* ── types ───────────────────────────────────────────────────────────────────────────────── */
export interface PeerGroup {
  id: string;
  name: string;
  description: string | null;
  crop: string | null;
  region: string | null;
  createdBy: string | null;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
}

export interface PeerPost {
  id: string;
  groupId: string;
  authorId: string;
  /** Stamped server-side from the author's profile; null when they have not set a name. */
  authorName: string | null;
  body: string;
  createdAt: string;
}

export type ConsultationStatus = 'submitted' | 'in_review' | 'answered' | 'closed';
export type ConsultationLanguage = 'en' | 'sw';

export interface ConsultationRequest {
  id: string;
  topic: string;
  crop: string | null;
  description: string;
  preferredLanguage: ConsultationLanguage;
  status: ConsultationStatus;
  createdAt: string;
  answeredAt: string | null;
  answer: string | null;
}

/* ── row mappers ─────────────────────────────────────────────────────────────────────────── */
export function mapGroupRow(row: any): PeerGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    crop: row.crop ?? null,
    region: row.region ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    // count(*) arrives as a bigint string over PostgREST.
    memberCount: Number(row.member_count ?? 0),
    isMember: Boolean(row.is_member),
  };
}

export function mapPostRow(row: any): PeerPost {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    authorName: row.author_name ?? null,
    body: row.body,
    createdAt: row.created_at,
  };
}

const STATUSES: ConsultationStatus[] = ['submitted', 'in_review', 'answered', 'closed'];

export function mapConsultationRow(row: any): ConsultationRequest {
  return {
    id: row.id,
    topic: row.topic,
    crop: row.crop ?? null,
    description: row.description,
    preferredLanguage: row.preferred_language === 'en' ? 'en' : 'sw',
    // An unknown future status is shown as the earliest honest one rather than crashing the list.
    status: STATUSES.includes(row.status) ? row.status : 'submitted',
    createdAt: row.created_at,
    answeredAt: row.answered_at ?? null,
    answer: row.answer ?? null,
  };
}

/* ── pure helpers ────────────────────────────────────────────────────────────────────────── */
/** Trim and collapse the value to what the database will store. */
export const clean = (s: string | null | undefined) => (s ?? '').trim();

/** Mine first (biggest first inside), then everything else in the order given. */
export function splitGroups(groups: PeerGroup[]): { mine: PeerGroup[]; discover: PeerGroup[] } {
  return {
    mine: groups.filter((g) => g.isMember),
    discover: groups.filter((g) => !g.isMember),
  };
}

/** Who a post is by, for display: you, a named member, or an unnamed member. */
export function authorKind(
  post: Pick<PeerPost, 'authorId' | 'authorName'>,
  myUserId: string | null | undefined
): { kind: 'me' | 'named' | 'member'; name: string | null } {
  if (myUserId && post.authorId === myUserId) return { kind: 'me', name: post.authorName };
  if (post.authorName && post.authorName.trim()) {
    return { kind: 'named', name: post.authorName.trim() };
  }
  return { kind: 'member', name: null };
}

/** First letter for the avatar circle ("?" when there is nothing to show). */
export function initialOf(name: string | null | undefined): string {
  const c = (name ?? '').trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

export const consultationStatusKey = (s: ConsultationStatus) =>
  `community.consult.status.${s}` as const;

/**
 * What a list screen should render. Kept pure so "empty" can never be confused with "offline",
 * "signed out" or "failed to load" (the false-empty bug this rebuild exists to prevent).
 *   - stale rows win: if there is anything to show we show it (the screen adds an offline banner)
 *   - "empty" is only ever reported after a real successful load returned nothing
 */
export type ListPhase =
  | 'unavailable'
  | 'signed_out'
  | 'ready'
  | 'offline'
  | 'error'
  | 'loading'
  | 'empty';

export function listPhase(s: {
  sessionResolved: boolean;
  userId: string | null;
  isOffline: boolean;
  loaded: boolean;
  error: 'not_configured' | 'error' | null;
  count: number;
}): ListPhase {
  if (s.error === 'not_configured') return 'unavailable';
  if (s.sessionResolved && !s.userId) return 'signed_out';
  if (s.count > 0) return 'ready';
  if (!s.loaded && s.isOffline) return 'offline';
  if (s.error) return 'error';
  if (!s.loaded) return 'loading';
  return 'empty';
}

/** Crop labels are stored as "Mahindi (Maize)"; show the one in the reader's language. */
export function cropLabel(stored: string | null | undefined, lang: 'en' | 'sw'): string {
  const v = (stored ?? '').trim();
  if (!v) return '';
  const m = v.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!m) return v;
  return (lang === 'sw' ? m[1] : m[2]).trim();
}

/** "Maize · Mbeya" — the parts that exist, joined; empty string when there are none. */
export function groupMeta(g: Pick<PeerGroup, 'crop' | 'region'>, lang: 'en' | 'sw'): string {
  return [cropLabel(g.crop, lang), (g.region ?? '').trim()].filter(Boolean).join(' · ');
}

/** Only `answered` carries a staff reply worth showing; everything else is still waiting. */
export const hasAnswer = (c: ConsultationRequest) =>
  c.status === 'answered' && Boolean(c.answer && c.answer.trim());

/* ── validation (booleans, so the UI supplies the localized message) ────────────────────── */
export interface GroupInput {
  name: string;
  description?: string;
  crop?: string;
  region?: string;
}
export interface GroupErrors {
  name?: boolean;
  description?: boolean;
}

export function validateGroupInput(i: GroupInput): GroupErrors {
  const errors: GroupErrors = {};
  const name = clean(i.name);
  if (name.length < GROUP_NAME_MIN || name.length > GROUP_NAME_MAX) errors.name = true;
  if (clean(i.description).length > GROUP_DESCRIPTION_MAX) errors.description = true;
  return errors;
}

export interface PostErrors {
  body?: boolean;
}
export function validatePostBody(body: string): PostErrors {
  const n = clean(body).length;
  return n < 1 || n > POST_MAX ? { body: true } : {};
}

export interface ConsultationInput {
  topic: string;
  description: string;
  crop?: string;
  preferredLanguage: ConsultationLanguage;
}
export interface ConsultationErrors {
  topic?: boolean;
  description?: boolean;
}
export function validateConsultationInput(i: ConsultationInput): ConsultationErrors {
  const errors: ConsultationErrors = {};
  const topic = clean(i.topic);
  if (topic.length < 1 || topic.length > CONSULT_TOPIC_MAX) errors.topic = true;
  const d = clean(i.description);
  if (d.length < 1 || d.length > CONSULT_DESCRIPTION_MAX) errors.description = true;
  return errors;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

/* ── peer groups ─────────────────────────────────────────────────────────────────────────── */
export type GroupsResult = Res<{ groups: PeerGroup[] }> & { groups: PeerGroup[] };

/** Discover: all groups with member counts, optionally searched (server-side). */
export async function fetchGroupDirectory(
  client: any | null | undefined,
  search?: string
): Promise<GroupsResult> {
  if (!client) return { ok: false, groups: [], reason: 'not_configured' };
  try {
    const term = clean(search);
    const { data, error } = await client.rpc('peer_group_directory', {
      p_search: term ? term : null,
    });
    if (error) return { ok: false, groups: [], reason: 'error', message: error.message };
    return { ok: true, groups: (data ?? []).map(mapGroupRow) };
  } catch (e) {
    return { ok: false, groups: [], reason: 'error', message: errMsg(e) };
  }
}

export async function createGroup(
  client: any | null | undefined,
  input: GroupInput
): Promise<Res<{ group: PeerGroup }>> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  if (hasErrors(validateGroupInput(input)))
    return { ok: false as const, reason: 'invalid' as const };
  try {
    // created_by defaults to auth.uid(); the RLS check requires it to equal auth.uid(). The creator
    // becomes admin via a database trigger, so the client never writes an 'admin' row itself.
    const { data, error } = await client
      .from('peer_groups')
      .insert({
        name: clean(input.name),
        description: clean(input.description) || null,
        crop: clean(input.crop) || null,
        region: clean(input.region) || null,
      })
      .select('*')
      .single();
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const, group: mapGroupRow({ ...data, member_count: 1, is_member: true }) };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}

/** Unique-violation: you are already a member, which is the state the caller wanted. */
const isDuplicate = (error: any) => error?.code === '23505';

export async function joinGroup(
  client: any | null | undefined,
  groupId: string,
  userId: string
): Promise<Res> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  try {
    const { error } = await client
      .from('peer_group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'member' });
    if (error && !isDuplicate(error)) {
      return { ok: false as const, reason: 'error' as const, message: error.message };
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}

export async function leaveGroup(
  client: any | null | undefined,
  groupId: string,
  userId: string
): Promise<Res> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  try {
    const { error } = await client
      .from('peer_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}

/* ── peer posts ──────────────────────────────────────────────────────────────────────────── */
export const POSTS_PAGE = 50;

export type PostsResult = Res<{ posts: PeerPost[] }> & { posts: PeerPost[] };

/** Newest first. RLS returns nothing unless you are a member of the group. */
export async function fetchPosts(
  client: any | null | undefined,
  groupId: string,
  limit = POSTS_PAGE
): Promise<PostsResult> {
  if (!client) return { ok: false, posts: [], reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('peer_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { ok: false, posts: [], reason: 'error', message: error.message };
    return { ok: true, posts: (data ?? []).map(mapPostRow) };
  } catch (e) {
    return { ok: false, posts: [], reason: 'error', message: errMsg(e) };
  }
}

export async function createPost(
  client: any | null | undefined,
  groupId: string,
  userId: string,
  body: string
): Promise<Res<{ post: PeerPost }>> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  if (hasErrors(validatePostBody(body))) return { ok: false as const, reason: 'invalid' as const };
  try {
    const { data, error } = await client
      .from('peer_posts')
      .insert({ group_id: groupId, author_id: userId, body: clean(body) })
      .select('*')
      .single();
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const, post: mapPostRow(data) };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}

export async function deletePost(client: any | null | undefined, postId: string): Promise<Res> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  try {
    const { error } = await client.from('peer_posts').delete().eq('id', postId);
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}

/* ── consultation requests ───────────────────────────────────────────────────────────────── */
export type ConsultationsResult = Res<{ requests: ConsultationRequest[] }> & {
  requests: ConsultationRequest[];
};

/** The signed-in user's own requests, newest first (RLS is owner-only). */
export async function fetchMyConsultations(
  client: any | null | undefined
): Promise<ConsultationsResult> {
  if (!client) return { ok: false, requests: [], reason: 'not_configured' };
  try {
    const { data, error } = await client
      .from('consultation_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { ok: false, requests: [], reason: 'error', message: error.message };
    return { ok: true, requests: (data ?? []).map(mapConsultationRow) };
  } catch (e) {
    return { ok: false, requests: [], reason: 'error', message: errMsg(e) };
  }
}

/**
 * Store a request. Only `topic/crop/description/preferred_language` are sent — status, answer and
 * answered_at are server-owned (the insert policy rejects anything but a fresh 'submitted' row).
 */
export async function createConsultation(
  client: any | null | undefined,
  userId: string,
  input: ConsultationInput
): Promise<Res<{ request: ConsultationRequest }>> {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  if (hasErrors(validateConsultationInput(input))) {
    return { ok: false as const, reason: 'invalid' as const };
  }
  try {
    const { data, error } = await client
      .from('consultation_requests')
      .insert({
        user_id: userId,
        topic: clean(input.topic),
        crop: clean(input.crop) || null,
        description: clean(input.description),
        preferred_language: input.preferredLanguage,
      })
      .select('*')
      .single();
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const, request: mapConsultationRow(data) };
  } catch (e) {
    return { ok: false as const, reason: 'error' as const, message: errMsg(e) };
  }
}
