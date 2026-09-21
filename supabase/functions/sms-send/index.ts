// KILIMO AI — SMS dispatch edge function (Africa's Talking).
//
// Keeps the Africa's Talking credentials server-side so the mobile client
// never holds an SMS-sending key. JWT verification is on by default (see
// supabase/config.toml), so callers must present a valid Supabase session.
//
// Request body: { to: string (E.164), message: string, event?: string, meta?: object }
// Response:     { ok: boolean, reason?: string }
//
// Required edge-function secrets (set via `supabase secrets set ...`):
//   AFRICAS_TALKING_API_KEY
//   AFRICAS_TALKING_USERNAME
//   AFRICAS_TALKING_SENDER_ID   (optional)

// @ts-nocheck — Deno runtime; types are not available in the Expo TS project.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getCallerId } from '../_shared/auth.ts';

const AT_API_KEY = Deno.env.get('AFRICAS_TALKING_API_KEY');
const AT_USERNAME = Deno.env.get('AFRICAS_TALKING_USERNAME');
const AT_SENDER_ID = Deno.env.get('AFRICAS_TALKING_SENDER_ID') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require a real signed-in user (the public anon key passes verify_jwt too;
  // without this anyone with the app's anon key could burn SMS credits).
  if (!(await getCallerId(req))) return json({ ok: false, reason: 'not_authenticated' }, 401);

  if (!AT_API_KEY || !AT_USERNAME) {
    return json({ ok: false, reason: 'sms_provider_not_configured' }, 503);
  }

  try {
    const { to, message, event } = await req.json();
    if (!to || !message) return json({ ok: false, reason: 'missing_to_or_message' }, 400);

    // Authorization gate beyond bare JWT auth: verify_jwt only proves the caller
    // is *authenticated*, not that they're *authorized* to spend SMS credits.
    // Constrain what an authenticated caller can dispatch so this endpoint can't
    // be abused as a general-purpose SMS cannon:
    //   • only the app's known notification events are allowed
    //   • recipient must be a valid E.164 number
    //   • body length is capped (one or two SMS segments)
    // NOTE: a per-user ownership/rate-limit check (only send to the caller's own
    // verified number) is the recommended next layer once the profiles schema
    // is wired in here.
    const ALLOWED_EVENTS = ['critical_diagnosis', 'price_alert', 'severe_weather', 'payment_received'];
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return json({ ok: false, reason: 'event_not_allowed' }, 403);
    }
    if (!/^\+[1-9]\d{6,14}$/.test(String(to))) {
      return json({ ok: false, reason: 'invalid_recipient' }, 400);
    }
    if (String(message).length > 320) {
      return json({ ok: false, reason: 'message_too_long' }, 400);
    }

    const details: Record<string, string> = { username: AT_USERNAME, to, message };
    if (AT_SENDER_ID) details.from = AT_SENDER_ID;

    const formBody = Object.entries(details)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: AT_API_KEY,
      },
      body: formBody,
    });

    const text = await res.text();
    if (!res.ok) return json({ ok: false, reason: `africastalking_http_${res.status}` }, 502);

    const data = JSON.parse(text);
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') return json({ ok: true });
    return json({ ok: false, reason: recipient?.status || 'dispatch_failed' }, 502);
  } catch (err: any) {
    console.error('[sms-send]', err);
    return json({ ok: false, reason: err?.message ?? 'internal_error' }, 500);
  }
});
