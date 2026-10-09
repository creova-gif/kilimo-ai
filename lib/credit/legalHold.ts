/**
 * KILIMO AI — Agro-ID sharing legal hold (CRE-179 / CRE-83).
 *
 * Legal ruling (Rex, via Dr Mafie, 2026-10-09): a farmer's ledger-derived
 * financial record must not be offered to third parties (banks, buyers,
 * cooperatives) until CRE-83 clears. That covers the verification QR (the
 * verify-agro-id endpoint now returns 410) and the "verified" P&L PDF.
 *
 * Hard-off on purpose: a code constant, not a flag or env var. Lifting it is
 * a reviewed change that links Rex's written clearance in CRE-179 / CRE-83.
 */

export const AGRO_ID_SHARING_ON_HOLD: boolean = true;

export const SHARING_PAUSED_COPY = {
  title: { en: 'Sharing paused', sw: 'Kushiriki kumesimamishwa' },
  body: {
    en: 'Sharing your Agro-ID record with banks, buyers or cooperatives is paused while we complete regulatory registration. Your records stay on this device.',
    sw: 'Kushiriki rekodi yako ya Agro-ID na benki, wanunuzi au vyama vya ushirika kumesimamishwa kwa sasa tunapokamilisha usajili wa kisheria. Rekodi zako zinabaki kwenye kifaa hiki.',
  },
} as const;

/**
 * Whether the Agro-ID may be shared as a verification QR or a "Verified"
 * P&L PDF. Under the hold: never. That includes synthetic-only ledgers,
 * because the PDF is labelled "Verified · Tamper-evident" and the QR target
 * returns 410.
 */
export function agroIdSharingAllowed(onHold: boolean = AGRO_ID_SHARING_ON_HOLD): boolean {
  return onHold !== true;
}
