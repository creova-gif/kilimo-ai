#!/usr/bin/env bash
# KILIMO AI — end-to-end smoke/RLS test against the LOCAL Supabase stack.
#
# Real HTTP calls only (curl → Kong → GoTrue / PostgREST / Edge Runtime). Prints
# every request, its status, and PASS/FAIL. Exits non-zero if anything fails.
# Re-runnable: creates fresh users each run (timestamped emails).
#
#   scripts/local-backend.sh up      # stack must be running
#   scripts/local-backend-smoke.sh
#
# Needs: curl, jq. Never touches any cloud project (URL is hard-wired to local).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="${LOCAL_SUPABASE_URL:-http://127.0.0.1:54321}"
case "$API" in http://127.0.0.1:*|http://localhost:*) ;; *) echo "refusing non-local URL: $API" >&2; exit 2;; esac

ENVOUT="$(cd "$ROOT" && supabase status -o env 2>/dev/null)"
ANON="$(printf '%s\n' "$ENVOUT" | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
SERVICE="$(printf '%s\n' "$ENVOUT" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
[ -n "$ANON" ] && [ -n "$SERVICE" ] || { echo "stack not running? run scripts/local-backend.sh up" >&2; exit 2; }
CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' "$ROOT/supabase/.env.local" 2>/dev/null)"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
RUN="$(date +%s)"
PASS=0; FAIL=0; STATUS=""; BODY=""; LAST=""

# req METHOD PATH TOKEN [DATA] [extra header]...   → sets STATUS, BODY
req() {
  local method="$1" path="$2" tok="$3" data="${4:-}"; local extra=(); [ $# -gt 4 ] && extra=("${@:5}")
  local args=(-s -o "$TMP/body" -w '%{http_code}' --max-time 90 -X "$method"
              -H "apikey: ${APIKEY_OVERRIDE:-$ANON}" -H "Content-Type: application/json")
  [ -n "$tok" ] && args+=(-H "Authorization: Bearer $tok")
  local h; for h in ${extra[@]+"${extra[@]}"}; do [ -n "$h" ] && args+=(-H "$h"); done
  [ -n "$data" ] && args+=(-d "$data")
  STATUS="$(curl "${args[@]}" "$API$path")"; BODY="$(cat "$TMP/body")"
  LAST="$method $path"
}
short() { printf '%s' "$BODY" | tr -d '\n' | cut -c1-${2:-110}; }
report() { # name ok
  if [ "$2" = 1 ]; then PASS=$((PASS+1)); printf 'PASS  %-58s %s -> %s\n' "$1" "$LAST" "$STATUS"
  else FAIL=$((FAIL+1)); printf 'FAIL  %-58s %s -> %s  body=%s\n' "$1" "$LAST" "$STATUS" "$(short)"; fi
}
status() { # name expected-regex
  [[ "$STATUS" =~ ^($2)$ ]] && report "$1" 1 || report "$1 (want $2)" 0
}
jqeq() { # name filter expected
  local got; got="$(printf '%s' "$BODY" | jq -r "$2" 2>/dev/null)"
  [ "$got" = "$3" ] && report "$1" 1 || report "$1 (want '$3', got '$got')" 0
}
both() { # name expected-status-regex filter expected
  local got; got="$(printf '%s' "$BODY" | jq -r "$3" 2>/dev/null)"
  if [[ "$STATUS" =~ ^($2)$ ]] && [ "$got" = "$4" ]; then report "$1" 1
  else report "$1 (want $2 & '$4', got '$got')" 0; fi
}
section() { printf '\n== %s ==\n' "$1"; }
token_of() { printf '%s' "$BODY" | jq -r '.access_token // empty'; }
SVC() { APIKEY_OVERRIDE="$SERVICE" req "$1" "$2" "$SERVICE" "${3:-}" "${@:4}"; }

PW='Passw0rd!local-test'
EA="farmer.a.$RUN@example.test"; EB="farmer.b.$RUN@example.test"; EC="farmer.c.$RUN@example.test"

section "1. AUTH — email signup / login / refresh"
req POST /auth/v1/signup "" "{\"email\":\"$EA\",\"password\":\"$PW\"}"
status "email signup A" 200
A_TOK="$(token_of)"; A_ID="$(printf '%s' "$BODY" | jq -r '.user.id')"; A_REFRESH="$(printf '%s' "$BODY" | jq -r '.refresh_token')"
[ -n "$A_TOK" ] && report "signup returns access_token (autoconfirm on)" 1 || report "signup returns access_token" 0
req POST /auth/v1/signup "" "{\"email\":\"$EA\",\"password\":\"$PW\"}"
status "duplicate signup A rejected" '4[0-9][0-9]'
req POST "/auth/v1/token?grant_type=password" "" "{\"email\":\"$EA\",\"password\":\"$PW\"}"
status "email login A" 200; A_TOK="$(token_of)"; A_REFRESH="$(printf '%s' "$BODY" | jq -r '.refresh_token')"
req POST "/auth/v1/token?grant_type=password" "" "{\"email\":\"$EA\",\"password\":\"wrong-password\"}"
status "wrong password rejected" 400
req GET /auth/v1/user "$A_TOK"
both "GET /user returns A's email" 200 '.email' "$EA"
req POST "/auth/v1/token?grant_type=refresh_token" "" "{\"refresh_token\":\"$A_REFRESH\"}"
status "token refresh A" 200
NEW_TOK="$(token_of)"; [ -n "$NEW_TOK" ] && report "refresh returns new access_token" 1 || report "refresh returns new access_token" 0
A_TOK="$NEW_TOK"
req POST "/auth/v1/token?grant_type=refresh_token" "" "{\"refresh_token\":\"$A_REFRESH\"}"
status "reused (rotated) refresh token rejected or in reuse window" '200|400'
req POST /auth/v1/signup "" "{\"email\":\"$EB\",\"password\":\"$PW\"}"
status "email signup B" 200; B_TOK="$(token_of)"; B_ID="$(printf '%s' "$BODY" | jq -r '.user.id')"

section "2. AUTH — phone OTP with the fixed local test number"
PHONE_LOCAL=255700000001
req POST /auth/v1/otp "" "{\"phone\":\"+$PHONE_LOCAL\"}"
status "OTP request (+255700000001)" 200
req POST /auth/v1/verify "" "{\"phone\":\"+$PHONE_LOCAL\",\"token\":\"000000\",\"type\":\"sms\"}"
status "wrong OTP rejected" '4[0-9][0-9]'
req POST /auth/v1/verify "" "{\"phone\":\"+$PHONE_LOCAL\",\"token\":\"123456\",\"type\":\"sms\"}"
status "OTP verify 123456" 200
P_TOK="$(token_of)"; P_REFRESH="$(printf '%s' "$BODY" | jq -r '.refresh_token')"
jqeq "OTP session user has phone $PHONE_LOCAL" '.user.phone' "$PHONE_LOCAL"
[ -n "$P_TOK" ] && report "OTP session has access_token" 1 || report "OTP session has access_token" 0
req POST "/auth/v1/token?grant_type=refresh_token" "" "{\"refresh_token\":\"$P_REFRESH\"}"
status "phone-session token refresh" 200

section "3. USER-SCOPED ROUND TRIP as A (agro id, profile, ledger, market, tasks, notifications)"
req POST /functions/v1/mint-agro-id "$A_TOK" '{"docTag":"NIDA"}'
status "mint-agro-id (A)" 200; AGRO="$(printf '%s' "$BODY" | jq -r '.agroId')"
[[ "$AGRO" =~ ^AGRO-2026-NIDA-[A-Z0-9]{16}$ ]] && report "agro id format AGRO-2026-NIDA-<16>" 1 || report "agro id format ($AGRO)" 0
req POST /functions/v1/mint-agro-id "$A_TOK" '{"docTag":"TIN"}'
both "mint-agro-id idempotent (same id)" 200 '.agroId' "$AGRO"
req GET "/rest/v1/agro_profiles?select=*" "$A_TOK"
both "A reads own agro_profiles (1 row)" 200 'length' 1
jqeq "  new agro id verification_status = unverified" '.[0].verification_status' unverified
req POST /rest/v1/rpc/get_my_agro_id "$A_TOK" '{}'
both "rpc get_my_agro_id returns AgroID shape" 200 '.id' "$AGRO"
req POST /rest/v1/agro_profiles "$A_TOK" "{\"user_id\":\"$A_ID\",\"agro_id\":\"AGRO-FORGED\"}"
status "A cannot forge an agro_profiles row" '401|403'

req POST /rest/v1/farmer_profiles "$A_TOK" "{\"user_id\":\"$A_ID\",\"name\":\"Amina A\",\"role\":\"farmer\",\"region\":\"Mbeya\",\"primary_crops\":[\"maize\",\"beans\"],\"farm_size_acres\":3.5,\"main_activity\":\"mazao\",\"has_livestock\":false,\"has_irrigation\":true,\"language\":\"sw\"}" "Prefer: resolution=merge-duplicates,return=representation"
status "farmer_profiles upsert (insert path)" '200|201'
req POST /rest/v1/farmer_profiles "$A_TOK" "{\"user_id\":\"$A_ID\",\"name\":\"Amina A\",\"region\":\"Arusha\"}" "Prefer: resolution=merge-duplicates,return=representation"
status "farmer_profiles upsert (update path)" '200|201'
req GET "/rest/v1/farmer_profiles?select=name,region,primary_crops" "$A_TOK"
both "A reads own farmer_profile (region updated)" 200 '.[0].region' Arusha
req POST /rest/v1/rpc/get_my_agro_id "$A_TOK" '{}'
both "get_my_agro_id now carries profile name/location" 200 '.name + "/" + .location' "Amina A/Arusha"

req POST /rest/v1/agro_ledger "$A_TOK" "{\"user_id\":\"$A_ID\",\"client_id\":\"c-$RUN-1\",\"entry_date\":\"2026-09-01T00:00:00Z\",\"category\":\"sales\",\"description\":\"maize sale\",\"amount_tzs\":250000}"
status "ledger insert (self_reported)" 201
req POST /rest/v1/agro_ledger "$A_TOK" "{\"user_id\":\"$A_ID\",\"client_id\":\"c-$RUN-2\",\"entry_date\":\"2026-09-01T00:00:00Z\",\"category\":\"sales\",\"description\":\"fake\",\"amount_tzs\":999999999,\"verified\":true}"
status "ledger insert with verified=true rejected" '401|403'
req PATCH "/rest/v1/agro_ledger?client_id=eq.c-$RUN-1" "$A_TOK" '{"amount_tzs":1}' "Prefer: return=representation"
status "ledger UPDATE denied (append-only)" '401|403'
req DELETE "/rest/v1/agro_ledger?client_id=eq.c-$RUN-1" "$A_TOK"
status "ledger DELETE denied (append-only)" '401|403'
req GET "/rest/v1/agro_ledger?select=client_id,amount_tzs,verified,source" "$A_TOK"
both "A reads own ledger (1 row)" 200 'length' 1

req GET "/rest/v1/market_listings?select=crop_name&status=eq.active" "$A_TOK"
status "market_listings read (authenticated)" 200; MK_SEED="$(printf '%s' "$BODY" | jq 'length')"
req POST /rest/v1/market_listings "$A_TOK" "{\"seller_id\":\"$A_ID\",\"crop_name\":\"Tomato\",\"crop_name_sw\":\"Nyanya\",\"quantity_kg\":300,\"price_per_kg\":900,\"location\":\"Arusha\",\"notes\":\"fresh\"}" "Prefer: return=representation"
status "market_listings insert own (seller_id = A)" 201; LISTING_ID="$(printf '%s' "$BODY" | jq -r '.[0].id')"
req POST /rest/v1/market_listings "$A_TOK" "{\"seller_id\":\"$B_ID\",\"crop_name\":\"Spoof\",\"quantity_kg\":1,\"price_per_kg\":1}"
status "market_listings insert as someone else rejected" '401|403'
req POST /rest/v1/market_listings "$A_TOK" "{\"crop_name\":\"NoSeller\",\"quantity_kg\":1,\"price_per_kg\":1}"
status "market_listings insert with null seller rejected" '401|403'
req GET "/rest/v1/market_listings?select=crop_name&status=eq.active" "$A_TOK"
both "market_listings read now sees seed+1" 200 'length' "$((MK_SEED+1))"

req POST /rest/v1/tasks "$A_TOK" '{"title":"Irrigate Block B","title_sw":"Mwagilia Sehemu B","category":"irrigation","priority":"high","status":"pending","due_date":"2026-09-25T06:00:00Z","xp_reward":25,"farm_block":"Block B","synced_offline":false,"assigned_role":"employee"}' "Prefer: return=representation"
status "tasks insert (client payload, no user_id)" 201; TASK_ID="$(printf '%s' "$BODY" | jq -r '.[0].id')"
jqeq "  user_id defaulted to auth.uid()" '.[0].user_id' "$A_ID"
req GET "/rest/v1/tasks?select=*&order=due_date.asc" "$A_TOK"
both "tasks select * order by due_date" 200 'length' 1
req PATCH "/rest/v1/tasks?id=eq.$TASK_ID" "$A_TOK" '{"status":"done","completed_at":"2026-09-20T12:00:00Z"}' "Prefer: return=representation"
both "tasks complete (update status,completed_at)" 200 '.[0].status' done
req POST /rest/v1/tasks "$A_TOK" '{"title":"bad","category":"nonsense"}'
status "tasks invalid category rejected by check constraint" 400
req POST /rest/v1/offline_sync_logs "$A_TOK" "{\"sync_id\":\"q-$RUN\",\"event_type\":\"task_complete\",\"payload\":{\"taskId\":\"$TASK_ID\"},\"created_at\":\"2026-09-20T12:00:01Z\"}"
status "offline_sync_logs insert (useSyncEngine payload)" 201

req POST /rest/v1/user_notification_preferences "$A_TOK" "{\"user_id\":\"$A_ID\",\"push_token\":\"ExponentPushToken[local-test]\"}" "Prefer: resolution=merge-duplicates,return=representation"
status "notification prefs upsert own" '200|201'
req POST /rest/v1/user_notifications "$A_TOK" "{\"user_id\":\"$A_ID\",\"title\":\"forged\",\"body\":\"x\",\"type\":\"insight\",\"delivery_method\":\"push\"}"
status "client cannot fabricate a notification" '401|403'
SVC POST /rest/v1/user_notifications "{\"user_id\":\"$A_ID\",\"title\":\"Taarifa\",\"body\":\"test body\",\"type\":\"insight\",\"delivery_method\":\"push\"}" "Prefer: return=representation"
status "service role inserts notification for A" 201; NOTIF_ID="$(printf '%s' "$BODY" | jq -r '.[0].id')"
req GET "/rest/v1/user_notifications?select=*&order=created_at.desc&limit=50" "$A_TOK"
both "A reads own user_notifications" 200 'length' 1
req GET "/rest/v1/notifications?select=id,title,content,type&user_id=eq.$A_ID" "$A_TOK"
both "compat view notifications maps body->content" 200 '.[0].content' "test body"
req PATCH "/rest/v1/user_notifications?id=eq.$NOTIF_ID" "$A_TOK" '{"status":"read"}' "Prefer: return=representation"
both "A marks own notification read" 200 '.[0].status' read

req POST /functions/v1/submit-verification "$A_TOK" '{"verificationType":"business","tin":"123-456-789","businessName":"Amina Farms"}'
both "submit-verification (A)" 200 '.status' pending
req GET "/rest/v1/agro_profiles?select=verification_status" "$A_TOK"
both "  agro_profiles flipped to pending" 200 '.[0].verification_status' pending
req GET "/rest/v1/verification_requests?select=verification_type,status" "$A_TOK"
both "  A reads own verification_requests" 200 'length' 1
req PATCH "/rest/v1/verification_requests?verification_type=eq.business" "$A_TOK" '{"status":"verified"}' "Prefer: return=representation"
status "A cannot self-approve verification" '401|403'
req PATCH "/rest/v1/agro_profiles?user_id=eq.$A_ID" "$A_TOK" '{"verification_status":"verified"}' "Prefer: return=representation"
status "A cannot self-verify agro_profiles" '401|403'
req POST /functions/v1/submit-verification "$A_TOK" '{"verificationType":"bogus"}'
status "submit-verification invalid type" 400

section "4. RLS NEGATIVE as B (B must not see or modify A's rows)"
req POST /functions/v1/mint-agro-id "$B_TOK" '{"docTag":"REG"}'
status "mint-agro-id (B) gets its own id" 200; B_AGRO="$(printf '%s' "$BODY" | jq -r '.agroId')"
[ -n "$B_AGRO" ] && [ "$B_AGRO" != "$AGRO" ] && report "B's agro id differs from A's" 1 || report "B's agro id differs from A's" 0
req GET "/rest/v1/agro_profiles?user_id=eq.$A_ID" "$B_TOK";                 both "B reads A's agro_profiles -> 0 rows" 200 'length' 0
req GET "/rest/v1/farmer_profiles?user_id=eq.$A_ID" "$B_TOK";               both "B reads A's farmer_profiles -> 0 rows" 200 'length' 0
req GET "/rest/v1/agro_ledger?user_id=eq.$A_ID" "$B_TOK";                   both "B reads A's ledger -> 0 rows" 200 'length' 0
req GET "/rest/v1/tasks?user_id=eq.$A_ID" "$B_TOK";                         both "B reads A's tasks -> 0 rows" 200 'length' 0
req GET "/rest/v1/offline_sync_logs?user_id=eq.$A_ID" "$B_TOK";             both "B reads A's offline_sync_logs -> 0 rows" 200 'length' 0
req GET "/rest/v1/user_notifications?user_id=eq.$A_ID" "$B_TOK";            both "B reads A's notifications -> 0 rows" 200 'length' 0
req GET "/rest/v1/notifications?user_id=eq.$A_ID" "$B_TOK";                 both "B reads A's notifications via compat view -> 0" 200 'length' 0
req GET "/rest/v1/user_notification_preferences?user_id=eq.$A_ID" "$B_TOK"; both "B reads A's notif prefs -> 0 rows" 200 'length' 0
req GET "/rest/v1/verification_requests?user_id=eq.$A_ID" "$B_TOK";        both "B reads A's verification_requests -> 0 rows" 200 'length' 0
req PATCH "/rest/v1/farmer_profiles?user_id=eq.$A_ID" "$B_TOK" '{"region":"HACKED"}' "Prefer: return=representation"
both "B updates A's farmer_profile -> 0 rows affected" 200 'length' 0
req PATCH "/rest/v1/tasks?id=eq.$TASK_ID" "$B_TOK" '{"status":"cancelled"}' "Prefer: return=representation"
both "B updates A's task -> 0 rows affected" 200 'length' 0
req DELETE "/rest/v1/tasks?id=eq.$TASK_ID" "$B_TOK" "" "Prefer: return=representation"
both "B deletes A's task -> 0 rows affected" 200 'length' 0
req PATCH "/rest/v1/user_notifications?id=eq.$NOTIF_ID" "$B_TOK" '{"status":"unread"}' "Prefer: return=representation"
both "B updates A's notification -> 0 rows affected" 200 'length' 0
req DELETE "/rest/v1/user_notifications?id=eq.$NOTIF_ID" "$B_TOK" "" "Prefer: return=representation"
both "B deletes A's notification -> 0 rows affected" 200 'length' 0
req PATCH "/rest/v1/market_listings?id=eq.$LISTING_ID" "$B_TOK" '{"price_per_kg":1}' "Prefer: return=representation"
both "B updates A's market listing -> 0 rows affected" 200 'length' 0
req GET "/rest/v1/market_listings?id=eq.$LISTING_ID&select=price_per_kg" "$B_TOK"
both "B CAN read A's listing (public marketplace by design)" 200 '.[0].price_per_kg' 900
req POST /rest/v1/tasks "$B_TOK" "{\"user_id\":\"$A_ID\",\"title\":\"planted by B\"}"
status "B inserts a task owned by A -> rejected" '401|403'
req POST /rest/v1/agro_ledger "$B_TOK" "{\"user_id\":\"$A_ID\",\"client_id\":\"b-$RUN\",\"entry_date\":\"2026-09-01T00:00:00Z\",\"category\":\"x\",\"amount_tzs\":5}"
status "B inserts a ledger row for A -> rejected" '401|403'
req POST /rest/v1/farmer_profiles "$B_TOK" "{\"user_id\":\"$A_ID\",\"name\":\"B as A\"}" "Prefer: resolution=merge-duplicates"
status "B upserts a farmer_profile for A -> rejected" '401|403'
req GET "/rest/v1/agro_ledger_summary?select=*" "$B_TOK";                   status "B reads agro_ledger_summary (all users' totals) -> denied" '401|403'
req GET "/rest/v1/knowledge_base?select=id" "$B_TOK";                       status "B reads knowledge_base directly -> denied" '401|403'
req POST /rest/v1/knowledge_base "$B_TOK" '{"title":"poison","content":"drink bleach","category":"crop_disease"}'
status "B writes knowledge_base -> denied" '401|403'
req POST /rest/v1/rpc/get_my_agro_id "$B_TOK" '{}'
both "get_my_agro_id for B returns B's id, not A's" 200 '.id' "$B_AGRO"
req POST /rest/v1/rpc/match_knowledge "$B_TOK" '{"query_embedding":null,"match_threshold":0.5,"match_count":1}'
status "B calls match_knowledge RPC -> denied" '401|403|404'
APIKEY_OVERRIDE="$ANON" req GET "/rest/v1/tasks?select=id" ""
status "anon (no user) reads tasks -> denied" '401|403'
APIKEY_OVERRIDE="$ANON" req GET "/rest/v1/market_listings?select=id" ""
status "anon (no user) reads market_listings -> denied" '401|403'
APIKEY_OVERRIDE="$ANON" req GET "/rest/v1/agro_profiles?select=user_id" ""
status "anon reads agro_profiles -> denied" '401|403'
SVC GET "/rest/v1/farmer_profiles?user_id=eq.$A_ID&select=region"
both "service-role check: A's profile unchanged by B's attempts" 200 '.[0].region' Arusha
SVC GET "/rest/v1/tasks?id=eq.$TASK_ID&select=status"
both "service-role check: A's task still 'done'" 200 '.[0].status' done

section "5. PUBLIC verify-agro-id (no account) — non-PII attestation"
APIKEY_OVERRIDE="" req GET "/functions/v1/verify-agro-id?token=$AGRO" ""
status "verify-agro-id valid token, no credentials at all" 200
jqeq "  verified=true" '.verified' true
jqeq "  history.entryCount = 1 (A's one ledger row)" '.history.entryCount' 1
jqeq "  response keys are only verified/history/checkedAt" '[keys[]] | sort | join(",")' "checkedAt,history,verified"
jqeq "  history keys are aggregate-only" '[.history | keys[]] | sort | join(",")' "entryCount,firstEntryAt,lastEntryAt,netBand"
printf '%s' "$BODY" | grep -qiE "user_id|email|$A_ID|Amina|Arusha" && report "  no PII / user id in public response" 0 || report "  no PII / user id in public response" 1
APIKEY_OVERRIDE="" req GET "/functions/v1/verify-agro-id?token=AGRO-2026-REG-DOESNOTEXIST0" ""
status "verify-agro-id unknown token -> 404" 404
APIKEY_OVERRIDE="" req GET "/functions/v1/verify-agro-id" ""
status "verify-agro-id missing token -> 400" 400

section "6. EDGE FUNCTIONS — unconfigured providers must say so, never fake"
req POST /functions/v1/openai-proxy "$ANON" '{"action":"chat","messages":[{"role":"user","content":"hi"}]}'
status "openai-proxy with only the public anon key -> 401 (not a user)" 401
req POST /functions/v1/openai-proxy "$A_TOK" '{"action":"chat","messages":[{"role":"user","content":"hi"}]}'
both "openai-proxy as user, no OPENAI_API_KEY -> 503 ai_not_configured" 503 '.code' ai_not_configured
req POST /functions/v1/rag-chat "$ANON" '{"query":"maize armyworm"}'
status "rag-chat with only the public anon key -> 401" 401
req POST /functions/v1/rag-chat "$A_TOK" '{"query":"maize armyworm","userId":"someone-else"}'
both "rag-chat as user, no OPENAI_API_KEY -> 503 ai_not_configured" 503 '.error' ai_not_configured
req POST /functions/v1/sms-send "$ANON" '{"to":"+255700000001","message":"x","event":"price_alert"}'
status "sms-send with only the public anon key -> 401" 401
req POST /functions/v1/sms-send "$A_TOK" '{"to":"+255700000001","message":"hello","event":"price_alert"}'
both "sms-send as user, no Africa's Talking key -> 503" 503 '.reason' sms_provider_not_configured
req POST /functions/v1/mint-agro-id "$ANON" '{}'
status "mint-agro-id with only the anon key -> 401" 401
req POST /functions/v1/submit-verification "$ANON" '{"verificationType":"personal"}'
status "submit-verification with only the anon key -> 401" 401
req POST /functions/v1/delete-account "$ANON" '{}'
status "delete-account with only the anon key -> 401" 401
req POST /functions/v1/process-notifications "" ''
status "process-notifications without cron secret -> 401" 401
req POST /functions/v1/process-notifications "" '{}' "x-cron-secret: wrong"
status "process-notifications wrong cron secret -> 401" 401
req POST /functions/v1/process-notifications "" '{}' "x-cron-secret: $CRON_SECRET"
both "process-notifications right secret, no trigger -> skipped (no fabrication)" 200 '.status' skipped
req POST /functions/v1/process-notifications "" '{"trigger":{"type":"weather_alert","context":"Storm warning for Mbeya"}}' "x-cron-secret: $CRON_SECRET"
both "process-notifications with trigger, no OPENAI_API_KEY -> 503" 503 '.error' ai_not_configured

section "7. delete-account removes the user and all their data"
req POST /auth/v1/signup "" "{\"email\":\"$EC\",\"password\":\"$PW\"}"; C_TOK="$(token_of)"; C_ID="$(printf '%s' "$BODY" | jq -r '.user.id')"
req POST /functions/v1/mint-agro-id "$C_TOK" '{}'; C_AGRO="$(printf '%s' "$BODY" | jq -r '.agroId')"
req POST /rest/v1/farmer_profiles "$C_TOK" "{\"user_id\":\"$C_ID\",\"name\":\"Chuma C\"}" "Prefer: resolution=merge-duplicates"
req POST /rest/v1/tasks "$C_TOK" '{"title":"c task"}'
req POST /rest/v1/market_listings "$C_TOK" "{\"seller_id\":\"$C_ID\",\"crop_name\":\"Rice\",\"quantity_kg\":10,\"price_per_kg\":10}"
req POST /rest/v1/offline_sync_logs "$C_TOK" "{\"sync_id\":\"c-$RUN\",\"event_type\":\"voice_note\"}"
req POST /functions/v1/delete-account "$C_TOK" '{}'
both "delete-account (C)" 200 '.ok' true
for t in agro_profiles farmer_profiles tasks offline_sync_logs; do
  SVC GET "/rest/v1/$t?user_id=eq.$C_ID&select=user_id"; both "  $t rows for C purged" 200 'length' 0
done
SVC GET "/rest/v1/market_listings?seller_id=eq.$C_ID&select=id"; both "  market_listings for C purged" 200 'length' 0
req POST "/auth/v1/token?grant_type=password" "" "{\"email\":\"$EC\",\"password\":\"$PW\"}"
status "  C can no longer log in" 400
APIKEY_OVERRIDE="" req GET "/functions/v1/verify-agro-id?token=$C_AGRO" ""
status "  C's agro id no longer verifies -> 404" 404
req GET /auth/v1/user "$C_TOK"
status "  C's old access token no longer valid" '401|403'

printf '\n=========== %d passed, %d failed ===========\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
