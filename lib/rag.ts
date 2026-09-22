/**
 * KILIMO AI — grounded answers from the Kilimo knowledge base (rag-chat).
 *
 * Every text question goes to ONE edge function, `rag-chat`, which retrieves
 * the most relevant public.knowledge_base passages (vector search when
 * embeddings exist, Postgres full-text search otherwise) and — only when a
 * provider key is configured on the server — writes a short answer grounded in
 * those passages. Without a key the passages themselves are the answer; when
 * nothing matches, the result says so. Nothing here ever invents an answer.
 */
import { getSupabase } from './supabase';
import { classifyInvokeError } from './ai';

export const RAG_FN = 'rag-chat';

export type RagMode = 'generated' | 'knowledge_base' | 'no_match';
export type RagRetrieval = 'vector' | 'fulltext' | 'keyword' | 'none';
export type RagErrorKind =
  | 'not_configured' // no Supabase backend in this build
  | 'unauthorized' // no signed-in user
  | 'unavailable' // function answered 503 / is not deployed
  | 'network'
  | 'invalid' // empty / too long question, or malformed response
  | 'server';

export interface RagSource {
  id: string | null;
  title: string;
  category: string;
  excerpt: string;
  content: string;
}

export interface RagAnswer {
  mode: RagMode;
  /** Generated text — only in `generated` mode. */
  answer: string | null;
  sources: RagSource[];
  retrieval: RagRetrieval;
  llmConfigured: boolean;
  /** The provider was configured but failed; passages are shown instead. */
  llmError: boolean;
}

export type RagResult = { ok: true; data: RagAnswer } | { ok: false; error: RagErrorKind };

export interface KnowledgeStatus {
  llmConfigured: boolean;
  documents: number;
  embedded: number;
  fullTextReady: boolean;
  articles: { id: string | null; title: string; category: string }[];
}

export type StatusResult = { ok: true; data: KnowledgeStatus } | { ok: false; error: RagErrorKind };

export const MAX_QUESTION_LENGTH = 2000;

type Invoker = { functions: { invoke: (name: string, opts: any) => Promise<any> } } | null;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Validate + normalise a rag-chat response body. Returns null if it is not a RAG answer. */
export function normalizeRagResponse(raw: any): RagAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const mode = raw.mode;
  if (mode !== 'generated' && mode !== 'knowledge_base' && mode !== 'no_match') return null;
  const sources: RagSource[] = (Array.isArray(raw.sources) ? raw.sources : [])
    .filter((s: any) => s && str(s.title))
    .map((s: any) => ({
      id: str(s.id) || null,
      title: str(s.title),
      category: str(s.category),
      excerpt: str(s.excerpt) || str(s.content),
      content: str(s.content) || str(s.excerpt),
    }));
  const answer = str(raw.answer).trim() || null;
  const retrieval: RagRetrieval = ['vector', 'fulltext', 'keyword'].includes(raw.retrieval)
    ? raw.retrieval
    : 'none';
  // A "generated" answer without text, or passages mode without passages, is not trustworthy.
  if (mode === 'generated' && (!answer || !sources.length)) return null;
  if (mode === 'knowledge_base' && !sources.length) return null;
  return {
    mode,
    answer: mode === 'generated' ? answer : null,
    sources: mode === 'no_match' ? [] : sources,
    retrieval: mode === 'no_match' ? 'none' : retrieval,
    llmConfigured: raw.llmConfigured === true,
    llmError: raw.llmError === true,
  };
}

function toRagError(error: any): RagErrorKind {
  const kind = classifyInvokeError(error);
  if (kind === 'not_configured') return 'unavailable';
  if (kind === 'validation') return 'invalid';
  if (kind === 'unauthorized' || kind === 'network') return kind;
  const status = Number(error?.context?.status ?? 0);
  if (status === 404 || status === 502 || status === 504) return 'unavailable';
  return 'server';
}

/** Ask the Kilimo knowledge base a question. Never throws. */
export async function askKnowledgeBase(
  question: string,
  lang: 'en' | 'sw',
  client: Invoker = getSupabase() as Invoker
): Promise<RagResult> {
  const query = String(question ?? '').trim();
  if (!query || query.length > MAX_QUESTION_LENGTH) return { ok: false, error: 'invalid' };
  if (!client) return { ok: false, error: 'not_configured' };
  try {
    const { data, error } = await client.functions.invoke(RAG_FN, { body: { query, lang } });
    if (error) return { ok: false, error: toRagError(error) };
    const parsed = normalizeRagResponse(data);
    if (!parsed) return { ok: false, error: 'server' };
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: toRagError(e) };
  }
}

/** Knowledge-base status for the admin screen. Never throws. */
export async function getKnowledgeStatus(
  client: Invoker = getSupabase() as Invoker
): Promise<StatusResult> {
  if (!client) return { ok: false, error: 'not_configured' };
  try {
    const { data, error } = await client.functions.invoke(RAG_FN, { body: { mode: 'status' } });
    if (error) return { ok: false, error: toRagError(error) };
    if (!data || typeof data.documents !== 'number') return { ok: false, error: 'server' };
    return {
      ok: true,
      data: {
        llmConfigured: data.llmConfigured === true,
        documents: data.documents,
        embedded: typeof data.embedded === 'number' ? data.embedded : 0,
        fullTextReady: data.fullTextReady === true,
        articles: (Array.isArray(data.articles) ? data.articles : [])
          .filter((a: any) => a && str(a.title))
          .map((a: any) => ({
            id: str(a.id) || null,
            title: str(a.title),
            category: str(a.category),
          })),
      },
    };
  } catch (e) {
    return { ok: false, error: toRagError(e) };
  }
}

/** Known knowledge_base categories → i18n key suffix (ai.category.*). */
export const KNOWN_CATEGORIES = [
  'crop_disease',
  'fertiliser',
  'irrigation',
  'post_harvest',
  'weather_pattern',
  'market_info',
] as const;
export type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

export function isKnownCategory(c: string): c is KnownCategory {
  return (KNOWN_CATEGORIES as readonly string[]).includes(c);
}
