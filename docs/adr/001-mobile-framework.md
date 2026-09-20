# ADR 001: Retain the existing Expo / React Native app; do not rewrite

**Status:** Accepted (2026-09-20)

## Context
The repo already contains a working Expo SDK 54 / RN 0.81 / expo-router app (~55 routes), Zustand + TanStack Query, Supabase client, 16 passing unit tests and CI. The Figma file defines a new visual language and 35 additional screens, not a new platform.

## Decision
Keep the existing app. Re-skin via design tokens and shared primitives, then migrate screens domain by domain. No move to a monorepo (`apps/` + `packages/`) — single-app repo stays.

## Alternatives
Full rewrite (new project from Figma); Flutter/Swift; monorepo split.

## Why
Preserves working auth, offline queue, Supabase integration and tests. A rewrite would discard verified behaviour and cost the whole session before any screen is testable.

## Consequences
Legacy screens and new-design screens coexist during migration; token cascade keeps them visually coherent.

## Migration
n/a (no migration of framework).

## Rollback
Revert commits on `feat/kilimo-figma-v2-integration`.
