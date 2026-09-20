# ADR 003: Authentication fails closed; mock auth is dev-only and opt-in

**Status:** Accepted (2026-09-20)

## Context
Legacy `useAgroAuth` fell back to a mock (OTP 123456, `mock-access-token`) whenever Supabase env was unset, including release builds (G-016).

## Decision
`lib/authMode.ts` resolves `real | mock | unconfigured`. `mock` requires `__DEV__` AND `EXPO_PUBLIC_ENABLE_MOCK_AUTH=1` AND no credentials. Otherwise sign-in/verify throw a bilingual not-configured error.

## Alternatives
Keep the silent fallback; remove mock entirely.

## Why
Removes a fail-open path while keeping an explicit, labelled dev convenience.

## Consequences
Developers must set the flag or run the local backend; a misconfigured build now errors instead of admitting users.

## Migration
None (behavioural tightening).

## Rollback
Revert commit `89d6e92`.
