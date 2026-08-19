/**
 * KILIMO AI — Agriculture RAG Client
 *
 * Dedicated client for the `rag-chat` edge function: grounded, sourced
 * agriculture advice for the conversational Sankofa AI screens. Kept
 * separate from lib/ai.ts's general chat() so the retrieval strategy and
 * model behind agriculture Q&A can evolve independently, without touching
 * the already-verified openai-proxy paths (vision diagnosis, transcription,
 * general chat) other screens depend on.
 *
 * Falls back to lib/ai-demo.ts's honest demo mode when no backend is
 * configured — never fabricates a "grounded" answer locally.
 */

import { supabase } from './supabase';
import { AIError, aiConfigured } from './ai';
import { demoChat } from './ai-demo';

const AGRI_FN = 'rag-chat';

export interface AgriRecommendation {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface AgriSource {
  title: string;
  category: string;
}

export interface AgriAdvice {
  answer: string;
  recommendations: AgriRecommendation[];
  risks: string[];
  missingInformation: string[];
  sources: AgriSource[];
  disclaimer: string;
  requiresProfessionalConfirmation: boolean;
  hasKnowledge: boolean;
}

export function normalizePriority(p: unknown): AgriRecommendation['priority'] {
  return p === 'high' || p === 'medium' || p === 'low' ? p : 'medium';
}

export function normalizeRecommendation(r: any): AgriRecommendation {
  return {
    action: typeof r?.action === 'string' ? r.action : '',
    reason: typeof r?.reason === 'string' ? r.reason : '',
    priority: normalizePriority(r?.priority),
    confidence: typeof r?.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
  };
}

/** Parses the raw rag-chat response into a typed, defensively-normalized AgriAdvice. */
export function parseAgriAdvice(raw: any): AgriAdvice {
  return {
    answer: typeof raw?.answer === 'string' ? raw.answer : '',
    recommendations: Array.isArray(raw?.recommendations)
      ? raw.recommendations.map(normalizeRecommendation)
      : [],
    risks: Array.isArray(raw?.risks) ? raw.risks.filter((r: unknown) => typeof r === 'string') : [],
    missingInformation: Array.isArray(raw?.missing_information)
      ? raw.missing_information.filter((m: unknown) => typeof m === 'string')
      : [],
    sources: Array.isArray(raw?.sources)
      ? raw.sources
          .filter((s: any) => s && typeof s.title === 'string')
          .map((s: any) => ({ title: s.title, category: typeof s.category === 'string' ? s.category : '' }))
      : [],
    disclaimer: typeof raw?.disclaimer === 'string' ? raw.disclaimer : '',
    requiresProfessionalConfirmation: raw?.requiresProfessionalConfirmation === true,
    hasKnowledge: raw?.hasKnowledge === true,
  };
}

/** Grounded agriculture Q&A. Throws AIError('not_configured') when the backend isn't set up. */
export async function askAgriExpert(
  query: string,
  opts: { userId?: string; language?: 'sw' | 'en' } = {}
): Promise<AgriAdvice> {
  if (!aiConfigured() || !supabase) throw new AIError('AI backend not configured', 'not_configured');

  const { data, error } = await supabase.functions.invoke(AGRI_FN, {
    body: { action: 'ask', query, userId: opts.userId, language: opts.language },
  });
  if (error) throw new AIError(error.message ?? 'Agriculture AI error', 'server');
  if (data && (data as any).error) throw new AIError(String((data as any).error), 'server');

  return parseAgriAdvice(data);
}

/**
 * Renders an AgriAdvice into a single chat-bubble string: the answer, a
 * professional-confirmation warning when flagged, a short sources line,
 * then the disclaimer. Pure function so it's testable without mocking the
 * network call.
 */
export function formatAgriReply(advice: AgriAdvice, language: 'sw' | 'en' = 'sw'): string {
  const parts: string[] = [];
  if (advice.answer) parts.push(advice.answer);

  if (advice.requiresProfessionalConfirmation) {
    parts.push(
      language === 'sw'
        ? '⚠️ Thibitisha na afisa ugani au mtaalamu wa kilimo kabla ya kutumia kemikali yoyote.'
        : '⚠️ Confirm with a local agronomist or extension officer before applying any chemical.'
    );
  }

  if (advice.sources.length > 0) {
    const titles = advice.sources.map((s) => s.title).join(', ');
    parts.push(language === 'sw' ? `Vyanzo: ${titles}` : `Sources: ${titles}`);
  }

  if (advice.disclaimer) parts.push(advice.disclaimer);

  return parts.join('\n\n');
}

/**
 * Single entry point for the chat screens: grounded advice when the
 * backend is configured, otherwise lib/ai-demo.ts's honestly-labeled demo
 * reply. Never silently returns a fake "grounded" answer.
 */
export async function askAgriExpertOrDemo(
  query: string,
  opts: { userId?: string; language?: 'sw' | 'en' } = {}
): Promise<string> {
  if (!aiConfigured()) return demoChat(query);
  const advice = await askAgriExpert(query, opts);
  return formatAgriReply(advice, opts.language ?? 'sw');
}
