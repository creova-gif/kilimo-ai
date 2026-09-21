# KilimoAI — Design Consultation: evolve, don't replace

_Scope: the original (Git) UI, the Figma prototype (`kilimo.ai`, 213 screens), and the supplied "Mobile App UX & Design Principles" framework. Everything below is grounded in what was built, run on an iPhone 15 Pro Max simulator against a real local backend, or read from the source files. Where a claim is a judgement, it says so._

**North star (unchanged):** a Swahili-first companion that a smallholder farmer with a mid-range phone and patchy data can trust. Trust is the product — so the single biggest design rule is *never show a number, alert or person that isn't real*.

---

## KEEP — it works, it's part of the identity

- **Brand: forest/olive green on warm off-white, photography of real farms and farmers.** Both sources share it; the Figma variables confirm `brand/primary #3C4A2A`, `accent #4A5D23`, `text #1C2216`, `border #E4EADF`. It reads agricultural, calm and premium — and it is the app's recognisable face.
- **Swahili-first, bilingual copy** ("Kilimo chako, kwa akili.", "Kazi za leo"). Tone is warm and direct; keep it. Language toggle on the very first screen is right.
- **The five-destination bottom bar** — Nyumbani · Shamba · [AI] · Soko · Mimi. Figma and the framework agree (3–5 tabs, thumb zone, Jakob's law). Now implemented.
- **Offline-first engineering:** optimistic task completion + sync queue, append-only ledger, offline banner concept. Farmers *will* lose signal; this is a competitive advantage. Keep the architecture, finish the UX around it (stale timestamps, "last synced").
- **Honest states that already existed:** the weather feature's "not configured / unknown location / error" states were the model for everything else. Generalised into shared primitives.
- **Agro-ID + public verification QR** that returns only non-PII attestation (verified live in the backend suite). Distinctive and privacy-respecting.
- **Motion:** the Figma variables (80/180/320/550 ms) match the app's existing motion tokens exactly — keep haptics + short springs; they meet the framework's <400 ms feedback rule.
- **Content assets worth keeping:** crop imagery, the region and crop lists, the crop library concept, soil/planning as *features* (their data must become real).

## REPLACE / MODIFY — with the reason

| # | Element | Verdict | Why (evidence) |
|---|---|---|---|
| 1 | **Fabricated data everywhere** — dashboard crop progress ("82%", "22 days to harvest"), 3 seeded alerts, seeded tasks, fake vitals updated by a random-number timer that raised "irrigation required" alerts, 5 seeded listings (one with `escrow_funded`), fake ratings, `aiAccuracy: 95.8` | **Replace with real-or-empty** | Trust is the product. A new farmer saw invented alarms. Removed the simulator, seeds, and added migrations/tests (G-022). Figma's sample content ("TARI, 2024", flood warning with a phone number) is design placeholder and must **not** ship. |
| 2 | **5,672-line dashboard; 2,100-line wizard** | **Rebuild from primitives** | Unmaintainable, inconsistent, hides defects. Home and onboarding rebuilt in ~450 + ~700 lines on the design system. Do the same for Farm, Market, Profile. |
| 3 | **Floating pill tab bar with a centre "+" that opened a Features hub; Soko hidden** | **Replace** (done) | Docked, labelled bar; the centre is the AI action; Soko is visible. Framework: consistent, persistent navigation. |
| 4 | **Six-step wizard with a mandatory 20-digit NIDA gate** | **Modify** | Not every smallholder has a NIDA; "uniqueness" was checked against a client-side list seeded with two fake IDs. Now 4 steps with progress, identity verification moves to when it's needed (see Undecided #1). Goal-gradient kept (step dots + "Hatua 1 kati ya 4"). |
| 5 | **CTA hidden behind the keyboard; raw English provider errors; English accessibility labels on Swahili screens; 44 dp targets** | **Fix** (done) | Measured on device. Button now rides above the keyboard; errors are mapped to localised messages; a11y labels translated; touch target raised to **48 dp** (Figma `touch-target/default` and the framework). |
| 6 | **Farm-profile form pre-filled with "2 acres", region "Arusha"** | **Remove defaults** | Invented values feed the AI. Empty until the farmer enters them; optional questions collapsed (framework: cut fields 20–60%). |
| 7 | **Logout only reset local flags; idle timeout threw farmers back into SMS OTP** | **Modify** | Security and UX: logout must sign out server-side; idle should *lock* (biometric/PIN), not sign out on a weak network. (Planned in Profile work.) |
| 8 | **Two marketplace paradigms (Market + Soko) and 23 redundant Figma marketplace screens** | **Consolidate to one: Soko** | Only Soko draws a real offer → order → tracking journey. Phase 1 = discover, listing, contact seller, create/mark sold — everything with a real backend. |
| 9 | **Auth screens that assume passwords / Apple / Google** | **Drop** | Backend is phone/email OTP only; showing unbuildable options breaks the "predictable path" rule. |
| 10 | **Heavy hero images (~0.9–1.1 MB each) on the onboarding path** | **Compress** | On 2G/3G a 1 MB photo per step is the real first-run cost (Doherty threshold). Target < 150 KB WebP, with a solid-colour placeholder. |
| 11 | **Duplicate/orphaned routes** (`otp-auth`, root vs tab `edit-profile`, `privacy` vs `legal/privacy`, `input-supply`, contracts) | **Remove or hide** | Every dead route is a support burden and an accessibility risk. `otp-auth` already deleted. |

## UNDECIDED — the trade-offs (need your call)

1. **Identity verification: when?**
   *Ask at signup* → trust & finance eligibility earlier, but drop-off (many farmers can't complete on day 1). *Ask at first money-touching action (progressive)* → best conversion, but a later interruption. **Recommendation:** progressive — required before wallet/contracts/selling above a threshold; optional badge otherwise.
2. **Role model: Figma's six (Farmer, Buyer, Coop Leader, Extension Officer, Input Supplier, Finance) vs the app's eight (incl. Smallholder, Commercial Farmer, Farm Manager, Commercial Admin).** Buyer/Input Supplier/Finance do not exist in the access model; roles are client-selected, so they are routing, not security. Decide which set is the product, then make roles server-verified for anything privileged.
3. **One olive system or two?** The `.fig` holds *two* systems: the prototype's olive "Kilimo AI Tokens" and a richer "Primitives/Semantic" system (leaf/gold/ink/sand palettes, semantic `crop/*`, `device/*`, `market/*`, `finance/*`, `ai/confidence-*`, data-viz scales for NDVI/soil moisture/rain/severity, and `stale-data` opacity 0.55). **Recommendation:** keep olive for the farmer app's chrome; adopt the semantic + viz tokens for status colours and charts. Confirm this is the intent.
4. **Centre button: "Ask AI" or "Scan crop"?** Figma centres AI; a farmer's most frequent high-value task may be scanning a sick plant. AI-first matches the brand; scan-first matches the job-to-be-done. Cheap to A/B once analytics exist.
5. **Photo-forward vs light onboarding.** Photos build emotion and trust; they cost bytes and legibility. Compression (above) preserves most of the value.
6. **Contracts & escrow in v1?** Fully specified in Figma, zero backend. Shipping placeholders would break the trust rule; hiding them loses the differentiator. **Recommendation:** hide until the contract tables and a payment provider exist.
7. **Dark mode.** Figma is light-only; a coherent dark palette is derived. Keep only if it passes contrast checks; otherwise ship light-only first.

## Framework audit (supplied UX checklist) — current state on the device

| Checklist item | Standard | Status |
|---|---|---|
| Touch targets | ≥ 48×48 dp, thumb zone | **Met** in design-system primitives (raised 44→48); primary CTA is bottom-anchored and above the keyboard. Legacy screens not yet migrated. |
| System speed | feedback < 400 ms, skeletons | Dashboard uses skeleton groups; haptics on press. Onboarding steps respond instantly; **network waits need skeletons/progress on Soko + Farm** (pending). |
| Form fields | essential only, right keypad | Phone → `phone-pad`, OTP → `number-pad` + `sms-otp` autofill, acres → `decimal-pad`; optional questions collapsed. |
| Navigation | 3–5 tabs, persistent back | 5 tabs; back on every onboarding step. |
| Visual layout | bounded cards, clear hierarchy | Card-based dashboard per Figma. |
| Progress & flow | visible steps | Step dots + "Hatua x kati ya 4". |
| Accessibility ("design for extremes") | labels, contrast, scaling | Bilingual a11y labels on new screens; AA-safe text variants derived. **Not yet audited with VoiceOver / large text** (pending). |

## Recommended next steps (prioritised)

1. **P0 — Truth pass (in progress):** finish removing seeded/fake content from every remaining screen (Farm, Analytics, Market, Finance, Insurance, Livestock) and prove it with a fresh-install E2E that asserts no invented alert, task, vital or listing appears.
2. **P0 — Finish the entry-to-value loop:** stabilise the onboarding E2E (register → OTP → role → farm → dashboard + DB assertions + relaunch + reinstall restore) as the release gate.
3. **P1 — Soko phase 1** on the real `market_listings` (discover, search, listing detail with call/SMS/WhatsApp, create, "my listings", mark sold), honest empty states, no escrow claims.
4. **P1 — Shamba tab:** one farm overview from the profile the farmer entered; empty state when no farm; no fake vitals; map + GPS only with permission and a real fallback.
5. **P1 — Mimi (Profile):** real sign-out, idle *lock*, account deletion (typed confirm), language, verification entry point, notification settings.
6. **P1 — AI/Scan honest states:** unavailable, low-confidence, blurry, no-plant, unsupported crop — each already drawn in Figma; wire to the real function and show the truthful failure when the provider key is absent.
7. **P2 — Performance & data cost:** compress onboarding/hero images, lazy-load, add skeletons to every network wait, measure cold-start and API latency.
8. **P2 — Accessibility:** VoiceOver walk-through, Dynamic Type at 200 %, contrast audit, reduce-motion behaviour, keyboard/switch access on forms.
9. **P2 — Visual QA against Figma** screen by screen with side-by-side captures; document intentional deviations.
10. **P3 — Retire the legacy UI:** delete superseded routes/components/tokens; keep git history as the archive.
11. **Decisions needed from you:** Undecided #1, #2, #3, #6 (they change scope, not just polish).

## Targeted questions (only what blocks a decision)

- Is a **verified identity** legally or commercially required before a farmer can *list produce* (not just move money)?
- Are **Buyer / Input Supplier / Finance** real launch personas, or Figma exploration?
- Is the leaf/gold **semantic system** the intended direction for the whole product, or only for the ERP/dashboard side?
- Which **market/region** is v1 (Tanzania only)? It decides phone formats, currency, mobile-money providers and the crop list.
