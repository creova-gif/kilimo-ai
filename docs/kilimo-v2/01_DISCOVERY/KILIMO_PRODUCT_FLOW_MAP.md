# KilimoAI — Product Flow Map (reconstructed from Figma + legacy app)

Status: **onboarding + role model reconstructed and cross-checked against the running app.** Other journeys are listed in `FIGMA_SCREEN_INVENTORY.md` and will be added as each domain is migrated.

Visual reference: `docs/kilimo-v2/evidence/figma_onboarding_flow.jpg` (8 frames, in order).

## Onboarding (Figma "Onboarding v2" ↔ legacy `app/onboarding.tsx`)

| # | Figma frame (node) | Legacy step | What the user does | Backend / dependency | State coverage in Figma |
|---|---|---|---|---|---|
| 1 | Onboarding / Welcome (106:1004) — photo, "KILIMO CHAKO, KWA AKILI.", Kiswahili/English toggle, CTA "Anza" | step 0 | Choose language, start | none (language persisted in store) | — |
| 2 | Onboarding / Sign Up (106:1045) — "Hatua ya 1 kati ya 6", `+255` phone, "use email instead" | step 1 | Enter phone (or email) | Supabase Auth OTP (`signInWithOtp`) | error/rate-limit not drawn |
| 3 | Onboarding / OTP Verify (106:2059) — 6 boxes, resend timer | step 2 | Enter 6-digit code | Supabase Auth `verifyOtp` | invalid/expired not drawn |
| 4 | Onboarding / Role Select (108:1002) — 6 roles | step 3 | Pick role | `farmer_profiles.role` | — |
| 5 | Onboarding / Farm Setup (14:4109) — name, region chips, main crops (1–10), size + unit, irrigation, ownership | step 4 | Describe farm | `farmer_profiles` upsert | — |
| 6 | Onboarding / Agro ID Welcome (40:1134) — "Karibu!", ID card | step 5/6 | See minted Agro-ID | edge fn `mint-agro-id` (server-side) | offline-provisional state exists in code |
| 7 | Onboarding / Personalization Bridge (57:1210) — 3/6 checklist | (none) | Continue setup checklist | tasks / recommendations | **no legacy equivalent** |
| 8 | Onboarding / Completion (24:2718) — summary of region, crops, farmer type, farm size | done | Enter dashboard | local store | — |

Also in Figma, not yet mapped: `Auth / Splash` (14:3820, leaf-logo card + "Anza Sasa / Get Started"), `Auth / Language Select`, `Auth / Sign In` (returning user), `Auth / Password Reset` / `New Password`, `Onboarding / Tutorial Welcome`, `Onboarding / ID Verification`, `Business Verification`, `Verification Pending`.

**Observations / decisions**

- The v2 onboarding uses the *same copy and 6-step structure* as the legacy app; the change is visual (bright-green vs olive CTA, photo headers, step dots).
- Two design families exist for entry: `Auth /*` (Splash, Language Select, Sign Up/In, Phone Verify, Password Reset) and `Onboarding /*` v2. **Decision:** `Onboarding v2` is the primary new-user path; `Auth / Sign In` is the returning-user path. `Auth / Splash` is the app-launch splash. Documented as a Figma inconsistency, not silently resolved.
- Password reset frames exist in Figma but the backend uses phone/email OTP only (no passwords). **Decision:** password screens are Deferred until a password auth mode is intentionally added.
- Splash copy in Figma includes a hard-coded version string ("Toleo 2.4.0 • Tanzanian Farmers Companion"). Version must come from `expo-constants`, never be typed into copy.

## Role model (from Role Select frame)

| Figma role (Swahili / English) | Intended capability domain | Implemented today |
|---|---|---|
| Mkulima / Farmer | farm, plots, crops, scan, marketplace seller | yes (default) |
| Mnunuzi / Buyer | marketplace buyer, contracts | UI only |
| Ushirika / Coop Leader | coop dashboard, members | UI only, no backend |
| Afisa Ugani / Extension Officer | dashboard, farm visits | UI only, no backend |
| Msambazaji / Input Supplier | input-supply seller dashboard | UI only |
| Mtaalamu wa Fedha / Finance | wallet/insurance/finance | UI only |

Roles are **client-selected**. Real authorization for privileged roles needs server-side verification (`verification_requests` exists for business KYC). Until then role-specific screens are UX routing, not access control — recorded so nobody treats them as security boundaries.

## Global navigation (from Figma frames)

Bottom tab bar with 5 destinations: **Nyumbani** (Home), **Shamba** (Farm), centre **AI/Scan** action, **Soko** (Market), **Mimi** (Me/Profile). Legacy tabs: index, fields, ai, market, profile (+ features, action, video-hub hidden). Mapping is 1:1 in intent.
