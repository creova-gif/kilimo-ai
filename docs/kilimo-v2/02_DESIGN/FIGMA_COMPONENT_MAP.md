# Figma pattern → React Native component map

All components live in `components/ui/` (barrel: `components/ui/index.ts`). They are token-driven (`constants/Theme.ts`),
take **all copy via props** (English/Swahili), set `accessibilityRole`/state, and keep ≥ 44pt targets.
Frame ids refer to file `178jR1R7rV98GJzqsYy4Sp`. Figma sample data (weather text, "TARI, 2024", prices) is never embedded.

| Figma pattern (frame/node) | RN component | Key props | Screens that will use it |
|---|---|---|---|
| Button 32:97 (Primary/Secondary/Ghost/Destructive); auth CTAs 14:3865, 14:3909; state CTAs 20:562, 53:1229; outline "Hifadhi Ripoti" 20:401; text link 20:566; IoT remove CTA 163:1181 | `Button` | `label` `variant` (primary/secondary/ghost/destructive/destructiveOutline/outline/link) `size` (sm44/md48/lg52) `shape` (pill/rounded) `loading` `icon` `haptics` | Splash, Language, Sign Up/In, all state screens, Scan Results, Listing publish, Field Detail actions, Settings |
| Input Field 32:117 (Default/Focus/Error/Disabled); form fields 14:3883; search bar 14:2851; Listing dropdown/inputs 14:2920 | `TextField` (`Input` alias) | `label` `hint` `error` `leftIcon` `rightIcon` `disabled` `size` (md/lg) `shape` (rounded/search) | Sign Up/In, phone/OTP, Marketplace search, Listing form, Features Hub search, Ask-AI input |
| Status Badge 32:108 (Active/Warning/Error/Info/Neutral) | `StatusBadge` / `Badge` | `status` \| `variant` `label` `size` `shape` `icon` | IoT (`14:2549` "Hewa Safi", "Inaruka"), Field health, Payment status, task states |
| VERIFIED tag 14:2876; risk pill 20:364; LIVE / engine pills 129:1002-1005 | `Badge` size="sm" / variant="live"/"solid" | `size="sm"` `variant` `uppercase` | Marketplace cards, Scan Results, Today AI card |
| Card (white r16, 1px #E4EADF) 24:2356, 14:2871, 24:2619 card-weather/tasks; AI advice card 24:2380; tip cards 50:2279 | `Card` | `variant` (solid/outlined/tinted/primary) `padding` `onPress` | Dashboard, Field Detail, Weather, IoT, Marketplace, Scan |
| Filter pills 14:2855; suggested chips 24:2328 129:1012; Marketplace region pill 14:2848 | `Chip` | `label` `selected` `size` (md/sm) `onPress` `leading` | Marketplace Browse, Today quick-ask, Features Hub filters |
| Settings rows 14:4785; Language pills 14:3854/3859; task rows 24:2359; checkbox rows 20:380; IoT list-row 14:2549 | `ListRow` + `ListGroup` | `title` `subtitle` `value` `leading` `trailing` `showChevron` `onPress` `destructive` `selected` | Settings, Language Select, Today tasks, Scan actions, IoT alerts, profile menus |
| alert-weather / alert-pest 24:2343/2350; farming alert-card 102:1002; warning banner 50:2265 | `AlertCard` | `variant` (danger/warning/info/success + aliases weather/pest) `title` `body` `actionLabel` `onAction` `onPress` `icon` `announce` | Dashboard Today, Weather, Field Detail, IoT, AI Low Confidence |
| NavBar (state screens) / today-header 24:2339 / Scan header 20:350 | `ScreenHeader` | `title` `subtitle` `overline` `variant` (nav/large) `trailing` `showBack`+`onBack`+`backLabel` | every stack screen; Dashboard Today (large), Settings, Scan Results |
| State / Empty 53:1229, Permission 53:1444, No-farms; benefits list | `EmptyState` | `icon` `tone` `title` `description` `caption` `actionLabel` `onAction` `secondaryActionLabel` `children` | Farms, Marketplace empty, Notifications, Camera permission |
| State / Error 53:1388, Network 20:542, AI Unavailable 50:2506, Payment Failed 50:3608, Device Offline 163:1181 | `ErrorState` | `title` `description` `code` `retryLabel` `onRetry` `secondaryLabel` `onSecondary` `icon` `children` | Any failed fetch / M-Pesa / IoT / AI screen |
| Offline banner 50:2945 (and queue card) | `OfflineBanner` | `message` `visible` `actionLabel` `onAction` `icon` | App shell (top of tabs), Field/IoT while offline |
| Skeleton Loading 20:591 (shimmer-title/val/body/avatar/media) | `SkeletonBlock`, `SkeletonGroup` | `width` `height` `radius` (n/pill/circle) `tone`; group `label` | Dashboard, Weather, Marketplace, Field Detail loading |
| AI Confidence 20:370-374, Low-confidence pill 50:2272 | `ConfidenceMeter` | `value` `label` `valueText` `low` / `lowThreshold` `accessibilityValueText` | Scan Results, Low Confidence, AI advice |
| Bottom nav "ai-first-bottom-nav" 24:2328 (+center AI button 77:1782) | `getTabBarScreenOptions(theme)`, `TabBarCenterButton` | `bottomInset`; `accessibilityLabel` `onPress` | `app/(tabs)/_layout.tsx` (migration step; layout not edited here) |
| Type roles (display…overline) | `AppText` | `variant` `tone` `uppercase` | everywhere text is hand-styled today |

## Not yet componentized (next wave)
Checkbox/toggle row (24:2360, 14:3905), password-strength bar (14:3898), stat tile (24:2619 stats-row), hourly weather strip / charts (102:1002),
crop image card (14:2871), segmented "Home indicator"/status-bar chrome (OS-provided in RN — do not rebuild), Farm health hero (24:2619), camera viewfinder overlay (20:304).

## Migration notes
- Import from `components/ui` (or file paths); existing `Button`/`Input`/`Badge`/`Card` call sites keep compiling. Behavior changes to expect: `Button` is flat (no gradient) and pill by default, `Input` is flat with a 14 SemiBold label (was blurred, 10px caps), `Card` default is `solid` (`glass` is an alias), `Badge` accessibilityLabel is the label itself (was "Status: …" hard-coded).
- `ScreenHeader`/`EmptyState` had no call sites; `ScreenHeader` no longer imports the router — pass `showBack onBack backLabel`.
- New `useTheme()` keys: `colors.{primarySoft,accent,backgroundAlt,surface,surfaceMuted,placeholder,tabActive,tabInactive,borderStrong,borderFocus,*Soft,*Text,alert,banner,overlay,skeleton,confidence,chart}`, `typography`, `fonts`, `borderWidth`, `sizes`.
