# Pre-Migration Backup

Recovery point captured on **2026-09-21** before the iOS UI migration.

## Source code (Layer 1)

| Item | Value |
|------|-------|
| Original branch | `feat/kilimo-figma-v2-integration` |
| Original commit | `454a9f72fd736080eeae52b926a9ffb8674f072a` |
| Backup branch | `backup/pre-ios-ui-migration-2026-09-21` |
| Backup commit | `d8c5d70e98138dab3e8c4d659e58561a15d34582` (parent `454a9f7`) |
| Tag | `pre-ios-ui-migration-2026-09-21` (annotated, on the backup commit) |
| Working branch | `feat/ios-ui-migration` (created from the backup commit) |
| Pushed to remote | **No** — local only. Push the branch and tag if an off-machine copy is wanted. |

The backup commit adds three files that were uncommitted at capture time so no
local work is lost:

- `.maestro/05_soko_seller.yaml` (modified)
- `lib/session.ts` (new, offline-safe `signOutEverywhere`, not yet wired to a screen)
- `__tests__/session.test.ts` (new)

Ignored config (`.env`, `supabase/.env.local`) was copied to `~/kilimo-backups/`
with mode 600. Those files are not in Git and must never be committed.

## Database (Layer 2)

| Item | Value |
|------|-------|
| Engine | PostgreSQL 17.6 (Supabase image `postgres:17.6.1.084`), local Docker |
| Database | `postgres`, schemas `public` and `auth` (plus Supabase-managed schemas) |
| Project | `kilimo-ai`, host `127.0.0.1:54322`. No cloud project is involved. |
| Migration system | Supabase CLI, 18 files in `supabase/migrations/` |
| Tool | `pg_dump` run **inside** the DB container (`docker exec supabase_db_kilimo-ai`); no host `pg_dump` is installed |

Files (outside the repository, directory mode 700):

- `~/kilimo-backups/kilimo_pre_ios_migration_20260921-155144.dump` (custom format, ~242 KB)
- `~/kilimo-backups/kilimo_pre_ios_migration_20260921-155144.sql` (plain SQL, ~274 KB)

Both contain real user rows (auth users, profiles). **Do not commit them.**

## Verification performed

1. `pg_restore --list`: 457 TOC entries, **49 tables with data**.
2. **Test restore** into a scratch database (`kilimo_restore_test2`, since dropped) with
   `schema extensions` and `schema vault` pre-created:
   - 33 of 33 tables present in `public` + `auth`.
   - **31 of 33 tables have identical row counts** to the live database.
   - The 2 differences are `auth.audit_log_entries` (123 live vs 121 restored) and
     `auth.refresh_tokens` (56 vs 55). Both are auth activity that occurred after the
     dump was taken (health checks and restarts), not restore loss.
   - Public indexes (19), constraints (36) and functions (121) match exactly.
   - `public.knowledge_base` restored with 8 rows.
3. Remaining restore errors (24) are environmental: `pg_cron` may only be created in
   the `postgres` database, and `vault`/`cron` objects depend on it. They do not affect
   application data.

A first attempt into a bare scratch DB failed to restore `public.knowledge_base` because
the `vector` extension could not be created without Supabase's prerequisites. A summary line
in that first run printed "IDENTICAL row counts" in error; the diff above it showed the
missing table. The second run, above, is the authoritative result.

**Not tested:** a full overwrite-restore into the live `postgres` database. Use the scratch
procedure below unless a full rollback is required.

## Restoration procedure

Code:

```bash
git switch backup/pre-ios-ui-migration-2026-09-21     # or: git switch --detach pre-ios-ui-migration-2026-09-21
```

Database (scratch copy, tested):

```bash
C=supabase_db_kilimo-ai
docker exec $C psql -U postgres -c "create database kilimo_restore"
docker exec $C psql -U postgres -d kilimo_restore -c "create schema if not exists extensions" -c "create schema if not exists vault"
docker exec -i $C pg_restore -U postgres --no-owner --no-privileges -d kilimo_restore < ~/kilimo-backups/kilimo_pre_ios_migration_20260921-155144.dump
```

Expect roughly two dozen `cron`/`vault` errors; verify row counts as above.

## Environment

macOS 27.0, Xcode 27.0, Node 24.11.1, Supabase CLI 2.109.0, Docker Desktop 4.84.0.
Simulator: iPhone 15 Pro Max, iOS 17.0 runtime.

## Unresolved risks

- Backups live on the same machine as the source. Copy them off-machine.
- The dump is data at a single moment; anything written to the local DB afterward is not covered.
- The local DB holds test data only, but it is the only copy of it.
