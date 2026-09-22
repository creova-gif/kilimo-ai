/**
 * Keyless retrieval (KIL-009): the pure ranking/expansion used by rag-chat, run
 * against the REAL seeded knowledge_base rows (parsed from the seed migration),
 * plus contract checks on the full-text migration SQL.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  EMBEDDING_DIMENSIONS,
  embeddingInput,
  excerpt,
  expandQuery,
  fullTextQuery,
  groundedSystemPrompt,
  rankPassages,
  stem,
  tokenize,
  type KnowledgeRow,
} from '../supabase/functions/rag-chat/retrieval';

const MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');

function seededRows(): KnowledgeRow[] {
  const sql = fs.readFileSync(
    path.join(MIGRATIONS, '20260805000100_seed_knowledge_base.sql'),
    'utf8'
  );
  const re = /\(\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)',\s*null\s*\)/g;
  const rows: KnowledgeRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    rows.push({
      title: m[1].replace(/''/g, "'"),
      content: m[2].replace(/''/g, "'"),
      category: m[3],
    });
  }
  return rows;
}

const ROWS = seededRows();

describe('seed fixture', () => {
  it('parses all 8 genuine seeded knowledge_base rows', () => {
    expect(ROWS).toHaveLength(8);
    expect(ROWS.map((r) => r.title)).toContain('Maize — fall armyworm');
  });
});

describe('tokenize / stem / expandQuery', () => {
  it('drops stop words, short words and duplicates', () => {
    expect(tokenize('How do I stop the armyworm on my maize maize?')).toEqual([
      'stop',
      'armyworm',
      'maize',
    ]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('stems plurals and -ing forms', () => {
    expect(stem('leaves')).toBe('leaf');
    expect(stem('fertilisers')).toBe('fertiliser');
    expect(stem('planting')).toBe('plant');
  });

  it('adds English equivalents for Swahili farming words', () => {
    const q = expandQuery('viwavi jeshi kwenye mahindi');
    expect(q).toEqual(expect.arrayContaining(['viwavi', 'jeshi', 'mahindi', 'armyworm', 'maize']));
    expect(q).not.toContain('kwenye');
    expect(fullTextQuery('mbolea ya mahindi')).toBe('mbolea mahindi fertiliser fertilizer maize');
  });
});

describe('rankPassages (in-process fallback ranking)', () => {
  const top = (q: string) => rankPassages(q, ROWS).map((r) => r.title);

  it('ranks the armyworm article first for an armyworm question', () => {
    expect(top('How do I control fall armyworm in maize?')[0]).toBe('Maize — fall armyworm');
  });

  it('answers a Swahili question from the English knowledge base', () => {
    expect(top('Ninawezaje kudhibiti viwavi jeshi kwenye mahindi?')[0]).toBe(
      'Maize — fall armyworm'
    );
    expect(top('kuhifadhi nafaka')[0]).toBe('Post-harvest — grain storage');
  });

  it('prefers title matches over content-only matches', () => {
    const r = rankPassages('fertiliser for maize', ROWS);
    expect(r[0].title).toBe('Fertiliser — maize basics');
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it('returns nothing (not a random row) for an unrelated question', () => {
    expect(rankPassages('bitcoin wallet password', ROWS)).toEqual([]);
    expect(rankPassages('the and how what', ROWS)).toEqual([]);
    expect(rankPassages('armyworm', [])).toEqual([]);
  });

  it('respects the limit and sorts by descending score', () => {
    const r = rankPassages('maize leaves rust armyworm fertiliser', ROWS, 2);
    expect(r).toHaveLength(2);
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });
});

describe('prompt + excerpt helpers', () => {
  it('builds a grounded prompt with numbered passages in the requested language', () => {
    const p = groundedSystemPrompt(ROWS.slice(0, 2), 'sw');
    expect(p).toContain('[1] Maize — fall armyworm');
    expect(p).toContain('[2]');
    expect(p).toContain('Swahili');
    expect(p).toMatch(/Never invent prices/);
  });

  it('trims long passages on a word boundary', () => {
    const e = excerpt(ROWS[0].content, 60);
    expect(e.length).toBeLessThanOrEqual(61);
    expect(e.endsWith('…')).toBe(true);
    expect(excerpt('short text')).toBe('short text');
  });

  it('embeds title + category + content at the column dimension', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(768);
    expect(embeddingInput(ROWS[0])).toBe(`${ROWS[0].title}\ncrop disease\n${ROWS[0].content}`);
  });
});

describe('knowledge_search migration contract', () => {
  const sql = fs.readFileSync(path.join(MIGRATIONS, '20260922110000_knowledge_search.sql'), 'utf8');

  it('is additive and idempotent', () => {
    expect(sql).toMatch(/add column if not exists search_tsv tsvector/);
    expect(sql).toMatch(/create index if not exists knowledge_base_search_tsv_idx/);
    expect(sql).toMatch(
      /create or replace function public\.search_knowledge\(query text, lang text/
    );
    expect(sql).not.toMatch(/\b(drop table|delete from|truncate|insert into)\b/i);
  });

  it('runs as security invoker with a pinned search_path', () => {
    expect(sql).toMatch(/security invoker/);
    expect(sql).toMatch(/set search_path = public/);
  });

  it('follows the explicit-grants convention: service_role only', () => {
    expect(sql).toMatch(
      /revoke all on function public\.search_knowledge\(text, text, int\) from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.search_knowledge\(text, text, int\) to service_role;/
    );
  });

  it('ORs query words and ranks with ts_rank_cd', () => {
    expect(sql).toContain("' & ', ' | '");
    expect(sql).toMatch(/ts_rank_cd\(kb\.search_tsv/);
    expect(sql).toMatch(/order by rank desc/);
  });
});
