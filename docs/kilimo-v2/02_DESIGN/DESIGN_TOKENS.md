# Kilimo AI v2 — Design Tokens

Source: Figma file `178jR1R7rV98GJzqsYy4Sp`, page "2 · Prototype". The file has **no Figma variables**
(`get_variable_defs` → `{}`), so every token was **measured** from real nodes: 28 frames sampled
(via `get_design_context` on Button/Badge/Input/Dashboard/Sign Up/Network Error/Language/Marketplace/
Scan Results/Low Confidence, plus a programmatic pass over the full node trees of the frames below).
Code: `constants/Theme.ts` (`useTheme()` / pure `getTheme(isDark)`).

**Legend** — **F** = read directly from Figma. **D** = derived by us (no Figma source).
**F→** = Figma value collapsed/adjusted (see "Adjustments").

Frames sampled (all 402 wide): Auth `14:3820` Splash, `14:3840` Language, `14:3870` Sign Up, `14:3917` Sign In ·
Dashboard `24:2328` Today, `14:1245` Home, `24:2404` Features Hub · Farm `24:2619` Field Detail, `14:2549` IoT ·
Market `14:2835` Browse, `14:2920` Listing · Scan `20:304` Camera, `20:342` Results · Weather `102:1002` ·
Settings `14:4785` · Components `32:97` Button, `32:108` Status Badge, `32:117` Input · States `20:542` Network,
`20:591` Skeleton, `53:1229` Empty, `53:1388` Error, `53:1444` Permission, `50:2945` Offline, `50:2506` AI
Unavailable, `50:2247` AI Low Confidence, `50:3608` Payment Failed, `163:1181` Device Offline.
Finance, Community and Onboarding families were not in the frame list given; payments is covered by `50:3608`.

## Colors — light (F unless noted)

| Token | Value | Source / evidence |
|---|---|---|
| `primary` | `#3C4A2A` | Button `32:97`; 63 frame fills + 30 shape fills; active tab; links |
| `accent` (olive text) | `#4A5D23` | Status Badge Active text `32:99`; confidence value `20:372`; selected-row border `20:380`; "Imara" `14:3903` |
| `primaryPressed` / `primaryDim` | `#2F3A21` | **D** (no pressed frame) |
| `primarySoft` / `primaryLight` | `#EBF3E6` | Ghost button `32:93`, Active badge, VERIFIED tag `14:2876`, empty-state circle `53:1229` |
| `background` | `#FBFDF9` | Auth, Scan Results, Weather, Settings, Empty/Error/Payment states |
| `backgroundAlt` | `#F2F5EF` | Dashboard `24:2328`, Features Hub, Field Detail (cards sit on it) |
| `card` / `surface` | `#FFFFFF` | 125 frame fills |
| `surfaceMuted` | `#F2F5EF` | Input disabled `32:115`, Neutral badge, skeleton, progress track |
| `text` | `#1C2216` | 214 text nodes |
| `textMute` | `#606C55` | 56 nodes (F→ collapses `#6B7264`, `#667362`, `#606B56`, `#586253`, `#6B7760`, `#6B7366`) |
| `placeholder` | `#6B7264` | Sign Up inputs `14:3885`, search `14:2854` |
| `tabInactive` | `#6B6B70` | Bottom-nav inactive labels, 67 nodes |
| `textDisabled` | `#9AA391` | **D** |
| `border` | `#E4EADF` | 97 strokes (F→ collapses `#E2E7D8` input default `32:109`, `#DCE5D3`, `#E5ECE2`, `#E1E6DD`) |
| `borderStrong` | `#C5CDB3` | Dashboard/Field device-frame stroke `24:2328`, AI-tip card |
| `borderFocus` | `#3C4A2A` | Input Focus `32:111` |
| `disabledBg` / `disabledBorder` | `#F2F5EF` / `#E5E7EB` | Input Disabled `32:115` |
| `error` | `#D90429` | Button Destructive `32:95`, Badge Error, Input Error `32:113` (F→ collapses `#D32F2F`, `#FF3B30`, `#DC2626`, `#EF4444`, `#BE2A2A`) |
| `errorSoft` | `#FDE0E0` | Badge Error `32:102` |
| `errorSurface` | `#FFF2F2` | Alert bg `24:2343`; Input Error bg `#FFF0F0` (F→) |
| `errorBorder` | `#FF3B30` | Weather alert `24:2343`, Payment icon `50:3608` |
| `warning` | `#C27D13` | Badge Warning text `32:101` |
| `warningSoft` / `Surface` / `Border` | `#FFF3E1` / `#FFFBEB` / `#FF9F0A` | Badge `32:100` / pest alert `24:2350` |
| `info` / `infoSoft` | `#457B9D` / `#E0EFF9` | Badge Info `32:104` |
| `infoBorder` | `#93C5FD` | Weather info fills `102:1002` |
| `success` (bright) | `#22D15A` | "LIVE" pill `129:1005`, health badge `24:2619`, reconnect CTA `163:1181` — **fill only, 2.0:1 as text on white** |
| `successText` | `#4A5D23` | = accent |
| `successSoft` / `successSurface` | `#EBF3E6` / `#EAF9EC` | Active badge / weather good card `102:1002` |
| `onSuccess` | `#172114` | text on `#22D15A` `129:1006` |
| `alert.danger` | bg `#FFF2F2` border `#FF3B30` title/action `#D32F2F` | `24:2343` |
| `alert.warning` | bg `#FFFBEB` border `#FF9F0A` title `#A26600` (**D**, Figma `#B27000` = 3.9:1) action `#A06500` | `24:2350` |
| `alert.info` | bg `#E0EFF9` border `#93C5FD` title `#3F708F` | **D** (composed from Info badge + sky fills) |
| `alert.success` | bg `#EAF9EC` border `#22D15A` | `102:1002` alert-card |
| `banner.offline` | bg `#FFFDF0` border `#F5C242` text `#936E00` icon `#A37A00` | `50:2945` |
| `banner.caution` | bg `#FFF9E6` border `#FFCC00` text `#7A5C00` | `50:2247` |
| `overlay.*` | scrim `0/0/0/.5`, control `.38`, controlStrong `.69`, onPrimary `255/.13`, onPrimaryBorder `.2`, onPrimaryText `.8` | `20:304`, `24:2328` ai-advice card |
| `skeleton` | base `#F2F5EF`, strong `#E4EADF` | `20:591` shimmer rects |
| `confidence` | track `#F2F5EF`, fill `#3C4A2A`, value `#4A5D23`, lowBg `#FFEBE6`, lowText `#BE2A2A` | `20:373`, `50:2272` |
| `chart` | blue `#2563EB`, amber `#F59E0B`, sky `#93C5FD` | Weather `102:1002` |
| Olive ramp `green` | 50 `#F2F5EF`F · 100 `#EBF3E6`F · 500 `#4A5D23`F · 600 `#3C4A2A`F · 900 `#1C2216`F · 200/300/400/700/800 D | interpolated |

### AA-safe text variants (D) — Figma's own badge pairs fail 4.5:1
| Token | Figma value → contrast on its Figma bg | Shipped |
|---|---|---|
| `warningText` | `#C27D13` → **3.07** on `#FFF3E1` | `#9B640F` (4.54) |
| `infoText` | `#457B9D` → **3.91** on `#E0EFF9` | `#3F708F` (4.56) |
| `errorText` | `#D90429` → **4.23** on `#FDE0E0` | `#D00427` (4.54) |
| `alert.warning.title` | `#B27000` → 3.89 (large text OK, kept AA) | `#A26600` |
Badges/buttons use `*Text`; raw `warning`/`info`/`error` remain for fills, borders and icons. Contrast is enforced by `__tests__/ui/theme.test.ts` in both modes.

## Colors — dark (ALL DERIVED, D)
Figma is light only. Olive-hue dark set: `background #0F130B`, `backgroundAlt #141A0E`, `card/surface #171D11`, `surfaceMuted #1E2617`,
`border #2C3721`, `borderStrong #3A472D`, `text #F2F5EF`, `textMute #A3AE96`, `placeholder/tabInactive #8F9A83`,
`primary #9BB96A` (on-primary `#10160A`), `primaryPressed #86A557`, `primarySoft #2C361F`, `accent #B4CF85`.
Semantics: `error #F87171`, `warning #FBBF24`, `info #7FB3D3`, `success #4ADE80`, each with a dark tinted `*Soft` (`#3B2A20`, `#3B3714`, `#283530`, `#1F3C23`).
All text pairs verified ≥ 4.5:1 (script in tests).

## Typography (F) — family Inter
Measured from 40 distinct (weight,size) combos. Roles (`TYPE`, size/line-height = rendered Figma line box):

| Role | Size/LH | Weight | Source |
|---|---|---|---|
| `display` | 38/46 | ExtraBold | Splash `14:3820` |
| `hero` | 28/34 | ExtraBold | Sign In `14:3917` |
| `h1` | 24/29 | Bold | Today `24:2341`, Sign Up `14:3879`, Payment Failed |
| `h2` | 22/27 | Bold | Network Error `20:559` |
| `title` | 20/24 | Bold | Marketplace header `14:2846`, IoT `14:2549` |
| `h3` | 18/22 | Bold | nav-bar / card titles |
| `button` | 16/19 | Bold | primary CTA labels |
| `bodyLg` | 16/19 | Regular | input text |
| `body` | 14/20 | Regular | paragraphs (`14/20` measured) |
| `label` | 14/17 | SemiBold | field labels, list titles |
| `buttonSm` | 14/17 | Bold | secondary CTA labels |
| `small` / `smallStrong` | 13/18 · 13/16 | Regular · SemiBold | terms text, pills |
| `caption` / `captionStrong` | 12/15 | Regular · SemiBold | subtitles |
| `micro` / `microStrong` | 11/14 | Regular · SemiBold | tab labels (98 uses), badge text (Medium) |
| `overline` | 10/12, +0.5 tracking | Bold, caps | VERIFIED `14:2877` |
Weights map to `Inter_400Regular … Inter_900Black` keys (`FONT`). Extra/Black rarely appear (Splash, scores, ✕ glyph).

## Spacing (F) — gaps/paddings observed: 2 4 6 8 10 12 16 20 24 32 40
`xxs 2 · xs 4 · xs2 6 · sm 8 · sm2 10 · md 12 · lg 16 · lg2 20 · xl 24 · xxl 32 · xxxl 40 · huge 48 (legacy)`;
`gutter 20` (dashboards/lists), `gutterWide 24` (auth/forms/states). Most frequent gaps: 8 (150×), 12 (126×), 4 (133×).
Controls: `touchTarget 44`, `controlSm 44 / Md 48 / Lg 52` (Button/Input `32:97`/`32:117`; auth CTAs 52; state CTAs 48).

## Radius (F)
`xxs 4` (tags, progress, skeleton lines) · `xs 8` (status pill, checkbox, logo) · `sm 12` (inputs, list groups, retry btn `20:562`) ·
`md 16` (cards, alerts, state CTAs — 106×) · `xl 20` (troubleshooting card `163:1181`) · `lg 24` (FAB, center AI tab, icon wells) ·
`full 999` (pills, auth CTAs — Figma `100`, 71×). Device frame `44` and Button-component `26` are not tokens (26 @ h52 ≈ pill).
Border widths: `1` (135×), `1.5` (secondary buttons/cards), `2` (210×, icon strokes & secondary CTAs).

## Shadows (F effects)
`sm` 0/2/8 `#000`@.05 (14×, cards) · `md` 0/4/12 `#1B2214`@.08 (`20:358`) · `lg` 0/8/16 `#000`@.10 (20×, FAB/tab) ·
`premium` 0/8/16 `#1B2214`@.25 (scan FAB `20:403`). Dark mode multiplies opacity (D). Also seen: green glow 0/6/12 `#3C4A2A`@.13 (Language pill `14:3854`).

## Icons
lucide 2px stroke, rounded caps: layer names match lucide (`arrow-left`, `share-2`, `wand-sparkles`, `camera-off`, `circle-x`,
`alert-triangle`, `refresh-cw`, `check`, `fingerprint`, `wifi-off`, `cloud-off`, `zap-off`, `circle-help`). Sizes 12/14/16/18/20/24/48;
nav & tabs 24, in-input 20, list chevrons 20, state illustrations 48 in a 120 circle. App already ships `lucide-react-native`.

## Motion / a11y
Durations reuse `constants/MotionTokens.ts`. New `hooks/useReducedMotion.ts`; SkeletonBlock skips its pulse when Reduce Motion is on.
Min touch target 44 (`touchSlop()` pads visually smaller chips/links).

## Open inconsistencies (Figma) — not resolved
1. **Font**: Figma is Inter, but `app/_layout.tsx` registers the `Inter_*` keys with **Instrument Sans** (and maps ExtraBold/Black → Bold). Tokens use the `Inter_*` keys, so switching to real `@expo-google-fonts/inter` is a one-line map change (package already installed). Not changed here (global visual change).
2. **Backgrounds**: 5 near-identical canvases (`#FBFDF9`, `#F2F5EF`, `#F9FAF6`, `#FAFAF8`, `#FDFDFB`). Kept two (`background`, `backgroundAlt`); Marketplace/Listing/IoT/Skeleton will render `#FBFDF9`.
3. **Reds** (5 values), **muted greens** (6), **borders** (4) — collapsed as listed above.
4. **Button shape**: pill `r100` (auth), `r16` (states/scan), `r12` (Network Error retry), component frame `r26`. `Button` exposes `shape="pill"|"rounded"` (default pill).
5. **Type on state screens**: titles are Regular 20 on Empty/Error (`53:1229/1388`) but Bold 20–24 elsewhere; primitives use Bold.
6. **Tab bar**: Figma is a docked white bar with labels; the app's `(tabs)/_layout.tsx` is a floating pill without labels. `getTabBarScreenOptions` matches Figma; layout not edited (screen work).
7. **Contrast**: badge pairs and `#22D15A` text fail AA in Figma (see AA table); Weather/IoT use `#22D15A` for status text.
8. `Home 14:1245` was not separately dumped; it shares Dashboard components. No Finance/Community/Onboarding frames were among the given ids.
