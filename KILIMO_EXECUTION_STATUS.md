# KILIMO_EXECUTION_STATUS

_Last updated: 2026-09-20 (evening). Everything below is verified unless marked otherwise._

**Current phase:** 4 — Auth + onboarding on a real (local) backend; UI reconciliation (Figma vs Git) in progress
**Branch:** `feat/kilimo-figma-v2-integration` (from `origin/main` @ `9328807`; not pushed)
**Latest commit:** see `git log` (≈20 commits: build, backend, auth, i18n, design system, E2E, docs)

## Build / device

| Item | Status |
|---|---|
| `npm ci` | PASS |
| `tsc --noEmit` | PASS (0 errors) |
| Jest | PASS — 14 suites / 188 tests |
| eslint | 0 errors (pre-existing warnings only) |
| `expo prebuild --platform ios --clean` | PASS (with `plugins/withPodsDeploymentTarget.js`) |
| Native iOS Release build (Xcode 27, simulator) | PASS |
| Install / launch on iPhone 15 Pro Max (iOS 17.0) | PASS |
| Local backend (Supabase in Docker) | UP; smoke + RLS suite **116 passed, 0 failed** |
| Cloud Supabase | **INACTIVE — billing; not attempted** |

## What has been verified on the device (Maestro)

- Clean-state launch, EN/SW toggle, start → phone step (T-005).
- Release build with no backend **fails closed** (T-006).
- **Real phone-OTP sign-in against the local backend**, role selection, farm profile, ID verification, reaching the final onboarding step (T-008 — see test report; DB verification of persisted rows in progress after fix G-021).

## Coverage

| Area | Status |
|---|---|
| Figma inventory | Done: 213 screens = 159 live + 45 state + 9 superseded. 124/159 live have a legacy route; 35 do not. |
| UI reconciliation (Figma vs Git, per screen) | **In progress** — 2 of 7 domain agents running (auth/onboarding/profile/settings; dashboard/farm/weather/map). Others queued (AI/scan, market/soko/contracts, farm ops/IoT, finance, community/states/nav). `UI_RECONCILIATION_MATRIX.md` not yet assembled. |
| Design system | Tokens + 16 primitives + 176 tests landed (`docs/kilimo-v2/02_DESIGN`). **Not yet applied to screens / not yet visually verified on device.** |
| Backend | Local stack complete for auth, profiles, agro-id, tasks, ledger, notifications, listings, sync logs. Missing: contracts, offers/orders, payments, IoT, plots/geometry, community. |
| Authentication | Real OTP works end to end locally; fails closed when unconfigured; single shared client with Keychain session. Session restore / expiry: **not yet tested**. |
| AI | Functions exist; no OpenAI key → honest 503 `ai_not_configured`. UI states not yet verified. |
| IoT | No backend. UI over nothing — honest empty/“not connected” state required. |
| Marketplace | `market_listings` real; offers/orders none. UI still renders seed listings. |
| Offline | Sync-log table now exists; queue drain not yet tested on device. |
| Localization | `lib/i18n` + parity test; screens still use inline ternaries. |
| E2E | 3 Maestro flows (`.maestro/`). |

## Defects (see `KILIMO_GAP_REGISTER.md`)

Open P1: G-004 (35 Figma screens without route), G-007 (IoT), G-008 (marketplace), G-009 (i18n migration), G-010 (AI key), G-021 (in device verification).
Open P2: G-011 (push), G-012, G-018 (CTA behind keyboard), G-019 (raw English auth errors).
P0: **none open in the app.** G-003 (cloud backend inactive) is external/billing; local stack substitutes.

## Blockers needing the user

1. **Cloud Supabase restore** (billing) and which project is production.
2. **Disk**: ~11 GB free now, but `~/.cache` is 97 GB; recommend reviewing.
3. Provider secrets (OpenAI, Africa's Talking, OpenWeather) — needed to exercise AI/SMS/weather for real.

## Next actions

1. Rebuild with latest code; re-run onboarding journey and assert DB rows (agro_profiles, farmer_profiles, verification_requests).
2. Add relaunch/session-restore flow; wrong-OTP and network-loss failure flows.
3. Finish reconciliation agents → assemble `UI_RECONCILIATION_MATRIX.md`, `FINAL_NAVIGATION_MAP.md`, `FINAL_SCREEN_ARCHITECTURE.md`.
4. Apply design tokens to the app; visual comparison against Figma on device.
