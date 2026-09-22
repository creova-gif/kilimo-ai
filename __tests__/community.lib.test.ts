import * as fs from 'fs';
import * as path from 'path';
import {
  authorKind,
  consultationStatusKey,
  createConsultation,
  createGroup,
  createPost,
  cropLabel,
  deletePost,
  fetchGroupDirectory,
  fetchMyConsultations,
  fetchPosts,
  groupMeta,
  hasAnswer,
  initialOf,
  joinGroup,
  leaveGroup,
  listPhase,
  mapConsultationRow,
  mapGroupRow,
  mapPostRow,
  splitGroups,
  validateConsultationInput,
  validateGroupInput,
  validatePostBody,
  type PeerGroup,
} from '../lib/community';

/** Chainable, thenable fake of the PostgREST builder that records every call. */
function fakeClient(result: { data?: any; error?: any } = { data: [], error: null }) {
  const calls: [string, any[]][] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
        return (...args: any[]) => {
          calls.push([prop, args]);
          return builder;
        };
      },
    }
  );
  const client = {
    from: jest.fn((t: string) => (calls.push(['from', [t]]), builder)),
    rpc: jest.fn((fn: string, args: any) => (calls.push(['rpc', [fn, args]]), builder)),
  };
  return { client, calls };
}

const groupRow = {
  id: 'g1',
  name: 'Maize growers',
  description: 'Talk maize',
  crop: 'Mahindi (Maize)',
  region: 'Mbeya',
  created_by: 'u1',
  created_at: '2026-09-21T00:00:00Z',
  member_count: '12',
  is_member: true,
};

describe('row mappers', () => {
  it('maps a directory row (member_count arrives as a bigint string)', () => {
    expect(mapGroupRow(groupRow)).toEqual({
      id: 'g1',
      name: 'Maize growers',
      description: 'Talk maize',
      crop: 'Mahindi (Maize)',
      region: 'Mbeya',
      createdBy: 'u1',
      createdAt: '2026-09-21T00:00:00Z',
      memberCount: 12,
      isMember: true,
    });
  });

  it('defaults missing optional columns to null / 0 / false', () => {
    const g = mapGroupRow({ id: 'g', name: 'X', created_at: 't' });
    expect(g).toMatchObject({
      description: null,
      crop: null,
      region: null,
      memberCount: 0,
      isMember: false,
    });
  });

  it('maps a post row', () => {
    expect(
      mapPostRow({
        id: 'p',
        group_id: 'g',
        author_id: 'u',
        author_name: null,
        body: 'hi',
        created_at: 't',
      })
    ).toEqual({
      id: 'p',
      groupId: 'g',
      authorId: 'u',
      authorName: null,
      body: 'hi',
      createdAt: 't',
    });
  });

  it('maps a consultation row and never invents an answer', () => {
    const c = mapConsultationRow({
      id: 'c',
      topic: 'Yellow leaves',
      description: 'd',
      preferred_language: 'en',
      status: 'submitted',
      created_at: 't',
    });
    expect(c).toMatchObject({
      status: 'submitted',
      preferredLanguage: 'en',
      answer: null,
      answeredAt: null,
      crop: null,
    });
  });

  it('falls back to the earliest honest status for an unknown value', () => {
    expect(
      mapConsultationRow({
        id: 'c',
        topic: 't',
        description: 'd',
        status: 'weird',
        created_at: 't',
      }).status
    ).toBe('submitted');
  });
});

describe('validation', () => {
  it('group: name 3..80 after trimming, description <= 500', () => {
    expect(validateGroupInput({ name: '  ab  ' })).toEqual({ name: true });
    expect(validateGroupInput({ name: 'abc' })).toEqual({});
    expect(validateGroupInput({ name: 'x'.repeat(81) })).toEqual({ name: true });
    expect(validateGroupInput({ name: 'x'.repeat(80) })).toEqual({});
    expect(validateGroupInput({ name: 'okay', description: 'd'.repeat(501) })).toEqual({
      description: true,
    });
  });

  it('post: 1..2000 after trimming', () => {
    expect(validatePostBody('   ')).toEqual({ body: true });
    expect(validatePostBody('hello')).toEqual({});
    expect(validatePostBody('a'.repeat(2000))).toEqual({});
    expect(validatePostBody('a'.repeat(2001))).toEqual({ body: true });
  });

  it('consultation: topic 1..120, description 1..2000', () => {
    const ok = {
      topic: 'Blight',
      description: 'Spots on leaves',
      preferredLanguage: 'sw' as const,
    };
    expect(validateConsultationInput(ok)).toEqual({});
    expect(validateConsultationInput({ ...ok, topic: ' ' })).toEqual({ topic: true });
    expect(validateConsultationInput({ ...ok, topic: 't'.repeat(121) })).toEqual({ topic: true });
    expect(validateConsultationInput({ ...ok, description: '' })).toEqual({ description: true });
    expect(validateConsultationInput({ ...ok, description: 'd'.repeat(2001) })).toEqual({
      description: true,
    });
  });
});

describe('fetchGroupDirectory', () => {
  it('is not_configured without a client (never an invented list)', async () => {
    expect(await fetchGroupDirectory(null)).toEqual({
      ok: false,
      groups: [],
      reason: 'not_configured',
    });
  });

  it('calls the aggregate-only RPC, passing null for an empty search', async () => {
    const { client } = fakeClient({ data: [], error: null });
    const r = await fetchGroupDirectory(client, '   ');
    expect(r).toEqual({ ok: true, groups: [] }); // empty table = empty community
    expect(client.rpc).toHaveBeenCalledWith('peer_group_directory', { p_search: null });
  });

  it('passes a trimmed search term and maps rows', async () => {
    const { client } = fakeClient({ data: [groupRow], error: null });
    const r = await fetchGroupDirectory(client, '  maize ');
    expect(client.rpc).toHaveBeenCalledWith('peer_group_directory', { p_search: 'maize' });
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].memberCount).toBe(12);
  });

  it('surfaces a backend error instead of pretending the list is empty', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } });
    expect(await fetchGroupDirectory(client)).toEqual({
      ok: false,
      groups: [],
      reason: 'error',
      message: 'permission denied',
    });
  });

  it('a thrown network error is an error, not an empty list', async () => {
    const client = { rpc: () => Promise.reject(new Error('Network request failed')) };
    const r = await fetchGroupDirectory(client);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('error');
  });
});

describe('createGroup', () => {
  it('rejects an invalid name without calling the backend', async () => {
    const { client } = fakeClient();
    expect(await createGroup(client, { name: 'ab' })).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserts trimmed fields and does NOT send created_by (the DB stamps it)', async () => {
    const { client, calls } = fakeClient({
      data: { ...groupRow, member_count: undefined, is_member: undefined },
      error: null,
    });
    const r = await createGroup(client, {
      name: '  Maize growers ',
      description: ' ',
      crop: 'Mahindi (Maize)',
      region: '',
    });
    expect(r.ok).toBe(true);
    const insert = calls.find(([n]) => n === 'insert')![1][0];
    expect(insert).toEqual({
      name: 'Maize growers',
      description: null,
      crop: 'Mahindi (Maize)',
      region: null,
    });
    expect(insert).not.toHaveProperty('created_by');
    // The creator is made admin by a DB trigger, so the new group is reported with 1 member, joined.
    expect(r.group).toMatchObject({ memberCount: 1, isMember: true });
  });

  it('reports a database failure', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    expect(await createGroup(client, { name: 'Valid name' })).toEqual({
      ok: false,
      reason: 'error',
      message: 'boom',
    });
  });
});

describe('joinGroup / leaveGroup', () => {
  it('joins as a plain member of the given group, as the given user', async () => {
    const { client, calls } = fakeClient({ error: null });
    expect((await joinGroup(client, 'g1', 'u1')).ok).toBe(true);
    expect(calls).toContainEqual(['from', ['peer_group_members']]);
    expect(calls).toContainEqual(['insert', [{ group_id: 'g1', user_id: 'u1', role: 'member' }]]);
  });

  it('treats an existing membership (unique violation) as already joined', async () => {
    const { client } = fakeClient({ error: { code: '23505', message: 'duplicate key' } });
    expect((await joinGroup(client, 'g1', 'u1')).ok).toBe(true);
  });

  it('reports any other join failure', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'rls' } });
    expect(await joinGroup(client, 'g1', 'u1')).toEqual({
      ok: false,
      reason: 'error',
      message: 'rls',
    });
  });

  it('leaves only the caller’s own membership of that group', async () => {
    const { client, calls } = fakeClient({ error: null });
    expect((await leaveGroup(client, 'g1', 'u1')).ok).toBe(true);
    expect(calls).toContainEqual(['delete', []]);
    expect(calls).toContainEqual(['eq', ['group_id', 'g1']]);
    expect(calls).toContainEqual(['eq', ['user_id', 'u1']]);
  });

  it('is not_configured without a client', async () => {
    expect(await joinGroup(null, 'g', 'u')).toEqual({ ok: false, reason: 'not_configured' });
    expect(await leaveGroup(undefined, 'g', 'u')).toEqual({ ok: false, reason: 'not_configured' });
  });
});

describe('posts', () => {
  it('fetches newest-first for one group, limited', async () => {
    const { client, calls } = fakeClient({
      data: [
        {
          id: 'p',
          group_id: 'g1',
          author_id: 'u',
          author_name: 'Asha',
          body: 'hi',
          created_at: 't',
        },
      ],
      error: null,
    });
    const r = await fetchPosts(client, 'g1');
    expect(r.posts).toHaveLength(1);
    expect(calls).toContainEqual(['from', ['peer_posts']]);
    expect(calls).toContainEqual(['eq', ['group_id', 'g1']]);
    expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(calls).toContainEqual(['limit', [50]]);
  });

  it('an empty group is an empty list, not an error', async () => {
    const { client } = fakeClient({ data: [], error: null });
    expect(await fetchPosts(client, 'g1')).toEqual({ ok: true, posts: [] });
  });

  it('createPost rejects an empty / whitespace body locally', async () => {
    const { client } = fakeClient();
    expect(await createPost(client, 'g1', 'u1', '   ')).toEqual({ ok: false, reason: 'invalid' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('createPost sends the trimmed body as the author and returns the stored row', async () => {
    const stored = {
      id: 'p1',
      group_id: 'g1',
      author_id: 'u1',
      author_name: 'Asha',
      body: 'hello',
      created_at: 't',
    };
    const { client, calls } = fakeClient({ data: stored, error: null });
    const r = await createPost(client, 'g1', 'u1', '  hello  ');
    expect(calls).toContainEqual(['insert', [{ group_id: 'g1', author_id: 'u1', body: 'hello' }]]);
    // author_name is never sent — the database stamps it from the author's own profile.
    const insert = calls.find(([n]) => n === 'insert')![1][0];
    expect(insert).not.toHaveProperty('author_name');
    expect(r.post).toMatchObject({ id: 'p1', authorName: 'Asha', body: 'hello' });
  });

  it('createPost reports a rejected write (e.g. not a member)', async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: 'new row violates row-level security policy' },
    });
    const r = await createPost(client, 'g1', 'u1', 'x');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('error');
  });

  it('deletePost deletes by id', async () => {
    const { client, calls } = fakeClient({ error: null });
    expect((await deletePost(client, 'p1')).ok).toBe(true);
    expect(calls).toContainEqual(['eq', ['id', 'p1']]);
  });
});

describe('consultation requests', () => {
  const input = {
    topic: ' Yellow leaves ',
    description: ' On the maize ',
    crop: 'Mahindi (Maize)',
    preferredLanguage: 'sw' as const,
  };

  it('never sends status / answer / answered_at (the server owns them)', async () => {
    const stored = {
      id: 'c1',
      topic: 'Yellow leaves',
      description: 'On the maize',
      crop: 'Mahindi (Maize)',
      preferred_language: 'sw',
      status: 'submitted',
      created_at: 't',
      answer: null,
      answered_at: null,
    };
    const { client, calls } = fakeClient({ data: stored, error: null });
    const r = await createConsultation(client, 'u1', input);
    const payload = calls.find(([n]) => n === 'insert')![1][0];
    expect(payload).toEqual({
      user_id: 'u1',
      topic: 'Yellow leaves',
      crop: 'Mahindi (Maize)',
      description: 'On the maize',
      preferred_language: 'sw',
    });
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('answer');
    expect(payload).not.toHaveProperty('answered_at');
    expect(r.request).toMatchObject({ status: 'submitted', answer: null });
  });

  it('rejects invalid input without touching the backend', async () => {
    const { client } = fakeClient();
    expect(await createConsultation(client, 'u1', { ...input, topic: '' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('a failed save is reported as a failure (never a fake success)', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'nope' } });
    expect(await createConsultation(client, 'u1', input)).toEqual({
      ok: false,
      reason: 'error',
      message: 'nope',
    });
  });

  it('lists the caller’s own requests newest-first; empty means empty', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    expect(await fetchMyConsultations(client)).toEqual({ ok: true, requests: [] });
    expect(calls).toContainEqual(['from', ['consultation_requests']]);
    expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]]);
  });

  it('is not_configured without a client', async () => {
    expect(await fetchMyConsultations(null)).toEqual({
      ok: false,
      requests: [],
      reason: 'not_configured',
    });
  });

  it('only an answered request with real text counts as answered', () => {
    const base = mapConsultationRow({ id: 'c', topic: 't', description: 'd', created_at: 't' });
    expect(hasAnswer({ ...base, status: 'submitted', answer: 'sneaky' })).toBe(false);
    expect(hasAnswer({ ...base, status: 'answered', answer: '  ' })).toBe(false);
    expect(hasAnswer({ ...base, status: 'answered', answer: null })).toBe(false);
    expect(hasAnswer({ ...base, status: 'answered', answer: 'Spray X' })).toBe(true);
  });

  it('status keys exist for every status', () => {
    expect(consultationStatusKey('in_review')).toBe('community.consult.status.in_review');
  });
});

describe('listPhase — empty is never confused with offline / signed-out / failed', () => {
  const base = {
    sessionResolved: true,
    userId: 'u1',
    isOffline: false,
    loaded: false,
    error: null as any,
    count: 0,
  };
  it('table', () => {
    expect(listPhase({ ...base, error: 'not_configured' })).toBe('unavailable');
    expect(listPhase({ ...base, userId: null })).toBe('signed_out');
    expect(listPhase({ ...base, sessionResolved: false, userId: null })).toBe('loading');
    expect(listPhase({ ...base, count: 2 })).toBe('ready');
    expect(listPhase({ ...base, count: 2, isOffline: true, error: 'error' })).toBe('ready'); // stale rows win
    expect(listPhase({ ...base, isOffline: true })).toBe('offline');
    expect(listPhase({ ...base, error: 'error' })).toBe('error');
    expect(listPhase({ ...base, loaded: true, error: 'error' })).toBe('error'); // refresh failed on an empty list
    expect(listPhase(base)).toBe('loading');
    expect(listPhase({ ...base, loaded: true })).toBe('empty');
  });
});

describe('presentation helpers', () => {
  it('cropLabel shows the reader’s language and passes plain values through', () => {
    expect(cropLabel('Mahindi (Maize)', 'sw')).toBe('Mahindi');
    expect(cropLabel('Mahindi (Maize)', 'en')).toBe('Maize');
    expect(cropLabel('Rice', 'sw')).toBe('Rice');
    expect(cropLabel(null, 'en')).toBe('');
  });

  it('groupMeta joins only the parts that exist', () => {
    expect(groupMeta({ crop: 'Mahindi (Maize)', region: 'Mbeya' }, 'en')).toBe('Maize · Mbeya');
    expect(groupMeta({ crop: null, region: 'Mbeya' }, 'en')).toBe('Mbeya');
    expect(groupMeta({ crop: null, region: null }, 'en')).toBe('');
  });

  it('authorKind: you, a named member, or an unnamed member', () => {
    expect(authorKind({ authorId: 'u1', authorName: 'Asha' }, 'u1')).toEqual({
      kind: 'me',
      name: 'Asha',
    });
    expect(authorKind({ authorId: 'u2', authorName: ' John ' }, 'u1')).toEqual({
      kind: 'named',
      name: 'John',
    });
    expect(authorKind({ authorId: 'u2', authorName: null }, 'u1')).toEqual({
      kind: 'member',
      name: null,
    });
    expect(authorKind({ authorId: 'u2', authorName: '  ' }, null)).toEqual({
      kind: 'member',
      name: null,
    });
  });

  it('initialOf', () => {
    expect(initialOf('asha')).toBe('A');
    expect(initialOf('  ')).toBe('?');
    expect(initialOf(null)).toBe('?');
  });

  it('splitGroups separates mine from discoverable', () => {
    const g = (id: string, isMember: boolean): PeerGroup => ({
      ...mapGroupRow({ ...groupRow, id }),
      isMember,
    });
    const { mine, discover } = splitGroups([g('a', true), g('b', false), g('c', true)]);
    expect(mine.map((x) => x.id)).toEqual(['a', 'c']);
    expect(discover.map((x) => x.id)).toEqual(['b']);
  });
});

/**
 * Static guard on the migration: the privacy/authorization properties the feature depends on. A
 * regression here (e.g. someone adds `using (true)` to posts, or grants UPDATE on consultations)
 * fails CI without needing a database.
 */
describe('migration 20260921130000_community.sql', () => {
  const sql = fs
    .readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '20260921130000_community.sql'),
      'utf8'
    )
    .replace(/--.*$/gm, ''); // strip comments so words in prose do not trip the checks

  it('is additive and idempotent: no destructive statements, every create is guarded', () => {
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\balter\s+table\b[^;]*\bdrop\b/i);
    expect((sql.match(/create table/gi) ?? []).length).toBe(
      (sql.match(/create table if not exists/gi) ?? []).length
    );
    for (const m of sql.matchAll(/create policy "([^"]+)"/gi)) {
      expect(sql).toMatch(new RegExp(`drop policy if exists "${m[1]}"`, 'i'));
    }
    for (const m of sql.matchAll(/create trigger (\w+)/gi)) {
      expect(sql).toMatch(new RegExp(`drop trigger if exists ${m[1]}\\b`, 'i'));
    }
  });

  it('seeds nothing', () => {
    expect(sql).not.toMatch(
      /insert\s+into\s+public\.(peer_groups|peer_posts|consultation_requests)/i
    );
  });

  it('enables RLS on all four tables', () => {
    for (const t of ['peer_groups', 'peer_group_members', 'peer_posts', 'consultation_requests']) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${t}\\s+enable row level security`, 'i')
      );
    }
  });

  it('members and posts are readable only through the membership helper (no blanket read)', () => {
    const policy = (name: string) =>
      sql.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`, 'i'))![0];
    expect(policy('peer members: read fellow members')).toMatch(/is_peer_group_member\(group_id\)/);
    expect(policy('peer posts: members read')).toMatch(/is_peer_group_member\(group_id\)/);
    expect(policy('peer members: read fellow members')).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(policy('peer posts: members read')).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });

  it('joining/posting are pinned to the caller; members can only self-join as plain members', () => {
    const policy = (name: string) =>
      sql.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`, 'i'))![0];
    expect(policy('peer members: join as self')).toMatch(/user_id = auth\.uid\(\)/);
    expect(policy('peer members: join as self')).toMatch(/role = 'member'/);
    expect(policy('peer posts: members post as self')).toMatch(/author_id = auth\.uid\(\)/);
    expect(policy('peer posts: members post as self')).toMatch(/is_peer_group_member\(group_id\)/);
    expect(policy('peer posts: author deletes own')).toMatch(/author_id = auth\.uid\(\)/);
  });

  it('consultation requests: owner-only, insert can only be a fresh unanswered row, no client update', () => {
    const policy = (name: string) =>
      sql.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`, 'i'))![0];
    expect(policy('consultations: read own')).toMatch(/user_id = auth\.uid\(\)/);
    const submit = policy('consultations: submit own');
    expect(submit).toMatch(/status = 'submitted'/);
    expect(submit).toMatch(/answer is null/);
    expect(submit).toMatch(/answered_at is null/);
    expect(sql).not.toMatch(
      /create policy "[^"]*"\s+on public\.consultation_requests\s+for (update|delete)/i
    );
    expect(sql).toMatch(
      /grant select, insert\s+on public\.consultation_requests\s+to authenticated/i
    );
    expect(sql).not.toMatch(
      /grant[^;]*\b(update|delete)\b[^;]*on public\.consultation_requests\s+to authenticated/i
    );
  });

  it('security definer helpers pin an empty search_path', () => {
    const defs = sql.match(/create or replace function[\s\S]*?\$\$;/gi) ?? [];
    expect(defs.length).toBeGreaterThanOrEqual(4);
    for (const d of defs) {
      if (/security definer/i.test(d)) expect(d).toMatch(/set search_path = ''/i);
    }
  });

  it('anon is granted nothing', () => {
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\banon\b/i);
  });
});
