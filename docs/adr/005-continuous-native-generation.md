# ADR 005: Native iOS project is generated (`expo prebuild`), never committed

**Status:** Accepted (2026-09-20)

## Context
No `ios/`/`android/` exist in the repo. A first native build (Xcode 27) failed: pod resource bundles declared deployment targets 9.0–13.4, below Xcode's 15.0 minimum.

## Decision
Keep CNG. Ignore `ios/` and `android/`. Fix pod targets with the local config plugin `plugins/withPodsDeploymentTarget.js`, which patches the generated Podfile (idempotent). `npm run ios` now maps to `expo run:ios`.

## Alternatives
Commit hand-edited native projects; patch Podfile manually after each prebuild.

## Why
Reproducible from a clean checkout: `npm ci && npx expo prebuild --platform ios --clean && xcodebuild …`.

## Consequences
Plugin must be revisited when the affected pods raise their minimum targets.

## Migration
n/a

## Rollback
Remove the plugin entry from `app.json`.
