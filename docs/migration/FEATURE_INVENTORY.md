# Feature Inventory

Branch `feat/ios-ui-migration` (from `454a9f7`). Source: static read of the repo on 2026-09-21.
Nothing here has been re-verified on device unless stated. Owner decision (2026-09-21):
**screens running on fake or seeded data are to become real features**, not demos.

Actions: KEEP, MIGRATE (to new design system), FIX, MERGE (from another ref), INVESTIGATE.

## Tabs (real, `app/(tabs)/_layout.tsx`)

| Tab | Route | UI state | Data | Action |
|-----|-------|----------|------|--------|
| Nyumbani / Home | `index` | New design system, `useT` | Real (`tasks`, OpenWeather) | KEEP |
| Shamba / Fields | `fields` | Legacy | **Fake** — hard-coded `ZONES` (`constants/FarmData.ts`) | MIGRATE + build real farm/plot data |
| AI (centre) | `ai` | Legacy | Real via `openai-proxy`, demo fallback (`lib/ai-demo.ts`) | MIGRATE + FIX (hard-coded copy) |
| Soko / Market | `market` | New design system | Real (`market_listings`), no seed fallback | KEEP |
| Mimi / Profile | `profile` | Legacy | Real (`farmer_profiles`) | MIGRATE |

## Other routes

| Area | Routes | Data status | Action |
|------|--------|-------------|--------|
| Onboarding / auth | `onboarding`, `verification/*` | Real (OTP, `mint-agro-id`, `submit-verification`) | KEEP `onboarding`; MIGRATE verification (personal/pending are ~45-line stubs) |
| Soko detail | `soko/[id]`, `soko/create`, `soko/mine` | Real | KEEP |
| Analytics | `analytics/index` | New design system | KEEP / INVESTIGATE data source |
| Farm / plots | `field/[id]`, `farm-twin/*`, `crop-library`, `crop-planning`, `soil-analysis`, `vra-setup` | **Fake** (`ZONES`, mock pH, seeded twin scenarios) | MIGRATE + build real |
| Weather / planning | `forecast`, `calendar`, `tasks` | Real (OpenWeather, `tasks`) | MIGRATE |
| Maps | `map` (**orphan**) | Real map view, fake data, hard-coded "+16°C" weather card | FIX + link |
| Money | `finance`, `mobile-money` (**orphan**), `upgrade` (**orphan**), `insurance` (**orphan**) | **Fake** — local state; "sent" alert with no backend call; no payment provider | Build real or remove misleading UI (P1) |
| Wallet admin | `wallet-admin/*` | Seeded in-memory store | INVESTIGATE — admin scope undefined |
| IoT | `iot-systems` | **Simulated**, labelled prototype | Build real or gate (P1) |
| Farm records | `inventory` (**orphan**), `livestock` (**orphan**), `peer-groups` (**orphan**), `consultations` | Seeded stores | Build real |
| Identity | `agro-id` | Partly real (`mint-agro-id`), sample track record | FIX |
| System | `notifications`, `offline-queue` (**orphan**), `edit-profile` | `notifications` real; realtime dead | FIX |
| AI extras | `scan`, `ai-voice` (**orphan**), `ai-admin` (**orphan**), `ai-training-hub`, `video-hub` | Real with demo fallback / content-only | MIGRATE |
| Legal | `privacy`, `terms`, `legal/privacy`, `legal/terms` | Duplicated | Consolidate |

Orphans = no in-app navigation target; reachable only by deep link.

## Exists on `main` / `origin/main`, missing here

`app/(tabs)/action`, `ai-training-hub`, `edit-profile`, `features`, `video-hub`, `app/contracts/{[id],_layout,index}`, `app/input-supply`, `app/otp-auth`.
Several were removed deliberately by commit "five real tabs; remove three hidden duplicate routes".
**INVESTIGATE** each before restoring (`contracts/*`, `input-supply`, `otp-auth` first).

## Backend

Edge functions: `delete-account`, `mint-agro-id`, `openai-proxy`, `process-notifications`, `rag-chat`, `sms-send`, `submit-verification`, `verify-agro-id`.
`rag-chat` is deployed but **never called by the client**. `public.knowledge_base` has 8 rows and **0 embeddings**.
Provider secrets (OpenAI, Africa's Talking) are deliberately unset locally, so AI and SMS report "not configured".

## Localization

`lib/i18n/{en,sw}.ts`: 177 keys each, parity enforced by `__tests__/i18n.parity.test.ts`.
Only ~8 screens use `useT`. The rest hard-code `language === 'sw' ? … : …` ternaries
(heaviest: `iot-systems` ~123, `ai-training-hub` ~79, `insurance` ~62, `finance` ~52, `(tabs)/ai` ~40, `(tabs)/profile` ~37).
`verification/*` and `wallet-admin/*` are single-language.

## Tests

Jest: 15 files in `__tests__/` plus 5 in `__tests__/ui/`. Maestro: 6 flows in `.maestro/` (not wired to npm or CI).
No tests for offline queue processing or any legacy screen.
