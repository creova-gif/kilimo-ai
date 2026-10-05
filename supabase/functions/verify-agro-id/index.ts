// KILIMO AI — public Agro-ID verification endpoint.
//
// Backs the QR code on the Agro-ID passport. A bank / buyer / cooperative
// scans the QR (https://<project>.functions.supabase.co/verify-agro-id?id=...)
// and gets back a NON-PII attestation: that the ID exists, how long the
// verified financial history spans, entry count, and net position band — never
// raw transactions or personal data.
//
// This endpoint is intentionally public (no JWT) so third parties can verify
// without an account, but it reads through the service role and returns only
// aggregate, non-identifying figures.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected).

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function netBand(net: number): string {
  if (net >= 2_000_000) return 'strong';
  if (net >= 500_000) return 'healthy';
  if (net >= 0) return 'positive';
  return 'building';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });

  const url = new URL(req.url);
  // Accept `token` (preferred) and fall back to `id` for older QR codes.
  const agroId = url.searchParams.get('token') ?? url.searchParams.get('id');
  if (!agroId) return json(req, { verified: false, reason: 'missing_token' }, 400);

  try {
    // Map the public Agro-ID to a user. Select ONLY the join key — no PII
    // (name/region) is ever returned on this unauthenticated endpoint, so a
    // guessed/enumerated ID cannot be used to identify a farmer.
    const { data: profile, error: profileErr } = await admin
      .from('agro_profiles')
      .select('user_id')
      .eq('agro_id', agroId)
      .maybeSingle();

    // Distinguish a backend failure (500) from a genuinely missing ID (404);
    // never let an outage masquerade as a verification result.
    if (profileErr) return json(req, { verified: false, reason: 'lookup_failed' }, 500);
    if (!profile) return json(req, { verified: false, reason: 'not_found' }, 404);

    const { data: summary, error: summaryErr } = await admin
      .from('agro_ledger_summary')
      .select('*')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (summaryErr) return json(req, { verified: false, reason: 'lookup_failed' }, 500);

    // Non-PII attestation only: existence + aggregate, non-identifying history.
    return json(req, {
      verified: true,
      history: summary
        ? {
            entryCount: summary.entry_count,
            firstEntryAt: summary.first_entry_at,
            lastEntryAt: summary.last_entry_at,
            netBand: netBand(summary.net_tzs),
          }
        : null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[verify-agro-id]', err);
    return json(req, { verified: false, reason: 'internal_error' }, 500);
  }
});
