# iOS Simulator Source Audit

Which code produced the UI currently visible in the iOS Simulator.

| Item | Finding |
|------|---------|
| Device | iPhone 15 Pro Max, iOS 17.0 (`3B219BCB-075D-4260-82B9-D03E8426D9A6`) |
| App | **Native build** `com.jaymafie.kilimoai` ("Kilimo AI"), app version 1.0.0 (build 1) |
| Not Expo Go | Expo Go (`host.exp.Exponent`) is installed but is **not** the running app |
| JS source | Embedded `main.jsbundle` (7.0 MB) inside the app bundle. It is not loaded live from Metro. |
| Bundle time | 2026-09-21 10:20:15 (local) |
| Last commit before it | `454a9f7` at 10:17:47, i.e. built ~2.5 minutes after HEAD |
| Local edits at that time | `.maestro/05_soko_seller.yaml`, `lib/session.ts`, `__tests__/session.test.ts` (timestamps 10:18–10:21) |
| Native project | `ios/KilimoAI.xcworkspace`, bundle id `com.jaymafie.kilimoai`, scheme name assumed `KilimoAI` |
| Metro | `expo start --go --port 8081` from `~/kilimo-ai` is running, but the installed native app does not use it for its JS |
| SDK | Expo ~54, React Native 0.81.5 |
| Backend | Local Supabase (`http://127.0.0.1:54321`), no cloud project |

## Conclusion

The simulator UI **most likely** corresponds to commit `454a9f7` plus the three local files
now captured in backup commit `d8c5d70`. The timing match is strong evidence but not proof.

**To confirm** (not yet done): rebuild the JS bundle from `d8c5d70` and compare it with the
embedded `main.jsbundle`, or compare a known string/route table. Until then treat `454a9f7`
as the visual baseline and record any mismatch here.

## Other implementations that exist

| Ref | State | Relevance |
|-----|-------|-----------|
| `feat/kilimo-design-system` @ `1dd5a93` | Worktree `.claude/worktrees/agent-a17f34915f76509c8`. 25 commits behind the current branch. | 3 commits not in current: Figma-derived tokens, `components/ui` primitives with tests, two design docs. |
| `main` @ `74801a0` / `origin/main` @ `524583f` | Current branch is a strict descendant of `origin/main`. | 10 routes exist on main but not here (see FEATURE_INVENTORY.md). |
| ~10 `fix/*` audit branches | 1–6 commits ahead of `origin/main`, unmerged. | Audits of screens that the current branch deleted or replaced; conflicts likely. |
