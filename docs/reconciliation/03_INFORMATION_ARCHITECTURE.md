# 03 — Information Architecture

_Status: primary navigation implemented (commits `a52f2d8`, `0e834cc`). Route map below reflects `feat/figma-production-reconciliation`._

## Decisions (owner, 2026-09-24)

| #   | Decision                                         | Result                                                                                                                                   |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Adopt Figma's bottom navigation                  | Done — see below                                                                                                                         |
| C2  | Phone OTP only                                   | Figma frames `Auth / Password Reset` (20:94), `Auth / New Password` (20:138) and the password field on `Auth / Sign In` are out of scope |
| C6  | UI work first; Supabase `kilimo_ai` stays paused | Phase F deferred; no backend changes in this phase                                                                                       |

## Primary navigation

| Slot   | Swahili  | English | Route                            | Icon       | Visible to                                                       |
| ------ | -------- | ------- | -------------------------------- | ---------- | ---------------------------------------------------------------- |
| 1      | Nyumbani | Home    | `app/(tabs)/index.tsx`           | Home       | all roles                                                        |
| 2      | Shamba   | Farm    | `app/(tabs)/fields.tsx`          | Map        | all roles                                                        |
| centre | —        | —       | opens `/features` (Features hub) | Leaf       | all roles                                                        |
| 3      | Soko     | Market  | `app/(tabs)/market.tsx`          | TrendingUp | roles with `marketplace` access (hidden for `extension_officer`) |
| 4      | Mimi     | Me      | `app/(tabs)/profile.tsx`         | User       | all roles                                                        |

Labels follow the app language. Hidden tab routes (`href: null`): `ai`, `features`, `video-hub`, `ai-training-hub`, `edit-profile`.

**AI assistant** is entered from the "Uliza Kilimo AI" field on Home (goes to `/(tabs)/ai`). Figma also shows a floating camera button ("Piga Picha") on Home for scan. That button is a Phase D item for the Home screen.

**Centre button (assumption):** Figma draws a leaf button but the metadata export has no prototype link, so it keeps its existing target (Features hub). Confirm with the designer.

## Route map (after Phase C)

```
/onboarding                      language → role → farm setup → completion
/otp-auth                        phone OTP (only sign-in method)
/(tabs)
  ├─ index      Nyumbani         today, tasks, AI field, weather, shortcuts
  ├─ fields     Shamba           fields list → /field/[id]
  ├─ market     Soko             input store · prices · my orders (role-gated)
  ├─ profile    Mimi             profile, settings, Agro ID entry
  └─ (hidden)   ai · features · video-hub · ai-training-hub · edit-profile
Farm         /map /tasks /calendar /crop-planning /crop-library /livestock
             /inventory /soil-analysis /iot-systems /vra-setup /farm-twin/[id]
             /analytics /forecast
AI           /scan /ai-voice /ai-training-hub /ai-admin
Market       /contracts /contracts/[id] /input-supply
Finance      /finance /mobile-money /insurance /wallet-admin/{,transactions,payouts}
Community    /peer-groups /consultations /video-hub
Account      /agro-id /edit-profile /verification/{intro,personal,business,pending}
             /notifications /offline-queue /upgrade /legal/{terms,privacy}
```

## Role-based navigation

Access levels from `lib/access.tsx` (`full` / `basic` / `none`). The tab bar enforces `marketplace`. Every other screen enforces its own gate through `Gate` / `useAccess` (16 screens do today; Market was added in `0e834cc`).

| Feature              | smallholder | farmer | farm_manager | agribusiness | coop_leader | commercial_farmer | commercial_admin | extension_officer |
| -------------------- | ----------- | ------ | ------------ | ------------ | ----------- | ----------------- | ---------------- | ----------------- |
| marketplace (tab)    | full        | full   | full         | full         | full        | full              | full             | **none**          |
| contract_farming     | none        | full   | full         | full         | full        | full              | full             | none              |
| input_supply         | none        | full   | full         | full         | none        | full              | full             | basic             |
| mobile_money         | full        | full   | full         | full         | full        | full              | full             | none              |
| wallet_admin         | none        | none   | basic        | basic        | full        | basic             | full             | none              |
| iot_systems          | none        | basic  | full         | none         | none        | full              | full             | none              |
| analytics_predictive | none        | none   | full         | full         | basic       | full              | full             | full              |
| digital_farm_twin    | none        | none   | full         | none         | none        | basic             | full             | none              |

Still to verify: that server-side RLS matches this matrix (Phase F, blocked by C6), and the Figma-only roles (Input Supplier, Buyer, conflict C4).

## Known IA follow-ups

1. The Soko tab opens on the **input store** ("Duka la Pembejeo"). Figma's Soko opens on the produce marketplace (`Market / Browse v2`, 102:2118). Reorder the Market sub-tabs in Phase D.
2. The Soko screen shows a back button although it is now a root tab. Remove it in Phase D.
3. Duplicate stub routes `app/(tabs)/{edit-profile,video-hub,ai-training-hub}.tsx` can go once nothing links to them.
