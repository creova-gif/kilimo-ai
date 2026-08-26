# CLAUDE.md — kilimo-ai

Instructions for AI coding agents working in this repository.

## Project Overview

AgTech platform for East African farmers. React Native/Expo mobile app, Supabase backend. One of the most technically mature and actively hardened repos in the portfolio — a real anti-fabrication remediation sprint (10+ merged PRs) already removed fake "Live" map claims, a fake "Neural Link Active" AI header, and a fake device fleet, replacing them with honest demo-mode labels and real data wiring.

## Product Purpose

Give farmers real market listings, an income ledger (Agro Ledger), farmer profiles, and a Swahili-aware assistant — with an identity-verification flow (Agro ID) that is deliberately distinct from KYC (see Architecture below).

## Repository Structure

- `lib/offline.ts` — the real offline-sync implementation (Zustand store, `tasks`/`market_listings` tables). If you're asked to add offline sync, check here first — there is no separate `OfflineSyncService.ts`-style file in this repo; that pattern belongs to a different, unrelated proposal and does not match this codebase's actual sync architecture.
- `supabase/migrations/` — 11 real migrations exist here. As of the last audit they had all been applied to the live database, but always verify with `supabase migration list` before assuming a new migration file is live — this repo previously had 11 migrations sitting unapplied in git for months while the app queried tables that didn't exist yet.
- `supabase/functions/verify-agro-id/` — deliberately public (`verify_jwt = false`). This is correct, not a bug — it's a public attestation endpoint returning only non-PII aggregate bands (e.g. "healthy"/"strong"), never raw financial amounts. Do not "fix" this by requiring auth.
- `supabase/config.toml` — has a comment explaining the verify_jwt default and the specific public exception. Read it before touching any function's auth config.

## Architecture — KYC vs. Agro ID Activation

These are two distinct flows sharing similar-sounding names. Do not conflate their state:

- **Home Activation** (`handleActivateHome → mintAgroId`): mints the Agro ID. Success is immediate; `pending` means a local retry state (offline/failed mint), not a review queue.
- **KYC** (`/verification/personal` or `/verification/business` → `submit-verification` edge function → `/verification/pending`): a real backend review process, roughly 24–48 hours.

If you touch either flow, do not let them share a status variable or UI copy — that ambiguity was a previously-identified real bug class in this codebase.

## Technology Stack

Expo/React Native, TypeScript, Supabase (Postgres, Auth, Edge Functions), pgvector for the RAG knowledge base.

## Development Workflow

`feature/* → dev → staging → main`, both protected, CI (`npm run test` via vitest + build) required to pass.

## Database

Real tables: `agro_ledger` (+ `agro_ledger_summary` view, `security_invoker`), `agro_profiles`, `farmer_profiles`, `market_listings`, `knowledge_base` (RAG, pgvector), `user_notifications`, `verification_requests`. RLS is enabled and real on every table with actual policies — this is not a scaffold-only repo.

## Security

- `leaked-password-protection` is disabled in Supabase Auth. Dashboard-only fix (Authentication → Policies) — no code change possible.
- The `vector` Postgres extension lives in the `extensions` schema, not `public` — if you add a new function using `vector` types, make sure `search_path` includes `extensions`.

## AI Agent Rules

- Before adding a new "Live"/"Active" status label anywhere, check whether the underlying data is actually real-time. This codebase has an explicit, hard-won anti-fabrication standard — don't regress it.
- Before writing a new offline-sync feature, read `lib/offline.ts` first.
- Confirm any new migration is actually applied via `supabase migration list`, not just present in the `migrations/` folder.

## Definition of Done

Tests (vitest) and build pass. New tables have real RLS policies, not `ENABLE ROW LEVEL SECURITY` with zero policies. No new ambiguous shared status variables across distinct workflows.
