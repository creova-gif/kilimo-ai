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
| T-006 | Failure state: no backend configured → auth fails closed (G-016) | Release build without `EXPO_PUBLIC_SUPABASE_*`, `.maestro/01_auth_unconfigured.yaml` | clean state → Anza Sasa → enter `712345678` → dismiss keyboard → Endelea | Bilingual "not available" alert; stay on step 1; no session created | Alert "Hitilafu / Sign-in is not available: this build is not configured with a backend. Huduma ya kuingia haipatikani…"; OTP step NOT shown | PASS | `docs/kilimo-v2/evidence/T006_auth_not_configured.jpg` | G-016 (fixed) |
| T-007 | Keyboard vs primary CTA on phone step | same | Focus phone field; look for "Endelea" | CTA reachable while typing | **FAIL** — "Endelea" (y 790–866) is behind the keyboard; a tap on it hits the `0` key (stray digit observed). Tapping non-interactive text or swiping down dismisses the keyboard. | FAIL (P2) | failed run `2026-09-20_163537` | G-018 (open) |
| T-008 | Real onboarding journey with server persistence | iPhone 15 Pro Max, Release build → **local Supabase**, `scripts/e2e.sh` (flows 00/02/03 + DB checks) | fresh install → welcome → phone (random local test number) → OTP `123456` → role Farmer → farm profile (name, Arusha, Maize) → NIDA (synthetic) → done → dashboard | UI reaches the app; backend holds the user's data | UI: all steps COMPLETED, dashboard reached. DB (queried via psql): `auth.users` row; `agro_profiles` = server-minted `AGRO-2026-NIDA-…`, status **pending**; `farmer_profiles` = Amara Test / farmer / Arusha / {Mahindi (Maize)} / 2 acres; `verification_requests` = personal/pending | PASS (after G-021 fix) | `scripts/e2e.sh` output: 7 passed; `docs/kilimo-v2/evidence/` | **G-021 found and fixed here**: first run reached the final screen but DB had 0 rows (5 separate Supabase clients; session not shared) |
| T-009 | Session restoration after relaunch | same, `.maestro/03_session_restore.yaml` | `stopApp` → `launchApp` (no clearState) | Lands in the app as the same farmer, not the wizard | Dashboard shown with saved name "Amara"; welcome and wizard not shown | PASS | Maestro run 2026-09-21 09:2x | Initial assertion used a tab label hidden from the a11y tree while a modal was up (test bug, fixed) |

## Known-untested (do not read as passing)

Wrong/expired OTP, token expiry/refresh, network loss mid-flow, logout → login again, every post-onboarding screen except the dashboard shell, offline/network, AI, IoT, marketplace, maps, weather, Swahili completeness, accessibility, visual match to Figma.

## Findings from testing so far

- **Fabricated data reached users** (G-022): the legacy dashboard showed crop progress ("82%", "22 days to harvest") and the store seeded three fake alerts to every new install; the Figma frame also contains sample alerts. Both replaced with real-data-or-empty-state.
- **Success without persistence** (G-021): onboarding reported success while nothing was saved. Caught only because the E2E asserted database rows, not just UI.
- The ID-verification modal shows the user's full national ID unmasked (G-023).
- Legacy auth falls back to a **mock** (OTP `123456`, `mock-access-token`) whenever `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` are unset — see G-016.
- The Figma splash (leaf logo card, "Kilimo AI", tagline, single CTA, 2.4.0 version line) differs materially from the running splash (hero photo, two-line headline, language pill). Visual reference: `docs/kilimo-v2/evidence/figma_splash_reference.jpg`.
