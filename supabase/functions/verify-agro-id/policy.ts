// KILIMO AI — verify-agro-id response policy (CRE-179 / CRE-83).
//
// Legal ruling (Rex, via Dr Mafie, 2026-10-09): the public Agro-ID
// verification endpoint is fully OFF for real farmers until Linear CRE-83
// (Tanzania regulatory path, incl. the BoT credit-reference-bureau question)
// clears. Every lookup returns 410 Gone and no ledger data is read.
//
// Browsers (a phone camera scanning the QR) get a short, readable EN/SW
// HTML page; API clients get JSON. Nothing from the request is echoed back.
//
// This is hard-off on purpose: there is NO flag or environment variable that
// re-enables it. Turning it back on requires a reviewed code change that
// links Rex's written clearance in CRE-179 / CRE-83.
//
// Pure (no Deno APIs) so it can be unit-tested from jest.

export interface PolicyResponse {
  status: number;
  contentType: string;
  body: string;
}

export const VERIFY_AGRO_ID_HOLD_REASON = 'legal_hold';

export const HOLD_MESSAGE = {
  en: 'Agro-ID verification is unavailable while we complete regulatory registration.',
  sw: 'Uthibitishaji wa Agro-ID haupatikani kwa sasa tunapokamilisha usajili wa kisheria.',
} as const;

const MISSING_MESSAGE = {
  en: 'This verification link is incomplete.',
  sw: 'Kiungo hiki cha uthibitishaji hakijakamilika.',
} as const;

/** HTML for browsers, JSON for everything else (API clients, curl, fetch). */
export function prefersHtml(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const a = accept.toLowerCase();
  if (!a.includes('text/html')) return false;
  // An explicit JSON-first client keeps JSON.
  return (
    a.indexOf('text/html') <
    (a.includes('application/json') ? a.indexOf('application/json') : Infinity)
  );
}

function htmlPage(title: string, msg: { en: string; sw: string }): string {
  return `<!doctype html>
<html lang="sw">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#1f2937;line-height:1.5}h1{font-size:1.15rem}p{margin:.75rem 0}.en{color:#4b5563}</style>
</head>
<body>
<h1>KILIMO AI · Agro-ID</h1>
<p lang="sw">${msg.sw}</p>
<p class="en" lang="en">${msg.en}</p>
</body>
</html>
`;
}

export function verifyAgroIdHoldResponse(
  agroId: string | null | undefined,
  accept?: string | null
): PolicyResponse {
  const html = prefersHtml(accept);
  if (!agroId) {
    return html
      ? {
          status: 400,
          contentType: 'text/html; charset=utf-8',
          body: htmlPage('Agro-ID', MISSING_MESSAGE),
        }
      : {
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ verified: false, reason: 'missing_token' }),
        };
  }
  if (html) {
    return {
      status: 410,
      contentType: 'text/html; charset=utf-8',
      body: htmlPage('Agro-ID', HOLD_MESSAGE),
    };
  }
  return {
    status: 410,
    contentType: 'application/json',
    body: JSON.stringify({
      verified: false,
      history: null,
      reason: VERIFY_AGRO_ID_HOLD_REASON,
      message: HOLD_MESSAGE.en,
      messageSw: HOLD_MESSAGE.sw,
    }),
  };
}
