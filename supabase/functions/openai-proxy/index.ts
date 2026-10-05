// KILIMO AI — OpenAI proxy edge function.
//
// Single endpoint with an `action` discriminator so the mobile client never
// holds the OpenAI key. JWT verification is on (config.toml). The user id
// used for the daily budget comes from that JWT, not the body.
//
// The client cannot pick an unlisted model or replace the vision prompt.
// Each call claims one slot in ai_usage_daily before OpenAI is contacted.
//
// Supported actions:
//   - "chat"       : { messages, model? } → { content }
//   - "vision"     : { imageBase64, mimeType?, cropHint?, regionHint? } → { content }
//   - "transcribe" : { audioBase64, mimeType, language? } → { text }

// @ts-nocheck — Deno runtime; types are not available in the Expo TS project.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  AI_DAILY_LIMITS,
  boundChatMessages,
  mediaWithinLimit,
  resolveModel,
  transcribeLanguage,
  visionMime,
  visionRequestPrompt,
} from '../_shared/aiPolicy.ts';
import { adminClient, userFromRequest } from '../_shared/user.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE = 'https://api.openai.com/v1';

const SANKOFA_SYSTEM = `Wewe ni Sankofa AI, msaidizi wa kilimo wa KILIMO AI. Jibu kwa Kiswahili kwa lugha rahisi inayoweza kueleweka na mkulima wa kawaida Tanzania. Toa ushauri wa vitendo kwa mahindi, mpunga, kahawa, mbogamboga na mifugo. Kuwa mfupi (sentensi 2-4) na thibitisha hatua zinazohitajika.`;

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

async function callOpenAI(path: string, body: unknown) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

async function chat(messages: { role: string; content: string }[], model: string) {
  const data = await callOpenAI('/chat/completions', {
    model,
    messages: [{ role: 'system', content: SANKOFA_SYSTEM }, ...messages],
    temperature: 0.6,
    max_tokens: 600,
  });
  return { content: data.choices?.[0]?.message?.content ?? '' };
}

async function vision(payload: any, model: string) {
  const mime = visionMime(payload.mimeType);
  if (!mime) throw new Error('invalid_image_type');
  const data = await callOpenAI('/chat/completions', {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: visionRequestPrompt(payload) },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${payload.imageBase64}` } },
        ],
      },
    ],
    max_tokens: 500,
  });
  return { content: data.choices?.[0]?.message?.content ?? '' };
}

async function transcribe(payload: any, model: string) {
  const mime = payload.mimeType ?? 'audio/m4a';
  const ext = mime.split('/')[1]?.split(';')[0] ?? 'm4a';
  const bin = Uint8Array.from(atob(payload.audioBase64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append('file', new Blob([bin], { type: mime }), `audio.${ext}`);
  form.append('model', model);
  form.append('language', transcribeLanguage(payload.language));
  form.append('response_format', 'json');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  return { text: data.text ?? '' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  if (!OPENAI_API_KEY) {
    return json(req, { error: 'openai_not_configured' }, 503);
  }

  try {
    const body = await req.json();
    const action = body?.action;
    if (action !== 'chat' && action !== 'vision' && action !== 'transcribe') {
      return json(req, { error: 'unknown_action' }, 400);
    }

    const model = resolveModel(action, body.model);
    if (!model) return json(req, { error: 'model_not_allowed' }, 400);

    let messages = null;
    if (action === 'chat') {
      const bounded = boundChatMessages(body.messages);
      if (!bounded.ok) return json(req, { error: bounded.reason }, 400);
      messages = bounded.messages;
    } else if (action === 'vision') {
      if (!mediaWithinLimit(body.imageBase64) || !visionMime(body.mimeType)) {
        return json(req, { error: 'invalid_image' }, 400);
      }
    } else if (!mediaWithinLimit(body.audioBase64)) {
      return json(req, { error: 'invalid_audio' }, 400);
    }

    const user = await userFromRequest(req);
    if (!user?.id) return json(req, { error: 'not_authenticated' }, 401);

    const admin = adminClient();
    if (!admin) return json(req, { error: 'budget_unavailable' }, 503);

    const { data: claimed, error: claimErr } = await admin.rpc('claim_ai_call', {
      p_user_id: user.id,
      p_action: action,
      p_max: AI_DAILY_LIMITS[action],
    });
    if (claimErr) {
      console.error('[openai-proxy] budget', claimErr.message);
      return json(req, { error: 'budget_unavailable' }, 503);
    }
    if (claimed !== true) return json(req, { error: 'budget_exceeded' }, 429);

    if (action === 'chat') return json(req, await chat(messages, model));
    if (action === 'vision') return json(req, await vision(body, model));
    return json(req, await transcribe(body, model));
  } catch (err: any) {
    console.error('[openai-proxy]', err);
    return json(req, { error: 'internal_error' }, 500);
  }
});
