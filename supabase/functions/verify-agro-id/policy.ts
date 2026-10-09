// KILIMO AI — verify-agro-id response policy (CRE-179 / CRE-83).
//
// Legal ruling (Rex, via Dr Mafie, 2026-10-09): the public Agro-ID
// verification endpoint is fully OFF for real farmers until Linear CRE-83
// (Tanzania regulatory path, incl. the BoT credit-reference-bureau question)
// clears. Every lookup returns 410 Gone and no ledger data is read.
//
// This is hard-off on purpose: there is NO flag or environment variable that
// re-enables it. Turning it back on requires a reviewed code change that
// links Rex's written clearance in CRE-179 / CRE-83.
//
// Pure (no Deno APIs) so it can be unit-tested from jest.

export interface PolicyResponse {
  status: number;
  body: Record<string, unknown>;
}

export const VERIFY_AGRO_ID_HOLD_REASON = 'legal_hold';

export function verifyAgroIdHoldResponse(agroId: string | null | undefined): PolicyResponse {
  if (!agroId) return { status: 400, body: { verified: false, reason: 'missing_token' } };
  return {
    status: 410,
    body: {
      verified: false,
      history: null,
      reason: VERIFY_AGRO_ID_HOLD_REASON,
      message: 'Agro-ID verification is unavailable while we complete regulatory registration.',
      messageSw:
        'Uthibitishaji wa Agro-ID haupatikani kwa sasa tunapokamilisha usajili wa kisheria.',
    },
  };
}
