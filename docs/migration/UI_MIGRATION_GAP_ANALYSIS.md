# UI Migration Gap Analysis

Baseline decision: the **iOS simulator build is the visual baseline**. Figma
(`kilimo.ai.fig`) is the legacy 213-screen prototype and is used for coverage and
state design only (see `FIGMA_SCREEN_INDEX.md`). Owner decision: fake-data screens become **real features**.

Priorities: P0 blocks use/data/auth/core workflow, P1 major feature, P2 usability/consistency, P3 polish.

## Simulator vs Figma vs Source

| Area | iOS Simulator (baseline) | Figma (legacy) | Existing source | Decision |
|------|--------------------------|----------------|-----------------|----------|
| Navigation | 5 tabs, centre AI button | Multi-hub (many "Mobile / X" flows) | 5 tabs + ~50 root routes, 11 orphans | Keep 5 tabs; add a real "More" list in Profile for orphan features |
| Onboarding | Language toggle, hero, OTP, consent | Auth/* (22 screens) | Rebuilt, real | Keep |
| Home | Redesigned, real tasks + weather | Dashboard/Home | Real | Keep |
| Farm / Plot | Legacy fake `ZONES` | Farm/* (largest cluster, 48) | Fake | **Build real** (agent 2), migrate map/VRA/planning next |
| AI | Legacy screen, demo fallback | AI/* (23 incl. training, voice) | Real via proxy, demo fallback | Migrate UI; wire `rag-chat`; localise |
| Weather | Legacy | Weather/* (5: forecast, alerts, radar, hourly) | Real (OpenWeather) | Migrate UI; add alerts/hourly if data allows |
| Marketplace | Redesigned Soko, real | Market/* (28, several superseded) | Real | Keep; contracts deferred |
| IoT | Simulated prototype | IoT dashboard + 2 states | Simulated | **Build real registry + manual readings** (agent 6) |
| Finance | Local-state prototype | Finance/* (22) | Fake | **Build real ledger**; payments = honest records only |
| Settings/Profile | Legacy | Settings/* (17) | Real profile data | Migrate; wire offline-safe sign-out |
| Offline/States | Global banner (hard-coded copy) | State/Offline/* (Banner, Sync Queue, Sync Progress) | Two competing drainers | **Fix P0** (agent 1); build Sync Queue UI |

## Feature / screen matrix

| Feature | Simulator | Source | Figma | Backend | DB | Action | Pri | Risk |
|---------|-----------|--------|-------|---------|----|--------|-----|------|
| Offline sync queue | Banner only | Two drainers, data-loss risk | Yes | Supabase REST | `tasks`, `offline_sync_logs` | Unify, idempotency, visible failures | P0 | High |
| Farms and plots | Fake | Fake | Yes | none | none | New tables + CRUD UI | P1 | Med |
| Finance ledger | Fake | Fake | Yes | none | none | New tables + CRUD UI | P1 | Med |
| Mobile-money | Fake "sent" alert | Fake | Yes | **no provider** | none | Honest payment records | P1 | Med |
| Livestock, inventory | Seeded | Seeded | State screens only | none | none | New tables + CRUD | P1 | Low |
| Peer groups, consultations | Seeded | Seeded | Community/* | none | none | New tables + RLS | P1 | Med |
| IoT | Simulated | Simulated | Yes | **no ingest** | none | Registry + manual readings | P1 | Med |
| Insurance | Coming soon | Fake camera | Yes | **no insurer** | none | Policy/claim records | P2 | Low |
| Map / VRA / planning / soil / farm-twin | Fake data on real views | Use `ZONES` | Yes | none | needs farms | Rewire to real farms (next wave) | P1 | Med |
| Weather | Real | Real | Yes | OpenWeather | none | Migrate UI, i18n | P1 | Low |
| AI assistant / scan | Real + demo | Real + demo | Yes | proxy | `knowledge_base` | Migrate UI, wire RAG, i18n | P1 | Med |
| Verification / agro-id | Real | Partly stubs | Yes | edge fns | tables exist | Complete stubs, i18n | P2 | Low |
| Wallet admin | Seeded store | Seeded | Yes | none | none | INVESTIGATE (admin scope undefined); hide until real | P2 | Low |
| Notifications realtime | Dead | Dead | n/a | Realtime excluded | view | Subscribe to base table or poll | P2 | Low |
| Localisation | ~8 screens | ~20 hard-coded | n/a | n/a | n/a | Move to `lib/i18n` | P1 | Low |
| Orphan routes (11) | Hidden | Deep-link only | n/a | n/a | n/a | "More" list in Profile | P2 | Low |
| Contracts | Absent | Seeded (main only) | Yes | needs orders/escrow | none | **Deferred**: depends on marketplace orders | P3 | High |
| Input supply | Absent | "Coming Soon" (main only) | Yes | none | none | **Deferred** | P3 | Low |
| `otp-auth` (main only) | Absent | Superseded by onboarding OTP | Yes | n/a | n/a | **Deprecate** | P3 | Low |
| Design tokens / primitives | Redesigned screens use them | Legacy uses `PageScaffold` | Variables in file | n/a | n/a | Migrate legacy screens; reconcile with `feat/kilimo-design-system` | P2 | Low |

## Routes present on `main` but not on this branch

`(tabs)/action`, `(tabs)/ai-training-hub`, `(tabs)/edit-profile`, `(tabs)/features`, `(tabs)/video-hub`, `contracts/*`, `input-supply`, `otp-auth`.
`ai-training-hub`, `edit-profile` and `video-hub` also exist as root routes here. The others are handled as above.
