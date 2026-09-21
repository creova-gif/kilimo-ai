# FINAL_DESIGN_SYSTEM

Single source: **`constants/Theme.ts`**, derived from the Figma file's own variables (decoded from the attached `kilimo.ai.fig`) and the frames. Details and per-value provenance: `docs/kilimo-v2/02_DESIGN/DESIGN_TOKENS.md`, component mapping: `FIGMA_COMPONENT_MAP.md`.

| Foundation | Value | Source |
|---|---|---|
| Brand | primary `#3C4A2A`, dark `#26321D`, tint `#EBF3E6`, accent `#4A5D23` | variables `color/brand/*` ✓ |
| Text | primary `#1C2216`, secondary `#606C55`, disabled `#95A38C`, on-primary `#FFF` | variables ✓ |
| Surfaces / borders | bg `#FFF` / `#F2F5EF` / `#F9FAF6`; border `#E4EADF` / `#D4DEC3` / `#C5CDB3` | variables ✓ |
| Status | fills from frames (`#22D15A`, `#C27D13`, `#D90429`, `#457B9D`) + AA-safe text variants (derived) | frames; variables define slightly different system defaults |
| Type | Inter, 20 roles 10→38 px | frames |
| Spacing | 2 4 6 8 12 16 20 24 32 40 (+48) | variables ✓ |
| Radius | 4 8 12 16 24 pill | variables ✓ |
| **Touch target** | **48 dp** (was 44) | variable `touch-target/default`, UX framework |
| Motion | 80 / 180 / 320 / 550 ms | variables ✓ = `constants/MotionTokens.ts` |
| Dark mode | derived (Figma is light-only) | inference — verify contrast before shipping |

## Primitives (`components/ui`, 236+ tests)
`AppText · Button · Card · Badge/StatusBadge · TextField/Input · Chip · ListRow/ListGroup · AlertCard · ScreenHeader · EmptyState · ErrorState · OfflineBanner · SkeletonBlock/Group · ConfidenceMeter · tab bar helpers`.

## Also in the Figma file, not yet applied
A second, richer token set — `Primitives` (leaf/gold/ink/sand/sky/ember/blaze scales) and `Semantic` (`crop/*`, `device/*`, `market/*`, `finance/*`, `ai/confidence-*`, `state/*`), data-viz scales (NDVI, soil moisture, rain, severity, risk), `opacity/stale-data 0.55`. Intended for charts/IoT/AI-confidence screens; adoption is an open decision (`DESIGN_CONSULTATION.md`, Undecided #3).

## Rule
No raw hex, font size, radius or spacing in a screen — only tokens. One button, one card, one input.
