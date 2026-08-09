# Kilimo AI — Architecture & Workflow Audit

**Miro board (all diagrams):** https://miro.com/app/board/uXjVHz3Qfg4=/

Diagrams on the board (also version-controlled as Mermaid in `docs/diagrams/`):
1. System Architecture · 2. Data Model (ER) · 3. Auth (OTP) sequence ·
4. Agro-ID mint + public QR verify · 5. Crop scan (AI vision) · 6. Contract
lifecycle state machine · 7. Onboarding flow · 8. Account deletion ·
9. Client component/class diagram · 10. Scheduled notifications (cron) ·
11. Offline-first write & sync.

---

## Stack (verified)
- **Client:** Expo SDK 54 / React Native 0.81 / React 19, `expo-router`, Zustand, `@tanstack/react-query`.
- **Backend:** Supabase — Auth (phone/email OTP), Postgres + RLS, 8 Edge Functions (Deno).
- **External:** OpenAI (via `openai-proxy`), Africa's Talking (SMS), OpenWeather (client), Sentry (crash, DSN-gated).
- **Project ref:** `vwestumjbrpwlbsewupz`.

## Edge functions & gateway auth
| Function | `verify_jwt` | Live probe |
|---|---|---|
| openai-proxy | true | 401 ✅ |
| mint-agro-id | true | 401 ✅ |
| rag-chat | true | — |
| sms-send | true | — |
| delete-account | true | 401 ✅ |
| submit-verification | true | 401 ✅ |
| verify-agro-id | **false (public)** | 200/404 ✅ |
| process-notifications | **false (cron secret)** | 401 ✅ |

---

## Workflow audit — status

| Workflow | Wired | Backend | Runtime gap |
|---|---|---|---|
| Auth OTP (phone/email) | ✅ | Auth live | mock OTP `123456` when unconfigured (dev only) |
| Onboarding → mint + submit-verification | ✅ | live | — |
| Agro-ID QR verify (public) | ✅ | **verified live** (clean `not_found`) | — |
| Crop scan (AI vision) | ✅ | openai-proxy | requires `OPENAI_API_KEY` (set) |
| Sankofa chat | ✅ | openai-proxy | same |
| RAG chat | ✅ | rag-chat | ⚠️ `knowledge_base` corpus is **unseeded** → thin answers |
| SMS alerts | ✅ | sms-send | ⚠️ confirm `AFRICAS_TALKING_*` secrets set |
| Scheduled notifications | ✅ | process-notifications | ⚠️ **push delivery is a TODO** (only DB insert); confirm `pg_cron` schedule |
| Ledger / finance (offline-first) | ✅ | agro_ledger | — |
| Account deletion | ✅ | delete-account | — |
| Business verification | ✅ | submit-verification | no admin review UI (manual via DB) |
| Weather | ✅ | OpenWeather (client) | requires `EXPO_PUBLIC_OPENWEATHER_API_KEY`; mock fallback |
| Market prices | ⚠️ | none | **mock/seed data — not live** (`useMarketIntelligence`) |
| Contracts | ✅ | client-only store | **no backend persistence → no cross-device sync** |
| Crash reporting | ✅ | Sentry | DSN-gated (`EXPO_PUBLIC_SENTRY_DSN`) |

### Launch-relevant gaps (not yet addressed)
1. **Push not delivered** — `process-notifications` writes `user_notifications` rows but the Expo Push send is a `TODO`. In-app notifications work; device push does not.
2. **Market prices are mock** — the Market screen renders `SEED_LISTINGS`, not live data. Don't market it as "live prices" until wired.
3. **RAG corpus empty** — seed `knowledge_base` (agronomy content + embeddings) or RAG answers stay weak.
4. **Config to confirm** — `AFRICAS_TALKING_*` secrets and the `pg_cron` schedule (with `x-cron-secret`), else SMS + scheduled notifications silently no-op.

### Accepted-for-launch limitations (documented)
- Contracts and several stores are client-only (Zustand persist) — fine for a single-device MVP; no sync yet.
- Business verification is manual (rows land in `verification_requests`; no reviewer console yet).
