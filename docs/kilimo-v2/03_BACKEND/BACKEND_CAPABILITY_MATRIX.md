# Backend Capability Matrix

Evidence: `scripts/local-backend-smoke.sh` — **116 passed, 0 failed** against the local Supabase stack (Postgres 17.6.1.084, GoTrue, PostgREST, Edge Runtime), run 2026-09-20. "Tested" means a real HTTP call in that suite. Nothing here has been run against a cloud project (both are INACTIVE).

## Running it

```bash
scripts/local-backend.sh up        # DB + Auth + REST + edge functions (Docker)
scripts/local-backend-smoke.sh     # 116 checks
scripts/local-backend.sh env       # EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY for the app
```
From the iOS simulator the host is `127.0.0.1`. Local demo keys are public by design and are never committed.

## Matrix

| Capability | Figma needs | Provisioned | Tested locally | Notes / missing work |
|---|---|---|---|---|
| Email signup / login / refresh | ✓ | Auth | **Yes** | password path exists in GoTrue but the app uses OTP |
| Phone OTP | ✓ | Auth + test OTP `255700000001` → `123456` (LOCAL ONLY) | **Yes** (API level) | Real SMS needs a provider (none). App now sends E.164 (`lib/phone.ts`) |
| Farmer profile | ✓ | `farmer_profiles` | **Yes** upsert/read, RLS | — |
| Agro-ID mint | ✓ | `agro_profiles` + `mint-agro-id` | **Yes** | mints `unverified` (was auto-`verified`, fixed); `get_my_agro_id()` RPC returns the client's shape from real data |
| Agro-ID public verify | ✓ | `verify-agro-id` (public) | **Yes** | returns only verified/history/checkedAt, no PII (asserted) |
| KYC / business verification | ✓ | `verification_requests` + `submit-verification` | **Yes** | user cannot self-approve (403). **No reviewer console** |
| Ledger / finance | ✓ | `agro_ledger` (append-only) | **Yes** | cross-user reads/writes rejected |
| Tasks | ✓ | `tasks` (new migration) | **Yes** | own-row only; no coop sharing (no coop table) |
| Offline sync log | ✓ | `offline_sync_logs` (new) | **Yes** | queue previously never drained |
| Notifications inbox | ✓ | `user_notifications` (+ `notifications` compat view) | **Yes** | clients cannot create notifications (403); **push delivery not implemented** (G-011) |
| Notification prefs | ✓ | `user_notification_preferences` | **Yes** | INSERT policy added |
| Market listings (browse/create/update) | ✓ | `market_listings` | **Yes** | public read by design; owner-only write; realtime publication added |
| Account deletion | ✓ | `delete-account` | **Yes** | purges profiles, tasks, sync logs, listings; old token invalid afterwards |
| AI chat / diagnosis | ✓ | `openai-proxy` | **Auth only** | needs `OPENAI_API_KEY` (not available): returns 503 `ai_not_configured`. anon key alone → 401 |
| RAG chat | ✓ | `rag-chat`, `knowledge_base` | **Auth only** | same 503; corpus unseeded; client does not call it |
| SMS alerts | ✓ | `sms-send` | **Auth only** | needs Africa's Talking key: 503 |
| Scheduled notifications | ✓ | `process-notifications` | **Yes** (guards) | 401 without/with wrong cron secret; 503 without OpenAI key |
| Weather | ✓ | none (client → OpenWeather) | No | needs `EXPO_PUBLIC_OPENWEATHER_API_KEY` |
| Contracts | ✓ | **none** (client-only Zustand) | — | planned schema in `docs/backend/contracts.md`; no table, no API |
| Marketplace offers / orders / price alerts | ✓ (Soko) | **none** | — | G-008 |
| Payments / wallet / mobile money | ✓ | **none** (ledger only) | — | no provider integration |
| IoT devices / readings | ✓ | **none** | — | G-007: no tables, ingestion, or API |
| Maps / plot geometry | ✓ | **none** (no polygon storage) | — | plots live in client stores |
| Community / experts / forum | ✓ | **none** | — | no backend |

## Security properties verified (from the suite)

- Anon key alone cannot call any function that spends money or touches user data (401).
- User B cannot read, update, delete, or insert rows owned by user A on any user table (RLS + grants).
- `agro_ledger_summary` and `knowledge_base` are not readable by clients.
- The public verify endpoint leaks no PII or user id.
