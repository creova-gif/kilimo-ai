// KILIMO AI — public Agro-ID verification endpoint.
//
// Backs the QR code on the Agro-ID passport. A bank / buyer / cooperative
// scans the QR (https://<project>.functions.supabase.co/verify-agro-id?id=...).
// It is intentionally public (no JWT); see supabase/config.toml.
//
// CRE-179 / CRE-83 — HARD OFF. Legal ruling (Rex, via Dr Mafie,
// 2026-10-09): sharing a ledger-derived financial signal (entry count,
// history span, net band) with third parties is off for real farmers until
// CRE-83 clears. Every lookup returns 410 Gone. The function no longer
// creates a service-role client or reads agro_profiles / agro_ledger_summary,
// and there is deliberately NO flag or env var that turns it back on. See
// ./policy.ts. Re-enabling it is a reviewed code change linked to Rex's
// written clearance.

// @ts-nocheck — Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { verifyAgroIdHoldResponse } from './policy.ts';

serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });

  const url = new URL(req.url);
  // Accept `token` (preferred) and fall back to `id` for older QR codes.
  const agroId = url.searchParams.get('token') ?? url.searchParams.get('id');
  const { status, body } = verifyAgroIdHoldResponse(agroId);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
});
