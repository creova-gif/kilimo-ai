// KILIMO AI — authoritative Agro-ID minting (server-side).
//
// Generates a high-entropy Agro-ID with the server's CSPRNG and persists it in
// agro_profiles (unique per user). Idempotent: if the caller already has an id,
// it's returned unchanged. JWT verification is on (config.toml) so the caller
// must be authenticated; the id is keyed to *their* user, never client-supplied.
//
// Request body: { docTag?: 'NIDA' | 'TIN' | 'LIC' | 'REG' }
// Response:     { agroId: string } | { error: string }
//
// Required secrets (auto-injected): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   SUPABASE_ANON_KEY.

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const VALID_TAGS = ['NIDA', 'TIN', 'LIC', 'REG'];

function opaque(len = 16): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes); // Deno global CSPRNG
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHA[bytes[i] % ALPHA.length];
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Resolve the caller from their JWT (verify_jwt guarantees one is present).
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await userClient.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return json({ error: 'not_authenticated' }, 401);

    const { docTag } = await req.json().catch(() => ({}));
    const tag = VALID_TAGS.includes(docTag) ? docTag : 'REG';

    // A freshly minted id is 'unverified': minting only proves the account exists.
    // submit-verification moves it to 'pending'; only a reviewer (service role)
    // may set 'verified'.
    // Idempotent: return the existing id if this user already has one.
    const { data: existing, error: readErr } = await admin
      .from('agro_profiles')
      .select('agro_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (readErr) return json({ error: 'lookup_failed' }, 500);
    if (existing?.agro_id) return json({ agroId: existing.agro_id });

    const agroId = `AGRO-2026-${tag}-${opaque()}`;
    const { error: writeErr } = await admin
      .from('agro_profiles')
      .insert({ user_id: userId, agro_id: agroId, verification_status: 'unverified' });
    if (writeErr) {
      // Concurrency: two overlapping requests can both pass the read above and
      // race the insert; the loser hits the user_id uniqueness constraint. Re-read
      // and return the row that won so double-taps/retries stay idempotent.
      const { data: raced } = await admin
        .from('agro_profiles')
        .select('agro_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (raced?.agro_id) return json({ agroId: raced.agro_id });
      return json({ error: 'mint_failed' }, 500);
    }

    return json({ agroId });
  } catch (err: any) {
    console.error('[mint-agro-id]', err);
    return json({ error: 'internal_error' }, 500);
  }
});
