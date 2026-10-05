// KILIMO AI — submit a KYC verification request (server-side, authenticated).
//
// Backs app/verification/{business,personal}.tsx. The caller submits their
// documents; we persist a verification_requests row and flip their
// agro_profiles.verification_status to 'pending' for reviewer follow-up.
//
// JWT verification is ON (config.toml) so the caller is resolved from their own
// token — a caller can only ever file a request for themselves.
//
// Required secrets (auto-injected): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   SUPABASE_ANON_KEY.

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('submit-verification: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const VALID_TYPES = ['personal', 'business'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    // Resolve the caller from their JWT (verify_jwt guarantees one is present).
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await userClient.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return json({ error: 'not_authenticated' }, 401);

    const body = await req.json().catch(() => ({}));
    const verificationType = body?.verificationType;
    if (!VALID_TYPES.includes(verificationType)) {
      return json({ error: 'invalid_verification_type' }, 400);
    }

    // Store only the document fields, never client-supplied identity/ids.
    const payload: Record<string, unknown> = {};
    for (const k of ['tin', 'regNumber', 'nationalId', 'businessName', 'notes']) {
      if (body?.[k] != null && String(body[k]).trim() !== '') payload[k] = body[k];
    }

    const { error: insErr } = await admin.from('verification_requests').insert({
      user_id: userId,
      verification_type: verificationType,
      payload,
    });
    if (insErr) return json({ error: 'insert_failed', detail: insErr.message }, 500);

    // Flip the profile to pending (best-effort; row may not exist yet pre-mint).
    await admin
      .from('agro_profiles')
      .update({ verification_status: 'pending' })
      .eq('user_id', userId);

    return json({ ok: true, status: 'pending' });
  } catch (err) {
    return json({ error: 'unexpected', detail: String(err?.message ?? err) }, 500);
  }
});
