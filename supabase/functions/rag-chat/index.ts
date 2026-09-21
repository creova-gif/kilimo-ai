// KILIMO AI — RAG chat edge function (retrieval-augmented agronomy answers).
//
// Auth: verify_jwt = true (config.toml) AND the caller must be a real signed-in
// user (see _shared/auth.ts — the public anon key also passes verify_jwt). The
// farm-profile context is looked up for the *authenticated caller*, never for a
// `userId` supplied in the request body (that would let any signed-in user read
// another farmer's region/crops through the service-role client).
//
// Availability: needs OPENAI_API_KEY. Without it the function answers a clean
// 503 `ai_not_configured` instead of crashing the worker at cold start (the
// OpenAI client used to be constructed at module load, which threw and took the
// whole function down with a 500/504).
// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'
import { corsHeaders } from '../_shared/cors.ts'
import { getCallerId } from '../_shared/auth.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const userId = await getCallerId(req)
    if (!userId) return json({ error: 'not_authenticated' }, 401)

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return json(
        { error: 'ai_not_configured', detail: 'OPENAI_API_KEY is not set on this edge function' },
        503,
      )
    }
    const openai = new OpenAI({ apiKey })

    const body = await req.json().catch(() => ({}))
    const query = typeof body?.query === 'string' ? body.query.trim() : ''
    if (!query || query.length > 2000) return json({ error: 'invalid_query' }, 400)

    // 1. Service-role client (knowledge_base is RLS default-deny for clients).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // 2. Farm profile context for the authenticated caller only.
    const { data: userContext } = await supabase
      .from('farmer_profiles')
      .select('region, farm_size_acres, primary_crops')
      .eq('user_id', userId)
      .maybeSingle()

    // 3 & 4. Retrieve relevant local knowledge.
    //   Primary: pgvector similarity via match_knowledge.
    //   Fallback: keyword (ILIKE) search over knowledge_base — so RAG still
    //   returns grounded context when the vector index is empty or the query
    //   embedding can't be produced (keeps answers useful pre-embedding-backfill).
    let ragKnowledge: any[] = []
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      })
      const queryEmbedding = embeddingResponse.data[0].embedding
      const { data } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3,
      })
      ragKnowledge = data ?? []
    } catch (e) {
      console.warn('Vector retrieval unavailable; using keyword fallback.', e)
    }

    if (!ragKnowledge.length) {
      const keywords = query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3)
        .slice(0, 5)
      if (keywords.length) {
        const orFilter = keywords
          .map((k) => `content.ilike.%${k}%,title.ilike.%${k}%`)
          .join(',')
        const { data } = await supabase
          .from('knowledge_base')
          .select('title, content, category')
          .or(orFilter)
          .limit(3)
        ragKnowledge = data ?? []
      }
    }

    const knowledgeContext =
      ragKnowledge.map((k: any) => k.content).join('\n\n') || 'No specific local knowledge found.'

    // 5. Construct highly constrained prompt
    const systemPrompt = `
      You are Sankofa AI, a professional agronomist for East African farmers.
      You MUST base your advice on the provided Local Knowledge. Do not hallucinate treatments.
      
      User Profile:
      - Location: ${userContext?.region || 'Unknown'}
      - Active Crops: ${userContext?.primary_crops?.join(', ') || 'None'}
      
      Local Verified Knowledge:
      ${knowledgeContext}
      
      Respond in Swahili or English based on the user's language. Keep it concise, professional, and actionable.
    `

    // 6. Generate Response via LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast, capable model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.2, // Low temp for factual accuracy
    })

    return json({ response: completion.choices[0].message.content })
  } catch (error) {
    console.error('Error in RAG execution:', error)
    return json({ error: 'rag_failed', detail: String(error?.message ?? error) }, 502)
  }
})
