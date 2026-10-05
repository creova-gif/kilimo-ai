// Browser CORS allowlist for edge functions.
//
// Native clients do not send Origin, so they are unaffected. Browsers only
// receive Access-Control-Allow-Origin when the request Origin is on the list.
// `*` is never emitted. Extra origins (comma-separated, no wildcards) can be
// added with the ALLOWED_ORIGINS secret without widening the default list.

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'https://kilimo.tz',
  'https://www.kilimo.tz',
] as const;

export function parseExtraOrigins(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '*');
}

export function allowedOriginList(extraRaw?: string | null): string[] {
  return [...DEFAULT_ALLOWED_ORIGINS, ...parseExtraOrigins(extraRaw)];
}

export function corsHeadersForOrigin(
  origin: string | null,
  allowed: readonly string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function extraFromEnv(): string | undefined {
  const g = globalThis as {
    Deno?: { env: { get(name: string): string | undefined } };
  };
  return g.Deno?.env.get('ALLOWED_ORIGINS');
}

export function corsHeadersFor(req: {
  headers: { get(name: string): string | null };
}): Record<string, string> {
  return corsHeadersForOrigin(req.headers.get('Origin'), allowedOriginList(extraFromEnv()));
}
