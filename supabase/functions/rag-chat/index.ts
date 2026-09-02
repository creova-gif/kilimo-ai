// KILIMO AI — Agriculture RAG chat edge function.
//
// Dedicated, independently-upgradable agriculture-advice endpoint — kept
// separate from openai-proxy (general Sankofa chat/vision/transcribe) so
// this can evolve (retrieval strategy, model, prompt) without touching the
// already-verified paths other screens depend on.
//
// Request:  { query: string, userId?: string, language?: 'sw' | 'en',
//              action?: 'ask' | 'reembed_missing' }
//   - action defaults to 'ask' (the historical {query, userId} shape keeps
//     working unchanged).
// Response (action: 'ask'):
//   {
//     answer, recommendations: [{action, reason, priority, confidence}],
//     risks: string[], missing_information: string[],
//     sources: [{title, category}], disclaimer,
//     requiresProfessionalConfirmation
//   }
// Response (action: 'reembed_missing'): { embedded, remaining }
//   Maintenance action: embeds any knowledge_base row with a NULL
//   embedding. Self-healing for future inserts; run once after a migration
//   that adds/edits rows, since no OpenAI key is available client-side to
//   do this from the app itself.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'

// The OpenAI SDK constructor throws synchronously if apiKey is empty —
// unlike openai-proxy's raw-fetch approach, that would crash this whole
// module at cold-start if the secret isn't set, rather than returning a
// clean error. Check first (matching openai-proxy's graceful pattern) and
// only construct the client once we know the key is present.
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
let openai: OpenAI | null = null
function client() {
  if (!openai) openai = new OpenAI({ apiKey: OPENAI_API_KEY })
  return openai
}
const EMBED_MODEL = 'text-embedding-3-small' // 1536-dim — must match knowledge_base.embedding's dimension

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// Chemical-application questions get an explicit human-confirmation flag —
// this endpoint must never present a specific pesticide/fertilizer rate as
// the final word.
const CHEMICAL_TERMS = /\b(pesticide|herbicide|fungicide|fertili[sz]er|insecticide|spray|dawa|mbolea|kemikali|dozi|dosage|rate)\b/i

class BadRequest extends Error {}

async function ask(payload: any, authUserId?: string) {
  const query = String(payload.query ?? '').trim()
  if (!query) throw new BadRequest('query is required')
  // Use authenticated user ID from bearer token, fallback to request payload
  const userId = authUserId ?? (payload.userId as string | undefined)
  const language: 'sw' | 'en' = payload.language === 'en' ? 'en' : 'sw'

  const supabase = supabaseAdmin()

  // Real per-user farm context — was querying `user_profiles`, a table
  // that has never existed in any migration and always silently returned
  // nothing. The real farm profile (written by app/edit-profile.tsx's
  // save()) lives in farmer_profiles.
  const { data: userContext } = userId
    ? await supabase
        .from('farmer_profiles')
        .select('region, farm_size_acres, primary_crops')
        .eq('user_id', userId)
        .single()
    : { data: null }

  // Retrieve relevant local knowledge.
  //   Primary: pgvector similarity via match_knowledge.
  //   Fallback: keyword (ILIKE) search over knowledge_base — so RAG still
  //   returns grounded context when the vector index is empty or the query
  //   embedding can't be produced.
  let ragKnowledge: any[] = []
  try {
    const embeddingResponse = await client().embeddings.create({ model: EMBED_MODEL, input: query })
    const queryEmbedding = embeddingResponse.data[0].embedding
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 4,
    })
    if (error) throw error
    ragKnowledge = data ?? []
  } catch (e) {
    console.warn('[rag-chat] Vector retrieval unavailable; using keyword fallback.', e)
  }

  if (!ragKnowledge.length) {
    const keywords = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
    if (keywords.length) {
      const orFilter = keywords.map((k) => `content.ilike.%${k}%,title.ilike.%${k}%`).join(',')
      const { data } = await supabase
        .from('knowledge_base')
        .select('title, content, category')
        .or(orFilter)
        .limit(4)
      ragKnowledge = data ?? []
    }
  }

  const hasKnowledge = ragKnowledge.length > 0
  const knowledgeContext = hasKnowledge
    ? ragKnowledge.map((k: any) => `[${k.category}] ${k.title}: ${k.content}`).join('\n\n')
    : 'No matching local knowledge was found for this question.'

  const chemicalTopic = CHEMICAL_TERMS.test(query)

  // Constrained, structured prompt. The model must ground every claim in
  // the provided knowledge and explicitly say when it doesn't have enough
  // to answer, rather than filling the gap with a plausible-sounding guess
  // — the same discipline diagnoseCropPhoto() already applies via its
  // consultExpert flag in lib/ai.ts, extended here to text Q&A.
  const systemPrompt = `You are Sankofa AI, an agricultural assistant for East African farmers (Tanzania first).

Farmer profile:
- Region: ${userContext?.region || 'Unknown'}
- Farm size: ${userContext?.farm_size_acres ? `${userContext.farm_size_acres} acres` : 'Unknown'}
- Crops: ${userContext?.primary_crops?.join(', ') || 'None on file'}

Local verified knowledge (the ONLY source you may treat as factual for treatments, rates, or thresholds):
${knowledgeContext}

Rules — follow every one of these exactly:
1. Base your answer ONLY on the Local Knowledge above and general, widely-agreed agronomic principles. Never invent a specific fertilizer/pesticide rate, dosage, price, weather figure, yield statistic, or regulation that is not explicitly present in the Local Knowledge.
2. If the Local Knowledge does not cover something the farmer needs to know, say so plainly in your answer AND list it in "missing_information" — do not guess or pad with generic filler.
3. If the question involves applying any pesticide, herbicide, fungicide, or fertilizer, set "requiresProfessionalConfirmation" to true and make the answer clear that a local agronomist or extension officer should confirm the exact product and rate before application.
4. Respond in ${language === 'sw' ? 'Swahili' : 'English'}, in plain language a smallholder farmer can act on immediately. Keep "answer" concise (3-6 sentences).
5. Return ONLY a JSON object with this exact shape:
{
  "answer": string,
  "recommendations": [{"action": string, "reason": string, "priority": "high"|"medium"|"low", "confidence": number between 0 and 1}],
  "risks": string[],
  "missing_information": string[],
  "disclaimer": string,
  "requiresProfessionalConfirmation": boolean
}
"disclaimer" must always briefly note this is general guidance, not a substitute for a local extension officer.`

  const completion = await client().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.2,
  })

  let parsed: any = {}
  try {
    parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
  } catch (e) {
    console.error('[rag-chat] Failed to parse model JSON output', e)
  }

  return {
    answer: typeof parsed.answer === 'string' ? parsed.answer : '',
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
    // Real provenance: exactly what was retrieved and fed to the model —
    // never the model's own self-reported citations, which could be
    // fabricated.
    sources: ragKnowledge.map((k: any) => ({ title: k.title, category: k.category })),
    disclaimer:
      typeof parsed.disclaimer === 'string' && parsed.disclaimer
        ? parsed.disclaimer
        : language === 'sw'
          ? 'Huu ni ushauri wa jumla; thibitisha maamuzi makubwa na afisa ugani wa eneo lako.'
          : 'This is general guidance; confirm major decisions with your local extension officer.',
    requiresProfessionalConfirmation:
      chemicalTopic || (typeof parsed.requiresProfessionalConfirmation === 'boolean' && parsed.requiresProfessionalConfirmation),
    hasKnowledge,
  }
}

async function reembedMissing() {
  const supabase = supabaseAdmin()
  const { data: rows, error } = await supabase
    .from('knowledge_base')
    .select('id, content')
    .is('embedding', null)
    .limit(50)
  if (error) throw error

  let embedded = 0
  for (const row of rows ?? []) {
    try {
      const res = await client().embeddings.create({ model: EMBED_MODEL, input: row.content })
      const embedding = res.data[0].embedding
      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update({ embedding, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (updateError) {
        console.error('[rag-chat] Failed to update embedding for', row.id, updateError)
        continue
      }
      embedded++
    } catch (e) {
      console.error('[rag-chat] Failed to embed row', row.id, e)
      continue
    }
  }

  const { count: remaining } = await supabase
    .from('knowledge_base')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)

  return { embedded, remaining: remaining ?? 0 }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY not set on the edge function' }, 503)
  }

  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return json({ error: 'request body must be a JSON object' }, 400)
    }
    const action = body.action ?? 'ask'

    if (action === 'reembed_missing') {
      // Require admin secret header to allow maintenance re-embedding
      const adminSecret = Deno.env.get('REEMBED_SECRET') ?? ''
      const provided = req.headers.get('x-reembed-secret') || ''
      if (!adminSecret || provided !== adminSecret) {
        return json({ error: 'forbidden' }, 403)
      }
      return json(await reembedMissing())
    }
    if (action === 'ask') {
      // Extract user ID from authorization header if available
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      // In a production system, decode the JWT to get the authenticated user ID
      // For now, pass undefined to fallback to payload.userId
      const result = await ask(body, undefined)
      return json(result)
    }
    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (error: any) {
    console.error('[rag-chat] error', error)
    if (error instanceof BadRequest) return json({ error: error.message }, 400)
    return json({ error: 'internal error' }, 500)
  }
})
