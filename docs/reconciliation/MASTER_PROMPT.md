# KILIMO AI — FIGMA-TO-PRODUCTION MIGRATION & FULL PRODUCT ENGINEERING MASTER PROMPT

> Owner's brief (2026-09-24). The mission, §1.1, §2, §40 and §41 are word for word. The other sections are shortened (bullet lists turned into prose), but every requirement is kept. Saved so every session works from the same charter. Figma: https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=0-1

**Project:** Kilimo AI  
**Repository:** `https://github.com/creova-gif/kilimo-ai.git`  
**Primary design source:** attached `kilimo.ai(1).fig` Figma file  
**Supporting engineering references:**

- `04_USER_JOURNEYS(3).docx`
- `20_RAG_ENGINEERING.docx`
- `07_BENCHMARKS.docx`
- `12_ARCHITECTURE.docx`
- `Mobile_App_Audit_Build_Framework(1).docx`

**Mission:** Reconcile the attached Figma product design with the current Kilimo AI repository, then engineer the product until every intended screen, user journey, feature, state, interaction, backend contract, role, permission, and testable workflow is either fully implemented or explicitly documented as blocked by a credential/external dependency. Do not stop at visual migration. The result must be a coherent, production-grade, testable application suitable for real-user pilot testing.

---

# 0. EXECUTION MODE

You are not acting as a single developer. Operate as a coordinated senior product-engineering organization.

Use the roles below as explicit internal reviewers. One agent may execute multiple roles, but each role's concerns must be covered and documented.

## Core expert / agent roster

1. **Principal Product Engineer / Technical Lead** — Own end-to-end execution. Reconcile Figma, current code, PRD, migrations, services, and tests. Prevent architectural drift.
2. **Staff React Native / Expo Engineer** — Expo SDK 54 / React Native 0.81 / React 19. `expo-router`, platform behavior, native device APIs, performance.
3. **Senior Frontend Systems Engineer** — Component architecture, design tokens, state machines, animation, responsive layout, dark mode, tablet behavior.
4. **Figma Design Systems Engineer** — Extract every screen, component, variant, token, icon, spacing rule, typography rule, interaction, prototype flow, and asset from Figma. Build a Figma-to-code mapping ledger.
5. **Lead Product Designer** — Preserve the intended Kilimo visual system. Resolve inconsistent Figma patterns before reproducing them.
6. **Senior UX Architect** — Information architecture, discoverability, workflow depth, task completion, navigation, cognitive load, progressive disclosure.
7. **UX Researcher** — Validate flows for farmers, farm managers, commercial farmers, agribusinesses, co-ops, extension officers, low-literacy users, low-bandwidth users, and bilingual users.
8. **Accessibility Specialist** — WCAG 2.2 AA, VoiceOver, TalkBack, dynamic type, reduced motion, contrast, minimum targets, semantic labels.
9. **Human Factors / Behavioral Design Specialist** — Hick's Law, Fitts's Law, Jakob's Law, Miller's Law, Tesler's Law, Doherty Threshold, Peak-End Rule, Goal-Gradient Effect, Aesthetic-Usability Effect, Serial Position Effect, Von Restorff Effect, Postel's Law, error prevention and recovery.
10. **Information Architect** — Navigation hierarchy, feature grouping, routes, content architecture, cross-feature continuity.
11. **Design QA Engineer** — Pixel/spacing/alignment audit against Figma. Detect clipping, overlap, incorrect safe-area behavior, wrong typography, wrong icon alignment, inconsistent cards, and broken responsiveness.
12. **Backend Architect** — Supabase architecture, APIs, Edge Functions, multi-tenancy, authentication, authorization, business logic boundaries.
13. **Database / PostgreSQL Engineer** — Schema integrity, RLS, migrations, indexes, referential integrity, audit fields, conflict handling, real-time subscriptions.
14. **Distributed Systems / Offline-First Engineer** — Sync queue, conflict resolution, retry semantics, idempotency, stale data, offline actions, reconnection.
15. **Cloud / Infrastructure Engineer** — Dev/staging/production environments, secrets, logging, observability, deployments, cost controls.
16. **Security Engineer** — OWASP MASVS / Mobile Top 10, credential handling, sensitive storage, authorization, RLS, rate limits, abuse controls.
17. **Privacy / Data Governance Engineer** — Consent, retention, deletion, export, data minimization, AI data flow disclosure, location/camera/microphone policies.
18. **AI / ML Engineer** — Crop diagnosis, AI assistant, confidence, failure modes, model interfaces, latency, prompt safety, evaluation.
19. **RAG Engineer** — Retrieval, chunking, embedding, metadata, vector search, hybrid search, reranking, citation correctness, retrieval evaluation separate from generation.
20. **Data Engineer** — Event data, market data, weather, IoT, agricultural datasets, freshness, lineage, ingestion quality.
21. **IoT / Edge Systems Engineer** — Device telemetry, sensor state, drone state, last-seen, anomaly status, intermittent connectivity.
22. **GIS / Mapping Engineer** — Farm boundaries, GPS, map layers, NDVI/soil moisture abstractions, coordinate storage, performance.
23. **Marketplace / Commerce Engineer** — Listings, buyer mode, offers, orders, contracts, payment state, seller ratings, transaction integrity.
24. **Fintech / Payments Engineer** — Wallet semantics, M-Pesa/Airtel flows, receipts, failure states, pending states, duplicate payment protection.
25. **Localization Specialist** — Swahili/English parity, agricultural terminology, no hardcoded single-language strings.
26. **QA Lead** — Test plan, regression suite, device matrix, exploratory testing, acceptance sign-off.
27. **Automation Test Engineer** — Unit, integration, component, API, E2E, offline, deep-link, background/foreground, accessibility tests.
28. **Performance Engineer** — Start time, jank, memory, battery, images, network, low-end Android profiling.
29. **Observability / SRE Engineer** — Crashes, API failures, latency, sync failures, AI quality events, logs, traces, alerts.
30. **DevOps / Release Engineer** — CI/CD, EAS, preview builds, release channels, migrations, rollback, store submission readiness.
31. **Technical Writer** — Keep architecture, ADRs, feature matrix, screen matrix, runbooks, onboarding instructions, and release notes current.
32. **Red-Team Reviewer** — Challenge assumptions. Look for fake functionality, demo-only behavior, misleading UI, dead buttons, stale docs, hidden blockers, untested states.

---

# 1. NON-NEGOTIABLE OPERATING RULES

## 1.1 Do not trust stale documentation over the live code

The repository contains old audits, archived reports, historical architecture, and a PRD. Some older documents may describe problems that have already been fixed.

> **Current `main` code + attached Figma are the primary evidence. Historical audits are evidence, not truth.**

When a document contradicts current code: inspect the implementation, run it, test it, document the current truth, update the stale document only after verification.

## 1.2 Never claim a feature is complete because a screen exists

A feature is only complete when: the user can discover it, navigation reaches it, inputs work, validation works, loading works, success works, errors work, empty states work, offline behavior is defined, permissions are handled, data persists correctly, role access is correct, analytics/observability exists where appropriate, tests verify the critical path, it works on real target platforms.

## 1.3 No decorative dead UI

Every visible control must do something legitimate. No fake refresh, fake charts, fake balances, random graphs, nonfunctional buttons, mock toggles presented as production controls, "coming soon" for a flow that Figma presents as active, silent demo fallback without a clearly declared demo/test mode.

## 1.4 Protect what already works

Do not rewrite stable sections merely for architectural fashion. Before changing a working module: record current behavior, record tests, identify the specific design or engineering reason, preserve contracts unless migration is intentional.

## 1.5 Continue until the definition of done is satisfied

Do not stop after creating components, copying screens, making the app "look right," passing TypeScript, implementing only happy paths. If blocked only by external credentials, complete everything possible around the integration, provide a deterministic stub/test harness, and document the exact remaining credential/deployment action.

---

# 2. SOURCE-OF-TRUTH PRIORITY

1. Attached Figma file — intended visual and interaction design.
2. Current repository `main` branch — current product implementation.
3. Actual running build — real runtime behavior beats assumptions.
4. Current Supabase migrations / Edge Functions — backend truth.
5. Current architecture docs and PRD — product intent and missing contracts.
6. Historical audits / archived reports — regression clues only.
7. Your own assumptions — last resort, must be labeled.

---

# 3. FIRST TASK: FORENSIC INVENTORY — DO NOT CODE YET

Create `docs/reconciliation/00_CURRENT_STATE_INVENTORY.md`. Inspect `app/`, `components/`, `components/ui/`, `hooks/`, `lib/`, `services/`, `store/`, `supabase/functions/`, `supabase/migrations/`, `docs/`, `__tests__/`, `.github/`, `.agents/`, `app.json`, `eas.json`, `.env.example`, `package.json`, `KILIMO_AI_PRD.md`, `KILIMO_AI_AUDIT.md`.

Record: framework versions, every route, every user-facing screen, every shared component, every store, every API integration, every Supabase table/migration, every Edge Function, every environment dependency, current test coverage, current known fallback/demo data, every feature with no persistence, every feature with no real external data source, every duplicate route/screen implementation, every archived document that no longer matches current code. Do not depend on filenames alone. Read the implementation.

# 4. FIGMA FORENSIC AUDIT

Create `docs/reconciliation/01_FIGMA_SCREEN_INVENTORY.md`. Inventory every top-level page, frame, component, component set, variant, prototype connection, and screen. For every frame capture: Figma page, node, intended screen name, persona/role, user goal, entry point, exit/next actions, state, platform expectation, existing repo route, existing implementation (complete/partial/missing), data dependency, backend dependency, asset dependency, accessibility notes, localization requirements, implementation action (keep/refactor/build/merge/delete duplicate).

Include auth/OTP, consent, onboarding steps, empty/loading/skeleton/error/offline states, permission-denied (camera/location/microphone), payment pending/failure/success, marketplace empty/buyer/seller/order states, IoT disconnected/battery-low/offline, crop diagnosis uncertainty, AI rate-limit/error, no-data analytics, first-use states, destructive confirmation, account deletion, session expiry, sync conflicts.

# 5. BUILD THE FIGMA ↔ CODE RECONCILIATION MATRIX

Create `docs/reconciliation/02_FIGMA_CODE_GAP_MATRIX.md`. One row per Figma screen/state. Status values: `MATCHES`, `PARTIAL`, `MISSING`, `IMPLEMENTED_BUT_NOT_IN_FIGMA`, `DUPLICATE`, `STALE`, `BROKEN`, `BLOCKED_EXTERNAL`. For every `PARTIAL`, `MISSING`, or `BROKEN` item state what is missing, which route/component owns it, whether business logic exists, whether backend exists, what test proves completion. Also create the reverse matrix (code routes without Figma, undiscoverable features, PRD-only features, Figma-only features). Resolve contradictions intentionally.

# 6. PRODUCT SCOPE THAT MUST BE VERIFIED

- **Identity and onboarding:** bilingual language selection, role selection, phone OTP, consent, profile, region, farm type/size, crops, livestock, irrigation, Agro ID, verification (personal/business), account recovery, account deletion.
- **AI:** Sankofa AI assistant, crop photo diagnosis, AI voice, AI training hub, confidence and uncertainty, RAG retrieval, suggested actions, expert handoff when uncertain.
- **Farm operations:** fields, farm mapping, GPS boundary, crop planning, tasks, calendar, inventory, livestock, soil analysis, farm twin, analytics, weather, alerts, IoT/sensors, drones.
- **Market / commerce:** market prices, marketplace, seller mode, buyer mode, create listing, browse/search/filter, offers, negotiations, orders, order status, delivery state, seller/buyer identity, ratings/reviews, contract farming, input supply.
- **Finance:** ledger, income/expense entry, reports, Agro ID financial history, wallet/mobile money, payout admin, transaction history, insurance, receipts, payment failure/retry.
- **Community / learning:** peer groups, consultations, video/training, notifications, help/support.
- **Cross-cutting:** role-based access, subscription/tier gating, localization, offline-first, sync, deep links, push notifications, dark/light mode, accessibility, privacy, security.

# 7. UX LAWS AND USABILITY STANDARD

Use UX laws to make measurable decisions: **Jakob's Law** (familiar patterns, normal bottom nav, clear back, conventional icons, plain labels); **Hick's Law** (progressive disclosure, task-focused, persona-aware dashboards); **Fitts's Law** (iOS 44×44 pt, Android 48×48 dp, one-handed field use); **Miller's Law** (chunking, saved drafts, persistent context, summaries, prefilled details); **Tesler's Law** (move complexity into the system); **Doherty Threshold** (immediate tap feedback, local state <100 ms, data transition feedback <400 ms, progress/cancel/retry for long operations); **Aesthetic-Usability** (never sacrifice readability/speed/a11y for glass effects); **Goal-Gradient** (visible progress in onboarding, verification, learning, contracts, orders, setup); **Peak-End** (deliberate completion moments); **Von Restorff** (emphasis only for one primary CTA, critical warning, destructive action, urgent alert); **Serial Position**; **Error Prevention** (disable invalid submissions, explain constraints, validate progressively, confirm destructive actions, protect unsaved changes); **Postel's Law** (accept varied input, normalize canonical data).

# 8. MOBILE PLATFORM RULES

Verify safe areas, hardware/system back, edge swipe, keyboard, status bar, permission dialogs, share sheet, haptics, accessibility services, dynamic type, notification and media permissions. No web UI wrapped in a mobile shell. Shared business logic and tokens; platform-specific behavior where required.

# 9. NAVIGATION RECONSTRUCTION

Design a navigation architecture that matches Figma, preserves direct access to high-frequency field tasks, is understandable in Swahili and English, respects roles, and does not bury common tools. Candidate: Home · AI · Farm · Market · Profile/More — validate against Figma, routes, persona task frequency, usability. Create `docs/reconciliation/03_INFORMATION_ARCHITECTURE.md` with a route map and role-based navigation matrix.

# 10. DESIGN SYSTEM CONSOLIDATION

Required shared primitives: Button, IconButton, Card, Badge, Avatar, Input, Select, TextArea, SearchField, SectionHeader, ListItem, EmptyState, ErrorState, LoadingState, Skeleton, Toast, Modal, BottomSheet, ConfirmDialog, Progress, Tabs/SegmentedControl, Chip, StatusBadge, DataMetric, ChartContainer, ScreenHeader, PageScaffold, OfflineBanner, PermissionPrompt, SyncStatus, ErrorBoundary. Reuse existing primitives when correct. Tokens: color, typography, radius, spacing, elevation, motion, layout, icon size, target size, breakpoint, semantic states. No magic values unless justified.

# 11. FIGMA VISUAL MIGRATION RULE

For every matched screen: preserve working business logic; rebuild UI to the Figma structure; replace one-off styling with shared tokens/components; match layout, spacing, hierarchy, typography, card dimensions, iconography, imagery, button hierarchy, chart treatment, state visuals, navigation; fix Figma where it violates accessibility/platform usability; document intentional deviations in `docs/reconciliation/04_DESIGN_DEVIATIONS.md`. No silent deviations.

# 12. USER JOURNEYS — COMPLETE FLOWS, NOT SCREEN COLLECTIONS

Every journey: discovery, entry, authentication, completion, retention/re-entry, support/recovery. Paths: happy, alternate, error, offline, permission-denied, AI uncertainty, rate-limit, expired session, role-denied. Create `docs/product/USER_JOURNEYS.md`, `USER_FLOWS.md`, `USER_STORIES.md`. Every stage has an owner and a success metric.

# 13. ROLE-BASED PRODUCT EXPERIENCE

Roles: smallholder, farmer, commercial farmer, farm manager, commercial admin, agribusiness/buyer, co-op leader, extension officer. Enforce authorization in navigation, UI action, API, Supabase RLS, and server/Edge Function. Test direct route access by unauthorized roles.

# 14. OFFLINE-FIRST IS A PRODUCT REQUIREMENT

Classify every critical feature: fully offline / read-only offline / queues writes / requires network / requires real-time network. Implement network detection, cached timestamps, offline banner, stale indicator, queue, retry, backoff, idempotency, conflict resolution, user-visible sync status. Airplane-mode tests: open app, view farms/fields, last weather, tasks, complete task, create offline action, take crop photo, save scan for later, reconnect and sync. Never show indefinite spinners offline.

# 15. BACKEND ARCHITECTURE — CENTRAL SERVER, NOT A SERVER PER FACILITY

One centralized cloud backend with strict multi-tenant isolation: Supabase Postgres, Auth, Storage, Realtime, Edge Functions; optional Cloudflare Workers only when justified. Scope by `organization_id`, `facility_id`, `farm_id`, `user_id`, role membership tables; RLS guarantees isolation. Modular monolith with domain boundaries: Identity/Auth, Farmer Profile/Agro ID, Farm Operations, AI/RAG, Market/Listings, Contracts, Finance/Ledger, Payments, Notifications, IoT/Telemetry, Weather/External Data, Analytics/Reporting — each with explicit interface, typed contracts, tests, observability, ownership. Split into microservices only when evidence requires it.

# 16. CURRENT FREE / LOW-COST BACKEND STRATEGY

Extend the current Supabase implementation for pilot testing. One dev project, one staging/pilot project if limits allow, production later. Do not pretend a free tier has production guarantees. Before adding a second platform, document what Supabase cannot do, why an Edge Function cannot solve it, cost, complexity, failure mode.

# 17. SUPABASE BACKEND COMPLETION

Audit migrations, RLS, Edge Functions, auth, tables, indexes, storage, realtime. Create `docs/backend/BACKEND_STATUS_MATRIX.md` (per feature: frontend, persistence, tables, function/API, auth, RLS, offline, tests). Re-test gaps: live vs seeded market prices, contract persistence, payment credentials, notification credentials, IoT, consultations, admin verification, sync.

# 18. DATABASE ENGINEERING

UUID keys, `created_at`/`updated_at`, foreign keys, indexes, enum/check constraints for state machines, soft delete only where required, audit trail for financial/contract changes, immutable ledger, idempotency keys for payments and sync, tenant keys, RLS tests.

# 19. RAG ENGINEERING

Evaluate retrieval separately from generation. Decide chunking, embedding model, metadata, language, vector store, hybrid vs semantic, reranking, query expansion, filtering, permission-aware retrieval, freshness. Retrieval metrics: Recall@K, Precision@K, MRR, nDCG, latency, cost, freshness. Generation metrics: correctness, faithfulness, citation correctness, hallucination rate, latency, cost. Create `docs/ai/RAG_ARCHITECTURE.md`, `docs/ai/RAG_EVALUATION.md`.

# 20. AI CROP DIAGNOSIS SAFETY / UX

Photo quality guidance, compression, upload progress, retry, offline queue or clear network requirement, confidence/uncertainty, "not enough evidence", multiple diagnoses, next step, treatment warning, urgent escalation, expert handoff, bilingual output. Advisory, never false certainty.

# 21. MARKETPLACE COMPLETENESS

Seller: create/edit listing, publish/unpublish, inventory linkage, offers (accept/reject/counter), order status, payment, fulfillment, review. Buyer: browse, search, filter, saved/price alerts, listing detail, seller profile, offer/buy, payment, track order, issue/dispute, review. States: no listings, no results, expired, unavailable quantity, offline, seller unavailable, payment failed/pending, order cancelled, delivery delayed.

# 22. PAYMENTS

No live-looking financial state until the backend is real. Default balances 0 unless verified; explicit sandbox mode; idempotency keys; retry-safe APIs; pending state; timeouts; webhook verification; receipts; immutable history; reconciliation. Full workflow testable in sandbox.

# 23. WEATHER / MAPS / GEOSPATIAL

Weather: real source, data age, no invented hourly detail, missing-permission handling, region fallback, severe-weather state. Maps: contextual permission, boundary drawing, save/edit, area calculation, performance, empty/low-accuracy GPS, offline tiles if feasible, NDVI/soil layers only if real or labeled.

# 24. IOT / DEVICE UX

Model online/offline, last seen, battery, signal, readings, firmware, anomaly, thresholds, freshness. No fake "live" readings without a visible simulated label. Architecture ready for MQTT/WebSocket ingestion.

# 25. ACCESSIBILITY GATE

WCAG 2.2 AA mobile: VoiceOver, TalkBack, labels, roles, focus order, dynamic text, reduced motion, contrast, non-color cues, 44pt/48dp targets, chart alternatives, form error association, hints, readable Swahili labels. Manual assistive-technology testing on core flows.

# 26. LOW-END DEVICE / LOW-BANDWIDTH STANDARD

Test slow 3G, packet loss, offline, uploads, large lists, maps, animations, AI requests. Optimize images, memory, bundle, virtualization, deferred work, animation intensity, background loops, payloads. No expensive blur/continuous motion that harms target devices.

# 27. ERROR / EMPTY / LOADING STATE STANDARD

Every async feature: initial loading, refresh loading, empty, error, recoverable retry, unrecoverable error, offline, permission denied, stale data. Shared components. No blank screens; useful recovery instructions.

# 28. INTERNATIONALIZATION

One translation layer; every user-facing string, date, number, currency, error, permission rationale, and accessibility label localized; agricultural terms reviewed; test text expansion.

# 29. TESTING STRATEGY

Create `docs/testing/TEST_STRATEGY.md`. Unit (stores, state machines, validation, access control, RAG utilities, financial calculations, farm twin, offline queue); integration (Supabase client, auth, RLS, Edge Functions, marketplace, contracts, ledger, notifications, sync); component (forms, modals, states, a11y); E2E with Maestro or Detox: (1) install → consent → OTP → onboarding → home, (2) scan → diagnosis → task, (3) offline task → reconnect → sync, (4) map/create field, (5) seller listing, (6) buyer browse → offer/order, (7) finance entry → report, (8) Agro ID → PDF/share, (9) consultation request, (10) payment sandbox, (11) role restriction, (12) account deletion. Device matrix: current and previous iOS, current and previous Android, small and mid Android, real hardware.

# 30. BENCHMARKING RULE

Do not invent scores. Untested = `UNSCORED`. Numeric scores need sub-criteria, evidence, test, standard, failure points. Categories: Figma Fidelity, Navigation/IA, Onboarding, Accessibility, Offline, Performance, Security, Backend completeness, Data integrity, AI quality, RAG quality, Marketplace completeness, QA coverage, Store readiness. 10/10 requires verified compliance.

# 31. SECURITY GATE

OWASP Mobile Top 10, MASVS review, dependency audit, secret scanning, hardcoded keys, session handling, SecureStore, AsyncStorage sensitive data, input validation, authZ, RLS, rate limiting, upload abuse, AI endpoint abuse. No service-role key or private AI provider key in the client.

# 32. OBSERVABILITY

Instrument crashes, unhandled exceptions, API failures, Edge Function errors, AI latency, RAG retrieval failure, scan failure, sync failure, queue size, payment failure, failed auth, deep-link failure. No sensitive data in logs. Create `docs/ops/OBSERVABILITY.md`.

# 33. CI/CD

CI runs install, typecheck, lint, unit, integration where practical, security checks, build verification. EAS profiles: development, preview/staging, production. Migrations versioned, forward-fix plan, never edited after production application.

# 34. REAL-USER PILOT READINESS

Pilot mode with real auth, real user data, stable persistence, crash reporting, clear demo boundaries, feedback collection, version identification, analytics consent, test account cleanup. Never mix real users with fake balances or simulated live financial data.

# 35. IMPLEMENTATION SEQUENCE

A Evidence → B Architecture → C UX reconciliation → D Screen migration → E Feature completion → F Backend → G External integrations (sandbox first) → H Hardening → I Pilot.

# 36. GIT STRATEGY

Branch `feat/figma-production-reconciliation`; small coherent commits; PR with screenshots, architecture summary, feature matrix, migrations, tests, known external blocks.

# 37. REQUIRED OUTPUT FILES

- Reconciliation: `docs/reconciliation/00_CURRENT_STATE_INVENTORY.md`, `01_FIGMA_SCREEN_INVENTORY.md`, `02_FIGMA_CODE_GAP_MATRIX.md`, `03_INFORMATION_ARCHITECTURE.md`, `04_DESIGN_DEVIATIONS.md`
- Product: `docs/product/USER_JOURNEYS.md`, `USER_FLOWS.md`, `USER_STORIES.md`, `FEATURE_MATRIX.md`
- Architecture: `docs/ARCHITECTURE.md`, `docs/architecture/SERVICE_BOUNDARIES.md`, `OFFLINE_SYNC.md`, `MULTI_TENANCY.md`
- Backend: `docs/backend/BACKEND_STATUS_MATRIX.md`, `RLS_AUDIT.md`, `INTEGRATION_STATUS.md`
- AI: `docs/ai/RAG_ARCHITECTURE.md`, `RAG_EVALUATION.md`, `AI_SAFETY_AND_FALLBACKS.md`
- Quality: `docs/testing/TEST_STRATEGY.md`, `DEVICE_MATRIX.md`, `PILOT_ACCEPTANCE_TESTS.md`, `docs/ops/OBSERVABILITY.md`, `RELEASE_RUNBOOK.md`
- ADRs: centralized multi-tenant backend, microservice boundaries vs modular monolith, Supabase choice, offline conflict strategy, AI/RAG architecture, market-price data source, IoT transport.

# 38. DEFINITION OF DONE

- **Design:** every Figma screen inventoried and mapped; no unexplained missing frame, broken layout, or overlap; safe areas correct; tokens used.
- **Navigation:** every feature discoverable; role-aware; deep links; back behavior.
- **Functionality:** no dead control; no misleading fake live state; critical workflows complete; forms validate; persistence where required.
- **States:** loading, empty, error, offline, permission denied, success, retry, destructive confirmations.
- **Accessibility:** manual VoiceOver/TalkBack pass; targets; labels; contrast; dynamic text; reduced motion.
- **Backend:** real auth; RLS verified; correct tables; current migrations; data survives reinstall/login; tenant isolation proven.
- **AI/RAG:** retrieval and generation evaluated; uncertainty handled; no false certainty; fallback defined.
- **Offline:** cached reads; queued writes; reconnection sync; conflict strategy tested.
- **Performance:** cold start and scroll jank measured; images optimized; low-end Android tested.
- **Security:** no client secrets; session handling verified; storage reviewed; authZ verified.
- **QA:** critical automated tests pass; real-device smoke tests pass; no P0 blockers; P1 risks documented.
- **Pilot:** preview build installable; real accounts work; feedback collection; observability active; demo-only behavior labeled.

# 39. FINAL EXECUTION REPORT

Return: what existed before; what Figma required; what was missing; migrated; newly built; refactored; removed as duplicate/stale; backend status; AI/RAG status; offline status; security status; accessibility status; performance results; testing results; screenshots/evidence; remaining credential-only blockers; pilot readiness; store-readiness; exact next action for the owner. Every completion claim points to code, test, screenshot, migration, runtime verification, or a documented external block.

# 40. IMPORTANT ARCHITECTURAL DECISION

> **One centralized multi-tenant backend with modular service boundaries, not a server per facility and not premature microservice sprawl.**

Facilities/farms/co-ops are isolated by identity, tenancy, permissions, and database policy — not by duplicating the server stack.

# 41. START NOW

Begin with the evidence phase. Do not start coding until the repository is inventoried, the full Figma is inventoried, the screen/state gap matrix is complete, and architecture conflicts are recorded. Then implement in the order above. Continue until the acceptance gates are satisfied or the only remaining blockers are external credentials/services.
