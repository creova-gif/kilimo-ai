import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createConsultation,
  fetchMyConsultations,
  type ConsultationInput,
  type ConsultationRequest,
} from '../lib/community';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type ConsultationsError = 'not_configured' | 'error' | null;

export interface SubmitResult {
  ok: boolean;
  request?: ConsultationRequest;
  reason?: 'offline' | 'not_configured' | 'not_signed_in' | 'invalid' | 'error';
}

/**
 * The signed-in user's real consultation requests. Empty means empty — there are no seeded sessions.
 * Submitting is online-only: offline returns `offline` and nothing is queued or pretended.
 * The status shown is whatever the server holds; this hook can never change it.
 */
export function useConsultations(userId: string | null) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ConsultationsError>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchMyConsultations(getSupabase());
    if (mine !== seq.current) return;
    if (r.ok) {
      setRequests(r.requests);
      setError(null);
      setLoaded(true);
    } else {
      setError(r.reason === 'not_configured' ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (input: ConsultationInput): Promise<SubmitResult> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      if (!userId) return { ok: false, reason: 'not_signed_in' };
      const r = await createConsultation(getSupabase(), userId, input);
      if (!r.ok) return { ok: false, reason: r.reason };
      // Show the row the server stored, not a locally-built one.
      setRequests((prev) => [r.request, ...prev.filter((x) => x.id !== r.request.id)]);
      setLoaded(true);
      return { ok: true, request: r.request };
    },
    [isOffline, userId]
  );

  return { requests, loading, loaded, error, isOffline, refresh: load, submit };
}
