# REMOVED_LEGACY_UI

Git history is the archive (`git log --diff-filter=D`). Each removal below was replaced by a verified implementation or judged unsafe to keep (fabricated data / no backend). Lines are from `git show --stat`.

| Removed | Size | Why | Replaced by | Commit |
|---|---|---|---|---|
| `app/(tabs)/index.tsx` legacy dashboard | 5,672 lines | Hard-coded charts, tutorial animations, fake crop progress ("82%", "22 days to harvest"), fake vitals | Figma "Today" dashboard on real data + honest states | `b84eda2` |
| Floating pill tab bar, centre "+" → Features hub | — | Non-standard navigation; hid Soko | Docked, labelled 5-tab bar with centre AI button | `b84eda2` |
| `app/onboarding.tsx` 6-step wizard | 2,132 lines | Mandatory 20-digit NIDA gate, fake-ID uniqueness list, mock-auth fallback, pre-filled "2 acres"/region, CTA hidden behind keyboard, raw English errors | Figma onboarding v2: welcome → register → OTP → role → farm (4 steps) | `a88bf4e` |
| `app/otp-auth.tsx` | — | Orphaned duplicate of the OTP step | — | `a88bf4e` |
| `hooks/useFarmVitals.ts` | 76 lines | Random-number "sensor" simulator that raised fake irrigation alerts | `farmVitals = null` until real data exists | `89f2fbc` |
| Seeded store data: 3 notifications, 2 fake registered NIDA IDs, `farmVitals` defaults | — | Invented content shown to every new install | Empty by default + persist migrations v3/v4 purge existing installs | `868865d`, `89f2fbc` |
| Seeded tasks in `hooks/useTasks.ts` | 3 tasks | Kept even when the server returned zero rows | Server truth (empty list is valid) | `868865d` |
| `app/(tabs)/market.tsx` legacy market | 2,968 lines | Seed listings, fake ratings/benchmarks, simulated order flow ("Order Placed!" with no backend) | Soko phase 1 on real `market_listings` | `ce4b443` |
| `hooks/useMarketIntelligence.ts` | 271 lines | `SEED_LISTINGS` as initial state and after failed fetch | `lib/listings.ts` (tested) | `ce4b443` |
| `app/contracts/*` | 2,125 lines | Contract "signing" auto-counter-signed after 800 ms; no backend | Hidden until a contracts table + provider exist | `ce4b443` |
| `app/input-supply.tsx` | 739 lines | Seeded suppliers and fake ratings | Deferred (phase 3) | `ce4b443` |
| `app/(tabs)/features.tsx`, `action.tsx` | — | Orphaned after nav change | Quick actions on the dashboard | `ce4b443` |
| `lib/recommendations.ts` | — | No callers; generated advice from the fake vitals | — | `ce4b443` |
| `market_listings` seed rows (5, no seller; one `escrow_funded`) | 5 rows | Invented offers | Corrective migration `20260921000000` | `2c09fcb` |

## Preserved (deliberately)

Offline sync queue and `useTasks` optimistic completion · `lib/weather.ts` honest states · Agro-ID mint + public verify · ledger (append-only) · crop/region content · motion tokens · bilingual copy · map wrapper · PDF/Excel export libs.

## Still to remove or migrate (tracked, not done)

Farm tab (`fields`), AI tab, Profile, analytics, finance/wallet/insurance, livestock, inventory, IoT, soil, forecast, calendar, tasks, notifications, verification, legal — each still legacy UI with (some) fabricated seed content; see `FIGMA_IMPLEMENTATION_STATUS.md` and the reconciliation matrices.
