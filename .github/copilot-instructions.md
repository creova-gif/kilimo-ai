# Copilot Instructions for Kilimo AI

Kilimo AI is a React Native + Expo mobile app for East African smallholder farmers, featuring field tracking, market prices, expert consultations, and a voice-driven AI assistant. This guide helps Copilot sessions work effectively in this repository.

## Quick Start

```bash
npm install
npm run dev                 # Start dev client
npm run android            # Android emulator
npm run ios                # iOS simulator
npm run web                # Web preview
```

For EAS device builds (requires authentication):
```bash
npm run eas:build:preview  # Android preview build
npm run eas:build:android  # Production Android build
npm run eas:build:ios      # Production iOS build
```

## Build, Test & Lint

**Single test file:**
```bash
npm test -- __tests__/myFile.test.ts
```

**All tests:**
```bash
npm test
```

**Lint (ESLint + Prettier):**
```bash
npm run lint
```

**Note:** TypeScript strict mode is disabled (`"strict": false` in tsconfig.json) to allow rapid prototyping. When adding type safety for security-critical paths or public-facing APIs, opt into strict mode locally with `// @ts-strict` comments.

## Architecture

### High-Level Structure

1. **App Router (`app/`)** — Expo Router-based file routing with main tabs:
   - `(tabs)/_layout.tsx` — Bottom tab navigation (fields, market, AI hub, profile, analytics, contracts, consultations, calendar)
   - Top-level routes for onboarding, auth, verification flows
   - Sub-directories for feature-specific screens (e.g., `field/`, `analytics/`)

2. **Global State (`store/`)** — Zustand-based stores:
   - `useKilimoStore.ts` — Main app state (user, auth, UI state)
   - `useFarmDataStore.ts` — Field and farm-specific data
   - `useContractsStore.ts` — Contract tracking
   - `useWalletAdminStore.ts` — Financial operations
   - `useDigitalFarmTwinStore.ts` — Farm simulation/digital twin state

3. **Hooks (`hooks/`)** — Reusable async/side-effect logic:
   - `useAgroAuth.ts` — Authentication with AgroID verification
   - `useSyncEngine.ts` — Offline-first sync with Supabase (optimistic updates)
   - `useNotifications.ts` — Push notifications & in-app alerts
   - `useFarmVitals.ts` — Real-time farm health monitoring
   - `useTasks.ts` — Farming calendar & task management
   - `useMarketIntelligence.ts` — Market price data from external APIs
   - `useIdleTimeout.ts` — Session timeout & activity tracking
   - `useWeather.ts` — Weather forecasting integration

4. **Components (`components/`)** — Shared UI components:
   - `PageScaffold.tsx` — Page wrapper with header, footer, layout patterns
   - `ErrorBoundary.tsx` — Error recovery for crashed screens
   - `ui/` — Atomic UI components (buttons, inputs, modals, etc.)
   - Platform-specific wrappers (`.native.tsx`, `.web.tsx`, `.tsx`)

5. **Services (`services/`)** — External integrations:
   - `native-bridge.ts` — Native module communication for hardware features

6. **Backend Integration** — Supabase (via `@supabase/supabase-js`):
   - Auth: Phone + OTP, AgroID verification
   - Database: Real-time listeners for farm data, contracts, marketplace
   - Storage: Profile images, field photos, documents
   - Edge Functions (in `supabase/functions/`) for business logic

### Key Data Flow

- **Auth Flow:** Phone OTP → AgroID verification → User profile setup (see `useAgroAuth.ts`)
- **Field Sync:** Local Zustand store → Optimistic UI updates → Supabase real-time sync (see `useSyncEngine.ts`)
- **Offline Mode:** Failed mutations queued in Zustand (`useKilimoStore`'s `syncQueue`, persisted via AsyncStorage) and retried by `lib/offline.ts`/`hooks/useSyncEngine.ts` when online — no SQLite in this project
- **Market Data:** External API calls cached via React Query (`@tanstack/react-query`) with 5-minute stale time

## Code Conventions

### Naming & File Organization

- **Routes:** Kebab-case folder names (`field-edit/`, `farm-twin/`)
- **Components:** PascalCase files (`PageScaffold.tsx`), default export
- **Hooks:** camelCase, prefixed with `use` (`useKilimoStore.ts`)
- **Stores:** One store per file, named `use[Feature]Store.ts`, using Zustand `create()`
- **Constants:** UPPER_SNAKE_CASE in `constants/` or co-located in component files

### Styling & Theme

- **System:** React Native StyleSheet (no CSS-in-JS; no Tailwind)
- **Theme Colors:** See `DESIGN.md` — Deep Forest Green (`#2E6F40`), Ivory (`#FCFBF7`), Charcoal (`#080A08`)
- **Spacing:** 4px/8px baseline (4, 8, 12, 16, 24, 32, 48)
- **Border Radius:** 8px (small), 12px (medium), 16px/24px (cards), 999px (pills)
- **Haptics:** Use `expo-haptics` for touch feedback on CTAs and confirmations
- **Animations:** `react-native-reanimated` for spring/fade animations; `expo-blur` for glassmorphism

### TypeScript & Type Safety

- Types are colocated with features (no central `types/` folder)
- Disable strict mode globally (see tsconfig.json); opt-in locally when needed
- Common pattern: `interface ScreenProps { route: RouteProp<...>; navigation: NativeStackNavigationProp<...> }`
- Avoid `any`; use `unknown` and narrow with type guards if needed

### State Management Patterns

**Zustand stores:**
```typescript
import { create } from 'zustand';

export const useKilimoStore = create<KilimoState>()((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

**Accessing in components:**
```typescript
const { user, setUser } = useKilimoStore();
```

**React Query for server state:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['farms', farmId],
  queryFn: () => fetchFarmData(farmId),
  staleTime: 1000 * 60 * 5,
});
```

### Forms & Validation

- Use React Hook Form (if form libraries are in package.json) or plain `useState`
- Validate on blur & submit; show error messages inline
- Phone input: Use Supabase Auth's OTP flow (see `useAgroAuth.ts`)

### Error Handling

- Wrap risky operations in try-catch; log to Sentry (initialized in `_layout.tsx`)
- Graceful degradation: Show offline state, fallback UI, or error boundary
- User-facing errors: Toast notifications via `useNotifications` hook

### Testing

- Jest config uses `jest-expo` preset
- Transform ignore patterns handle React Native, Expo, and third-party RN packages
- Tests in `__tests__/` folder, parallel to source structure
- Example: `__tests__/services/native-bridge.test.ts` for `services/native-bridge.ts`

## Offline-First Principles

- Mutations optimistically update Zustand stores immediately
- Failed requests queued in Zustand (`useKilimoStore`'s `syncQueue`, AsyncStorage-persisted), processed by `lib/offline.ts`
- Sync engine retries on network restoration (listen via `@react-native-community/netinfo`)
- All Supabase queries should have offline fallbacks or graceful degradation

## Common Gotchas

1. **Platform-specific code:** Use `.native.tsx` / `.web.tsx` extensions; Expo bundler picks the right file
2. **Imports:** Use `@/*` path alias (e.g., `@/store/useKilimoStore`) instead of relative paths
3. **Motion library:** Shimmed at `shims/motion/index.tsx` for web compatibility
4. **Env variables:** Loaded via `expo-constants` and `.env` files (never commit `.env` — see `.env.example`)
5. **Prettier enforced:** 100-char printWidth, single quotes, trailing commas (see `.prettierrc`)
6. **ESLint:** Allows `console.warn` and `console.error`; warns on `console.log`; unused vars trigger warnings if not prefixed with `_`

## Before Submitting Code

- Run `npm run lint` and fix Prettier/ESLint warnings
- Run `npm test` to ensure tests pass (or skip test files for non-critical UI changes)
- Commit message should describe *what changed and why*, not how it was generated (see CONTRIBUTING.md)
- If adding security-critical code, ensure it's human-reviewed and documented

## Key Files to Reference

- **Routing & Layout:** `app/_layout.tsx`, `app/(tabs)/_layout.tsx`
- **Auth Flow:** `hooks/useAgroAuth.ts`, `app/otp-auth.tsx`, `app/verification/`
- **Styling System:** `DESIGN.md`, `components/ui/`
- **Global State:** `store/useKilimoStore.ts`
- **Network Sync:** `hooks/useSyncEngine.ts`, `lib/offline.ts`
- **Error Reporting:** `lib/sentry.ts`
- **Agent Skills:** `.github/agents/`, `.agents/skills/` (for n8n workflow support)

## Troubleshooting

**Dev server won't start:**
```bash
npm install
npx expo prebuild --clean
npm run dev
```

**Linting fails:**
```bash
npm run lint --fix
```

**Tests hang:**
- Check `jest.config.js` transformIgnorePatterns if you added a new dependency
- Run single test file to isolate: `npm test -- myFile.test.ts`

## Resources

- Expo docs: https://docs.expo.dev
- React Native docs: https://reactnative.dev
- Zustand: https://github.com/pmndrs/zustand
- React Query: https://tanstack.com/query
- Supabase: https://supabase.com/docs
