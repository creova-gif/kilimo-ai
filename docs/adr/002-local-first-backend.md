# ADR 002: Develop against a local Supabase stack; cloud is externally blocked

**Status:** Accepted (2026-09-20)

## Context
Both Supabase projects (`kilimo_ai` hsjxaxnenyomtgctungx, `creova` vwestumjbrpwlbsewupz) are INACTIVE; restoring is a billing action (prior audit: PaymentRequiredException). The repo contains the full backend definition: 11 migrations + 8 edge functions.

## Decision
Run the repo's own backend locally with `supabase start` (Docker), configured in `supabase/config.toml`. The mobile app points at it through `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`. Cloud restoration and choice of production project are left to the owner.

## Alternatives
Restore/create a cloud project (billing + irreversible); mock the backend in the client (violates 'no silent mocks').

## Why
Real Postgres + RLS + Auth + edge functions, so auth, RLS and API contracts are genuinely testable.

## Consequences
Anything requiring third-party secrets (OpenAI, Africa's Talking) cannot be exercised end-to-end; those paths must show truthful 'unavailable' states.

## Migration
Point env at the cloud project once restored; migrations are the shared source of truth.

## Rollback
`supabase stop`; remove local env.
