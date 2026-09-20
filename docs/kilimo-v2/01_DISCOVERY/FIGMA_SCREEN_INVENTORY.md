# Figma Screen Inventory — kilimo.ai (file `178jR1R7rV98GJzqsYy4Sp`)

Generated programmatically from the Figma metadata of page **`2· Prototype`** (node `0:1`). A second page, **`1· Enterprise Resource Platform, ERP`** (`208:1221`), exists and is out of scope for the mobile app.

> "Legacy route exists" means an Expo Router file exists in `app/` for the *domain*; it does **not** mean it matches the Figma design or works. Verification status is tracked in `KILIMO_TEST_REPORT.md`.

## Totals

- Top-level nodes: **227** (216 frames, 11 canvas labels)
- Live screens (non-superseded, non-state): **159** — legacy route exists: **124**, no route (GAP): **35**
- Cross-cutting state screens (empty/error/offline/payment/permission/AI states): **45**
- Superseded v1 screens (skip): **9**
- Reusable component frames: **3**

## Matrix

| Node | Screen | Size | Kind | Domain | Legacy route | Backend / dependency | Status |
|---|---|---|---|---|---|---|---|
| 14:3820 | Mobile / Auth / Splash Screen | 402x874 | screen | Onboarding | app/onboarding.tsx | i18n (EN/SW) | legacy route exists — restyle+verify |
| 14:3840 | Mobile / Auth / Language Select | 402x874 | screen | Onboarding | app/onboarding.tsx | i18n (EN/SW) | legacy route exists — restyle+verify |
| 14:3870 | Mobile / Auth / Sign Up | 402x874 | screen | Auth | app/otp-auth.tsx | Supabase Auth (phone/email OTP) | legacy route exists — restyle+verify |
| 14:3917 | Mobile / Auth / Sign In | 402x874 | screen | Auth | app/otp-auth.tsx | Supabase Auth (phone/email OTP) | legacy route exists — restyle+verify |
| 14:3955 | Mobile / Auth / Phone Verify | 402x874 | screen | Auth | app/otp-auth.tsx | Supabase Auth (phone/email OTP) | legacy route exists — restyle+verify |
| 14:4058 | Mobile / Onboarding / Role Select | 402x874 | superseded | Onboarding | app/onboarding.tsx | farmer_profiles | Superseded (v1) – skip |
| 14:4109 | Mobile / Onboarding / Farm Setup | 402x1229 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 14:4159 | Mobile / Onboarding / Tutorial Welcome | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 20:94 | Mobile / Auth / Password Reset | 402x874 | screen | Auth | app/otp-auth.tsx | Supabase Auth (phone/email OTP) | legacy route exists — restyle+verify |
| 20:138 | Mobile / Auth / New Password | 402x874 | screen | Auth | app/otp-auth.tsx | Supabase Auth (phone/email OTP) | legacy route exists — restyle+verify |
| 20:265 | Mobile / Scan / Camera Permission | 402x874 | screen | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | legacy route exists — restyle+verify |
| 20:304 | Mobile / Scan / Camera Active | 402x874 | screen | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | legacy route exists — restyle+verify |
| 20:342 | Mobile / Scan / Results | 402x874 | screen | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | legacy route exists — restyle+verify |
| 20:908 | Mobile / AI / Voice Recording | 402x874 | screen | AI assistant | app/ai-voice.tsx | edge fn openai-proxy, mic | legacy route exists — restyle+verify |
| 24:2328 | Mobile / Dashboard / Today | 402x874 | screen | Dashboard | app/(tabs)/index.tsx | weather, farm store | legacy route exists — restyle+verify |
| 24:2404 | Mobile / Dashboard / Features Hub | 402x1093 | screen | Dashboard | app/(tabs)/features.tsx | — | legacy route exists — restyle+verify |
| 24:2523 | Mobile / Farm / Crop Library | 402x874 | screen | Crops | app/crop-library.tsx | static catalog | legacy route exists — restyle+verify |
| 24:2619 | Mobile / Farm / Field Detail | 402x1200 | screen | Farm/Plot | app/field/[id].tsx | farm store | legacy route exists — restyle+verify |
| 24:2718 | Mobile / Onboarding / Completion | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 24:2890 | Mobile / Farm / Digital Twin | 402x987 | screen | Digital twin | app/farm-twin/index.tsx | farm store | legacy route exists — restyle+verify |
| 24:3055 | Mobile / Profile / Edit Profile | 402x957 | screen | Profile | app/edit-profile.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 24:3151 | Mobile / Profile / KYC Verification | 402x1065 | screen | Verification | app/verification/intro.tsx | submit-verification | legacy route exists — restyle+verify |
| 24:3244 | Mobile / AI / Training Guide | 402x1024 | screen | AI training | app/ai-training-hub.tsx | static content | legacy route exists — restyle+verify |
| 24:3363 | Mobile / Community / Consultation Booking | 402x874 | screen | Experts | app/consultations.tsx | no backend | legacy route exists — restyle+verify |
| 27:52 | Mobile / Community / Video Hub | 402x1377 | screen | Content | app/video-hub.tsx | static | legacy route exists — restyle+verify |
| 27:138 | Mobile / Profile / Premium Upgrade | 402x874 | screen | Billing | app/upgrade.tsx | no payments backend | legacy route exists — restyle+verify |
| 27:230 | Mobile / Settings / Legal & Privacy | 402x874 | screen | Legal | app/legal/privacy.tsx | static | legacy route exists — restyle+verify |
| 27:312 | Mobile / Finance / Wallet Transactions | 402x874 | screen | Wallet | app/wallet-admin/index.tsx | agro_ledger | legacy route exists — restyle+verify |
| 14:1245 | Mobile / Dashboard / Home | 402x994 | screen | Dashboard | app/(tabs)/index.tsx | weather, farm store | legacy route exists — restyle+verify |
| 14:1317 | Mobile / Farm / Overview | 402x874 | superseded | Farm/Plot | app/(tabs)/fields.tsx | farm store | Superseded (v1) – skip |
| 14:1385 | Mobile / AI / Chat | 402x874 | superseded | AI assistant | app/(tabs)/ai.tsx | edge fns openai-proxy / rag-chat | Superseded (v1) – skip |
| 14:1440 | Mobile / Market / Browse | 402x874 | superseded | Marketplace | app/(tabs)/market.tsx | SEED data; market_listings | Superseded (v1) – skip |
| 14:1518 | Mobile / Weather / Forecast | 402x874 | superseded | Weather | app/forecast.tsx | OpenWeather (client) | Superseded (v1) – skip |
| 14:1587 | Mobile / Scan / Crop Scan | 402x874 | screen | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | legacy route exists — restyle+verify |
| 14:1642 | Mobile / Farm / Map | 402x874 | screen | Maps | app/map.tsx | react-native-maps | legacy route exists — restyle+verify |
| 14:1702 | Mobile / Profile / Overview | 402x874 | screen | Profile | app/(tabs)/profile.tsx | auth | legacy route exists — restyle+verify |
| 14:2038 | Mobile / Farm / VRA Setup | 402x874 | screen | Precision ag | app/vra-setup.tsx | IoT | legacy route exists — restyle+verify |
| 14:2132 | Mobile / Farm / Crop Planning | 402x876 | screen | Crops | app/crop-planning.tsx | static templates | legacy route exists — restyle+verify |
| 14:2198 | Mobile / Farm / Tasks List | 402x874 | screen | Tasks | app/tasks.tsx | tasks store | legacy route exists — restyle+verify |
| 14:2269 | Mobile / Farm / Calendar | 402x1079 | screen | Tasks | app/calendar.tsx | — | legacy route exists — restyle+verify |
| 14:2353 | Mobile / Farm / Livestock | 402x874 | screen | Livestock | app/livestock.tsx | local store | legacy route exists — restyle+verify |
| 14:2417 | Mobile / Farm / Inventory | 402x874 | screen | Inventory | app/inventory.tsx | local store | legacy route exists — restyle+verify |
| 14:2490 | Mobile / Farm / Soil Analysis | 402x874 | superseded | Soil | app/soil-analysis.tsx | local store | Superseded (v1) – skip |
| 14:2549 | Mobile / Farm / IoT Dashboard | 402x1023 | screen | IoT | app/iot-systems.tsx | NO ingestion backend | legacy route exists — restyle+verify |
| 14:2835 | Mobile / Market / Marketplace Browse | 402x874 | screen | Marketplace | app/(tabs)/market.tsx | SEED data; market_listings | legacy route exists — restyle+verify |
| 14:2920 | Mobile / Market / Listing Detail | 402x874 | screen | Marketplace | app/(tabs)/market.tsx | SEED data; market_listings | legacy route exists — restyle+verify |
| 14:2993 | Mobile / Market / Contracts List | 402x874 | screen | Contracts | app/contracts/index.tsx | client-only store (no table) | legacy route exists — restyle+verify |
| 14:3082 | Mobile / Market / Contract Detail | 402x874 | screen | Contracts | app/contracts/index.tsx | client-only store (no table) | legacy route exists — restyle+verify |
| 14:3166 | Mobile / Finance / Tracker | 402x874 | superseded | Finance | app/finance.tsx | agro_ledger (offline-first) | Superseded (v1) – skip |
| 14:3256 | Mobile / Finance / Mobile Money | 402x874 | screen | Payments | app/mobile-money.tsx | no live provider | legacy route exists — restyle+verify |
| 14:3347 | Mobile / Finance / Insurance | 402x874 | screen | Insurance | app/insurance.tsx | disabled (unsupported) | legacy route exists — restyle+verify |
| 14:3403 | Mobile / Finance / Wallet Admin | 402x874 | screen | Wallet | app/wallet-admin/index.tsx | agro_ledger | legacy route exists — restyle+verify |
| 14:3476 | Mobile / Market / Input Supply | 402x874 | screen | Marketplace | app/input-supply.tsx | market_listings | legacy route exists — restyle+verify |
| 14:4332 | Mobile / Community / Coop Dashboard | 402x874 | screen | Community | — | no backend | GAP — no route |
| 14:4410 | Mobile / Community / Extension Officer | 402x874 | screen | Community | — | no backend | GAP — no route |
| 14:4484 | Mobile / Community / Agribusiness | 402x874 | screen | Community | — | no backend | GAP — no route |
| 14:4562 | Mobile / Community / Forum | 402x1158 | screen | Community | — | no backend | GAP — no route |
| 14:4641 | Mobile / Community / Knowledge Base | 402x977 | screen | Community | — | no backend | GAP — no route |
| 14:4709 | Mobile / Settings / Notifications | 402x874 | superseded | Notifications | app/notifications.tsx | user_notifications | Superseded (v1) – skip |
| 14:4785 | Mobile / Settings / Preferences | 402x874 | screen | Settings | — | no screen | GAP — no route |
| 14:4854 | Mobile / Settings / Offline Mode | 402x874 | screen | Offline | app/offline-queue.tsx | lib/offline.ts | legacy route exists — restyle+verify |
| 14:4921 | Mobile / Settings / Help & Support | 402x874 | screen | Settings | — | no screen | GAP — no route |
| 14:5321 | Mobile / Scan / Crop Analysis | 402x874 | screen | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | legacy route exists — restyle+verify |
| 14:5396 | Mobile / Farm / Pest Alert | 402x874 | screen | Farm | — | no backend | GAP — no route |
| 14:5458 | Mobile / Farm / Harvest Log | 402x874 | screen | Farm | — | no backend | GAP — no route |
| 14:5534 | Mobile / Finance / Expense Tracker | 402x874 | screen | Finance | app/finance.tsx | agro_ledger (offline-first) | legacy route exists — restyle+verify |
| 14:5607 | Mobile / Farm / Report Generator | 402x874 | screen | Analytics | app/analytics/index.tsx | farm store | legacy route exists — restyle+verify |
| 14:5687 | Mobile / Farm / Analytics | 402x874 | screen | Analytics | app/analytics/index.tsx | farm store | legacy route exists — restyle+verify |
| 14:5762 | Mobile / Finance / Payment History | 402x874 | screen | Finance | app/finance.tsx | agro_ledger (offline-first) | legacy route exists — restyle+verify |
| 14:5849 | Mobile / Market / Contract Negotiation | 402x874 | screen | Contracts | app/contracts/index.tsx | client-only store (no table) | legacy route exists — restyle+verify |
| 14:5916 | Mobile / Weather / Alerts | 402x874 | screen | Weather | app/forecast.tsx | OpenWeather (client) | legacy route exists — restyle+verify |
| 14:6333 | Mobile / Settings / Data Export | 402x874 | screen | Settings | — | no screen | GAP — no route |
| 14:6412 | Mobile / Farm / Comparison | 402x874 | screen | Analytics | app/analytics/index.tsx | farm store | legacy route exists — restyle+verify |
| 14:6498 | Mobile / Market / Trends | 402x874 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 14:6591 | Mobile / Community / Coop Members | 402x874 | screen | Community | — | no backend | GAP — no route |
| 14:6696 | Mobile / Community / Farm Visit Report | 402x874 | screen | Community | — | no backend | GAP — no route |
| 14:6766 | Mobile / Market / Supply Chain | 402x874 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 14:6839 | Mobile / Finance / Digital Receipt | 402x874 | screen | Finance | app/finance.tsx | agro_ledger (offline-first) | legacy route exists — restyle+verify |
| 14:6904 | Mobile / Farm / Crop Recommendation | 402x874 | screen | Crops | app/crop-planning.tsx | static templates | legacy route exists — restyle+verify |
| 14:6992 | Mobile / Settings / Emergency Contacts | 402x874 | screen | Settings | — | no screen | GAP — no route |
| 20:492 | State / Market / Empty | 402x874 | state | Marketplace | — | no backend (dashboards/trends/supply chain) | cross-cutting state component |
| 20:542 | State / App / Network Error | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 20:591 | State / App / Skeleton Loading | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 20:658 | State / App / Tooltip Onboarding | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 32:97 | Button | 181x288 | component |  | — |  | component → primitives |
| 32:108 | Status Badge | 78x161 | component |  | — |  | component → primitives |
| 32:117 | Input Field | 166x252 | component |  | — |  | component → primitives |
| 32:131 | 01 — Onboarding & Authentication | 474x34 | section-label |  | — |  | n/a (canvas label) |
| 32:132 | 02 — Onboarding Completion & Today | 521x34 | section-label |  | — |  | n/a (canvas label) |
| 32:133 | 03 — Core App | 208x34 | section-label |  | — |  | n/a (canvas label) |
| 32:134 | 04 — Farm Management | 336x34 | section-label |  | — |  | n/a (canvas label) |
| 32:135 | 05 — Commerce & Finance | 369x34 | section-label |  | — |  | n/a (canvas label) |
| 32:136 | 06 — Community & Settings | 385x34 | section-label |  | — |  | n/a (canvas label) |
| 32:137 | 07 — Advanced Features | 342x34 | section-label |  | — |  | n/a (canvas label) |
| 32:138 | 08 — Extended Features | 336x34 | section-label |  | — |  | n/a (canvas label) |
| 32:139 | 09 — AI & Scan Flows | 295x34 | section-label |  | — |  | n/a (canvas label) |
| 32:140 | 10 — Profile & Account | 311x34 | section-label |  | — |  | n/a (canvas label) |
| 32:141 | 11 — App States | 220x34 | section-label |  | — |  | n/a (canvas label) |
| 40:1089 | Mobile / Onboarding / ID Verification | 402x874 | screen | Verification | app/verification/personal.tsx | edge fn submit-verification | legacy route exists — restyle+verify |
| 40:1134 | Mobile / Onboarding / Agro ID Welcome | 402x874 | screen | Agro-ID | app/agro-id.tsx | edge fn mint-agro-id | legacy route exists — restyle+verify |
| 50:2113 | State / AI / Processing | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2179 | State / AI / High Confidence | 402x951 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2247 | State / AI / Low Confidence | 402x889 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2309 | State / AI / Multiple Diagnoses | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2388 | State / AI / No Plant Detected | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2448 | State / AI / Image Blurry | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2506 | State / AI / Service Unavailable | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2561 | State / AI / Followup Chat | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2632 | State / AI / Unsupported Crop | 402x874 | state | AI diagnosis | app/scan.tsx | edge fn openai-proxy, camera | cross-cutting state component |
| 50:2945 | State / Offline / Banner | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3027 | State / Offline / Sync Queue | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3096 | State / Offline / Sync Progress | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3165 | State / Offline / Sync Complete | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3204 | State / Offline / Sync Failed | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3248 | State / Offline / AI Fallback | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3386 | State / Payment / Review | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3483 | State / Payment / Processing | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3523 | State / Payment / Success | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3608 | State / Payment / Failed | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3687 | State / Payment / Pending | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3781 | State / Payment / Insufficient | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 50:3862 | State / Payment / Refund | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:528 | Mobile / Soko / Search | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:623 | Mobile / Soko / Product Detail | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:680 | Mobile / Soko / Make Offer | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:725 | Mobile / Soko / Offer Sent | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:769 | Mobile / Soko / My Offers | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:847 | Mobile / Soko / Order Tracking | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:913 | Mobile / Soko / Price Alerts | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:975 | Mobile / Soko / Seller Profile | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 53:1229 | State / Empty / No Farms | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1282 | State / Empty / No Products | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1335 | State / Empty / No History | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1388 | State / Error / Generic | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1444 | State / Permission / Camera | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1512 | State / Permission / Location | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 53:1580 | State / Permission / Notifications | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 57:666 | Mobile / Dashboard / Daily Actions | 402x1017 | screen | Dashboard | app/(tabs)/action.tsx | tasks | legacy route exists — restyle+verify |
| 57:750 | Mobile / AI / Diagnosis History | 402x874 | screen | AI diagnosis | — | no history table | GAP — no route |
| 57:834 | Mobile / Soko / Seller Dashboard | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 57:916 | Mobile / Soko / Create Listing | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 57:986 | Mobile / Soko / Seller Offers | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 57:1066 | Mobile / Soko / Order Fulfillment | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 57:1134 | Mobile / Soko / Order History | 402x874 | screen | Marketplace (Soko) | — | no offers/orders/price-alert backend | GAP — no route |
| 57:1210 | Mobile / Onboarding / Personalization Bridge | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 81:1940 | Mobile / Profile / Agro ID Card | 402x944 | screen | Agro-ID | app/agro-id.tsx | mint-agro-id / verify-agro-id | legacy route exists — restyle+verify |
| 81:2063 | Mobile / Finance / Wallet Payouts | 402x874 | screen | Wallet | app/wallet-admin/index.tsx | agro_ledger | legacy route exists — restyle+verify |
| 81:2185 | Mobile / Community / Peer Groups | 402x874 | screen | Community | app/peer-groups.tsx | disabled (fabricated links removed) | legacy route exists — restyle+verify |
| 81:2434 | Mobile / Onboarding / Business Verification | 402x874 | screen | Verification | app/verification/business.tsx | edge fn submit-verification | legacy route exists — restyle+verify |
| 81:2495 | Mobile / Onboarding / Verification Pending | 402x874 | screen | Verification | app/verification/pending.tsx | verification_requests | legacy route exists — restyle+verify |
| 81:2539 | Mobile / Settings / AI Admin | 402x874 | screen | AI admin | app/ai-admin.tsx | — | legacy route exists — restyle+verify |
| 89:1775 | Mobile / Farm / Health Dashboard | 402x1332 | screen | Farm/Plot | app/(tabs)/fields.tsx | farm store | legacy route exists — restyle+verify |
| 89:2006 | Mobile / Farm / Overview v2 | 402x874 | screen | Farm/Plot | app/(tabs)/fields.tsx | farm store | legacy route exists — restyle+verify |
| 89:2107 | Mobile / AI / Voice Assistant | 402x882 | screen | AI assistant | app/ai-voice.tsx | edge fn openai-proxy, mic | legacy route exists — restyle+verify |
| 89:2171 | Mobile / Settings / Notifications v2 | 402x874 | screen | Notifications | app/notifications.tsx | user_notifications | legacy route exists — restyle+verify |
| 100:1007 | Mobile / Farm / Predictive Analytics | 402x1033 | screen | Analytics | app/analytics/index.tsx | farm store | legacy route exists — restyle+verify |
| 100:1132 | Mobile / Market / Buyer Dashboard | 402x1061 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 100:1365 | Mobile / Community / Coop Leader Dashboard | 402x1137 | screen | Community | — | no backend | GAP — no route |
| 100:1497 | Mobile / Community / Extension Officer Dashboard | 402x1042 | screen | Community | — | no backend | GAP — no route |
| 102:1002 | Mobile / Weather / Forecast v2 | 402x1931 | screen | Weather | app/forecast.tsx | OpenWeather (client) | legacy route exists — restyle+verify |
| 102:1362 | Mobile / Farm / Soil Analysis v2 | 402x2035 | screen | Soil | app/soil-analysis.tsx | local store | legacy route exists — restyle+verify |
| 102:1627 | Mobile / Finance / Tracker v2 | 402x1837 | screen | Finance | app/finance.tsx | agro_ledger (offline-first) | legacy route exists — restyle+verify |
| 102:1932 | Mobile / Farm / Twin Simulator | 402x1567 | screen | Digital twin | app/farm-twin/index.tsx | farm store | legacy route exists — restyle+verify |
| 102:2118 | Mobile / Market / Browse v2 | 402x1758 | screen | Marketplace | app/(tabs)/market.tsx | SEED data; market_listings | legacy route exists — restyle+verify |
| 102:2453 | Mobile / AI / Chat v2 | 402x900 | screen | AI assistant | app/(tabs)/ai.tsx | edge fns openai-proxy / rag-chat | legacy route exists — restyle+verify |
| 102:2635 | Mobile / Farm / Crop Lifecycle | 402x1750 | screen | Crops | app/crop-planning.tsx | static templates | legacy route exists — restyle+verify |
| 102:2806 | Mobile / Settings / Profile v2 | 402x1804 | screen | Profile | app/(tabs)/profile.tsx | auth | legacy route exists — restyle+verify |
| 106:1004 | Mobile / Onboarding / Welcome | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 106:1045 | Mobile / Onboarding / Sign Up | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 106:1092 | Mobile / Onboarding / Farm Setup | 402x874 | superseded | Onboarding | app/onboarding.tsx | farmer_profiles | Superseded (v1) – skip |
| 106:1230 | Mobile / Farm / Map View | 402x874 | screen | Maps | app/map.tsx | react-native-maps | legacy route exists — restyle+verify |
| 106:1319 | Mobile / Empty / No Farms | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 106:1360 | Mobile / Empty / No Connection | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 106:1612 | Mobile / Farm / Crop Health Map | 402x874 | screen | Maps | app/map.tsx | react-native-maps | legacy route exists — restyle+verify |
| 106:1710 | Mobile / Farm / VRA Map | 402x885 | screen | Maps | app/map.tsx | react-native-maps | legacy route exists — restyle+verify |
| 106:1926 | Mobile / Market / Seller Dashboard | 402x1300 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 106:2059 | Mobile / Onboarding / OTP Verify | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 108:1002 | Mobile / Onboarding / Role Select | 402x874 | screen | Onboarding | app/onboarding.tsx | farmer_profiles | legacy route exists — restyle+verify |
| 108:1134 | Mobile / Weather / Radar Map | 402x874 | screen | Weather | app/forecast.tsx | OpenWeather (client) | legacy route exists — restyle+verify |
| 108:1207 | Mobile / Edge States / No Products | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 108:1246 | Mobile / Edge States / Loading State | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 108:1382 | Mobile / Market / Input Supplier Dashboard | 402x1026 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 108:1502 | Mobile / Market / Order Management | 402x874 | screen | Marketplace | — | no backend (dashboards/trends/supply chain) | GAP — no route |
| 108:1715 | Mobile / Profile / Settings | 402x1263 | screen | Profile | app/(tabs)/profile.tsx | auth | legacy route exists — restyle+verify |
| 108:1852 | Mobile / Profile / Help | 402x874 | screen | Profile | app/(tabs)/profile.tsx | auth | legacy route exists — restyle+verify |
| 160:1010 | Mobile / Farm / Livestock - Animal Detail | 402x874 | screen | Livestock | app/livestock.tsx | local store | legacy route exists — restyle+verify |
| 160:1094 | Mobile / Farm / Livestock - Add Animal | 402x875 | screen | Livestock | app/livestock.tsx | local store | legacy route exists — restyle+verify |
| 160:1181 | Mobile / Farm / Livestock - Health Event | 402x874 | screen | Livestock | app/livestock.tsx | local store | legacy route exists — restyle+verify |
| 160:1272 | Mobile / Farm / Inventory - Add Item | 402x874 | screen | Inventory | app/inventory.tsx | local store | legacy route exists — restyle+verify |
| 160:1359 | Mobile / Farm / Inventory - Low Stock Alert | 402x874 | screen | Inventory | app/inventory.tsx | local store | legacy route exists — restyle+verify |
| 160:1440 | Mobile / Farm / IoT - Device Detail | 402x874 | screen | IoT | app/iot-systems.tsx | NO ingestion backend | legacy route exists — restyle+verify |
| 160:1536 | Mobile / Farm / IoT - Add Device | 402x874 | screen | IoT | app/iot-systems.tsx | NO ingestion backend | legacy route exists — restyle+verify |
| 160:1605 | Mobile / Farm / IoT - Alerts | 402x874 | screen | IoT | app/iot-systems.tsx | NO ingestion backend | legacy route exists — restyle+verify |
| 160:1670 | Mobile / Farm / IoT - Drone View | 402x874 | screen | IoT | app/iot-systems.tsx | NO ingestion backend | legacy route exists — restyle+verify |
| 160:1884 | Mobile / AI / Training Module List | 402x874 | screen | AI training | app/ai-training-hub.tsx | static content | legacy route exists — restyle+verify |
| 160:1984 | Mobile / AI / Training Module Detail | 402x985 | screen | AI training | app/ai-training-hub.tsx | static content | legacy route exists — restyle+verify |
| 160:2051 | Mobile / AI / Training Quiz | 402x874 | screen | AI training | app/ai-training-hub.tsx | static content | legacy route exists — restyle+verify |
| 160:2115 | Mobile / Farm / Task Detail - Create | 402x902 | screen | Tasks | app/tasks.tsx | tasks store | legacy route exists — restyle+verify |
| 160:2201 | Mobile / Farm / Soil Analysis - Add Test | 402x874 | screen | Soil | app/soil-analysis.tsx | local store | legacy route exists — restyle+verify |
| 160:2293 | Mobile / Farm / Soil Analysis - Results Detail | 402x982 | screen | Soil | app/soil-analysis.tsx | local store | legacy route exists — restyle+verify |
| 160:2379 | Mobile / Farm / Soil Analysis - Test History | 402x906 | screen | Soil | app/soil-analysis.tsx | local store | legacy route exists — restyle+verify |
| 160:2472 | Mobile / Farm / Crop Library - Detail | 402x1009 | screen | Crops | app/crop-library.tsx | static catalog | legacy route exists — restyle+verify |
| 160:2590 | Mobile / Finance / Insurance - Policy Detail | 402x874 | screen | Insurance | app/insurance.tsx | disabled (unsupported) | legacy route exists — restyle+verify |
| 160:2677 | Mobile / Finance / Insurance - File Claim | 402x874 | screen | Insurance | app/insurance.tsx | disabled (unsupported) | legacy route exists — restyle+verify |
| 160:2756 | Mobile / Finance / Insurance - My Policies | 402x874 | screen | Insurance | app/insurance.tsx | disabled (unsupported) | legacy route exists — restyle+verify |
| 160:2843 | Mobile / Market / Input Supply - Product Detail | 402x874 | screen | Marketplace | app/input-supply.tsx | market_listings | legacy route exists — restyle+verify |
| 160:2924 | Mobile / Market / Input Supply - Cart Order | 402x874 | screen | Marketplace | app/input-supply.tsx | market_listings | legacy route exists — restyle+verify |
| 160:3002 | Mobile / Community / Expert Directory | 402x874 | screen | Experts | app/consultations.tsx | no backend | legacy route exists — restyle+verify |
| 160:3084 | Mobile / Community / Expert Active Session | 402x874 | screen | Experts | app/consultations.tsx | no backend | legacy route exists — restyle+verify |
| 160:3148 | Mobile / Community / Expert Consultation History | 402x874 | screen | Experts | app/consultations.tsx | no backend | legacy route exists — restyle+verify |
| 160:3536 | Mobile / AI / Voice Processing Result | 402x874 | screen | AI assistant | app/ai-voice.tsx | edge fn openai-proxy, mic | legacy route exists — restyle+verify |
| 160:3619 | Mobile / Farm / Crop Plan - Create | 402x874 | screen | Crops | app/crop-planning.tsx | static templates | legacy route exists — restyle+verify |
| 160:3706 | Mobile / Farm / Digital Twin - Simulation Results | 402x874 | screen | Digital twin | app/farm-twin/index.tsx | farm store | legacy route exists — restyle+verify |
| 160:3785 | Mobile / Farm / Digital Twin - Scenario Comparison | 402x877 | screen | Digital twin | app/farm-twin/index.tsx | farm store | legacy route exists — restyle+verify |
| 160:3888 | Mobile / Market / Contract - Create | 402x874 | screen | Contracts | app/contracts/index.tsx | client-only store (no table) | legacy route exists — restyle+verify |
| 160:3978 | Mobile / Market / Contract - Milestones | 402x874 | screen | Contracts | app/contracts/index.tsx | client-only store (no table) | legacy route exists — restyle+verify |
| 160:4077 | Mobile / Weather / Hourly Detail | 402x874 | screen | Weather | app/forecast.tsx | OpenWeather (client) | legacy route exists — restyle+verify |
| 160:4166 | Mobile / Profile / Agro ID - QR Export | 402x874 | screen | Agro-ID | app/agro-id.tsx | mint-agro-id / verify-agro-id | legacy route exists — restyle+verify |
| 160:4230 | Mobile / Finance / Wallet - Payout Approval | 402x874 | screen | Wallet | app/wallet-admin/index.tsx | agro_ledger | legacy route exists — restyle+verify |
| 163:1125 | State / IoT / No Devices | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1181 | State / IoT / Device Offline | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1250 | State / Empty / No Tasks | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1304 | State / Empty / No Livestock | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1358 | State / Empty / No Inventory | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1412 | State / Empty / No Soil Tests | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1468 | State / Empty / No Contracts | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |
| 163:1522 | State / Empty / No Insurance | 402x874 | state | Cross-cutting state | — | shared components | cross-cutting state component |

## Gap screens (Figma screen with no legacy route)

- `14:4332` Mobile / Community / Coop Dashboard — Community (no backend)
- `14:4410` Mobile / Community / Extension Officer — Community (no backend)
- `14:4484` Mobile / Community / Agribusiness — Community (no backend)
- `14:4562` Mobile / Community / Forum — Community (no backend)
- `14:4641` Mobile / Community / Knowledge Base — Community (no backend)
- `14:4785` Mobile / Settings / Preferences — Settings (no screen)
- `14:4921` Mobile / Settings / Help & Support — Settings (no screen)
- `14:5396` Mobile / Farm / Pest Alert — Farm (no backend)
- `14:5458` Mobile / Farm / Harvest Log — Farm (no backend)
- `14:6333` Mobile / Settings / Data Export — Settings (no screen)
- `14:6498` Mobile / Market / Trends — Marketplace (no backend (dashboards/trends/supply chain))
- `14:6591` Mobile / Community / Coop Members — Community (no backend)
- `14:6696` Mobile / Community / Farm Visit Report — Community (no backend)
- `14:6766` Mobile / Market / Supply Chain — Marketplace (no backend (dashboards/trends/supply chain))
- `14:6992` Mobile / Settings / Emergency Contacts — Settings (no screen)
- `53:528` Mobile / Soko / Search — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:623` Mobile / Soko / Product Detail — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:680` Mobile / Soko / Make Offer — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:725` Mobile / Soko / Offer Sent — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:769` Mobile / Soko / My Offers — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:847` Mobile / Soko / Order Tracking — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:913` Mobile / Soko / Price Alerts — Marketplace (Soko) (no offers/orders/price-alert backend)
- `53:975` Mobile / Soko / Seller Profile — Marketplace (Soko) (no offers/orders/price-alert backend)
- `57:750` Mobile / AI / Diagnosis History — AI diagnosis (no history table)
- `57:834` Mobile / Soko / Seller Dashboard — Marketplace (Soko) (no offers/orders/price-alert backend)
- `57:916` Mobile / Soko / Create Listing — Marketplace (Soko) (no offers/orders/price-alert backend)
- `57:986` Mobile / Soko / Seller Offers — Marketplace (Soko) (no offers/orders/price-alert backend)
- `57:1066` Mobile / Soko / Order Fulfillment — Marketplace (Soko) (no offers/orders/price-alert backend)
- `57:1134` Mobile / Soko / Order History — Marketplace (Soko) (no offers/orders/price-alert backend)
- `100:1132` Mobile / Market / Buyer Dashboard — Marketplace (no backend (dashboards/trends/supply chain))
- `100:1365` Mobile / Community / Coop Leader Dashboard — Community (no backend)
- `100:1497` Mobile / Community / Extension Officer Dashboard — Community (no backend)
- `106:1926` Mobile / Market / Seller Dashboard — Marketplace (no backend (dashboards/trends/supply chain))
- `108:1382` Mobile / Market / Input Supplier Dashboard — Marketplace (no backend (dashboards/trends/supply chain))
- `108:1502` Mobile / Market / Order Management — Marketplace (no backend (dashboards/trends/supply chain))
