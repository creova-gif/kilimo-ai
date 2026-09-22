import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createGroup,
  createPost,
  deletePost,
  fetchGroupDirectory,
  fetchPosts,
  joinGroup,
  leaveGroup,
  type GroupInput,
  type PeerGroup,
  type PeerPost,
} from '../lib/community';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type CommunityLoadError = 'not_configured' | 'error' | null;

/** Result of a write. Writes are online-only for now: offline returns `offline`, nothing is queued. */
export interface WriteResult {
  ok: boolean;
  reason?: 'offline' | 'not_configured' | 'not_signed_in' | 'invalid' | 'error';
}

const OFFLINE: WriteResult = { ok: false, reason: 'offline' };
const NOT_SIGNED_IN: WriteResult = { ok: false, reason: 'not_signed_in' };

/**
 * The signed-in user's id from the persisted session. Unlike `useMyUserId` it also reports whether
 * the lookup has finished, so a screen can tell "still loading" from "not signed in" and never
 * shows a false "no groups yet" to someone who is simply signed out.
 */
export function useSessionUserId() {
  const [state, setState] = useState<{ userId: string | null; resolved: boolean }>({
    userId: null,
    resolved: false,
  });
  useEffect(() => {
    let alive = true;
    const client = getSupabase();
    if (!client) {
      setState({ userId: null, resolved: true });
      return;
    }
    Promise.resolve(client.auth.getSession())
      .then(({ data }: any) => {
        if (alive) setState({ userId: data?.session?.user?.id ?? null, resolved: true });
      })
      .catch(() => {
        if (alive) setState({ userId: null, resolved: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/**
 * Real peer groups from `peer_group_directory` (no seed fallback — empty means empty).
 * `search` is debounced and applied server-side. While offline the last results stay on screen and
 * every write reports `offline` instead of pretending to succeed.
 */
export function usePeerGroups(userId: string | null, search = '', debounceMs = 250) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [groups, setGroups] = useState<PeerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<CommunityLoadError>(null);
  /** Group currently being joined/left (disables just that row's button). */
  const [busyId, setBusyId] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchGroupDirectory(getSupabase(), search);
    if (mine !== seq.current) return; // a newer request superseded this one
    if (r.ok) {
      setGroups(r.groups);
      setError(null);
      setLoaded(true);
    } else {
      setError(r.reason === 'not_configured' ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [search, isOffline]);

  useEffect(() => {
    const id = setTimeout(load, search ? debounceMs : 0);
    return () => clearTimeout(id);
  }, [load, search, debounceMs]);

  const join = useCallback(
    async (groupId: string): Promise<WriteResult> => {
      if (isOffline) return OFFLINE;
      if (!userId) return NOT_SIGNED_IN;
      setBusyId(groupId);
      const r = await joinGroup(getSupabase(), groupId, userId);
      if (r.ok) await load(); // show the server's truth (member count, membership), not a guess
      setBusyId(null);
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    },
    [isOffline, userId, load]
  );

  const leave = useCallback(
    async (groupId: string): Promise<WriteResult> => {
      if (isOffline) return OFFLINE;
      if (!userId) return NOT_SIGNED_IN;
      setBusyId(groupId);
      const r = await leaveGroup(getSupabase(), groupId, userId);
      if (r.ok) await load();
      setBusyId(null);
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    },
    [isOffline, userId, load]
  );

  const create = useCallback(
    async (input: GroupInput): Promise<WriteResult & { group?: PeerGroup }> => {
      if (isOffline) return OFFLINE;
      if (!userId) return NOT_SIGNED_IN;
      const r = await createGroup(getSupabase(), input);
      if (!r.ok) return { ok: false, reason: r.reason };
      await load();
      return { ok: true, group: r.group };
    },
    [isOffline, userId, load]
  );

  return { groups, loading, loaded, error, isOffline, busyId, refresh: load, join, leave, create };
}

/**
 * Posts of ONE group. Only fetches when `enabled` (i.e. you are a member — RLS would return nothing
 * for a non-member anyway). Newest first.
 */
export function usePeerPosts(groupId: string | null, userId: string | null, enabled: boolean) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [posts, setPosts] = useState<PeerPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<CommunityLoadError>(null);
  const seq = useRef(0);

  // A different group must never briefly show the previous group's posts.
  useEffect(() => {
    setPosts([]);
    setLoaded(false);
    setError(null);
  }, [groupId]);

  const load = useCallback(async () => {
    if (!groupId || !enabled || isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchPosts(getSupabase(), groupId);
    if (mine !== seq.current) return;
    if (r.ok) {
      setPosts(r.posts);
      setError(null);
      setLoaded(true);
    } else {
      setError(r.reason === 'not_configured' ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [groupId, enabled, isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(
    async (body: string): Promise<WriteResult> => {
      if (isOffline) return OFFLINE;
      if (!userId) return NOT_SIGNED_IN;
      if (!groupId) return { ok: false, reason: 'error' };
      const r = await createPost(getSupabase(), groupId, userId, body);
      if (!r.ok) return { ok: false, reason: r.reason };
      // Prepend the row the server actually stored (with its real id / timestamp / stamped name).
      setPosts((prev) => [r.post, ...prev.filter((p) => p.id !== r.post.id)]);
      return { ok: true };
    },
    [isOffline, userId, groupId]
  );

  const remove = useCallback(
    async (postId: string): Promise<WriteResult> => {
      if (isOffline) return OFFLINE;
      const r = await deletePost(getSupabase(), postId);
      if (!r.ok) return { ok: false, reason: r.reason };
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return { ok: true };
    },
    [isOffline]
  );

  return { posts, loading, loaded, error, isOffline, refresh: load, send, remove };
}
