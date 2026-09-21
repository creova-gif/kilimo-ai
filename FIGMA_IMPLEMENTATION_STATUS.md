# FIGMA_IMPLEMENTATION_STATUS

Source: Figma `kilimo.ai`, page "2· Prototype" — 227 top-level nodes: **159 live screens + 45 state screens + 9 superseded** (=213) + 3 component frames + 11 labels. The attached `.fig` was decoded and matches (227 nodes / 216 frames). Inventory: `docs/kilimo-v2/01_DISCOVERY/FIGMA_SCREEN_INVENTORY.md`.

"Implemented" = built in the final design system, running on the iPhone 15 Pro Max simulator, with real data or an honest state, and covered by tests.

## Implemented (final UI)

| Figma | Final screen | Verified |
|---|---|---|
| Onboarding / Welcome (106:1004), Auth / Language Select (14:3840) | `app/onboarding.tsx` welcome + language | E2E 00, 02 |
| Onboarding / Sign Up (106:1045) | register step (phone or email + consent) | E2E 02 |
| Onboarding / OTP Verify (106:2059) | OTP step (resend countdown) | E2E 02 |
| Onboarding / Role Select (108:1002) | role step | E2E 02 |
| Onboarding / Farm Setup (14:4109) | farm step (empty by default; optional questions collapsed) | E2E 02 + DB |
| Dashboard / Today (24:2328) | `app/(tabs)/index.tsx` (real data / empty states) | E2E 03, 04 |
| Bottom navigation (all tabbed frames) | `app/(tabs)/_layout.tsx` | device |
| Soko / Search (53:528) + Marketplace Browse | `app/(tabs)/market.tsx` | 6 screen tests; E2E 05 |
| Soko / Product Detail (53:623) | `app/soko/[id].tsx` (contact seller) | typecheck; E2E 05 (list→mine) |
| Soko / Create Listing (57:916) | `app/soko/create.tsx` | E2E 05 + DB |
| Soko / Seller Dashboard (57:834) | `app/soko/mine.tsx` ("Matangazo yangu") | E2E 05 |
| State / Empty, Error, Offline banner, Skeleton (shared) | `EmptyState`, `ErrorState`, `OfflineBanner`, `SkeletonBlock` primitives | used on dashboard + Soko |

## Deferred deliberately (no backend / would require fabricating data)

Soko offers / orders / tracking / price alerts (13 screens) · Contracts (5) · Input supply (3) · Payments state screens (7) · IoT (device list/detail/alerts, 2 states) · Insurance · Wallet payouts · Community forum / coop / extension dashboards · Predictive analytics · Digital twin. Each needs a table/API/provider first (see `BACKEND_CAPABILITY_MATRIX.md`).

## Not yet migrated (legacy UI still in the app)

Shamba (farm) tab · AI tab + Scan flows (+ 9 AI state screens) · Profile/Settings · Notifications · Weather (full forecast) · Map · Tasks/Calendar · Verification · Legal · Finance · Livestock · Inventory · Soil · Analytics.

## Count

Final-design screens implemented: **10 of 159 live** (+ shared state components). The remaining ~149 are either deferred with a stated reason (~55) or not yet migrated (~94). No Figma screen is unexplained; each has a row in the inventory with a decision in the reconciliation matrices.
