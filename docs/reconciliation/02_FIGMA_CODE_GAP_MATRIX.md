# 02 — Figma ↔ Code Gap Matrix

_Generated 2026-09-24 against `main` @ 524583f. One row per Figma screen/state (superseded frames excluded)._

## Status key

| Status | Meaning here |
|---|---|
| `MATCHES` | Code matches Figma visually and functionally. **No row is marked MATCHES yet**: no screen has been compared pixel-for-pixel, and the Figma Home already differs from the code in navigation and header colour. |
| `PARTIAL` | A route or in-screen section implements this frame's purpose. Visual fidelity and state coverage are unverified. |
| `MISSING` | No route, section, or state implements it. |
| `BLOCKED_EXTERNAL` | UI can be built, but real behaviour needs an external credential/service (payments, insurer, IoT hardware, video provider). Must ship as clearly labelled sandbox/demo until then. |
| `STALE` | Superseded in Figma — see 01. |

## Summary

| Status | Screens + states |
|---|---|
| `PARTIAL` | 130 |
| `MISSING` | 56 |
| `BLOCKED_EXTERNAL` | 18 |
| **Total** | **204** |

### By area

| Area | Partial | Missing | Blocked |
|---|---|---|---|
| Mobile / AI | 8 | 1 | 0 |
| Mobile / Auth | 5 | 2 | 0 |
| Mobile / Community | 6 | 8 | 1 |
| Mobile / Dashboard | 4 | 0 | 0 |
| Mobile / Edge States | 1 | 1 | 0 |
| Mobile / Empty | 1 | 1 | 0 |
| Mobile / Farm | 26 | 12 | 5 |
| Mobile / Finance | 9 | 1 | 3 |
| Mobile / Market | 12 | 5 | 0 |
| Mobile / Onboarding | 10 | 2 | 0 |
| Mobile / Profile | 6 | 1 | 1 |
| Mobile / Scan | 5 | 0 | 0 |
| Mobile / Settings | 6 | 3 | 0 |
| Mobile / Soko | 6 | 7 | 0 |
| Mobile / Weather | 3 | 1 | 0 |
| State / AI | 4 | 5 | 0 |
| State / App | 0 | 3 | 0 |
| State / Empty | 8 | 1 | 0 |
| State / Error | 1 | 0 | 0 |
| State / IoT | 1 | 0 | 1 |
| State / Market | 1 | 0 | 0 |
| State / Offline | 6 | 0 | 0 |
| State / Payment | 0 | 0 | 7 |
| State / Permission | 1 | 2 | 0 |

## Matrix

Evidence method: route/file read plus keyword search over `app/ components/ lib/ hooks/ store/`. "Owner" is the file that should own the frame after migration.

| Node | Frame | Status | Owner (code) | Notes |
|---|---|---|---|---|
| [`57:750`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-750) | Mobile / AI / Diagnosis History | `MISSING` | `—` | No scan history screen |
| [`20:138`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-138) | Mobile / Auth / New Password | `MISSING` | `—` | Same as Password Reset |
| [`20:94`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-94) | Mobile / Auth / Password Reset | `MISSING` | `—` | App is OTP-only; decide whether password auth is in scope (see conflicts) |
| [`14:4484`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4484) | Mobile / Community / Agribusiness | `MISSING` | `—` |  |
| [`14:4332`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4332) | Mobile / Community / Coop Dashboard | `MISSING` | `—` | coop_leader role exists, no dashboard |
| [`100:1365`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1365) | Mobile / Community / Coop Leader Dashboard | `MISSING` | `—` |  |
| [`14:6591`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6591) | Mobile / Community / Coop Members | `MISSING` | `—` |  |
| [`14:4410`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4410) | Mobile / Community / Extension Officer | `MISSING` | `—` |  |
| [`100:1497`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1497) | Mobile / Community / Extension Officer Dashboard | `MISSING` | `—` |  |
| [`14:6696`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6696) | Mobile / Community / Farm Visit Report | `MISSING` | `—` |  |
| [`14:4641`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4641) | Mobile / Community / Knowledge Base | `MISSING` | `—` | KB exists server-side (RAG) but no browse screen |
| [`108:1246`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1246) | Mobile / Edge States / Loading State | `MISSING` | `—` | No shared Loading/Skeleton component |
| [`106:1360`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1360) | Mobile / Empty / No Connection | `MISSING` | `—` | No shared offline/error screen |
| [`14:6412`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6412) | Mobile / Farm / Comparison | `MISSING` | `—` |  |
| [`102:2635`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2635) | Mobile / Farm / Crop Lifecycle | `MISSING` | `—` |  |
| [`14:6904`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6904) | Mobile / Farm / Crop Recommendation | `MISSING` | `lib/recommendations.ts` | Logic exists, no screen |
| [`160:3785`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3785) | Mobile / Farm / Digital Twin - Scenario Comparison | `MISSING` | `—` |  |
| [`14:5458`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5458) | Mobile / Farm / Harvest Log | `MISSING` | `—` | Harvest mentions exist in tasks/calendar but no log screen |
| [`89:1775`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-1775) | Mobile / Farm / Health Dashboard | `MISSING` | `—` |  |
| [`160:1181`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1181) | Mobile / Farm / Livestock - Health Event | `MISSING` | `—` |  |
| [`14:5396`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5396) | Mobile / Farm / Pest Alert | `MISSING` | `—` |  |
| [`14:5607`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5607) | Mobile / Farm / Report Generator | `MISSING` | `lib/pdf (P&L only)` | Only P&L PDF exists |
| [`160:2201`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2201) | Mobile / Farm / Soil Analysis - Add Test | `MISSING` | `—` | No soil-test entry; blocks honest soil screen |
| [`160:2293`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2293) | Mobile / Farm / Soil Analysis - Results Detail | `MISSING` | `—` |  |
| [`160:2379`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2379) | Mobile / Farm / Soil Analysis - Test History | `MISSING` | `—` |  |
| [`14:6839`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6839) | Mobile / Finance / Digital Receipt | `MISSING` | `—` |  |
| [`100:1132`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1132) | Mobile / Market / Buyer Dashboard | `MISSING` | `—` | Marketplace is seller-centric (§21) |
| [`14:5849`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5849) | Mobile / Market / Contract Negotiation | `MISSING` | `—` |  |
| [`108:1382`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1382) | Mobile / Market / Input Supplier Dashboard | `MISSING` | `—` |  |
| [`108:1502`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1502) | Mobile / Market / Order Management | `MISSING` | `—` |  |
| [`14:6766`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6766) | Mobile / Market / Supply Chain | `MISSING` | `—` |  |
| [`57:1210`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1210) | Mobile / Onboarding / Personalization Bridge | `MISSING` | `—` |  |
| [`14:4159`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4159) | Mobile / Onboarding / Tutorial Welcome | `MISSING` | `—` | No post-onboarding tutorial |
| [`108:1852`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1852) | Mobile / Profile / Help | `MISSING` | `—` |  |
| [`14:6333`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6333) | Mobile / Settings / Data Export | `MISSING` | `—` | Needed for privacy (§17 export) |
| [`14:6992`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6992) | Mobile / Settings / Emergency Contacts | `MISSING` | `—` |  |
| [`14:4921`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4921) | Mobile / Settings / Help & Support | `MISSING` | `—` |  |
| [`53:769`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-769) | Mobile / Soko / My Offers | `MISSING` | `—` | No offers persistence |
| [`53:725`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-725) | Mobile / Soko / Offer Sent | `MISSING` | `—` |  |
| [`57:1066`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1066) | Mobile / Soko / Order Fulfillment | `MISSING` | `—` |  |
| [`57:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1134) | Mobile / Soko / Order History | `MISSING` | `—` |  |
| [`53:847`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-847) | Mobile / Soko / Order Tracking | `MISSING` | `—` | No orders table for marketplace |
| [`57:986`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-986) | Mobile / Soko / Seller Offers | `MISSING` | `—` |  |
| [`53:975`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-975) | Mobile / Soko / Seller Profile | `MISSING` | `—` |  |
| [`108:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1134) | Mobile / Weather / Radar Map | `MISSING` | `—` | Needs radar tile source |
| [`50:2561`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2561) | State / AI / Followup Chat | `MISSING` | `—` | No scan→chat handoff |
| [`50:2448`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2448) | State / AI / Image Blurry | `MISSING` | `—` |  |
| [`50:2309`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2309) | State / AI / Multiple Diagnoses | `MISSING` | `—` | Single diagnosis only (§20) |
| [`50:2388`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2388) | State / AI / No Plant Detected | `MISSING` | `—` |  |
| [`50:2632`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2632) | State / AI / Unsupported Crop | `MISSING` | `—` |  |
| [`20:542`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-542) | State / App / Network Error | `MISSING` | `—` | No shared ErrorState |
| [`20:591`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-591) | State / App / Skeleton Loading | `MISSING` | `—` | No Skeleton primitive |
| [`20:658`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-658) | State / App / Tooltip Onboarding | `MISSING` | `—` | No coachmarks |
| [`163:1412`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1412) | State / Empty / No Soil Tests | `MISSING` | `—` |  |
| [`53:1512`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1512) | State / Permission / Location | `MISSING` | `—` | Verify map/weather denied path |
| [`53:1580`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1580) | State / Permission / Notifications | `MISSING` | `—` |  |
| [`160:3084`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3084) | Mobile / Community / Expert Active Session | `BLOCKED_EXTERNAL` | `—` | Needs video/voice provider |
| [`160:1536`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1536) | Mobile / Farm / IoT - Add Device | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` |  |
| [`160:1605`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1605) | Mobile / Farm / IoT - Alerts | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` |  |
| [`160:1440`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1440) | Mobile / Farm / IoT - Device Detail | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` |  |
| [`160:1670`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1670) | Mobile / Farm / IoT - Drone View | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` |  |
| [`14:2549`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2549) | Mobile / Farm / IoT Dashboard | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` | No real device ingestion; must show simulated label (§24) |
| [`14:3347`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3347) | Mobile / Finance / Insurance | `BLOCKED_EXTERNAL` | `app/insurance.tsx` | Enrollment disabled in #77 pending insurer integration |
| [`160:2677`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2677) | Mobile / Finance / Insurance - File Claim | `BLOCKED_EXTERNAL` | `app/insurance.tsx` | Claims disabled in #77 |
| [`14:3256`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3256) | Mobile / Finance / Mobile Money | `BLOCKED_EXTERNAL` | `app/mobile-money.tsx` | M-Pesa/Airtel credentials; open PR #71 |
| [`27:138`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-138) | Mobile / Profile / Premium Upgrade | `BLOCKED_EXTERNAL` | `app/upgrade.tsx` | Paid tier needs real payments |
| [`163:1181`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1181) | State / IoT / Device Offline | `BLOCKED_EXTERNAL` | `app/iot-systems.tsx` |  |
| [`50:3608`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3608) | State / Payment / Failed | `BLOCKED_EXTERNAL` | `app/mobile-money.tsx` |  |
| [`50:3781`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3781) | State / Payment / Insufficient | `BLOCKED_EXTERNAL` | `—` |  |
| [`50:3687`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3687) | State / Payment / Pending | `BLOCKED_EXTERNAL` | `—` |  |
| [`50:3483`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3483) | State / Payment / Processing | `BLOCKED_EXTERNAL` | `app/mobile-money.tsx` |  |
| [`50:3862`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3862) | State / Payment / Refund | `BLOCKED_EXTERNAL` | `—` |  |
| [`50:3386`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3386) | State / Payment / Review | `BLOCKED_EXTERNAL` | `app/mobile-money.tsx` |  |
| [`50:3523`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3523) | State / Payment / Success | `BLOCKED_EXTERNAL` | `app/mobile-money.tsx` | Fake success removed in open PR #71 |
| [`102:2453`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2453) | Mobile / AI / Chat v2 | `PARTIAL` | `app/(tabs)/ai.tsx` |  |
| [`24:3244`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3244) | Mobile / AI / Training Guide | `PARTIAL` | `app/ai-training-hub.tsx` |  |
| [`160:1984`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1984) | Mobile / AI / Training Module Detail | `PARTIAL` | `app/ai-training-hub.tsx` |  |
| [`160:1884`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1884) | Mobile / AI / Training Module List | `PARTIAL` | `app/ai-training-hub.tsx` |  |
| [`160:2051`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2051) | Mobile / AI / Training Quiz | `PARTIAL` | `app/ai-training-hub.tsx` | Quiz references found |
| [`89:2107`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2107) | Mobile / AI / Voice Assistant | `PARTIAL` | `app/ai-voice.tsx` |  |
| [`160:3536`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3536) | Mobile / AI / Voice Processing Result | `PARTIAL` | `app/ai-voice.tsx` |  |
| [`20:908`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-908) | Mobile / AI / Voice Recording | `PARTIAL` | `app/ai-voice.tsx` |  |
| [`14:3840`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3840) | Mobile / Auth / Language Select | `PARTIAL` | `app/onboarding.tsx` | Language step inside onboarding |
| [`14:3955`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3955) | Mobile / Auth / Phone Verify | `PARTIAL` | `app/otp-auth.tsx` |  |
| [`14:3917`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3917) | Mobile / Auth / Sign In | `PARTIAL` | `app/otp-auth.tsx` | OTP sign-in exists; no password sign-in |
| [`14:3870`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3870) | Mobile / Auth / Sign Up | `PARTIAL` | `app/onboarding.tsx` | Phone-first signup; Figma shows separate screen |
| [`14:3820`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3820) | Mobile / Auth / Splash Screen | `PARTIAL` | `app/_layout.tsx (expo-splash-screen)` | Native splash; no designed splash screen in code |
| [`24:3363`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3363) | Mobile / Community / Consultation Booking | `PARTIAL` | `app/consultations.tsx` |  |
| [`160:3148`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3148) | Mobile / Community / Expert Consultation History | `PARTIAL` | `app/consultations.tsx` |  |
| [`160:3002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3002) | Mobile / Community / Expert Directory | `PARTIAL` | `app/consultations.tsx` |  |
| [`14:4562`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4562) | Mobile / Community / Forum | `PARTIAL` | `app/peer-groups.tsx` | Peer-group posts only; community links disabled in #79 |
| [`81:2185`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2185) | Mobile / Community / Peer Groups | `PARTIAL` | `app/peer-groups.tsx` |  |
| [`27:52`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-52) | Mobile / Community / Video Hub | `PARTIAL` | `app/video-hub.tsx` | Also stub app/(tabs)/video-hub.tsx — duplicate |
| [`57:666`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-666) | Mobile / Dashboard / Daily Actions | `PARTIAL` | `app/(tabs)/index.tsx` | Verify as distinct section |
| [`24:2404`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2404) | Mobile / Dashboard / Features Hub | `PARTIAL` | `app/(tabs)/features.tsx` |  |
| [`14:1245`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1245) | Mobile / Dashboard / Home | `PARTIAL` | `app/(tabs)/index.tsx` |  |
| [`24:2328`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2328) | Mobile / Dashboard / Today | `PARTIAL` | `app/(tabs)/index.tsx` | index.tsx is 5,672 lines — split before migrating |
| [`108:1207`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1207) | Mobile / Edge States / No Products | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`106:1319`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1319) | Mobile / Empty / No Farms | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`14:5687`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5687) | Mobile / Farm / Analytics | `PARTIAL` | `app/analytics/index.tsx` |  |
| [`14:2269`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2269) | Mobile / Farm / Calendar | `PARTIAL` | `app/calendar.tsx` |  |
| [`106:1612`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1612) | Mobile / Farm / Crop Health Map | `PARTIAL` | `app/map.tsx` | NDVI layer must be real or labeled |
| [`24:2523`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2523) | Mobile / Farm / Crop Library | `PARTIAL` | `app/crop-library.tsx` |  |
| [`160:2472`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2472) | Mobile / Farm / Crop Library - Detail | `PARTIAL` | `app/crop-library.tsx` |  |
| [`160:3619`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3619) | Mobile / Farm / Crop Plan - Create | `PARTIAL` | `app/crop-planning.tsx` |  |
| [`14:2132`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2132) | Mobile / Farm / Crop Planning | `PARTIAL` | `app/crop-planning.tsx` |  |
| [`24:2890`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2890) | Mobile / Farm / Digital Twin | `PARTIAL` | `app/farm-twin/index.tsx` |  |
| [`160:3706`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3706) | Mobile / Farm / Digital Twin - Simulation Results | `PARTIAL` | `app/farm-twin/[id].tsx` |  |
| [`24:2619`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2619) | Mobile / Farm / Field Detail | `PARTIAL` | `app/field/[id].tsx` |  |
| [`14:2417`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2417) | Mobile / Farm / Inventory | `PARTIAL` | `app/inventory.tsx` |  |
| [`160:1272`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1272) | Mobile / Farm / Inventory - Add Item | `PARTIAL` | `app/inventory.tsx` | addItem in store |
| [`160:1359`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1359) | Mobile / Farm / Inventory - Low Stock Alert | `PARTIAL` | `app/inventory.tsx` | lowStockAt field exists |
| [`14:2353`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2353) | Mobile / Farm / Livestock | `PARTIAL` | `app/livestock.tsx` |  |
| [`160:1094`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1094) | Mobile / Farm / Livestock - Add Animal | `PARTIAL` | `app/livestock.tsx` | addAnimal in store |
| [`160:1010`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1010) | Mobile / Farm / Livestock - Animal Detail | `PARTIAL` | `app/livestock.tsx` | Verify detail view |
| [`14:1642`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1642) | Mobile / Farm / Map | `PARTIAL` | `app/map.tsx` |  |
| [`106:1230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1230) | Mobile / Farm / Map View | `PARTIAL` | `app/map.tsx` |  |
| [`89:2006`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2006) | Mobile / Farm / Overview v2 | `PARTIAL` | `app/(tabs)/fields.tsx` |  |
| [`100:1007`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1007) | Mobile / Farm / Predictive Analytics | `PARTIAL` | `app/analytics/index.tsx` | Fabricated predictions removed in #74; needs real model or honest label |
| [`102:1362`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1362) | Mobile / Farm / Soil Analysis v2 | `PARTIAL` | `app/soil-analysis.tsx` | Open PRs #62/#78 |
| [`160:2115`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2115) | Mobile / Farm / Task Detail - Create | `PARTIAL` | `app/tasks.tsx` |  |
| [`14:2198`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2198) | Mobile / Farm / Tasks List | `PARTIAL` | `app/tasks.tsx` |  |
| [`102:1932`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1932) | Mobile / Farm / Twin Simulator | `PARTIAL` | `app/farm-twin/[id].tsx` |  |
| [`106:1710`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1710) | Mobile / Farm / VRA Map | `PARTIAL` | `app/vra-setup.tsx` |  |
| [`14:2038`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2038) | Mobile / Farm / VRA Setup | `PARTIAL` | `app/vra-setup.tsx` |  |
| [`14:5534`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5534) | Mobile / Finance / Expense Tracker | `PARTIAL` | `app/finance.tsx` | Open PR #67 |
| [`160:2756`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2756) | Mobile / Finance / Insurance - My Policies | `PARTIAL` | `app/insurance.tsx` |  |
| [`160:2590`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2590) | Mobile / Finance / Insurance - Policy Detail | `PARTIAL` | `app/insurance.tsx` |  |
| [`14:5762`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5762) | Mobile / Finance / Payment History | `PARTIAL` | `app/mobile-money.tsx` |  |
| [`102:1627`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1627) | Mobile / Finance / Tracker v2 | `PARTIAL` | `app/finance.tsx` | Open PR #67 |
| [`160:4230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4230) | Mobile / Finance / Wallet - Payout Approval | `PARTIAL` | `app/wallet-admin/payouts.tsx` |  |
| [`14:3403`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3403) | Mobile / Finance / Wallet Admin | `PARTIAL` | `app/wallet-admin/index.tsx` |  |
| [`81:2063`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2063) | Mobile / Finance / Wallet Payouts | `PARTIAL` | `app/wallet-admin/payouts.tsx` |  |
| [`27:312`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-312) | Mobile / Finance / Wallet Transactions | `PARTIAL` | `app/wallet-admin/transactions.tsx` |  |
| [`102:2118`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2118) | Mobile / Market / Browse v2 | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`160:3888`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3888) | Mobile / Market / Contract - Create | `PARTIAL` | `app/contracts/index.tsx` |  |
| [`160:3978`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3978) | Mobile / Market / Contract - Milestones | `PARTIAL` | `app/contracts/[id].tsx` |  |
| [`14:3082`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3082) | Mobile / Market / Contract Detail | `PARTIAL` | `app/contracts/[id].tsx` |  |
| [`14:2993`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2993) | Mobile / Market / Contracts List | `PARTIAL` | `app/contracts/index.tsx` |  |
| [`14:3476`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3476) | Mobile / Market / Input Supply | `PARTIAL` | `app/input-supply.tsx` |  |
| [`160:2924`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2924) | Mobile / Market / Input Supply - Cart Order | `PARTIAL` | `app/input-supply.tsx` | Fake ordering removed in #52 |
| [`160:2843`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2843) | Mobile / Market / Input Supply - Product Detail | `PARTIAL` | `app/input-supply.tsx` |  |
| [`14:2920`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2920) | Mobile / Market / Listing Detail | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`14:2835`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2835) | Mobile / Market / Marketplace Browse | `PARTIAL` | `app/(tabs)/market.tsx` | Market tab is hidden (href:null); reached via Features/Home only |
| [`106:1926`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1926) | Mobile / Market / Seller Dashboard | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`14:6498`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6498) | Mobile / Market / Trends | `PARTIAL` | `app/(tabs)/market.tsx` | Price index labeling — open PR #66 |
| [`40:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=40-1134) | Mobile / Onboarding / Agro ID Welcome | `PARTIAL` | `app/verification/intro.tsx` |  |
| [`81:2434`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2434) | Mobile / Onboarding / Business Verification | `PARTIAL` | `app/verification/business.tsx` |  |
| [`24:2718`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2718) | Mobile / Onboarding / Completion | `PARTIAL` | `app/onboarding.tsx` |  |
| [`14:4109`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4109) | Mobile / Onboarding / Farm Setup | `PARTIAL` | `app/onboarding.tsx` |  |
| [`40:1089`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=40-1089) | Mobile / Onboarding / ID Verification | `PARTIAL` | `app/verification/personal.tsx` | 44-line screen; thin |
| [`106:2059`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-2059) | Mobile / Onboarding / OTP Verify | `PARTIAL` | `app/otp-auth.tsx` | Duplicate of Auth / Phone Verify in Figma |
| [`108:1002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1002) | Mobile / Onboarding / Role Select | `PARTIAL` | `app/onboarding.tsx` | 8 canonical roles in lib/access.tsx |
| [`106:1045`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1045) | Mobile / Onboarding / Sign Up | `PARTIAL` | `app/onboarding.tsx` | Duplicate of Auth / Sign Up in Figma — pick one |
| [`81:2495`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2495) | Mobile / Onboarding / Verification Pending | `PARTIAL` | `app/verification/pending.tsx` |  |
| [`106:1004`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1004) | Mobile / Onboarding / Welcome | `PARTIAL` | `app/onboarding.tsx` |  |
| [`160:4166`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4166) | Mobile / Profile / Agro ID - QR Export | `PARTIAL` | `app/agro-id.tsx` | QR via react-native-qrcode-svg |
| [`81:1940`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-1940) | Mobile / Profile / Agro ID Card | `PARTIAL` | `app/agro-id.tsx` |  |
| [`24:3055`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3055) | Mobile / Profile / Edit Profile | `PARTIAL` | `app/edit-profile.tsx` | Also stub app/(tabs)/edit-profile.tsx (2 lines) — duplicate |
| [`24:3151`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3151) | Mobile / Profile / KYC Verification | `PARTIAL` | `app/verification/*` |  |
| [`14:1702`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1702) | Mobile / Profile / Overview | `PARTIAL` | `app/(tabs)/profile.tsx` |  |
| [`108:1715`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1715) | Mobile / Profile / Settings | `PARTIAL` | `app/(tabs)/profile.tsx` | No dedicated settings route |
| [`20:304`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-304) | Mobile / Scan / Camera Active | `PARTIAL` | `app/scan.tsx` |  |
| [`20:265`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-265) | Mobile / Scan / Camera Permission | `PARTIAL` | `app/scan.tsx` |  |
| [`14:5321`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5321) | Mobile / Scan / Crop Analysis | `PARTIAL` | `app/scan.tsx` |  |
| [`14:1587`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1587) | Mobile / Scan / Crop Scan | `PARTIAL` | `app/scan.tsx` |  |
| [`20:342`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-342) | Mobile / Scan / Results | `PARTIAL` | `app/scan.tsx + components/diseaseModal.tsx` |  |
| [`81:2539`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2539) | Mobile / Settings / AI Admin | `PARTIAL` | `app/ai-admin.tsx` | Needs RBAC gate check |
| [`27:230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-230) | Mobile / Settings / Legal & Privacy | `PARTIAL` | `app/legal/*, app/privacy.tsx, app/terms.tsx` | Two parallel legal implementations — duplicate |
| [`89:2171`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2171) | Mobile / Settings / Notifications v2 | `PARTIAL` | `app/notifications.tsx` |  |
| [`14:4854`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4854) | Mobile / Settings / Offline Mode | `PARTIAL` | `app/offline-queue.tsx` |  |
| [`14:4785`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4785) | Mobile / Settings / Preferences | `PARTIAL` | `app/(tabs)/profile.tsx` |  |
| [`102:2806`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2806) | Mobile / Settings / Profile v2 | `PARTIAL` | `app/(tabs)/profile.tsx` |  |
| [`57:916`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-916) | Mobile / Soko / Create Listing | `PARTIAL` | `app/(tabs)/market.tsx` | market_listings migration exists |
| [`53:680`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-680) | Mobile / Soko / Make Offer | `PARTIAL` | `app/(tabs)/market.tsx` | Offer UI found; no offers table in migrations |
| [`53:913`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-913) | Mobile / Soko / Price Alerts | `PARTIAL` | `app/(tabs)/market.tsx` | Verify persistence/SMS path |
| [`53:623`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-623) | Mobile / Soko / Product Detail | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`53:528`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-528) | Mobile / Soko / Search | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`57:834`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-834) | Mobile / Soko / Seller Dashboard | `PARTIAL` | `app/(tabs)/market.tsx` |  |
| [`14:5916`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5916) | Mobile / Weather / Alerts | `PARTIAL` | `app/forecast.tsx` | Fabricated outlook removed in #72 |
| [`102:1002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1002) | Mobile / Weather / Forecast v2 | `PARTIAL` | `app/forecast.tsx` |  |
| [`160:4077`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4077) | Mobile / Weather / Hourly Detail | `PARTIAL` | `app/forecast.tsx` | Only if source provides hourly (§23) |
| [`50:2179`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2179) | State / AI / High Confidence | `PARTIAL` | `app/scan.tsx` |  |
| [`50:2247`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2247) | State / AI / Low Confidence | `PARTIAL` | `app/scan.tsx` | confidence handled; verify UI treatment |
| [`50:2113`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2113) | State / AI / Processing | `PARTIAL` | `app/scan.tsx` |  |
| [`50:2506`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2506) | State / AI / Service Unavailable | `PARTIAL` | `app/scan.tsx` | Network-error path exists |
| [`163:1468`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1468) | State / Empty / No Contracts | `PARTIAL` | `app/contracts/index.tsx` |  |
| [`53:1229`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1229) | State / Empty / No Farms | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`53:1335`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1335) | State / Empty / No History | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`163:1522`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1522) | State / Empty / No Insurance | `PARTIAL` | `app/insurance.tsx` |  |
| [`163:1358`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1358) | State / Empty / No Inventory | `PARTIAL` | `app/inventory.tsx` | Needed after #81 (empty seeds) |
| [`163:1304`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1304) | State / Empty / No Livestock | `PARTIAL` | `app/livestock.tsx` | EmptyState wired |
| [`53:1282`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1282) | State / Empty / No Products | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`163:1250`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1250) | State / Empty / No Tasks | `PARTIAL` | `app/tasks.tsx` |  |
| [`53:1388`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1388) | State / Error / Generic | `PARTIAL` | `components/ErrorBoundary.tsx` |  |
| [`163:1125`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1125) | State / IoT / No Devices | `PARTIAL` | `app/iot-systems.tsx` |  |
| [`20:492`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-492) | State / Market / Empty | `PARTIAL` | `components/ui/EmptyState.tsx` |  |
| [`50:3248`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3248) | State / Offline / AI Fallback | `PARTIAL` | `lib/ai-demo.ts` | Must be labeled demo |
| [`50:2945`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2945) | State / Offline / Banner | `PARTIAL` | `app/_layout.tsx` | isOffline in store; verify banner |
| [`50:3165`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3165) | State / Offline / Sync Complete | `PARTIAL` | `app/offline-queue.tsx` |  |
| [`50:3204`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3204) | State / Offline / Sync Failed | `PARTIAL` | `app/offline-queue.tsx` |  |
| [`50:3096`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3096) | State / Offline / Sync Progress | `PARTIAL` | `app/offline-queue.tsx` |  |
| [`50:3027`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3027) | State / Offline / Sync Queue | `PARTIAL` | `app/offline-queue.tsx` |  |
| [`53:1444`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1444) | State / Permission / Camera | `PARTIAL` | `app/scan.tsx` |  |

## Reverse matrix

### Code with no Figma equivalent

| Code | Observation | Proposed action |
|---|---|---|
| `app/(tabs)/edit-profile.tsx`, `video-hub.tsx`, `ai-training-hub.tsx` | 2-line re-exports of root screens, hidden tabs | Delete; keep root routes |
| `app/terms.tsx` + `app/privacy.tsx` vs `app/legal/terms.tsx` + `app/legal/privacy.tsx` | Two legal implementations | Keep one under `app/legal/`, redirect the other |
| `app/(tabs)/action.tsx` | Placeholder that redirects to `/features` | Replaced by whatever the Figma centre button does (Conflict C1) |
| `components/NeuralOrb.tsx`, `SwipeCardDeck3D.tsx` | Not in Figma | Keep only if a migrated screen uses them |

### Features in code but hard to discover

- **Market** — hidden tab; Figma makes it a primary tab.
- **Offline queue** (`app/offline-queue.tsx`) — Figma exposes it as Settings → Offline Mode plus sync states.
- **Notifications** — only reachable from Home bell.

### PRD ↔ Figma cross-check

Not done yet — `KILIMO_AI_PRD.md` has to be read against both lists. Scheduled as the first step of Phase B.

## Conflicts that need an owner decision

| # | Conflict | Figma | Code | Recommendation |
|---|---|---|---|---|
| C1 | **Bottom navigation** | Nyumbani · Shamba · centre leaf · Soko · Mimi; AI via Home search; camera FAB | Home · Fields · centre (→ Features) · AI · Profile; Market hidden | Adopt Figma: Market as a tab matches the marketplace's weight; AI stays one tap away via the Home field + FAB. Validate with 3–5 farmers before locking. |
| C2 | **Authentication** | Sign In, Password Reset, New Password frames | Phone OTP only | Keep OTP-only (feature phones, shared devices, no password to forget) and drop the password frames. |
| C3 | **Duplicate Figma frames** | `Auth / Sign Up` vs `Onboarding / Sign Up`; `Auth / Phone Verify` vs `Onboarding / OTP Verify`; `Market / Seller Dashboard` vs `Soko / Seller Dashboard`; `Mobile / Empty / No Farms` vs `State / Empty / No Farms`; `Edge States / No Products` vs `State / Empty / No Products` | — | Designer marks one of each pair as superseded (the later, taller frames look newer). |
| C4 | **Roles** | Input Supplier dashboard; Buyer dashboard | No `input_supplier` role; buyers folded into `agribusiness` | Add `input_supplier` (or map to `agribusiness`), and make the buyer role explicit before building those dashboards. |
| C5 | **Brand colour** | Header reads dark olive | `#2E6F40` forest | Sample exact hex from Figma frames and update `constants/Theme.ts` once, in one commit. |
| C6 | **Backend is paused** | — | Supabase `kilimo_ai` project `INACTIVE` | Restore it (or create dev/staging projects) before any persistence work; the owner has to do this. |
