# Issue Register

Seeded from static discovery on 2026-09-21. **Every issue is unverified until reproduced on
device or in a test**; the "Basis" column says how it was found. Severity: P0 critical,
P1 high, P2 medium, P3 low. Status starts as `Open`.

| ID | Sev | Title | Where | Basis | Expected | Suspected cause | Status |
|----|-----|-------|-------|-------|----------|-----------------|--------|
| KIL-001 | P0 | Offline task queue may lose writes | `lib/offline.ts:31-118`, `hooks/useSyncEngine.ts:23,60` | Code read, **not reproduced** | Offline-created/completed tasks reach `tasks` after reconnect | Two drainers on one queue. `useSyncEngine` inserts each item into `offline_sync_logs` then removes it, and may win the race. Online detection differs (`!!isInternetReachable` vs `!== false`). | **Fixed** `9472783`: single drainer (`lib/syncQueue.ts`), client ids for idempotent retry, backoff, failed items kept and shown. Jest: `offline.engine`, `offline.syncQueue`. Not yet exercised on device. |
| KIL-002 | P1 | Mobile-money shows a false "sent" success | `app/mobile-money.tsx:162-172` | Code read | No success message without a backend transaction | No provider integrated; seeded transactions | **Fixed** `3d4ce20`: payment *records* only, permanent notice that no money moves. |
| KIL-003 | P1 | Shamba tab and farm/plot screens run on hard-coded fake zones | `constants/FarmData.ts:26`, `(tabs)/fields.tsx:53,125`, `field/[id].tsx:267`, `vra-setup.tsx:41` | Code read | User's real farms/plots | No farm/plot tables or hooks; store is AsyncStorage-only | **Fixed** for Shamba tab and plot detail `726f227`. Map, VRA, crop planning, farm-twin still read `ZONES` (Wave 2). |
| KIL-004 | P1 | Finance, insurance, IoT, wallet-admin, peer-groups, livestock, inventory present seeded/simulated data as if real | see FEATURE_INVENTORY.md | Code read | Real data or clearly unavailable | Prototype code | **Fixed** except wallet-admin: finance `3d4ce20`, livestock/inventory `4460ff9`, community `e1edd12`, IoT/insurance `e7dea79`. RLS verified by `scripts/rls-smoke.py` (85/85). |
| KIL-005 | P1 | 11 routes are unreachable from the UI | see FEATURE_INVENTORY.md | Grep for `push`/`navigate`/`href` | Every shipped screen reachable or removed | Removed tabs left routes behind | Open |
| KIL-006 | P1 | Swahili/English incomplete on most screens | ~20 legacy screens | Grep of ternaries | All copy from `lib/i18n` | Inline ternaries; some screens single-language | Open |
| KIL-007 | P2 | Notifications realtime subscription never fires | `hooks/useNotifications.ts:146-162` | Code + migration comment | Live push of new notifications | Subscribes to view `notifications`; Realtime cannot subscribe to views. Realtime also excluded locally. | Open |
| KIL-008 | P2 | Global offline banner ignores i18n | `app/_layout.tsx:104-138` | Code read (and visible on the simulator) | Uses `state.offline.banner` | Hard-coded copy | Open |
| KIL-009 | P2 | RAG is deployed but unused | `supabase/functions/rag-chat`; `public.knowledge_base` | Code + DB query | AI assistant grounded in `knowledge_base` | Client never calls `rag-chat`; 8 rows, **0 embeddings** | Open |
| KIL-010 | P2 | `lib/session.ts` `signOutEverywhere` not wired | `lib/session.ts` | Grep | Profile sign-out uses offline-safe sign-out | New file, no importer | **Fixed** `9472783`: profile sign-out uses `signOutCurrentUser`. |
| KIL-011 | P2 | Duplicate legal routes | `privacy`, `terms`, `legal/*` | Route list | One copy each | Legacy duplication | Open |
| KIL-012 | P3 | Fonts are aliased | `app/_layout.tsx:219-227` | Code read | Instrument Sans/Serif loaded as themselves | `Inter_*` names aliased | Open |
| KIL-013 | P2 | Simulator baseline not yet confirmed equal to HEAD | `IOS_SIMULATOR_SOURCE_AUDIT.md` | Timestamp evidence only | Bundle matches `d8c5d70` | Not compared | Open |

Fix and verification columns (root cause confirmed, fix, regression test) are filled when an issue is worked.

## Verification log

- 2026-09-21: Wave 1 migrations (7) applied to local DB after dump `~/kilimo-backups/kilimo_pre_wave1_20260921-222234.dump`.
- `scripts/rls-smoke.py`: 85/85 checks (cross-user read/update/delete denied on 13 owner tables, anon denied,
  child rows cannot attach to another user's parent, stock trigger applies and refuses overdraw, direct quantity
  edit blocked, consultation owner cannot self-answer, community membership rules).
- `tsc --noEmit` clean; Jest 658/658; `expo export --platform ios` succeeds.
