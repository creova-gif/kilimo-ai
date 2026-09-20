# KilimoAI — Repository Map

Evidence gathered 2026-09-20. Everything here was read from the machine or GitHub, not assumed.

## Repositories

| Path / remote | What it is | Branch | State |
|---|---|---|---|
| `github.com/creova-gif/kilimo-ai` (public) | **The** KilimoAI product repo. Single Expo/React Native app + Supabase backend in one repo (not a monorepo). Default branch `main`. | — | 71 remote branches; latest `origin/main` = `9328807` (Wave 2 CI: typecheck + build sanity) |
| `~/kilimo-ai` | Working clone used for this integration. | `feat/kilimo-figma-v2-integration` (from `origin/main`) | Clean at start. |
| `~/Kilimoai` | A **second, older clone** of the same remote. Do not treat as canonical. | `codex/fix-peer-groups-audit` | 6 modified + 3 untracked files (auth/onboarding WIP from 2026-09-02, `docs/brand`, `docs/production/FEATURE_COMPLETION_REGISTER.md`). **Left untouched.** |
| Other: `~/Desktop/research/KilimoAI_*.docx`, `~/Downloads/kilimo-ai-investor-whitepaper.pdf` | Product/hardware/IoT research docs. | — | Reference only. |

There is **no separate backend repository**. The backend is `supabase/` inside this repo.

## Stack (verified from `package.json`, `app.json`, `docs/ARCHITECTURE.md`)

- Client: Expo SDK 54, React Native 0.81.5, React 19.1, expo-router 6, Zustand 5, TanStack Query 5, Reanimated 4.
- Backend: Supabase (Auth phone/email OTP, Postgres + RLS, 8 Deno Edge Functions).
- External: OpenAI (via `openai-proxy`), Africa's Talking SMS, OpenWeather (client-side), Sentry (DSN-gated).
- Bundle id `com.jaymafie.kilimoai`, URL scheme `kilimoai`, EAS project `1ee34dcc-…`.
- No `ios/` or `android/` directories are committed (Continuous Native Generation). They are produced by `expo prebuild`.

## Backend inventory

Edge functions (`supabase/functions/`): `openai-proxy`, `rag-chat`, `sms-send`, `mint-agro-id`, `verify-agro-id` (public), `submit-verification`, `delete-account`, `process-notifications` (cron-secret).

Migrations (`supabase/migrations/`, 11): ai_rag_notifications, agro_ledger, agro_profiles, verification_requests, market_listings (+notes), seed_knowledge_base, knowledge_base_rls, match_knowledge_search_path, user_notifications_write_policies, farmer_profiles.

Live projects (Supabase MCP, org `ucbuilpclqslmlkocoxs`): `kilimo_ai` (`hsjxaxnenyomtgctungx`, us-east-1) and `creova` (`vwestumjbrpwlbsewupz`, us-east-1) are both **INACTIVE**. `docs/ARCHITECTURE.md` and `supabase/.temp` point at `vwestumjbrpwlbsewupz`; the prior audit names `hsjxaxnenyomtgctungx`. **Which one is production is unresolved** (see gap `G-003`).

## Branch triage (unmerged work on remote, ahead of `origin/main`)

Not merged; purpose established from names only — none merged by this work:
`feat/agri-rag-grounding` (+6), `feat/offline-scan-queue` (+4), `fix/tasks-web-animation-and-audit` (+3), `feat/skills-expansion-audit` (+3), several `fix/*-audit` (+1–2), `autonoma-integration`.

## CI

`.github/workflows/ci-validate.yml` (lint, typecheck, jest, `expo export --platform web`) and `eas-build.yml` (tag-triggered EAS builds).

## Worktrees / tags

One worktree (this one). No tags.
