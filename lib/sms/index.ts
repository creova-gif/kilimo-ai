/**
 * Kilimo AI — SMS Adapter
 *
 * Dispatches SMS through the Supabase `sms-send` edge function so the Africa's
 * Talking credentials NEVER ship inside the mobile bundle. When no backend is
 * configured (dev / offline), it degrades to a logged in-app notification so
 * the channel is still observable.
 *
 * SECURITY: do not reintroduce EXPO_PUBLIC_AT_* / EXPO_PUBLIC_AFRICAS_TALKING_*
 * here. SMS credentials are billable — a leaked key lets anyone send SMS on
 * your account. The provider call lives in supabase/functions/sms-send.
 *
 * The Notification Delivery Matrix (PRD 2.2) routes through here for all
 * SMS-backed events: critical diagnosis, price alerts, severe weather.
 */

import { useKilimoStore } from '../../store/useKilimoStore';
import { getSupabase, invokeAuthedFunction } from '../supabase';

export type SmsEvent = 'critical_diagnosis' | 'price_alert' | 'severe_weather' | 'payment_received';

export interface SmsPayload {
  to: string; // E.164, e.g. "+255712345678"
  body: string; // Plain text, < 160 chars ideally
  event: SmsEvent;
  meta?: Record<string, unknown>;
}

export async function sendSms(payload: SmsPayload): Promise<{ ok: boolean; reason?: string }> {
  if (!getSupabase()) {
    if (__DEV__)
      console.log('[SMS:stub]', payload.event, '→', maskNumber(payload.to), '· [redacted]');

    // Mirror to in-app notification so the user sees the channel firing
    useKilimoStore.getState().addNotification({
      title: `[SMS Stub] ${labelForEvent(payload.event)}`,
      body: `Would send to ${maskNumber(payload.to)}: ${payload.body}`,
      type: 'info',
    });

    return { ok: false, reason: 'sms_backend_not_configured' };
  }

  try {
    const { data, error } = await invokeAuthedFunction<{ ok?: boolean; reason?: string }>(
      'sms-send',
      {
        body: { to: payload.to, message: payload.body, event: payload.event, meta: payload.meta },
      }
    );
    if (error) {
      if (error.status === 401 || error.message === 'not_authenticated') {
        return { ok: false, reason: 'not_authenticated' };
      }
      // The edge function returns structured reasons (e.g. sms_provider_not_configured)
      // in the response body; on a non-2xx status supabase-js surfaces that body via
      // error.context, so read it before falling back to the generic message.
      let reason = error.message || 'sms_invoke_error';
      try {
        const body = await (error as any).context?.json?.();
        if (body?.reason) reason = body.reason;
      } catch {
        /* body not JSON / already consumed — keep message fallback */
      }
      console.error('[SMS:edge] invoke error:', reason);
      return { ok: false, reason };
    }
    if (data?.ok) return { ok: true };
    return { ok: false, reason: data?.reason || 'dispatch_failed' };
  } catch (err: any) {
    console.error('[SMS:edge] Network exception:', err);
    return { ok: false, reason: err.message || 'network_exception' };
  }
}

function labelForEvent(e: SmsEvent): string {
  switch (e) {
    case 'critical_diagnosis':
      return 'Critical Diagnosis';
    case 'price_alert':
      return 'Price Alert';
    case 'severe_weather':
      return 'Severe Weather';
    case 'payment_received':
      return 'Payment Received';
  }
}

function maskNumber(n: string): string {
  if (n.length < 6) return n;
  return n.slice(0, 4) + '••••' + n.slice(-3);
}
