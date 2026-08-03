// KILIMO AI — account deletion (server-side, authenticated).
//
// Required by Apple App Store guideline 5.1.1(v) and Google Play's data-deletion
// policy: any app that lets users create an account must let them delete it (and
// their data) from within the app.
//
// JWT verification is ON (config.toml) so the caller must be authenticated. The
// user is resolved from *their own* JWT — a caller can only ever delete
// themselves, never an id supplied in the request body.
//
// Deleting the auth user cascades to every user-owned table
// (agro_profiles, agro_ledger, user_notification_preferences, user_notifications)
// because each declares `references auth.users(id) on delete cascade`. We also
// issue explicit deletes first as belt-and-suspenders in case a future table is
// added without the cascade.
//
// Required secrets (auto-injected): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   SUPABASE_ANON_KEY.

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Fail fast at cold start rather than with an opaque 500 mid-request.
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('delete-account: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
// Edge Functions are stateless — no session persistence for the admin client.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// User-owned tables purged before the auth row is removed.
const USER_TABLES = [
  'agro_ledger',
  'agro_profiles',
  'user_notification_preferences',
  'user_notifications',
];

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

    // Explicit data purge (cascade also covers this on auth-user deletion).
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      // A missing table or already-empty result is not fatal; keep going.
      if (error && !/does not exist/i.test(error.message ?? '')) {
        return json({ error: `purge_failed:${table}`, detail: error.message }, 500);
      }
    }

    // Remove the auth identity itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: 'auth_delete_failed', detail: delErr.message }, 500);

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'unexpected', detail: String(err?.message ?? err) }, 500);
  }
});
