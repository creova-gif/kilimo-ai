/**
 * lib/rag.ts — the rag-chat client: 503 / 401 / network / empty / success /
 * malformed handling, and lib/ai.ts's invoke-error classification.
 */
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { classifyInvokeError } from '../lib/ai';
import { askKnowledgeBase, getKnowledgeStatus, normalizeRagResponse, RAG_FN } from '../lib/rag';

function httpError(status: number) {
  return {
    name: 'FunctionsHttpError',
    message: `Edge Function returned ${status}`,
    context: { status },
  };
}
function client(result: { data?: any; error?: any } | (() => never)) {
  const invoke = jest.fn(async () =>
    typeof result === 'function' ? result() : { data: null, error: null, ...result }
  );
  return { functions: { invoke } };
}

const SOURCE = {
  id: 'kb1',
  title: 'Maize — fall armyworm',
  category: 'crop_disease',
  excerpt: 'Scout maize weekly…',
  content: 'Scout maize weekly from emergence.',
};

describe('classifyInvokeError', () => {
  it('maps HTTP statuses and fetch failures', () => {
    expect(classifyInvokeError(httpError(503))).toBe('not_configured');
    expect(classifyInvokeError(httpError(401))).toBe('unauthorized');
    expect(classifyInvokeError(httpError(400))).toBe('validation');
    expect(classifyInvokeError(httpError(500))).toBe('server');
    expect(classifyInvokeError({ name: 'FunctionsFetchError', message: 'x' })).toBe('network');
    expect(classifyInvokeError(new TypeError('Network request failed'))).toBe('network');
  });
});

describe('askKnowledgeBase', () => {
  it('sends the question and language to rag-chat', async () => {
    const c = client({ data: { mode: 'no_match', sources: [], retrieval: 'none' } });
    await askKnowledgeBase('  armyworm?  ', 'sw', c);
    expect(c.functions.invoke).toHaveBeenCalledWith(RAG_FN, {
      body: { query: 'armyworm?', lang: 'sw' },
    });
  });

  it('503 (function has no provider key / not deployed) → unavailable, never a fake answer', async () => {
    const r = await askKnowledgeBase('armyworm', 'en', client({ error: httpError(503) }));
    expect(r).toEqual({ ok: false, error: 'unavailable' });
  });

  it('401 → unauthorized; fetch failure → network; 500 → server', async () => {
    expect(await askKnowledgeBase('q', 'en', client({ error: httpError(401) }))).toEqual({
      ok: false,
      error: 'unauthorized',
    });
    expect(
      await askKnowledgeBase(
        'q',
        'en',
        client({ error: { name: 'FunctionsFetchError', message: 'offline' } })
      )
    ).toEqual({ ok: false, error: 'network' });
    expect(await askKnowledgeBase('q', 'en', client({ error: httpError(500) }))).toEqual({
      ok: false,
      error: 'server',
    });
  });

  it('a thrown invoke is caught, not propagated', async () => {
    const r = await askKnowledgeBase(
      'q',
      'en',
      client(() => {
        throw new TypeError('Failed to fetch');
      })
    );
    expect(r).toEqual({ ok: false, error: 'network' });
  });

  it('no backend → not_configured; empty / oversized question → invalid (no request)', async () => {
    expect(await askKnowledgeBase('q', 'en', null)).toEqual({ ok: false, error: 'not_configured' });
    const c = client({ data: {} });
    expect(await askKnowledgeBase('   ', 'en', c)).toEqual({ ok: false, error: 'invalid' });
    expect(await askKnowledgeBase('x'.repeat(2001), 'en', c)).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(c.functions.invoke).not.toHaveBeenCalled();
  });

  it('empty result → honest no_match with no sources', async () => {
    const r = await askKnowledgeBase(
      'bitcoin',
      'en',
      client({
        data: {
          mode: 'no_match',
          answer: null,
          sources: [],
          retrieval: 'none',
          llmConfigured: false,
        },
      })
    );
    expect(r).toEqual({
      ok: true,
      data: {
        mode: 'no_match',
        answer: null,
        sources: [],
        retrieval: 'none',
        llmConfigured: false,
        llmError: false,
      },
    });
  });

  it('no-key success → the knowledge-base passages themselves, no generated text', async () => {
    const r = await askKnowledgeBase(
      'armyworm',
      'en',
      client({
        data: {
          mode: 'knowledge_base',
          answer: 'should be ignored',
          sources: [SOURCE],
          retrieval: 'fulltext',
          llmConfigured: false,
        },
      })
    );
    expect(r.ok).toBe(true);
    const data = (r as any).data;
    expect(data.mode).toBe('knowledge_base');
    expect(data.answer).toBeNull();
    expect(data.retrieval).toBe('fulltext');
    expect(data.sources).toEqual([SOURCE]);
  });

  it('generated success keeps the answer and its sources', async () => {
    const r = await askKnowledgeBase(
      'armyworm',
      'en',
      client({
        data: {
          mode: 'generated',
          answer: 'Scout weekly [1].',
          sources: [SOURCE],
          retrieval: 'vector',
          llmConfigured: true,
        },
      })
    );
    expect((r as any).data).toMatchObject({
      mode: 'generated',
      answer: 'Scout weekly [1].',
      retrieval: 'vector',
    });
    expect((r as any).data.sources).toHaveLength(1);
  });

  it('rejects untrustworthy shapes as server errors', async () => {
    // "generated" without sources, passages mode without passages, legacy { response } body
    for (const data of [
      { mode: 'generated', answer: 'x', sources: [] },
      { mode: 'knowledge_base', sources: [] },
      { response: 'legacy free text' },
      null,
    ]) {
      expect(await askKnowledgeBase('q', 'en', client({ data }))).toEqual({
        ok: false,
        error: 'server',
      });
    }
  });
});

describe('normalizeRagResponse', () => {
  it('drops sources without a title and fills excerpt/content from each other', () => {
    const n = normalizeRagResponse({
      mode: 'knowledge_base',
      sources: [{ title: '' }, { title: 'T', category: 'irrigation', content: 'Body' }],
      retrieval: 'weird',
    });
    expect(n!.sources).toEqual([
      { id: null, title: 'T', category: 'irrigation', excerpt: 'Body', content: 'Body' },
    ]);
    expect(n!.retrieval).toBe('none');
  });

  it('flags a provider failure', () => {
    expect(
      normalizeRagResponse({ mode: 'knowledge_base', sources: [SOURCE], llmError: true })!.llmError
    ).toBe(true);
  });
});

describe('getKnowledgeStatus', () => {
  it('returns counts and articles', async () => {
    const c = client({
      data: {
        llmConfigured: false,
        documents: 8,
        embedded: 0,
        fullTextReady: true,
        articles: [
          { id: 'a', title: 'Irrigation — dry spells', category: 'irrigation' },
          { title: '' },
        ],
      },
    });
    const r = await getKnowledgeStatus(c);
    expect(c.functions.invoke).toHaveBeenCalledWith(RAG_FN, { body: { mode: 'status' } });
    expect(r).toEqual({
      ok: true,
      data: {
        llmConfigured: false,
        documents: 8,
        embedded: 0,
        fullTextReady: true,
        articles: [{ id: 'a', title: 'Irrigation — dry spells', category: 'irrigation' }],
      },
    });
  });

  it('maps errors and bad bodies', async () => {
    expect(await getKnowledgeStatus(null)).toEqual({ ok: false, error: 'not_configured' });
    expect(await getKnowledgeStatus(client({ error: httpError(401) }))).toEqual({
      ok: false,
      error: 'unauthorized',
    });
    expect(await getKnowledgeStatus(client({ data: { nope: true } }))).toEqual({
      ok: false,
      error: 'server',
    });
  });
});
