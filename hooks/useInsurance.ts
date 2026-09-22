import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createClaim,
  createPolicy,
  deleteClaim,
  deletePolicy,
  failed,
  fetchClaims,
  fetchPolicies,
  updateClaimStatus,
  updatePolicyStatus,
  type ClaimInput,
  type ClaimStatus,
  type InsuranceClaim,
  type InsurancePolicy,
  type PolicyInput,
  type PolicyStatus,
} from '../lib/insurance';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type InsuranceError = 'not_configured' | 'error' | null;
export type InsuranceWriteReason = 'offline' | 'not_configured' | 'invalid' | 'error';
type WriteFail = { ok: false; reason: InsuranceWriteReason; message?: string };

/**
 * The signed-in farmer's own insurance policy and claim RECORDS. Empty means empty — no seed policies,
 * and no insurer is ever contacted. Writes are online-only: while offline they refuse with
 * `reason: 'offline'`.
 */
export function useInsurance() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<InsuranceError>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const client = getSupabase();
    const [p, c] = await Promise.all([fetchPolicies(client), fetchClaims(client)]);
    if (mine !== seq.current) return;
    if (p.ok && c.ok) {
      setPolicies(p.policies);
      setClaims(c.claims);
      setError(null);
      setLoaded(true);
    } else {
      const notConfigured =
        (failed(p) && p.reason === 'not_configured') || (failed(c) && c.reason === 'not_configured');
      setError(notConfigured ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const addPolicy = useCallback(
    async (input: PolicyInput): Promise<{ ok: true; policy: InsurancePolicy } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await createPolicy(getSupabase(), input);
      if (r.ok) setPolicies((prev) => [r.policy, ...prev]);
      return r;
    },
    [isOffline]
  );

  const setPolicyStatus = useCallback(
    async (id: string, status: PolicyStatus): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await updatePolicyStatus(getSupabase(), id, status);
      if (r.ok) setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      return r;
    },
    [isOffline]
  );

  const removePolicy = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await deletePolicy(getSupabase(), id);
      if (r.ok) {
        setPolicies((prev) => prev.filter((p) => p.id !== id));
        setClaims((prev) => prev.filter((c) => c.policyId !== id)); // ON DELETE CASCADE
      }
      return r;
    },
    [isOffline]
  );

  const addClaim = useCallback(
    async (input: ClaimInput): Promise<{ ok: true; claim: InsuranceClaim } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await createClaim(getSupabase(), input);
      if (r.ok) setClaims((prev) => [r.claim, ...prev]);
      return r;
    },
    [isOffline]
  );

  const setClaimStatus = useCallback(
    async (id: string, status: ClaimStatus): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await updateClaimStatus(getSupabase(), id, status);
      if (r.ok) setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      return r;
    },
    [isOffline]
  );

  const removeClaim = useCallback(
    async (id: string): Promise<{ ok: true } | WriteFail> => {
      if (isOffline) return { ok: false, reason: 'offline' };
      const r = await deleteClaim(getSupabase(), id);
      if (r.ok) setClaims((prev) => prev.filter((c) => c.id !== id));
      return r;
    },
    [isOffline]
  );

  return {
    policies,
    claims,
    loading,
    loaded,
    error,
    isOffline,
    refresh: load,
    addPolicy,
    setPolicyStatus,
    removePolicy,
    addClaim,
    setClaimStatus,
    removeClaim,
  };
}
