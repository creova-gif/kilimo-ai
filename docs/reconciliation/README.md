# Figma → Production Reconciliation

Charter: [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) (owner's brief — read it before continuing this work).
Design source: Figma `178jR1R7rV98GJzqsYy4Sp` ("kilimo.ai"), canvas `0:1` "2· Prototype".
Branch: `feat/figma-production-reconciliation`.

## Phase tracker

| Phase                     | Status          | Output                                                                                                                                                                                                   |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Evidence              | **In progress** | [00 Inventory](./00_CURRENT_STATE_INVENTORY.md) ✅ · [01 Figma inventory](./01_FIGMA_SCREEN_INVENTORY.md) ✅ · [02 Gap matrix](./02_FIGMA_CODE_GAP_MATRIX.md) ✅ · runtime audit ⏳ · PRD cross-check ⏳ |
| B — Architecture          | Not started     | 03 IA, design tokens, service boundaries, data model, roles, offline strategy                                                                                                                            |
| C — UX reconciliation     | Not started     | Navigation, auth/onboarding, shared scaffolds                                                                                                                                                            |
| D — Screen migration      | Not started     | Every Figma screen and state                                                                                                                                                                             |
| E — Feature completion    | Not started     |                                                                                                                                                                                                          |
| F — Backend               | Blocked by C6   | Supabase project is paused                                                                                                                                                                               |
| G — External integrations | Not started     | Payments, SMS, push, market data, IoT                                                                                                                                                                    |
| H — Hardening             | Not started     |                                                                                                                                                                                                          |
| I — Pilot                 | Not started     |                                                                                                                                                                                                          |

## Headline numbers (Phase A)

204 Figma screens/states (excluding 9 superseded frames, 3 components, 11 section labels):
**130 partial · 56 missing · 18 blocked on external services · 0 verified matches.**

## Open decisions for the owner

See [02 → Conflicts](./02_FIGMA_CODE_GAP_MATRIX.md#conflicts-that-need-an-owner-decision): C1 navigation, C2 auth, C3 duplicate Figma frames, C4 roles, C5 brand colour, C6 paused Supabase project.

## Remaining Phase A work

1. **Runtime audit** — run the web build (and a device build) and screenshot each route next to its Figma frame; this is what turns `PARTIAL` rows into `MATCHES` or concrete gaps.
2. **PRD cross-check** — `KILIMO_AI_PRD.md` against the 02 matrix (features in PRD but in neither Figma nor code, and the reverse).
3. **Per-frame detail** — user goal, entry/exit, a11y and copy for each frame via `get_design_context`, done area by area as Phase D reaches it.
