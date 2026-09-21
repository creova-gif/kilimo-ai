# FINAL_NAVIGATION_MAP

Model: **one docked bottom bar, 5 destinations** (framework: 3–5 tabs; Figma `ai-first-bottom-nav`), stacks pushed over it, modals only for creation flows. Everything reachable in ≤ 3 taps. Status: ✅ built and verified on device · 🟡 legacy screen still in place · 📋 planned (route decided, not built).

```
Root Stack
├─ onboarding ✅            welcome/language → register → OTP → role → farm     (guard: no profile)
├─ (tabs) ── docked bar ─────────────────────────────────────────────────────
│   ├─ Nyumbani  /(tabs)/index ✅     Today: greeting+date, verification card, weather, tasks, farm, quick actions, Ask-AI
│   ├─ Shamba    /(tabs)/fields 🟡    → plan: farm overview (plots), empty "Weka shamba"
│   ├─ [AI]      /(tabs)/ai 🟡        centre raised button → Ask AI; Scan reachable from it and from Today
│   ├─ Soko      /(tabs)/market ✅    discover · search · crop chips · FAB "Weka tangazo"
│   └─ Mimi      /(tabs)/profile 🟡   → plan: profile, language, verification, notifications, delete account, sign out
├─ soko/[id] ✅  listing detail + contact seller        soko/create ✅ (modal-style)   soko/mine ✅ "Matangazo yangu"
├─ scan 🟡 · notifications 🟡 · tasks 🟡 · calendar 🟡 · forecast 🟡 · map 🟡 · analytics 🟡 (empty until real data)
├─ finance/wallet/insurance 🟡 (each needs backend truth before migration)
├─ verification/* 🟡 (opened from the dashboard card, not forced at signup)
└─ legal/terms · legal/privacy 🟡
```

## Guards and session
1. **Boot:** fonts + store hydration → `useSessionRestore` (server-side) → `OnboardingGate`.
2. **Gate:** `!onboardingComplete || !isAuthenticated` → `/onboarding`; otherwise `/(tabs)`.
3. **Returning user on a new phone / reinstall:** OTP → server profile hydrated → dashboard (no role/farm steps). Verified E2E 04.
4. **Idle:** planned = app *lock* (biometric/PIN), not sign-out (currently signs out — known defect, see `KILIMO_GAP_REGISTER.md`).

## Roles
Roles are client-selected today (8 in the model, 6 in Figma). They change **default emphasis**, not permissions; anything privileged must be server-verified before it is exposed. Extension officers have marketplace access `none` (`lib/access.tsx`).

## Deep links
Scheme `kilimoai://`. Planned: `kilimoai://soko/<id>` (share a listing), `kilimoai://scan`, `kilimoai://tasks`.

## Removed from navigation
Centre "+" → Features hub · Market/Contracts/Input-supply stacks · `otp-auth` · `(tabs)/action` shim. (See `REMOVED_LEGACY_UI.md`.)
