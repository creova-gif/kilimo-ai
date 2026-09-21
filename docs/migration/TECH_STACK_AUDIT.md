# Tech Stack Audit

Verified from the repository on 2026-09-21 (branch `feat/ios-ui-migration`).

| Layer | Finding |
|-------|---------|
| Framework | Expo ~54, React Native 0.81.5, React 19.1, New Architecture per Expo defaults |
| Routing | expo-router ~6.0 (file-based, `app/`), 5 real tabs, remaining screens are root Stack routes registered in `app/_layout.tsx` |
| Language | TypeScript ~5.9 (strict), `npm run typecheck` = `tsc --noEmit` |
| State | Zustand 5 (`store/`, AsyncStorage-persisted `useKilimoStore`), TanStack Query 5 (no persistence) |
| Backend | Supabase (local Docker only; cloud project not paid). Auth = phone OTP; PostgREST; 8 edge functions |
| DB | PostgreSQL 17.6, Supabase CLI migrations (`supabase/migrations`, 18 pre-migration files) |
| Auth storage | Session in Keychain via chunked `expo-secure-store` (`lib/secureSessionStorage.ts`) |
| Maps | `react-native-maps` 1.20.1 native, Leaflet (unpkg) on web |
| Animation / graphics | react-native-reanimated ~4.1, react-native-svg 15.12 |
| Notifications | expo-notifications ~0.32; edge function `process-notifications` |
| Connectivity | `@react-native-community/netinfo` 11.4 |
| Media | expo-image-picker ~17, expo-document-picker ~14, expo-print ~15 |
| i18n | Home-grown (`lib/i18n`): English + Swahili, parity-tested; per-area dictionaries added during migration |
| Styling | React Native `StyleSheet` with `constants/Theme.ts` tokens. **No NativeWind/Tailwind.** |
| Lint | ESLint 10 (`eslint.config.mjs`), `npm run lint` |
| Tests | Jest 29 + jest-expo (255 tests at baseline); 6 Maestro flows in `.maestro/` (not wired to CI) |
| CI | GitHub Actions `ci-validate.yml`: lint, typecheck, test, `expo export --platform web` |
| Build | EAS profiles in `eas.json`; native project checked in at `ios/` (CocoaPods) |
| Native app id | `com.jaymafie.kilimoai`, scheme `kilimoai` |
| Not present | Prisma/Drizzle, Redux, NativeWind, Firebase, payment SDK, analytics SDK beyond `lib/analytics` |

## Integrations status

| Integration | Status |
|-------------|--------|
| Supabase auth / DB | Working locally |
| OpenWeather | Wired (`lib/weather.ts`); key not in local `.env`, falls back to demo banner |
| OpenAI | Via `openai-proxy` edge function; key unset locally, function answers 503 "not configured", client falls back to labelled demo |
| SMS (Africa's Talking) | `sms-send` edge function; keys unset locally |
| RAG | `rag-chat` edge function exists but the client never calls it; `knowledge_base` has 8 rows and no embeddings |
| Payments | **None.** No mobile-money provider or licence. No screen may claim money moved. |
| IoT hardware | **None.** No ingestion path. |
| Push | expo-notifications configured; delivery pipeline not verified |

## Environment used

macOS 27.0, Xcode 27.0, Node 24.11.1, Supabase CLI 2.109.0, Docker Desktop 4.84.0.
Local `.env` holds only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (local demo keys).
