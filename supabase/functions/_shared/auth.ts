// @ts-nocheck — Deno runtime.
//
// Shared caller authentication for edge functions.
//
// IMPORTANT: `verify_jwt = true` in config.toml only proves the bearer token is
// a *validly signed* JWT. The public `anon` key that ships inside the app bundle
// IS a validly signed JWT (role = anon), so it passes the gateway check. Any
// function that spends money or touches per-user data must therefore also
// resolve a real signed-in *user* from the token, which is what this does:
// GoTrue's /user endpoint rejects the anon key (no `sub`) and accepts only a
// live user session.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getCallerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}
