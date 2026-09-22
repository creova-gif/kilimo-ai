// KILIMO AI — RAG chat edge function (answers grounded in public.knowledge_base).
//
// Auth: verify_jwt = true (config.toml) AND the caller must be a real signed-in
// user (see _shared/auth.ts — the public anon key also passes verify_jwt).
//
// Works WITHOUT any provider key:
//   retrieval  1. vector   — match_knowledge(), only when OPENAI_API_KEY is set
//                            and rows have embeddings (scripts/embed-knowledge.ts)
//              2. fulltext — search_knowledge() (Postgres FTS, migration
//                            20260922110000_knowledge_search.sql)
//              3. keyword  — in-process ranking, only if the RPC is missing
//   answer     - key set + passages found → grounded LLM answer + sources ("generated")
//              - no key (or LLM failed)   → the passages themselves ("knowledge_base")
//              - nothing relevant found   → "no_match" (no answer is invented)
//
// Request:  { query: string, lang?: 'en' | 'sw' }            → RagResponse
//           { mode: 'status' }                                → knowledge-base status
// Response: { mode, answer, sources[{id,title,category,excerpt,content}], retrieval, llmConfigured }
// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getCallerId } from '../_shared/auth.ts'
import {
  DEFAULT_MATCH_COUNT,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  MAX_QUERY_LENGTH,
  VECTOR_MATCH_THRESHOLD,
  excerpt,
  fullTextQuery,
  groundedSystemPrompt,
  rankPassages,
} from './retrieval.ts'

const OPENAI_BASE = 'https://api.openai.com/v1'
const CHAT_MODEL = 'gpt-4o-mini'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function openai(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const userId = await getCallerId(req)
    if (!userId) return json({ error: 'not_authenticated' }, 401)

    const apiKey = Deno.env.get('OPENAI_API_KEY') || ''
    const llmConfigured = apiKey.length > 0

    // knowledge_base is RLS default-deny for clients → service role.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const body = await req.json().catch(() => ({}))

    // ── Status (used by the AI admin screen). Counts + titles only. ──────────
    if (body?.mode === 'status') {
      const { data: rows, error } = await supabase
        .from('knowledge_base')
        .select('id, title, category, updated_at')
        .order('category')
        .order('title')
      if (error) return json({ error: 'status_failed', detail: error.message }, 502)
      const { count: embedded } = await supabase
        .from('knowledge_base')
        .select('id', { count: 'exact', head: true })
        .not('embedding', 'is', null)
      const { error: ftsError } = await supabase.rpc('search_knowledge', {
        query: 'maize',
        lang: 'en',
        n: 1,
      })
      return json({
        llmConfigured,
        documents: rows?.length ?? 0,
        embedded: embedded ?? 0,
        fullTextReady: !ftsError,
        articles: (rows ?? []).map((r) => ({ id: r.id, title: r.title, category: r.category })),
      })
    }

    const query = typeof body?.query === 'string' ? body.query.trim() : ''
    if (!query || query.length > MAX_QUERY_LENGTH) return json({ error: 'invalid_query' }, 400)
    const lang = body?.lang === 'sw' ? 'sw' : 'en'

    // ── 1. Vector retrieval (only when embeddings can exist) ─────────────────
    let passages: any[] = []
    let retrieval = 'none'
    if (llmConfigured) {
      try {
        const emb = await openai(apiKey, '/embeddings', {
          model: EMBEDDING_MODEL,
          input: query,
          dimensions: EMBEDDING_DIMENSIONS,
        })
        const { data } = await supabase.rpc('match_knowledge', {
          query_embedding: emb.data[0].embedding,
          match_threshold: VECTOR_MATCH_THRESHOLD,
          match_count: DEFAULT_MATCH_COUNT,
        })
        if (data?.length) {
          passages = data
          retrieval = 'vector'
        }
      } catch (e) {
        console.warn('[rag-chat] vector retrieval unavailable; using full-text.', String(e))
      }
    }

    // ── 2. Full-text retrieval (no key needed) ───────────────────────────────
    if (!passages.length) {
      const { data, error } = await supabase.rpc('search_knowledge', {
        query: fullTextQuery(query) || query,
        lang,
        n: DEFAULT_MATCH_COUNT,
      })
      if (!error) {
        passages = data ?? []
        if (passages.length) retrieval = 'fulltext'
      } else {
        // ── 3. RPC missing (migration not applied): rank in-process ─────────
        console.warn('[rag-chat] search_knowledge unavailable:', error.message)
        const { data: rows } = await supabase
          .from('knowledge_base')
          .select('id, title, content, category')
          .limit(500)
        passages = rankPassages(query, rows ?? [], DEFAULT_MATCH_COUNT)
        if (passages.length) retrieval = 'keyword'
      }
    }

    const sources = passages.map((p) => ({
      id: p.id ?? null,
      title: p.title,
      category: p.category,
      excerpt: excerpt(p.content),
      content: p.content,
    }))

    if (!sources.length) {
      return json({ mode: 'no_match', answer: null, sources: [], retrieval: 'none', llmConfigured })
    }

    if (!llmConfigured) {
      return json({ mode: 'knowledge_base', answer: null, sources, retrieval, llmConfigured })
    }

    // ── Grounded generation ──────────────────────────────────────────────────
    try {
      const completion = await openai(apiKey, '/chat/completions', {
        model: CHAT_MODEL,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: groundedSystemPrompt(passages, lang) },
          { role: 'user', content: query },
        ],
      })
      const answer = completion?.choices?.[0]?.message?.content?.trim() || null
      if (!answer) throw new Error('empty completion')
      return json({ mode: 'generated', answer, sources, retrieval, llmConfigured })
    } catch (e) {
      // Provider failure: still return the real passages, flagged honestly.
      console.error('[rag-chat] generation failed:', String(e))
      return json({
        mode: 'knowledge_base',
        answer: null,
        sources,
        retrieval,
        llmConfigured,
        llmError: true,
      })
    }
  } catch (error) {
    console.error('[rag-chat] failed:', error)
    return json({ error: 'rag_failed', detail: String(error?.message ?? error) }, 502)
  }
})
