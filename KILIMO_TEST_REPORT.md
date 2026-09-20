# KILIMO_TEST_REPORT

Device for all simulator tests: **iPhone 15 Pro Max, iOS 17.0**, UDID `3B219BCB-075D-4260-82B9-D03E8426D9A6`.
Build under test: Release, `com.jaymafie.kilimoai`, from branch `feat/kilimo-figma-v2-integration` (legacy UI; Figma migration not started).
Driver: Maestro 2.10.0 (`.maestro/`). The `control` tool's touch input does not reach the device (G-002); Maestro is the input path.

| ID | Test | Environment | Steps | Expected | Observed | Result | Evidence | Related bug |
|---|---|---|---|---|---|---|---|---|
| T-001 | Dependency install | Node 24.11.1, npm 11.6.2 | `npm ci` | Installs | 1143 packages | PASS | shell | — |
| T-002 | Static checks + unit tests | same | `tsc --noEmit`; `jest` | 0 errors; all pass | tsc: 0 errors; jest: 4 suites, 16 tests pass | PASS | shell | — |
| T-003 | Native iOS build | Xcode 27.0, CocoaPods 1.17.0 | `expo prebuild --platform ios --clean`; `xcodebuild … -configuration Release -sdk iphonesimulator` | BUILD SUCCEEDED | FAIL twice (pod deployment targets < 15.0; then `ENOSPC`), then **BUILD SUCCEEDED** after `plugins/withPodsDeploymentTarget.js` and freeing disk | PASS (after fixes) | commit `2601cc7` | G-005 (fixed), G-001 |
| T-004 | Install + launch | iPhone 15 Pro Max sim | `simctl install`; `simctl launch com.jaymafie.kilimoai` | App launches, process stays alive | Launched; welcome screen rendered | PASS | `docs/kilimo-v2/evidence/T003_00_welcome_sw.jpg` | — |
| T-005 | Smoke flow: clean state → welcome → language toggle → start | same, `.maestro/00_smoke_launch.yaml` | `launchApp clearState`; assert heading/CTA; tap English; tap Kiswahili; tap "Anza Sasa" | Copy switches EN/SW; start opens phone-number step 1/6 | All 10 steps COMPLETED. EN copy: "YOUR FARM, SMARTER." / "Get Started". After start: "Namba yako ya simu", `+255 7…` field, numeric keyboard, step 1/6 | PASS | `T003_00_welcome_en.jpg`, `T003_00_after_start.jpg` | — |

## Known-untested (do not read as passing)

Authentication against a real backend, onboarding steps 2–6, session restoration, every post-onboarding screen, offline/network, AI, IoT, marketplace, maps, weather, Swahili completeness, accessibility, visual match to Figma.

## Findings from testing so far

- Legacy auth falls back to a **mock** (OTP `123456`, `mock-access-token`) whenever `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` are unset — see G-016.
- The Figma splash (leaf logo card, "Kilimo AI", tagline, single CTA, 2.4.0 version line) differs materially from the running splash (hero photo, two-line headline, language pill). Visual reference: `docs/kilimo-v2/evidence/figma_splash_reference.jpg`.
