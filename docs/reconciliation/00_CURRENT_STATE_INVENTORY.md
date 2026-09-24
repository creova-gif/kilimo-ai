# 00 — Current State Inventory

_Evidence snapshot of `main` @ `524583f` (2026-09-24). Method: read the files, run the checks, query the Figma and Supabase connectors. Historical audits in `docs/archive/` and `KILIMO_AI_AUDIT.md` were **not** trusted as truth; items below were checked in code._

## 1. Stack (verified in `package.json`)

| Area | Version / implementation |
|---|---|
| Framework | Expo `~54.0.0`, React Native `0.81.5`, React `19.1.0` |
| Routing | `expo-router ~6.0.24` (file-based, `app/`) |
| State | `zustand` stores in `store/` (persisted to AsyncStorage) |
| Data | `@supabase/supabase-js`; offline queue in `lib/offline.ts` + `hooks/useSyncEngine.ts` |
| AI | Server-side through Edge Functions (`openai-proxy`, `rag-chat`). `lib/ai.ts` explicitly forbids `EXPO_PUBLIC_*` provider keys — no private AI or SMS keys found in the client. |
| Observability | `@sentry/react-native` via `lib/sentry.ts` (`EXPO_PUBLIC_SENTRY_DSN`) |
| CI | `.github/workflows/ci-validate.yml` (lint, typecheck, test, build sanity), `eas-build.yml` |

Client env vars read: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_OPENWEATHER_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN`.

## 2. Health checks (run locally on `main`)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx jest` | 4 suites, 16 tests, all pass |
| Test files | `ai.normalizeSeverity`, `contractsStore`, `credit.score`, `diseaseDetector` — no component, integration, E2E, or RLS tests |

## 3. Navigation (verified in `app/(tabs)/_layout.tsx`)

Visible tabs: **Home** (`index`) · **Fields** (`fields`) · **centre button** (`action` → redirects to `/features`) · **AI** (`ai`) · **Profile** (`profile`).

Hidden tabs (`href: null`): `market`, `video-hub`, `ai-training-hub`, `edit-profile`, `features`. Market is reachable only from the Features hub and one Home link.

**Figma differs** (see 02 §Conflicts): Home · Farm · centre action · **Market** · Me, with AI reached from a Home search field.

## 4. Routes (61 files)

| Route | Lines | Notes |
|---|---|---|
| `app/(tabs)/index.tsx` | 5,672 | Home. Far too large to migrate as one unit — split first. |
| `app/(tabs)/market.tsx` | 2,968 | Market + Soko flows in one file |
| `app/(tabs)/ai.tsx` | 1,822 | AI chat |
| `app/(tabs)/fields.tsx` | 1,072 | |
| `app/(tabs)/features.tsx` | 1,046 | Features hub |
| `app/(tabs)/profile.tsx` | 757 | Profile + settings |
| `app/(tabs)/edit-profile.tsx`, `video-hub.tsx`, `ai-training-hub.tsx` | 2 each | **Duplicates** — re-export the root screens |
| `app/iot-systems.tsx` | 3,456 | |
| `app/ai-training-hub.tsx` | 2,216 | |
| `app/onboarding.tsx` | 2,132 | Language, role, farm setup, completion |
| `app/insurance.tsx` | 1,726 | Enrollment/claims disabled (#77) |
| `app/calendar.tsx` | 1,676 | |
| `app/agro-id.tsx` | 1,642 | |
| `app/scan.tsx` | 1,632 | |
| `app/tasks.tsx` | 1,565 | |
| `app/ai-admin.tsx` | 1,387 | |
| `app/finance.tsx` | 1,359 | |
| `app/crop-planning.tsx` | 1,209 | |
| `app/contracts/[id].tsx`, `index.tsx` | 1,169 / 956 | |
| `app/crop-library.tsx` | 1,119 | |
| `app/livestock.tsx` | 1,082 | |
| `app/inventory.tsx` | 1,068 | |
| `app/ai-voice.tsx` | 988 | |
| `app/edit-profile.tsx` | 961 | |
| `app/peer-groups.tsx` | 919 | |
| `app/forecast.tsx` | 901 | |
| `app/field/[id].tsx` | 850 | |
| `app/video-hub.tsx` | 805 | |
| `app/consultations.tsx` | 751 | |
| `app/input-supply.tsx` | 739 | |
| `app/farm-twin/index.tsx`, `[id].tsx` | 681 / 557 | |
| `app/map.tsx` | 666 | |
| `app/mobile-money.tsx` | 619 | |
| `app/soil-analysis.tsx` | 582 | |
| `app/offline-queue.tsx` | 480 | |
| `app/wallet-admin/{index,transactions,payouts}.tsx` | 274 / 473 / 366 | |
| `app/analytics/index.tsx` | 462 | |
| `app/_layout.tsx` | 454 | Root stack, providers |
| `app/notifications.tsx` | 452 | |
| `app/upgrade.tsx` | 418 | |
| `app/vra-setup.tsx` | 387 | |
| `app/otp-auth.tsx` | 379 | Phone OTP |
| `app/terms.tsx`, `privacy.tsx` | 236 / 229 | **Duplicate** of `app/legal/terms.tsx`, `legal/privacy.tsx` (78 / 75) |
| `app/verification/{intro,business,personal,pending}.tsx` | 80 / 85 / 44 / 45 | |

## 5. Shared components

`components/ui/`: `Badge`, `Button`, `Card`, `EmptyState`, `Input`, `ScreenHeader`. Plus `ErrorBoundary`, `InitialsAvatar`, `PageScaffold`, `RemoteImage`, `RequireVerification`, `MapViewWrapper.{native,web}`, `NeuralOrb`, `SwipeCardDeck3D`, `diseaseModal`.

Missing versus master prompt §10: IconButton, Select, TextArea, SearchField, SectionHeader, ListItem, ErrorState, LoadingState, **Skeleton**, Toast, Modal/BottomSheet, ConfirmDialog, Progress, SegmentedControl, Chip, DataMetric, ChartContainer, OfflineBanner, PermissionPrompt, SyncStatus.

Tokens: `constants/Theme.ts` (brand primary `#2E6F40`, light/dark), `constants/MotionTokens.ts`. Figma defines **no variables**, and its header green reads darker/olive than `#2E6F40` — to be sampled and reconciled in Phase B.

## 6. State (`store/`)

| Store | Persisted | Purpose |
|---|---|---|
| `useKilimoStore` | yes | Session, language, Agro ID, `isOffline`, `syncQueue`, notifications |
| `useFarmDataStore` | yes (`kilimo-farm-data`) | Livestock, inventory, insurance, suppliers, orders, groups, experts, consultations, ledger. Fake seeds being removed in open PR #81. |
| `useContractsStore` | yes | Contract lifecycle (local only, no table) |
| `useDigitalFarmTwinStore` | yes | Farm twin |
| `useWalletAdminStore` | yes | Wallet admin |

## 7. Roles (`lib/access.tsx`)

8 canonical roles: `smallholder`, `farmer`, `commercial_farmer`, `farm_manager`, `commercial_admin`, `agribusiness`, `coop_leader`, `extension_officer`. 26 gated features, levels `full | basic | none`, enforced **client-side only** via `useAccess` / `Gate`. RLS-level role enforcement not yet verified. Figma also has an **Input Supplier** dashboard and a **Buyer** dashboard with no matching canonical role.

## 8. Backend

**Supabase project `kilimo_ai` (`hsjxaxnenyomtgctungx`) is currently `INACTIVE` (paused).** Live schema could not be queried; everything below is from the repo.

Migrations (11) create: `agro_ledger`, `agro_profiles`, `farmer_profiles`, `knowledge_base`, `market_listings`, `user_notifications`, `user_notification_preferences`, `verification_requests`.

Edge Functions (8 + `_shared`): `delete-account`, `mint-agro-id`, `openai-proxy`, `process-notifications`, `rag-chat`, `sms-send`, `submit-verification`, `verify-agro-id`.

### Client ↔ schema mismatches (unverified against live DB — project paused)

| Client call | Table in migrations? | Consequence if absent |
|---|---|---|
| `hooks/useSyncEngine.ts:23` → `offline_sync_logs.insert` | **No** — defined nowhere in repo | Every sync push fails → queued items never drain |
| `hooks/useNotifications.ts:125` → `notifications.select` | **No** — migrations create `user_notifications` | Notification history never loads |
| `hooks/useTasks.ts` → `tasks` (6 calls) | Only in `docs/supabase-schema.sql`, not a migration | A project built from migrations has no `tasks` table |
| `hooks/useFarmVitals.ts:25` → `farm_sensors` | Only in `docs/supabase-schema.sql` | Call is commented out — no runtime effect |

No tables exist for: marketplace **offers**, **orders**, contracts (local-only store), consultations, insurance, livestock/inventory (local-only).

## 9. Data honesty status

Recent PRs (#48–#79, and open #55–#81) removed fabricated data screen by screen. Still open at time of writing: soil (#62/#78), mobile-money (#71), market (#66), finance (#67), profile (#61), wallet-admin (#58), features-hub (#56), farm-data seeds (#81). See PR list for current state.

## 10. Stale documentation

- `KILIMO_AI_AUDIT.md` §4 lists "offline image dependency" as open — fixed in `6183dd5`. It also says there are "no test files" — 4 exist.
- `docs/supabase-schema.sql` defines tables (`tasks`, `farm_sensors`) that are not in `supabase/migrations/` — two schema sources of truth.
