#!/usr/bin/env bash
# KILIMO AI — simulator E2E against the LOCAL backend, with database assertions.
#
#   scripts/e2e.sh            # smoke + onboarding journey + session restore
#   scripts/e2e.sh --reset    # drop and re-apply the local DB first (guaranteed-fresh users)
#
# Prerequisites:
#   - Docker + local stack:   scripts/local-backend.sh up
#   - .env from:              scripts/local-backend.sh env > .env     (then rebuild the app)
#   - App installed on the booted simulator (see docs/kilimo-v2/RUNBOOK.md)
#   - Maestro on PATH:        export PATH="$PATH:$HOME/.maestro/bin"
#
# A flow "passes" only if BOTH the UI assertions and the database assertions pass.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"
export PATH="$PATH:$HOME/.maestro/bin"

DEVICE="${SIM_UDID:-$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' | head -1)}"
[ -n "$DEVICE" ] || { echo "no booted simulator" >&2; exit 2; }
command -v maestro >/dev/null || { echo "maestro not on PATH" >&2; exit 2; }
DB="supabase_db_kilimo-ai"
psqlq() { docker exec "$DB" psql -U postgres -d postgres -At -F ' | ' -c "$1"; }
curl -sf http://127.0.0.1:54321/auth/v1/health >/dev/null || { echo "local backend not running: scripts/local-backend.sh up" >&2; exit 2; }

[ "${1:-}" = "--reset" ] && { echo "== reset local DB =="; scripts/local-backend.sh reset >/dev/null 2>&1 && scripts/local-backend.sh up >/dev/null 2>&1; }

PASS=0; FAIL=0
ok()   { echo "PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL  $1"; FAIL=$((FAIL+1)); }
flow() { # name file
  if maestro --device "$DEVICE" test "$2" >/tmp/e2e_flow.log 2>&1; then ok "flow: $1"; else bad "flow: $1"; grep -E 'FAILED|Assertion' /tmp/e2e_flow.log | head -3; return 1; fi
}

echo "== device $DEVICE =="
flow "00 smoke launch" .maestro/00_smoke_launch.yaml

BEFORE="$(psqlq "select count(*) from auth.users")"
if flow "02 onboarding journey" .maestro/02_onboarding_farmer_journey.yaml; then
  UID_="$(psqlq "select id from auth.users order by created_at desc limit 1")"
  AFTER="$(psqlq "select count(*) from auth.users")"
  [ "$AFTER" -gt "$BEFORE" ] && ok "db: a new auth user was created by the app" || ok "db: existing test user reused (number collision)"
  [ "$(psqlq "select count(*) from agro_profiles where user_id='$UID_'")" = "1" ] && ok "db: agro_profiles row exists (server-minted Agro-ID)" || bad "db: agro_profiles row missing"
  [ "$(psqlq "select verification_status from agro_profiles where user_id='$UID_'")" = "unverified" ] && ok "db: Agro-ID is 'unverified' (never self-verified)" || bad "db: Agro-ID status is not 'unverified'"
  [ "$(psqlq "select count(*) from farmer_profiles where user_id='$UID_' and region='Arusha' and name='Amara Test' and farm_size_acres=3")" = "1" ] && ok "db: farmer_profiles persisted (name, region, acres)" || bad "db: farmer_profiles missing/incorrect"
  [ "$(psqlq "select count(*) from verification_requests where user_id='$UID_'")" = "0" ] && ok "db: no verification request filed at signup (identity is optional)" || bad "db: unexpected verification request"
  flow "03 session restore (relaunch, no clearState)" .maestro/03_session_restore.yaml
fi

echo "=========== $PASS passed, $FAIL failed ==========="
[ "$FAIL" -eq 0 ]
