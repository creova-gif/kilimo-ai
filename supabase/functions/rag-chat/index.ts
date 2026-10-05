// KILIMO AI — RAG chat.
//
// The caller is taken from their JWT only. A `userId` field in the body is
// ignored, including when it is the only identity the client sends. The
// service role is used to read shared knowledge and the caller's own
// farmer_profiles row; it is never pointed at a client-supplied user id.
//
// JWT verification is on (config.toml). Daily spend is claimed via
// claim_ai_call before any OpenAI request.

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.0.0';
import { corsHeadersFor } from '../_shared/cors.ts';
import { AI_DAILY_LIMITS } from '../_shared/aiPolicy.ts';
import { adminClient, userFromRequest } from '../_shared/user.ts';

const MAX_QUERY_CHARS = 2000;

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function getOpenAI() {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  try {
    const user = await userFromRequest(req);
    const userId = user?.id;
    if (!userId) return json(req, { error: 'not_authenticated' }, 401);

    const body = await req.json().catch(() => null);
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query) return json(req, { error: 'query_required' }, 400);
    if (query.length > MAX_QUERY_CHARS) return json(req, { error: 'query_too_long' }, 400);

    const openai = getOpenAI();
    if (!openai) return json(req, { error: 'openai_not_configured' }, 503);

    const supabase = adminClient();
    if (!supabase) return json(req, { error: 'budget_unavailable' }, 503);

    const { data: claimed, error: claimErr } = await supabase.rpc('claim_ai_call', {
      p_user_id: userId,
      p_action: 'rag',
      p_max: AI_DAILY_LIMITS.rag,
    });
    if (claimErr) {
      console.error('[rag-chat] budget', claimErr.message);
      return json(req, { error: 'budget_unavailable' }, 503);
    }
    if (claimed !== true) return json(req, { error: 'budget_exceeded' }, 429);

    const { data: userContext } = await supabase
      .from('farmer_profiles')
      .select('region, farm_size_acres, primary_crops')
      .eq('user_id', userId)
      .maybeSingle();

    let ragKnowledge: any[] = [];
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;
      const { data } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3,
      });
      ragKnowledge = data ?? [];
    } catch (e) {
      console.warn('Vector retrieval unavailable; using keyword fallback.', e);
    }

    if (!ragKnowledge.length) {
      const keywords = String(query)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5);
      if (keywords.length) {
        const orFilter = keywords
          .map((k: string) => `content.ilike.%${k}%,title.ilike.%${k}%`)
          .join(',');
        const { data } = await supabase
          .from('knowledge_base')
          .select('title, content, category')
          .or(orFilter)
          .limit(3);
        ragKnowledge = data ?? [];
      }
    }

    const knowledgeContext =
      ragKnowledge.map((k: any) => k.content).join('\n\n') || 'No specific local knowledge found.';

    const systemPrompt = `
      You are Sankofa AI, a professional agronomist for East African farmers.
      You MUST base your advice on the provided Local Knowledge. Do not hallucinate treatments.

      User Profile:
      - Location: ${userContext?.region || 'Unknown'}
      - Active Crops: ${userContext?.primary_crops?.join(', ') || 'None'}

      Local Verified Knowledge:
      ${knowledgeContext}

      Respond in Swahili or English based on the user's language. Keep it concise, professional, and actionable.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
    });

    return json(req, { response: completion.choices[0].message.content });
  } catch (error) {
    console.error('[rag-chat]', error);
    return json(req, { error: 'internal_error' }, 500);
  }
});
