# ADR 004: Use Maestro for simulator E2E and UI inspection

**Status:** Accepted (2026-09-20)

## Context
The simulator tool's touch input does not reach the device (G-002). Journeys and E2E tests still need input and an accessibility tree.

## Decision
Adopt Maestro 2.10.0 (official release, sha256-verified) with flows in `.maestro/`. `maestro hierarchy` is used to inspect the accessibility tree; `simctl` for install/launch/capture.

## Alternatives
Detox (requires app-side config + pods); XCUITest by hand; idb.

## Why
Black-box, no app changes, works on the existing Release build.

## Consequences
Requires Java (present) and ~400 MB under `~/.maestro`.

## Migration
Flows are plain YAML; portable to Maestro Cloud/CI later.

## Rollback
Delete `.maestro/` and `~/.maestro`.
