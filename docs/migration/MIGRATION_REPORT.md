# iOS UI Migration — Final Report

Branch `feat/ios-ui-migration` (from backup `d8c5d70`, tag `pre-ios-ui-migration-2026-09-21`).
Dates: 2026-09-21 to 2026-09-22. Local only: **nothing has been pushed**.

## Outcome

Every screen now shows the user's real records or an honest empty / unavailable state. The
owner's decision "fake-data screens become real features" is implemented across the app. All 13
register issues are closed (see `ISSUE_REGISTER.md`).

| Area | Result |
|------|--------|
| Offline sync | One idempotent drainer with backoff; failed items kept and shown; offline-queue screen to retry/discard |
| Farms, plots, map | Real `farms` / `plots`; boundary drawing on the map; input planner, farm twin, crop planning and soil tests on real plots |
| Money | Real income/expense ledger; payment *records* that state no money moves; honest plans screen |
| Records | Livestock with health events and vaccination reminders; inventory with trigger-applied stock movements |
| Community | Peer groups (members-only posts), consultation requests (no fake experts) |
| IoT, insurance | Device registry with manual readings; policy and claim records (not filed with any insurer) |
| AI | Knowledge-base answers with sources via `rag-chat` (full-text now, vector once embedded); scan never invents a diagnosis |
| Agro ID | Passport and credit *estimate* from the real ledger; public verification reads the same ledger |
| Navigation | Role-gated "More" menu reaches every feature; one legal route each |
| Language | All UI copy in English and Swahili through `lib/i18n` (parity-tested) |
| Removed as fake | Seeded stores, simulated IoT, fake mobile-money success, random prescription maps, fake NDVI/pH, invented prices and forecasts, fake AI stats, placeholder videos, canned calendar assistant, simulated alarm tasks, dead demo diagnosis modal |

## Verification (2026-09-22, from the committed tree)

- `tsc --noEmit`: 0 errors. Jest: 50 suites, 794 tests, all passing.
- ESLint: 0 errors in migrated code. 4 errors remain in `plugins/withPodsDeploymentTarget.js`
  (pre-existing, untouched Node config plugin).
- `scripts/rls-smoke.py` against the local stack: 90/90 checks.
- `expo export --platform ios` succeeds. Release build installed on the iPhone 15 Pro Max (iOS 17)
  simulator: Home, Shamba, Profile/More render in Swahili; `.maestro/06_add_farm.yaml` adds a farm
  through the UI and the row is confirmed in Postgres. That run found and fixed a real bug (iOS
  numeric keypads could not be closed, hiding Save).
- Database: 10 migrations added, applied locally after dumps in `~/kilimo-backups/`
  (`kilimo_pre_wave1_*`, `kilimo_pre_wave2_*`). No data was deleted except the test rows created
  for verification.

## Needs a human

1. **Push** the branch and the backup tag if an off-machine copy is wanted.
2. **Provider keys** (never committed): `OPENAI_API_KEY` for generated AI answers, photo diagnosis
   and voice; then run `scripts/embed-knowledge.ts`. OpenWeather key for weather.
   Africa's Talking for SMS.
3. **Cloud Supabase** (when the paid plan exists): apply all migrations, redeploy `rag-chat` and
   `verify-agro-id`, run `scripts/rls-smoke.py` against a staging copy only.
4. **Payments**: no provider or licence exists; mobile-money stays records-only until one does.
5. **Admin authorization**: `ai-admin` and `wallet-admin` are gated by a role stored on the
   client. That is a UI gate, not access control; server-side roles are needed before real admin
   features.
6. **Swahili review** by a native speaker of the new strings (~1,500 keys).
7. The `agro_ledger` table keeps its 3 old rows but is no longer read; drop it once confirmed.
8. `plugins/withPodsDeploymentTarget.js` lint errors (pre-existing).
