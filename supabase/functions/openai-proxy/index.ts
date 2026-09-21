// KILIMO AI — OpenAI proxy edge function.
//
// Single endpoint with an `action` discriminator so the mobile client never
// holds the OpenAI key. JWT verification is on by default (configured in
// supabase/config.toml), so callers must present a valid Supabase session.
//
// Supported actions:
//   - "chat"       : { messages, model? } → { content }
//   - "vision"     : { imageBase64, mimeType?, prompt? } → { content }
//   - "transcribe" : { audioBase64, mimeType, language? } → { text }

// @ts-nocheck — Deno runtime; types are not available in the Expo TS project.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getCallerId } from '../_shared/auth.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE = 'https://api.openai.com/v1';

const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
const DEFAULT_VISION_MODEL = 'gpt-4o';
const DEFAULT_TRANSCRIBE_MODEL = 'whisper-1';

const SANKOFA_SYSTEM = `Wewe ni Sankofa AI, msaidizi wa kilimo wa KILIMO AI. Jibu kwa Kiswahili kwa lugha rahisi inayoweza kueleweka na mkulima wa kawaida Tanzania. Toa ushauri wa vitendo kwa mahindi, mpunga, kahawa, mbogamboga na mifugo. Kuwa mfupi (sentensi 2-4) na thibitisha hatua zinazohitajika.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

async function chat(payload: any) {
  const model = payload.model ?? DEFAULT_CHAT_MODEL;
  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  // Server-enforced policy: strip ALL client system messages and always
  // prepend the Sankofa prompt. Clients cannot override assistant behavior.
  const userMessages = raw.filter((m: any) => m && m.role !== 'system');
  const messages = [{ role: 'system', content: SANKOFA_SYSTEM }, ...userMessages];

  const data = await callOpenAI('/chat/completions', {
    model,
    messages,
    temperature: 0.6,
    max_tokens: 600,
  });
  return { content: data.choices?.[0]?.message?.content ?? '' };
}

async function vision(payload: any) {
  if (!payload.imageBase64) throw new Error('imageBase64 required');
  const mime = payload.mimeType ?? 'image/jpeg';
  const prompt = payload.prompt ??
    'Wewe ni mtaalamu wa magonjwa ya mimea. Chunguza picha hii ya zao na utoe: jina la zao, ugonjwa unaoshukiwa (au "Hakuna ugonjwa"), kiwango cha hatari (low/medium/high/critical), na hatua 3 za matibabu. Jibu kwa Kiswahili kama JSON tu na funguo: crop, disease, severity, actions.';

  const data = await callOpenAI('/chat/completions', {
    model: DEFAULT_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${payload.imageBase64}` } },
        ],
      },
    ],
    max_tokens: 500,
  });
  return { content: data.choices?.[0]?.message?.content ?? '' };
}

async function transcribe(payload: any) {
  if (!payload.audioBase64) throw new Error('audioBase64 required');
  const mime = payload.mimeType ?? 'audio/m4a';
  const ext = mime.split('/')[1]?.split(';')[0] ?? 'm4a';

  // Decode base64 → Uint8Array for multipart upload.
  const bin = Uint8Array.from(atob(payload.audioBase64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append('file', new Blob([bin], { type: mime }), `audio.${ext}`);
  form.append('model', DEFAULT_TRANSCRIBE_MODEL);
  form.append('language', payload.language ?? 'sw');
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require a real signed-in user. The public anon key also passes the gateway's
  // verify_jwt check, so without this anyone holding the app's anon key could
  // spend the OpenAI budget with no account.
  if (!(await getCallerId(req))) return json({ error: 'not_authenticated' }, 401);

  if (!OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY not set on the edge function', code: 'ai_not_configured' }, 503);
  }

  try {
    const body = await req.json();
    const action = body.action;
    let result;
    switch (action) {
      case 'chat':       result = await chat(body); break;
      case 'vision':     result = await vision(body); break;
      case 'transcribe': result = await transcribe(body); break;
      default:           return json({ error: `Unknown action: ${action}` }, 400);
    }
    return json(result);
  } catch (err: any) {
    console.error('[openai-proxy]', err);
    return json({ error: err?.message ?? 'internal error' }, 500);
  }
});
