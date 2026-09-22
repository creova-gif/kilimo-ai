/**
 * KILIMO AI — former "demo response engine" (retired).
 *
 * This module used to return canned Swahili chat answers (including invented
 * market prices and weather forecasts) and randomly-picked crop diagnoses
 * whenever no AI backend was configured, presented as if they were real
 * results. That violated the no-fake-data rule, so:
 *
 *  - `demoChat` is gone. Text questions go to lib/rag.ts, which answers from
 *    the real Kilimo knowledge base even without a provider key.
 *  - `demoDiagnosis` is kept ONLY as a compatibility shim for
 *    components/diseaseModal.tsx (owned elsewhere). It never fabricates a
 *    diagnosis: it rejects with AIError('not_configured'), so the caller's
 *    existing failure path shows an error instead of a made-up disease.
 *    New code must not import this file.
 */
import { AIError, type VisionDiagnosis } from './ai';

export async function demoDiagnosis(): Promise<VisionDiagnosis> {
  throw new AIError('AI diagnosis is not available in this build', 'not_configured');
}
