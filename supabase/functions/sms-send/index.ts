// KILIMO AI — SMS dispatch edge function (Africa's Talking).
//
// Keeps the Africa's Talking credentials server-side. JWT verification is on
// (config.toml). The recipient must be the authenticated user's own phone
// (`auth.users.phone`, set by phone OTP). A per-user window is claimed via
// claim_sms_send before the provider is called.
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
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  SMS_MAX_CHARS,
  SMS_MAX_PER_WINDOW,
  SMS_WINDOW_SECONDS,
  recipientOwnedBy,
  smsEventAllowed,
} from '../_shared/smsPolicy.ts';
import { adminClient, userFromRequest } from '../_shared/user.ts';

const AT_API_KEY = Deno.env.get('AFRICAS_TALKING_API_KEY');
const AT_USERNAME = Deno.env.get('AFRICAS_TALKING_USERNAME');
const AT_SENDER_ID = Deno.env.get('AFRICAS_TALKING_SENDER_ID') ?? '';

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, { ok: false, reason: 'method_not_allowed' }, 405);

  try {
    const user = await userFromRequest(req);
    if (!user?.id) return json(req, { ok: false, reason: 'not_authenticated' }, 401);

    const { to, message, event } = await req.json();
    if (!to || !message) return json(req, { ok: false, reason: 'missing_to_or_message' }, 400);
    if (!smsEventAllowed(event)) return json(req, { ok: false, reason: 'event_not_allowed' }, 403);
    if (!/^\+[1-9]\d{6,14}$/.test(String(to))) {
      return json(req, { ok: false, reason: 'invalid_recipient' }, 400);
    }
    if (String(message).length > SMS_MAX_CHARS) {
      return json(req, { ok: false, reason: 'message_too_long' }, 400);
    }
    if (!recipientOwnedBy(String(to), user.phone)) {
      return json(req, { ok: false, reason: 'recipient_not_owned' }, 403);
    }

    if (!AT_API_KEY || !AT_USERNAME) {
      return json(req, { ok: false, reason: 'sms_provider_not_configured' }, 503);
    }

    const admin = adminClient();
    if (!admin) return json(req, { ok: false, reason: 'rate_limit_unavailable' }, 503);

    const { data: claimed, error: claimErr } = await admin.rpc('claim_sms_send', {
      p_user_id: user.id,
      p_window_seconds: SMS_WINDOW_SECONDS,
      p_max: SMS_MAX_PER_WINDOW,
    });
    if (claimErr) {
      console.error('[sms-send] rate limit', claimErr.message);
      return json(req, { ok: false, reason: 'rate_limit_unavailable' }, 503);
    }
    if (claimed !== true) return json(req, { ok: false, reason: 'rate_limited' }, 429);

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
    if (!res.ok) return json(req, { ok: false, reason: `africastalking_http_${res.status}` }, 502);

    const data = JSON.parse(text);
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') return json(req, { ok: true });
    return json(req, { ok: false, reason: recipient?.status || 'dispatch_failed' }, 502);
  } catch (err: any) {
    console.error('[sms-send]', err);
    return json(req, { ok: false, reason: 'internal_error' }, 500);
  }
});
