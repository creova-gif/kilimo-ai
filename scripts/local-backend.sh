#!/usr/bin/env bash
# KILIMO AI — run the repo's own backend locally (Supabase in Docker).
#
#   scripts/local-backend.sh up       start DB/Auth/REST + serve edge functions
#   scripts/local-backend.sh down     stop everything
#   scripts/local-backend.sh reset    drop DB and re-apply all migrations
#   scripts/local-backend.sh status   what is running
#   scripts/local-backend.sh env      print EXPO_PUBLIC_* lines for the app's .env
#
# Requires Docker Desktop running and the Supabase CLI. Never touches a cloud
# project. Provider secrets (OPENAI_API_KEY, AFRICAS_TALKING_*) are deliberately
# NOT set, so AI/SMS functions answer 503 "not configured" instead of faking.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FN_LOG="supabase/.temp/functions-serve.log"
FN_PID="supabase/.temp/functions-serve.pid"
# Services the app does not use — excluded to save RAM/disk.
EXCLUDE="realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,logflare,vector,supavisor"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 2; }; }
need supabase; need docker
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop first." >&2; exit 2; }

ensure_env_file() {
  mkdir -p supabase/.temp
  if [ ! -f supabase/.env.local ]; then
    {
      echo "# LOCAL ONLY (gitignored). Edge-function secrets for \`supabase functions serve\`."
      echo "# Intentionally NO OPENAI_API_KEY / AFRICAS_TALKING_*: those functions must report 'not configured'."
      echo "CRON_SECRET=$(openssl rand -hex 24)"
    } > supabase/.env.local
  fi
}

serve_functions() {
  if [ -f "$FN_PID" ] && kill -0 "$(cat "$FN_PID")" 2>/dev/null; then
    echo "edge functions already served (pid $(cat "$FN_PID"))"; return
  fi
  nohup supabase functions serve --env-file supabase/.env.local >"$FN_LOG" 2>&1 &
  echo $! > "$FN_PID"
  echo "serving edge functions (log: $FN_LOG)"
}

stop_functions() {
  if [ -f "$FN_PID" ]; then kill "$(cat "$FN_PID")" 2>/dev/null || true; rm -f "$FN_PID"; fi
}

print_env() {
  local out; out="$(supabase status -o env 2>/dev/null)"
  local url key
  url="$(printf '%s\n' "$out" | sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
  key="$(printf '%s\n' "$out" | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
  [ -n "$url" ] && [ -n "$key" ] || { echo "stack not running — run: scripts/local-backend.sh up" >&2; exit 1; }
  echo "# Local Supabase (demo keys, public by design). The iOS simulator reaches the host via 127.0.0.1."
  echo "EXPO_PUBLIC_SUPABASE_URL=$url"
  echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$key"
}

case "${1:-status}" in
  up)
    ensure_env_file
    supabase start -x "$EXCLUDE"
    serve_functions
    echo; print_env
    ;;
  down)
    stop_functions
    supabase stop
    ;;
  reset)
    ensure_env_file
    supabase db reset
    ;;
  status)
    supabase status 2>&1 | grep -v 'new version' || true
    if [ -f "$FN_PID" ] && kill -0 "$(cat "$FN_PID")" 2>/dev/null; then echo "edge functions: serving (pid $(cat "$FN_PID"))"; else echo "edge functions: not serving"; fi
    ;;
  env)
    print_env
    ;;
  *)
    echo "usage: $0 {up|down|reset|status|env}" >&2; exit 2
    ;;
esac
