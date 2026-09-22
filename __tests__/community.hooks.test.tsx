jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// Global holder: jest.mock factories run at first import, before file-level consts exist.
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useConsultations } from '../hooks/useConsultations';
import { usePeerGroups, usePeerPosts, useSessionUserId } from '../hooks/usePeerGroups';
import { useKilimoStore } from '../store/useKilimoStore';

const setBackend = (client: any) => {
  (global as any).__TEST_SUPABASE__ = client;
};

const groupRow = (over: Partial<any> = {}) => ({
  id: 'g1',
  name: 'Maize growers',
  description: null,
  crop: null,
  region: 'Mbeya',
  created_by: 'u9',
  created_at: '2026-09-21T00:00:00Z',
  member_count: 3,
  is_member: false,
  ...over,
});

/** Tiny in-memory fake of the parts of supabase-js these hooks use. */
function backend(opts: {
  directory?: any[];
  posts?: any[];
  consultations?: any[];
  error?: any;
  onInsert?: (table: string, row: any) => { data?: any; error?: any };
}) {
  const state = {
    directory: opts.directory ?? [],
    posts: opts.posts ?? [],
    consultations: opts.consultations ?? [],
  };
  const rpc = jest.fn(async () => ({ data: state.directory, error: opts.error ?? null }));
  const from = jest.fn((table: string) => {
    const chain: any = {
      _table: table,
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      delete: () => chain,
      single: () => chain,
      insert: (row: any) => {
        chain._insert = row;
        return chain;
      },
      then: (res: any, rej: any) => {
        let out: { data?: any; error?: any };
        if (chain._insert !== undefined) {
          out = opts.onInsert?.(table, chain._insert) ?? { data: chain._insert, error: null };
        } else if (table === 'peer_posts') out = { data: state.posts, error: opts.error ?? null };
        else if (table === 'consultation_requests')
          out = { data: state.consultations, error: opts.error ?? null };
        else out = { data: null, error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return chain;
  });
  return {
    client: {
      from,
      rpc,
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    },
    state,
    rpc,
    from,
  };
}

beforeEach(() => {
  setBackend(null);
  useKilimoStore.setState({ isOffline: false, isOnline: true } as any);
});

describe('useSessionUserId', () => {
  it('distinguishes "still loading" from "not signed in"', async () => {
    setBackend({ auth: { getSession: async () => ({ data: { session: null } }) } });
    const { result } = renderHook(() => useSessionUserId());
    expect(result.current).toEqual({ userId: null, resolved: false });
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.userId).toBeNull();
  });

  it('resolves the session user id', async () => {
    setBackend(backend({}).client);
    const { result } = renderHook(() => useSessionUserId());
    await waitFor(() => expect(result.current.userId).toBe('u1'));
  });

  it('is resolved-and-null when no backend is configured', async () => {
    const { result } = renderHook(() => useSessionUserId());
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.userId).toBeNull();
  });
});

describe('usePeerGroups', () => {
  it('starts empty (no seeded groups) and stays empty for an empty server list', async () => {
    const b = backend({ directory: [] });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    expect(result.current.groups).toEqual([]);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('is empty and NOT loaded when no backend is configured', async () => {
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.error).toBe('not_configured'));
    expect(result.current.groups).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  it('maps real rows', async () => {
    setBackend(
      backend({ directory: [groupRow(), groupRow({ id: 'g2', is_member: true })] }).client
    );
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    expect(result.current.groups[1]).toMatchObject({ id: 'g2', isMember: true, memberCount: 3 });
  });

  it('exposes a backend failure instead of an empty list', async () => {
    setBackend(backend({ error: { message: 'permission denied' } }).client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.error).toBe('error'));
    expect(result.current.loaded).toBe(false);
    expect(result.current.groups).toEqual([]);
  });

  it('passes the debounced search to the server', async () => {
    const b = backend({ directory: [] });
    setBackend(b.client);
    const { rerender } = renderHook(({ q }: { q: string }) => usePeerGroups('u1', q, 0), {
      initialProps: { q: '' },
    });
    await waitFor(() =>
      expect(b.rpc).toHaveBeenCalledWith('peer_group_directory', { p_search: null })
    );
    rerender({ q: 'maize' });
    await waitFor(() =>
      expect(b.rpc).toHaveBeenCalledWith('peer_group_directory', { p_search: 'maize' })
    );
  });

  it('join stores the membership then re-reads the server truth', async () => {
    const b = backend({ directory: [groupRow()] });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    b.state.directory = [groupRow({ is_member: true, member_count: 4 })];
    let r: any;
    await act(async () => {
      r = await result.current.join('g1');
    });
    expect(r).toEqual({ ok: true });
    expect(b.from).toHaveBeenCalledWith('peer_group_members');
    expect(result.current.groups[0]).toMatchObject({ isMember: true, memberCount: 4 });
    expect(result.current.busyId).toBeNull();
  });

  it('a failed join does not flip membership', async () => {
    const b = backend({
      directory: [groupRow()],
      onInsert: () => ({ error: { code: '42501', message: 'rls' } }),
    });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.join('g1');
    });
    expect(r).toEqual({ ok: false, reason: 'error' });
    expect(result.current.groups[0].isMember).toBe(false);
  });

  it('writes are online-only: offline reports "offline" and touches nothing', async () => {
    const b = backend({ directory: [groupRow()] });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      useKilimoStore.setState({ isOffline: true, isOnline: false } as any);
    });
    b.from.mockClear();
    let joined: any, left: any, created: any;
    await act(async () => {
      joined = await result.current.join('g1');
      left = await result.current.leave('g1');
      created = await result.current.create({ name: 'A new group' });
    });
    expect(joined).toEqual({ ok: false, reason: 'offline' });
    expect(left).toEqual({ ok: false, reason: 'offline' });
    expect(created).toEqual({ ok: false, reason: 'offline' });
    expect(b.from).not.toHaveBeenCalled();
  });

  it('refuses writes when not signed in', async () => {
    setBackend(backend({}).client);
    const { result } = renderHook(() => usePeerGroups(null));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.join('g1');
    });
    expect(r).toEqual({ ok: false, reason: 'not_signed_in' });
  });

  it('create returns the new group and reloads', async () => {
    const b = backend({
      directory: [],
      onInsert: (_t, row) => ({
        data: { id: 'gNew', created_at: 't', created_by: 'u1', ...row },
        error: null,
      }),
    });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerGroups('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.create({ name: 'Brand new group' });
    });
    expect(r.ok).toBe(true);
    expect(r.group).toMatchObject({
      id: 'gNew',
      name: 'Brand new group',
      isMember: true,
      memberCount: 1,
    });
  });
});

describe('usePeerPosts', () => {
  const postRow = (over: Partial<any> = {}) => ({
    id: 'p1',
    group_id: 'g1',
    author_id: 'u2',
    author_name: 'Asha',
    body: 'Habari',
    created_at: '2026-09-21T00:00:00Z',
    ...over,
  });

  it('does not fetch for a non-member (enabled=false)', async () => {
    const b = backend({ posts: [postRow()] });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', false));
    await new Promise((r) => setTimeout(r, 20));
    expect(b.from).not.toHaveBeenCalled();
    expect(result.current.posts).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  it('loads a member’s feed and keeps an empty feed empty', async () => {
    setBackend(backend({ posts: [] }).client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', true));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.posts).toEqual([]);
  });

  it('send prepends the server-stored row (real name, real id), not a local guess', async () => {
    const b = backend({
      posts: [postRow()],
      onInsert: (_t, row) => ({
        data: { id: 'p2', author_name: 'Me Myself', created_at: '2026-09-21T01:00:00Z', ...row },
        error: null,
      }),
    });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', true));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    let r: any;
    await act(async () => {
      r = await result.current.send('  Hello group  ');
    });
    expect(r).toEqual({ ok: true });
    expect(result.current.posts.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(result.current.posts[0]).toMatchObject({
      body: 'Hello group',
      authorName: 'Me Myself',
      authorId: 'u1',
    });
  });

  it('a rejected send adds nothing to the feed', async () => {
    const b = backend({ posts: [], onInsert: () => ({ error: { message: 'rls' } }) });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', true));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.send('Hello');
    });
    expect(r.ok).toBe(false);
    expect(result.current.posts).toEqual([]);
  });

  it('send/remove are online-only', async () => {
    const b = backend({ posts: [postRow({ author_id: 'u1' })] });
    setBackend(b.client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', true));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    await act(async () => {
      useKilimoStore.setState({ isOffline: true, isOnline: false } as any);
    });
    b.from.mockClear();
    let s: any, d: any;
    await act(async () => {
      s = await result.current.send('x');
      d = await result.current.remove('p1');
    });
    expect(s).toEqual({ ok: false, reason: 'offline' });
    expect(d).toEqual({ ok: false, reason: 'offline' });
    expect(b.from).not.toHaveBeenCalled();
    expect(result.current.posts).toHaveLength(1); // nothing was pretend-deleted
  });

  it('remove drops the post once the server confirms', async () => {
    setBackend(backend({ posts: [postRow({ author_id: 'u1' })] }).client);
    const { result } = renderHook(() => usePeerPosts('g1', 'u1', true));
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    await act(async () => {
      await result.current.remove('p1');
    });
    expect(result.current.posts).toEqual([]);
  });
});

describe('useConsultations', () => {
  const cRow = (over: Partial<any> = {}) => ({
    id: 'c1',
    topic: 'Yellow leaves',
    crop: null,
    description: 'Maize',
    preferred_language: 'sw',
    status: 'submitted',
    created_at: '2026-09-21T00:00:00Z',
    answered_at: null,
    answer: null,
    ...over,
  });

  it('starts empty: there are no seeded sessions', async () => {
    setBackend(backend({ consultations: [] }).client);
    const { result } = renderHook(() => useConsultations('u1'));
    expect(result.current.requests).toEqual([]);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.requests).toEqual([]);
  });

  it('shows the status the server holds, unchanged', async () => {
    setBackend(
      backend({
        consultations: [
          cRow({ status: 'answered', answer: 'Apply X', answered_at: '2026-09-22T00:00:00Z' }),
          cRow({ id: 'c2' }),
        ],
      }).client
    );
    const { result } = renderHook(() => useConsultations('u1'));
    await waitFor(() => expect(result.current.requests).toHaveLength(2));
    expect(result.current.requests.map((r) => r.status)).toEqual(['answered', 'submitted']);
    expect(result.current.requests[0].answer).toBe('Apply X');
  });

  it('submit stores the request and lists the row the server returned (status "submitted")', async () => {
    const b = backend({
      consultations: [],
      onInsert: (_t, row) => ({
        data: {
          id: 'cNew',
          status: 'submitted',
          created_at: '2026-09-21T02:00:00Z',
          answer: null,
          answered_at: null,
          ...row,
        },
        error: null,
      }),
    });
    setBackend(b.client);
    const { result } = renderHook(() => useConsultations('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.submit({
        topic: 'Blight',
        description: 'Brown spots',
        preferredLanguage: 'en',
      });
    });
    expect(r.ok).toBe(true);
    expect(r.request).toMatchObject({ id: 'cNew', status: 'submitted', answer: null });
    expect(result.current.requests[0].id).toBe('cNew');
  });

  it('a failed submit adds nothing and reports the failure', async () => {
    const b = backend({ consultations: [], onInsert: () => ({ error: { message: 'boom' } }) });
    setBackend(b.client);
    const { result } = renderHook(() => useConsultations('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.submit({
        topic: 'Blight',
        description: 'Brown spots',
        preferredLanguage: 'en',
      });
    });
    expect(r).toEqual({ ok: false, reason: 'error' });
    expect(result.current.requests).toEqual([]);
  });

  it('submitting offline is refused honestly and nothing is queued', async () => {
    const b = backend({ consultations: [] });
    setBackend(b.client);
    const { result } = renderHook(() => useConsultations('u1'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      useKilimoStore.setState({ isOffline: true, isOnline: false } as any);
    });
    b.from.mockClear();
    const queueBefore = useKilimoStore.getState().syncQueue?.length ?? 0;
    let r: any;
    await act(async () => {
      r = await result.current.submit({
        topic: 'Blight',
        description: 'x',
        preferredLanguage: 'sw',
      });
    });
    expect(r).toEqual({ ok: false, reason: 'offline' });
    expect(b.from).not.toHaveBeenCalled();
    expect(useKilimoStore.getState().syncQueue?.length ?? 0).toBe(queueBefore);
  });

  it('refuses when not signed in', async () => {
    setBackend(backend({}).client);
    const { result } = renderHook(() => useConsultations(null));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let r: any;
    await act(async () => {
      r = await result.current.submit({
        topic: 'Blight',
        description: 'x',
        preferredLanguage: 'sw',
      });
    });
    expect(r).toEqual({ ok: false, reason: 'not_signed_in' });
  });

  it('a backend load error is exposed, not shown as "no requests"', async () => {
    setBackend(backend({ error: { message: 'permission denied' } }).client);
    const { result } = renderHook(() => useConsultations('u1'));
    await waitFor(() => expect(result.current.error).toBe('error'));
    expect(result.current.loaded).toBe(false);
  });
});
