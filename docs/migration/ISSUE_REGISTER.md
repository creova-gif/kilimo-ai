# Issue Register

Seeded from static discovery on 2026-09-21. **Every issue is unverified until reproduced on
device or in a test**; the "Basis" column says how it was found. Severity: P0 critical,
P1 high, P2 medium, P3 low. Status starts as `Open`.

| ID | Sev | Title | Where | Basis | Expected | Suspected cause | Status |
|----|-----|-------|-------|-------|----------|-----------------|--------|
| KIL-001 | P0 | Offline task queue may lose writes | `lib/offline.ts:31-118`, `hooks/useSyncEngine.ts:23,60` | Code read, **not reproduced** | Offline-created/completed tasks reach `tasks` after reconnect | Two drainers on one queue. `useSyncEngine` inserts each item into `offline_sync_logs` then removes it, and may win the race. Online detection differs (`!!isInternetReachable` vs `!== false`). | **Fixed** `9472783`: single drainer (`lib/syncQueue.ts`), client ids for idempotent retry, backoff, failed items kept and shown. Jest: `offline.engine`, `offline.syncQueue`. Not yet exercised on device. |
| KIL-002 | P1 | Mobile-money shows a false "sent" success | `app/mobile-money.tsx:162-172` | Code read | No success message without a backend transaction | No provider integrated; seeded transactions | **Fixed** `3d4ce20`: payment *records* only, permanent notice that no money moves. |
| KIL-003 | P1 | Shamba tab and farm/plot screens run on hard-coded fake zones | `constants/FarmData.ts:26`, `(tabs)/fields.tsx:53,125`, `field/[id].tsx:267`, `vra-setup.tsx:41` | Code read | User's real farms/plots | No farm/plot tables or hooks; store is AsyncStorage-only | **Fixed** `726f227` (Shamba tab, plot detail) and `5ac2042` (map with boundary drawing, input planner, farm twin, crop planning, soil tests). `ZONES` deleted. |
| KIL-004 | P1 | Finance, insurance, IoT, wallet-admin, peer-groups, livestock, inventory present seeded/simulated data as if real | see FEATURE_INVENTORY.md | Code read | Real data or clearly unavailable | Prototype code | **Fixed**: finance `3d4ce20`, livestock/inventory `4460ff9`, community `e1edd12`, IoT/insurance `e7dea79`, wallet-admin honest unavailable state `d51ed21`, Agro ID on real ledger `10e277a`. Seeded `useFarmDataStore` deleted. RLS smoke 90/90. |
| KIL-005 | P1 | 11 routes are unreachable from the UI | see FEATURE_INVENTORY.md | Grep for `push`/`navigate`/`href` | Every shipped screen reachable or removed | Removed tabs left routes behind | **Fixed** `d51ed21`: role-gated More section in Profile reaches every feature; a test asserts each route file exists. |
| KIL-006 | P1 | Swahili/English incomplete on most screens | ~20 legacy screens | Grep of ternaries | All copy from `lib/i18n` | Inline ternaries; some screens single-language | **Fixed** `8f24c6a`, `ad4c5de`, `5ac2042`, `d51ed21`, `10e277a`: every screen uses `lib/i18n`. Remaining `lang === 'sw'` checks only choose between stored bilingual data fields (crop names, credit factor labels), not UI copy. |
| KIL-007 | P2 | Notifications realtime subscription never fires | `hooks/useNotifications.ts:146-162` | Code + migration comment | Live push of new notifications | Subscribes to view `notifications`; Realtime cannot subscribe to views. Realtime also excluded locally. | **Fixed** `d51ed21`: subscribes to base table `user_notifications` (in the realtime publication) filtered by user, with polling and refresh-on-foreground fallback. The local stack excludes realtime, so the fallback is what runs locally. |
| KIL-008 | P2 | Global offline banner ignores i18n | `app/_layout.tsx:104-138` | Code read (and visible on the simulator) | Uses `state.offline.banner` | Hard-coded copy | **Fixed** `9472783`: `SyncStatusBanner` uses i18n and shows pending/failed counts. |
| KIL-009 | P2 | RAG is deployed but unused | `supabase/functions/rag-chat`; `public.knowledge_base` | Code + DB query | AI assistant grounded in `knowledge_base` | Client never calls `rag-chat`; 8 rows, **0 embeddings** | **Fixed** `ad4c5de`: AI tab calls `rag-chat`; full-text retrieval without a key, vector search once `scripts/embed-knowledge.ts` fills embeddings. Generated answers need `OPENAI_API_KEY`. |
| KIL-010 | P2 | `lib/session.ts` `signOutEverywhere` not wired | `lib/session.ts` | Grep | Profile sign-out uses offline-safe sign-out | New file, no importer | **Fixed** `9472783`: profile sign-out uses `signOutCurrentUser`. |
| KIL-011 | P2 | Duplicate legal routes | `privacy`, `terms`, `legal/*` | Route list | One copy each | Legacy duplication | **Fixed** `d51ed21`: `/privacy` and `/terms` redirect to `/legal/*`. |
| KIL-012 | P3 | Fonts are aliased | `app/_layout.tsx:219-227` | Code read | Instrument Sans/Serif loaded as themselves | `Inter_*` names aliased | **Fixed** `49c28e2`: Instrument Sans registered under its own names; `Inter_*` kept as documented aliases. |
| KIL-013 | P2 | Simulator baseline not yet confirmed equal to HEAD | `IOS_SIMULATOR_SOURCE_AUDIT.md` | Timestamp evidence only | Bundle matches `d8c5d70` | Not compared | **Resolved** 2026-09-22: superseded — the simulator now runs a Release build made from the committed branch head. |

Fix and verification columns (root cause confirmed, fix, regression test) are filled when an issue is worked.

## Verification log

- 2026-09-21: Wave 1 migrations (7) applied to local DB after dump `~/kilimo-backups/kilimo_pre_wave1_20260921-222234.dump`.
- `scripts/rls-smoke.py`: 85/85 checks (cross-user read/update/delete denied on 13 owner tables, anon denied,
  child rows cannot attach to another user's parent, stock trigger applies and refuses overdraw, direct quantity
  edit blocked, consultation owner cannot self-answer, community membership rules).
- `tsc --noEmit` clean; Jest 658/658; `expo export --platform ios` succeeds.
- 2026-09-22: Wave 2 migrations (soil_tests, knowledge_search, agro_ledger_summary over finance_entries) applied after dump
  `~/kilimo-backups/kilimo_pre_wave2_20260922-110811.dump`. `scripts/rls-smoke.py` 90/90. `tsc` clean; Jest 795/795.
- 2026-09-22: Release build from the branch head installed on the simulator; `.maestro/06_add_farm.yaml` passes and the row is confirmed in Postgres. Final checks in `MIGRATION_REPORT.md`.
