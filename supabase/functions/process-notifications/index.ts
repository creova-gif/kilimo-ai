import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'

// Lazily construct the OpenAI client INSIDE the handler. Building it at module
// load with a missing OPENAI_API_KEY throws at cold start, which crashes the
// whole function (500) before the auth guard below can run. Lazy init keeps the
// endpoint locked (401) even when the key isn't configured yet.
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// This function runs with verify_jwt = false (pg_cron has no user JWT), so the
// gateway does NOT authenticate callers — the function MUST do it itself, or the
// endpoint is world-open (triggering OpenAI spend + notification inserts).
// The pg_cron job must send  `x-cron-secret: <CRON_SECRET>`.
// Set it once with:  supabase secrets set CRON_SECRET=<random>
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

serve(async (req) => {
  // Only allow POST requests (usually from pg_cron)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Require the shared cron secret. Fail closed if it isn't configured.
  const provided = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Users eligible for notifications
    // E.g., haven't received one in the last 24 hours, and allow_push is true
    const { data: users, error } = await supabase
      .from('user_notification_preferences')
      .select('user_id, allow_push, allow_sms, weather_alerts, market_alerts, push_token')
      .eq('allow_push', true)
      .is('last_insight_sent_at', null) // Simplified for scaffold. In production: < NOW() - INTERVAL '1 day'
      .limit(50)

    if (error || !users?.length) {
      return new Response(JSON.stringify({ status: 'no users to notify' }), { headers: { "Content-Type": "application/json" } })
    }

    const notificationsToSend = []
    const pushMessages = [] // Expo push payloads for users with a registered token

    // 2. Generate and Send Notifications
    for (const user of users) {
      // In a real implementation, you'd fetch user-specific triggers here
      // E.g., "Is there a storm in Arusha?" or "Did Maize price spike?"
      const triggerContext = "Heavy rain expected tomorrow in your registered farm area."

      // Generate localized, non-spammy message
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful agronomist sending a brief SMS/Push notification to a farmer. Keep it under 100 characters. Use Swahili." },
          { role: "user", content: `Context to notify about: ${triggerContext}` }
        ],
        temperature: 0.5,
      })

      const messageBody = completion.choices[0].message.content

      const title = 'Taarifa ya Hali ya Hewa'

      // Prepare notification log
      notificationsToSend.push({
        user_id: user.user_id,
        title,
        body: messageBody,
        type: 'weather_alert',
        delivery_method: 'push',
      })

      // Queue an Expo push if the user has a registered token.
      if (user.push_token) {
        pushMessages.push({
          to: user.push_token,
          sound: 'default',
          title,
          body: messageBody,
          data: { type: 'weather_alert' },
        })
      }
    }

    // 2b. Deliver via the Expo Push API (batched, max 100 per request).
    let pushSent = 0
    for (let i = 0; i < pushMessages.length; i += 100) {
      const batch = pushMessages.slice(i, i + 100)
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(batch),
        })
        if (res.ok) pushSent += batch.length
        else console.error('Expo push batch failed:', res.status, await res.text())
      } catch (e) {
        console.error('Expo push batch error:', e)
      }
    }

    // 3. Log to database to prevent spam
    if (notificationsToSend.length > 0) {
      await supabase.from('user_notifications').insert(notificationsToSend)
      
      // Update last_insight_sent_at
      const userIds = notificationsToSend.map(n => n.user_id)
      await supabase
        .from('user_notification_preferences')
        .update({ last_insight_sent_at: new Date().toISOString() })
        .in('user_id', userIds)
    }

    return new Response(
      JSON.stringify({ status: 'success', processed: notificationsToSend.length, pushSent }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error processing notifications:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
