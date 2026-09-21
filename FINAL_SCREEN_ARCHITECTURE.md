# FINAL_SCREEN_ARCHITECTURE

Layers (top imports only from below):

```
app/ (routes: thin composition, own data fetching + state)
  └─ components/{onboarding,soko,…}   feature components (presentational, translated via props/useT)
       └─ components/ui               design-system primitives (token-driven, a11y roles, ≥48dp targets)
            └─ constants/Theme.ts     tokens (color, type, spacing, radius, shadow, sizes) ← Figma variables
lib/                pure, injectable-client logic  (listings, farmerProfile, hydrateProfile, phone, authMode, authErrors, timeAgo, i18n)
hooks/              React glue                      (useTasks, useListings, useSessionRestore, useAgroAuth, useWeather)
store/              Zustand (persisted, versioned migrations)  — UI/app state only; server data is fetched
supabase/           migrations, edge functions, config          — the backend contract
```

## Rules that keep the product honest
1. **Real or empty.** A screen renders backend data, on-device user input, or an explicit empty/unavailable state. No seed data, no sample copy from Figma frames.
2. **One Supabase client** (`lib/supabase.ts`), Keychain-backed session; `null` when unconfigured and callers must show a truthful state.
3. **Lib functions take the client as a parameter** → every data path is unit-tested without a network.
4. **Every user-facing string in `lib/i18n` (EN + SW) with a parity test**; accessibility labels are translated too.
5. **Server decides trust:** verification status, escrow flags, roles for privileged actions are enforced by RLS/edge functions, never by the client.
6. **Screens are small.** New screens are composed from primitives (target ≲ 400 lines); the legacy 2–6k-line files are retired as their replacements land.

## Screen inventory (final)
✅ onboarding (welcome, register, OTP, role, farm) · Home/Today · Soko (discover, detail, create, mine) · bottom navigation. Planned per `FINAL_NAVIGATION_MAP.md` and `docs/kilimo-v2/04_RECONCILIATION/*`.
