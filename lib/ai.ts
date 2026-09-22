/**
 * KILIMO AI — AI Client
 *
 * All model calls go through the Supabase `openai-proxy` edge function so that
 * the provider API key NEVER ships inside the mobile bundle. The proxy is
 * JWT-verified (see supabase/config.toml) and enforces the Sankofa system
 * prompt server-side.
 *
 * `aiConfigured()` reflects backend availability, not the presence of any
 * client-side secret. When the server has no provider key the proxy answers
 * 503 and callers receive AIError kind 'not_configured' — they must show an
 * honest "unavailable" state, never a sample answer or diagnosis. Grounded
 * text answers go through lib/rag.ts (rag-chat), which works without a key.
 *
 * SECURITY: do not reintroduce EXPO_PUBLIC_GEMINI_API_KEY /
 * EXPO_PUBLIC_OPENAI_API_KEY here — EXPO_PUBLIC_* vars are inlined into the
 * shipped JS bundle and are trivially extractable from the APK.
 */

import { getSupabase } from './supabase';

const AI_FN = 'openai-proxy';

export class AIError extends Error {
  constructor(
    message: string,
    public kind: 'not_configured' | 'unauthorized' | 'network' | 'server' | 'validation'
  ) {
    super(message);
  }
}

export function aiConfigured(): boolean {
  return !!getSupabase();
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Map a `supabase.functions.invoke` error to an AIError kind. Pure (exported
 * for tests). FunctionsHttpError carries the Response in `context`: 503 means
 * the provider key is not configured on the server, 401 means no real session.
 */
export function classifyInvokeError(error: any): AIError['kind'] {
  const name = String(error?.name ?? '');
  const status = Number(error?.context?.status ?? error?.status ?? 0);
  if (name === 'FunctionsFetchError') return 'network';
  if (status === 503) return 'not_configured';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 400 || status === 413 || status === 422) return 'validation';
  if (/network|fetch failed|failed to fetch|timeout/i.test(String(error?.message ?? '')))
    return 'network';
  return 'server';
}

/** Invoke the AI proxy edge function with an action discriminator. */
async function invokeAI<T = any>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) throw new AIError('AI backend not configured', 'not_configured');
  const { data, error } = await supabase.functions.invoke(AI_FN, { body });
  if (error) {
    throw new AIError(error.message ?? 'AI proxy error', classifyInvokeError(error));
  }
  if (data && (data as any).error) {
    const code = String((data as any).code ?? (data as any).error);
    throw new AIError(
      String((data as any).error),
      code === 'ai_not_configured' ? 'not_configured' : 'server'
    );
  }
  return data as T;
}

/** T201 — Sankofa text chat. Routed through the server-side proxy. */
export async function chat(messages: ChatMessage[]): Promise<string> {
  if (!aiConfigured()) throw new AIError('AI backend not configured', 'not_configured');
  // The proxy strips client system messages and enforces the Sankofa prompt.
  const { content } = await invokeAI<{ content: string }>({ action: 'chat', messages });
  return content ?? '';
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Confidence = 'low' | 'medium' | 'high';
export type ImgQuality = 'good' | 'poor' | 'unusable';

export interface VisionDiagnosis {
  crop?: string;
  disease?: string;
  severity?: Severity;
  confidence?: Confidence;
  imageQuality?: ImgQuality;
  consultExpert?: boolean;
  actions?: string[];
  raw: string;
}

export function normalizeSeverity(input: unknown): Severity | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim().toLowerCase();
  if (!v) return undefined;
  if (/(crit|hatari kubwa|dharura|severe|urgent)/.test(v)) return 'critical';
  if (/(high|kubwa|kali)/.test(v)) return 'high';
  if (/(med|wastani|kadiri|moderate)/.test(v)) return 'medium';
  if (/(low|ndogo|hafifu|mild|minor)/.test(v)) return 'low';
  return undefined;
}

export async function diagnoseCropPhoto(
  imageBase64: string,
  opts: { mimeType?: string; prompt?: string } = {}
): Promise<VisionDiagnosis> {
  if (!aiConfigured()) throw new AIError('AI backend not configured', 'not_configured');

  const mimeType = opts.mimeType ?? 'image/jpeg';
  const prompt =
    opts.prompt ??
    `Chunguza picha hii ya mmea kwa makini na toa uchambuzi wa kitaalamu.
Jibu LAZIMA kwa JSON iliyosafi tu:
{
  "crop": "jina la mmea kwa Kiswahili",
  "disease": "jina la ugonjwa/tatizo",
  "severity": "low|medium|high|critical",
  "confidence": "high|medium|low",
  "imageQuality": "good|poor|unusable",
  "consultExpert": true|false,
  "actions": ["hatua 1", "hatua 2"]
}
HAKIKISHA JSON YAKO NI SAHIHI.`;

  try {
    const { content } = await invokeAI<{ content: string }>({
      action: 'vision',
      imageBase64,
      mimeType,
      prompt,
    });

    let parsed: Partial<VisionDiagnosis> = {};
    try {
      const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) parsed = JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      // leave parsed empty; raw is always returned
    }

    const severity = normalizeSeverity(parsed.severity);
    const rawConf = typeof parsed.confidence === 'string' ? parsed.confidence.toLowerCase() : '';
    const confidence: Confidence | undefined =
      rawConf === 'high'
        ? 'high'
        : rawConf === 'medium'
          ? 'medium'
          : rawConf === 'low'
            ? 'low'
            : undefined;

    const rawQuality =
      typeof parsed.imageQuality === 'string' ? parsed.imageQuality.toLowerCase() : '';
    const imageQuality: ImgQuality | undefined =
      rawQuality === 'good'
        ? 'good'
        : rawQuality === 'poor'
          ? 'poor'
          : rawQuality === 'unusable'
            ? 'unusable'
            : undefined;

    const consultExpert: boolean =
      typeof parsed.consultExpert === 'boolean'
        ? parsed.consultExpert
        : severity === 'critical' || severity === 'high' || confidence === 'low';

    return { ...parsed, severity, confidence, imageQuality, consultExpert, raw: content };
  } catch (err: any) {
    if (err instanceof AIError) throw err;
    throw new AIError(err?.message ?? 'Vision Error', 'server');
  }
}

/** Voice transcription, routed server-side through the proxy (Whisper). */
export async function transcribeAudio(
  audioBase64: string,
  opts: { mimeType?: string; language?: string } = {}
): Promise<string> {
  if (!aiConfigured()) throw new AIError('AI backend not configured', 'not_configured');
  const { text } = await invokeAI<{ text: string }>({
    action: 'transcribe',
    audioBase64,
    mimeType: opts.mimeType ?? 'audio/m4a',
    language: opts.language ?? 'sw',
  });
  return text ?? '';
}
