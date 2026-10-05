import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { query, userId } = await req.json()

    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch User Profile/Digital Twin Context
    // Was querying `user_profiles`, a table that has never existed in any
    // migration — this always silently returned nothing. The real farm
    // profile (written by app/edit-profile.tsx's save()) lives in
    // farmer_profiles (see supabase/migrations/20260814000000_farmer_profiles.sql).
    const { data: userContext } = await supabase
      .from('farmer_profiles')
      .select('region, farm_size_acres, primary_crops')
      .eq('user_id', userId)
      .single()

    // 3 & 4. Retrieve relevant local knowledge.
    //   Primary: pgvector similarity via match_knowledge.
    //   Fallback: keyword (ILIKE) search over knowledge_base — so RAG still
    //   returns grounded context when the vector index is empty or the query
    //   embedding can't be produced (keeps answers useful pre-embedding-backfill).
    let ragKnowledge: any[] = []
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
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
      const keywords = String(query)
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
      model: "gpt-4o-mini", // Fast, capable model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      temperature: 0.2, // Low temp for factual accuracy
    })

    return new Response(
      JSON.stringify({ response: completion.choices[0].message.content }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (error) {
    console.error("Error in RAG execution:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
