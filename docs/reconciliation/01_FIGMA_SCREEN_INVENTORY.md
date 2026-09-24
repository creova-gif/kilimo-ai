# 01 — Figma Screen Inventory

_Source: Figma file `178jR1R7rV98GJzqsYy4Sp` (kilimo.ai), canvas `0:1` "2· Prototype". Extracted 2026-09-24 via Figma MCP `get_metadata`. The other page (`208:1221` "1· Enterprise Resource Platform, ERP") is empty._

## Totals

| Kind                    | Count   |
| ----------------------- | ------- |
| SCREEN                  | 163     |
| STATE                   | 41      |
| SUPERSEDED              | 9       |
| COMPONENT               | 3       |
| SECTION                 | 11      |
| **All top-level nodes** | **227** |

All frames are 402 pt wide (iPhone 16 Pro class). Tall frames (height > 874) are scrolling screens.

## Figma sections

- 01 — Onboarding & Authentication
- 02 — Onboarding Completion & Today
- 03 — Core App
- 04 — Farm Management
- 05 — Commerce & Finance
- 06 — Community & Settings
- 07 — Advanced Features
- 08 — Extended Features
- 09 — AI & Scan Flows
- 10 — Profile & Account
- 11 — App States

## Bottom navigation in Figma (from `Mobile / Dashboard / Home`, 14:1245)

`Nyumbani` (Home) · `Shamba` (Farm) · **centre leaf button** · `Soko` (Market) · `Mimi` (Me). The AI assistant is entered from an "Uliza Kilimo AI…" search field on Home, not a tab. A floating camera FAB ("Piga Picha") opens scan.

## Fields not yet filled

The master prompt asks for user goal, entry/exit, accessibility and localization notes per frame. Those need `get_design_context` per frame (prototype links and text are not in the metadata export) and are filled in per area as each area is migrated (Phase D). Persona below is inferred from the frame name and `lib/access.tsx` roles.

### Mobile / AI (9)

| Node                                                                                         | Frame                                 | Size     | State   | Persona     |
| -------------------------------------------------------------------------------------------- | ------------------------------------- | -------- | ------- | ----------- |
| [`20:908`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-908)     | Mobile / AI / Voice Recording         | 402x874  | Default | all farmers |
| [`24:3244`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3244)   | Mobile / AI / Training Guide          | 402x1024 | Default | all farmers |
| [`57:750`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-750)     | Mobile / AI / Diagnosis History       | 402x874  | Default | all farmers |
| [`89:2107`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2107)   | Mobile / AI / Voice Assistant         | 402x882  | Default | all farmers |
| [`102:2453`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2453) | Mobile / AI / Chat v2                 | 402x900  | Default | all farmers |
| [`160:1884`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1884) | Mobile / AI / Training Module List    | 402x874  | Default | all farmers |
| [`160:1984`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1984) | Mobile / AI / Training Module Detail  | 402x985  | Default | all farmers |
| [`160:2051`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2051) | Mobile / AI / Training Quiz           | 402x874  | Default | all farmers |
| [`160:3536`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3536) | Mobile / AI / Voice Processing Result | 402x874  | Default | all farmers |

### Mobile / Auth (7)

| Node                                                                                       | Frame                           | Size    | State   | Persona     |
| ------------------------------------------------------------------------------------------ | ------------------------------- | ------- | ------- | ----------- |
| [`14:3820`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3820) | Mobile / Auth / Splash Screen   | 402x874 | Default | all farmers |
| [`14:3840`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3840) | Mobile / Auth / Language Select | 402x874 | Default | all farmers |
| [`14:3870`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3870) | Mobile / Auth / Sign Up         | 402x874 | Default | all farmers |
| [`14:3917`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3917) | Mobile / Auth / Sign In         | 402x874 | Default | all farmers |
| [`14:3955`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3955) | Mobile / Auth / Phone Verify    | 402x874 | Default | all farmers |
| [`20:94`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-94)     | Mobile / Auth / Password Reset  | 402x874 | Default | all farmers |
| [`20:138`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-138)   | Mobile / Auth / New Password    | 402x874 | Default | all farmers |

### Mobile / Community (15)

| Node                                                                                         | Frame                                            | Size     | State   | Persona           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------- | ------- | ----------------- |
| [`24:3363`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3363)   | Mobile / Community / Consultation Booking        | 402x874  | Default | all farmers       |
| [`27:52`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-52)       | Mobile / Community / Video Hub                   | 402x1377 | Default | all farmers       |
| [`14:4332`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4332)   | Mobile / Community / Coop Dashboard              | 402x874  | Default | coop_leader       |
| [`14:4410`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4410)   | Mobile / Community / Extension Officer           | 402x874  | Default | extension_officer |
| [`14:4484`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4484)   | Mobile / Community / Agribusiness                | 402x874  | Default | agribusiness      |
| [`14:4562`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4562)   | Mobile / Community / Forum                       | 402x1158 | Default | all farmers       |
| [`14:4641`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4641)   | Mobile / Community / Knowledge Base              | 402x977  | Default | all farmers       |
| [`14:6591`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6591)   | Mobile / Community / Coop Members                | 402x874  | Default | coop_leader       |
| [`14:6696`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6696)   | Mobile / Community / Farm Visit Report           | 402x874  | Default | all farmers       |
| [`81:2185`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2185)   | Mobile / Community / Peer Groups                 | 402x874  | Default | all farmers       |
| [`100:1365`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1365) | Mobile / Community / Coop Leader Dashboard       | 402x1137 | Default | coop_leader       |
| [`100:1497`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1497) | Mobile / Community / Extension Officer Dashboard | 402x1042 | Default | extension_officer |
| [`160:3002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3002) | Mobile / Community / Expert Directory            | 402x874  | Default | all farmers       |
| [`160:3084`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3084) | Mobile / Community / Expert Active Session       | 402x874  | Default | all farmers       |
| [`160:3148`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3148) | Mobile / Community / Expert Consultation History | 402x874  | Default | all farmers       |

### Mobile / Dashboard (4)

| Node                                                                                       | Frame                              | Size     | State   | Persona     |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | -------- | ------- | ----------- |
| [`24:2328`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2328) | Mobile / Dashboard / Today         | 402x874  | Default | all farmers |
| [`24:2404`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2404) | Mobile / Dashboard / Features Hub  | 402x1093 | Default | all farmers |
| [`14:1245`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1245) | Mobile / Dashboard / Home          | 402x994  | Default | all farmers |
| [`57:666`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-666)   | Mobile / Dashboard / Daily Actions | 402x1017 | Default | all farmers |

### Mobile / Edge States (2)

| Node                                                                                         | Frame                                | Size    | State         | Persona     |
| -------------------------------------------------------------------------------------------- | ------------------------------------ | ------- | ------------- | ----------- |
| [`108:1207`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1207) | Mobile / Edge States / No Products   | 402x874 | No Products   | all farmers |
| [`108:1246`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1246) | Mobile / Edge States / Loading State | 402x874 | Loading State | all farmers |

### Mobile / Empty (2)

| Node                                                                                         | Frame                          | Size    | State         | Persona     |
| -------------------------------------------------------------------------------------------- | ------------------------------ | ------- | ------------- | ----------- |
| [`106:1319`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1319) | Mobile / Empty / No Farms      | 402x874 | No Farms      | all farmers |
| [`106:1360`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1360) | Mobile / Empty / No Connection | 402x874 | No Connection | all farmers |

### Mobile / Farm (43)

| Node                                                                                         | Frame                                              | Size     | State   | Persona     |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------- | ------- | ----------- |
| [`24:2523`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2523)   | Mobile / Farm / Crop Library                       | 402x874  | Default | all farmers |
| [`24:2619`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2619)   | Mobile / Farm / Field Detail                       | 402x1200 | Default | all farmers |
| [`24:2890`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2890)   | Mobile / Farm / Digital Twin                       | 402x987  | Default | all farmers |
| [`14:1642`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1642)   | Mobile / Farm / Map                                | 402x874  | Default | all farmers |
| [`14:2038`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2038)   | Mobile / Farm / VRA Setup                          | 402x874  | Default | all farmers |
| [`14:2132`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2132)   | Mobile / Farm / Crop Planning                      | 402x876  | Default | all farmers |
| [`14:2198`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2198)   | Mobile / Farm / Tasks List                         | 402x874  | Default | all farmers |
| [`14:2269`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2269)   | Mobile / Farm / Calendar                           | 402x1079 | Default | all farmers |
| [`14:2353`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2353)   | Mobile / Farm / Livestock                          | 402x874  | Default | all farmers |
| [`14:2417`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2417)   | Mobile / Farm / Inventory                          | 402x874  | Default | all farmers |
| [`14:2549`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2549)   | Mobile / Farm / IoT Dashboard                      | 402x1023 | Default | all farmers |
| [`14:5396`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5396)   | Mobile / Farm / Pest Alert                         | 402x874  | Default | all farmers |
| [`14:5458`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5458)   | Mobile / Farm / Harvest Log                        | 402x874  | Default | all farmers |
| [`14:5607`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5607)   | Mobile / Farm / Report Generator                   | 402x874  | Default | all farmers |
| [`14:5687`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5687)   | Mobile / Farm / Analytics                          | 402x874  | Default | all farmers |
| [`14:6412`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6412)   | Mobile / Farm / Comparison                         | 402x874  | Default | all farmers |
| [`14:6904`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6904)   | Mobile / Farm / Crop Recommendation                | 402x874  | Default | all farmers |
| [`89:1775`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-1775)   | Mobile / Farm / Health Dashboard                   | 402x1332 | Default | all farmers |
| [`89:2006`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2006)   | Mobile / Farm / Overview v2                        | 402x874  | Default | all farmers |
| [`100:1007`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1007) | Mobile / Farm / Predictive Analytics               | 402x1033 | Default | all farmers |
| [`102:1362`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1362) | Mobile / Farm / Soil Analysis v2                   | 402x2035 | Default | all farmers |
| [`102:1932`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1932) | Mobile / Farm / Twin Simulator                     | 402x1567 | Default | all farmers |
| [`102:2635`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2635) | Mobile / Farm / Crop Lifecycle                     | 402x1750 | Default | all farmers |
| [`106:1230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1230) | Mobile / Farm / Map View                           | 402x874  | Default | all farmers |
| [`106:1612`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1612) | Mobile / Farm / Crop Health Map                    | 402x874  | Default | all farmers |
| [`106:1710`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1710) | Mobile / Farm / VRA Map                            | 402x885  | Default | all farmers |
| [`160:1010`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1010) | Mobile / Farm / Livestock - Animal Detail          | 402x874  | Default | all farmers |
| [`160:1094`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1094) | Mobile / Farm / Livestock - Add Animal             | 402x875  | Default | all farmers |
| [`160:1181`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1181) | Mobile / Farm / Livestock - Health Event           | 402x874  | Default | all farmers |
| [`160:1272`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1272) | Mobile / Farm / Inventory - Add Item               | 402x874  | Default | all farmers |
| [`160:1359`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1359) | Mobile / Farm / Inventory - Low Stock Alert        | 402x874  | Default | all farmers |
| [`160:1440`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1440) | Mobile / Farm / IoT - Device Detail                | 402x874  | Default | all farmers |
| [`160:1536`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1536) | Mobile / Farm / IoT - Add Device                   | 402x874  | Default | all farmers |
| [`160:1605`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1605) | Mobile / Farm / IoT - Alerts                       | 402x874  | Default | all farmers |
| [`160:1670`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-1670) | Mobile / Farm / IoT - Drone View                   | 402x874  | Default | all farmers |
| [`160:2115`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2115) | Mobile / Farm / Task Detail - Create               | 402x902  | Default | all farmers |
| [`160:2201`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2201) | Mobile / Farm / Soil Analysis - Add Test           | 402x874  | Default | all farmers |
| [`160:2293`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2293) | Mobile / Farm / Soil Analysis - Results Detail     | 402x982  | Default | all farmers |
| [`160:2379`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2379) | Mobile / Farm / Soil Analysis - Test History       | 402x906  | Default | all farmers |
| [`160:2472`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2472) | Mobile / Farm / Crop Library - Detail              | 402x1009 | Default | all farmers |
| [`160:3619`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3619) | Mobile / Farm / Crop Plan - Create                 | 402x874  | Default | all farmers |
| [`160:3706`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3706) | Mobile / Farm / Digital Twin - Simulation Results  | 402x874  | Default | all farmers |
| [`160:3785`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3785) | Mobile / Farm / Digital Twin - Scenario Comparison | 402x877  | Default | all farmers |

### Mobile / Finance (13)

| Node                                                                                         | Frame                                        | Size     | State   | Persona          |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- | ------- | ---------------- |
| [`27:312`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-312)     | Mobile / Finance / Wallet Transactions       | 402x874  | Default | commercial_admin |
| [`14:3256`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3256)   | Mobile / Finance / Mobile Money              | 402x874  | Default | all farmers      |
| [`14:3347`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3347)   | Mobile / Finance / Insurance                 | 402x874  | Default | all farmers      |
| [`14:3403`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3403)   | Mobile / Finance / Wallet Admin              | 402x874  | Default | commercial_admin |
| [`14:5534`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5534)   | Mobile / Finance / Expense Tracker           | 402x874  | Default | all farmers      |
| [`14:5762`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5762)   | Mobile / Finance / Payment History           | 402x874  | Default | all farmers      |
| [`14:6839`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6839)   | Mobile / Finance / Digital Receipt           | 402x874  | Default | all farmers      |
| [`81:2063`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2063)   | Mobile / Finance / Wallet Payouts            | 402x874  | Default | commercial_admin |
| [`102:1627`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1627) | Mobile / Finance / Tracker v2                | 402x1837 | Default | all farmers      |
| [`160:2590`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2590) | Mobile / Finance / Insurance - Policy Detail | 402x874  | Default | all farmers      |
| [`160:2677`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2677) | Mobile / Finance / Insurance - File Claim    | 402x874  | Default | all farmers      |
| [`160:2756`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2756) | Mobile / Finance / Insurance - My Policies   | 402x874  | Default | all farmers      |
| [`160:4230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4230) | Mobile / Finance / Wallet - Payout Approval  | 402x874  | Default | commercial_admin |

### Mobile / Market (17)

| Node                                                                                         | Frame                                           | Size     | State   | Persona                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- | ------- | ---------------------------------- |
| [`14:2835`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2835)   | Mobile / Market / Marketplace Browse            | 402x874  | Default | all farmers                        |
| [`14:2920`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2920)   | Mobile / Market / Listing Detail                | 402x874  | Default | all farmers                        |
| [`14:2993`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2993)   | Mobile / Market / Contracts List                | 402x874  | Default | all farmers                        |
| [`14:3082`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3082)   | Mobile / Market / Contract Detail               | 402x874  | Default | all farmers                        |
| [`14:3476`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3476)   | Mobile / Market / Input Supply                  | 402x874  | Default | all farmers                        |
| [`14:5849`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5849)   | Mobile / Market / Contract Negotiation          | 402x874  | Default | all farmers                        |
| [`14:6498`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6498)   | Mobile / Market / Trends                        | 402x874  | Default | all farmers                        |
| [`14:6766`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6766)   | Mobile / Market / Supply Chain                  | 402x874  | Default | all farmers                        |
| [`100:1132`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=100-1132) | Mobile / Market / Buyer Dashboard               | 402x1061 | Default | agribusiness (buyer)               |
| [`102:2118`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2118) | Mobile / Market / Browse v2                     | 402x1758 | Default | all farmers                        |
| [`106:1926`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1926) | Mobile / Market / Seller Dashboard              | 402x1300 | Default | farmer (seller)                    |
| [`108:1382`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1382) | Mobile / Market / Input Supplier Dashboard      | 402x1026 | Default | input supplier (no canonical role) |
| [`108:1502`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1502) | Mobile / Market / Order Management              | 402x874  | Default | all farmers                        |
| [`160:2843`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2843) | Mobile / Market / Input Supply - Product Detail | 402x874  | Default | all farmers                        |
| [`160:2924`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-2924) | Mobile / Market / Input Supply - Cart Order     | 402x874  | Default | all farmers                        |
| [`160:3888`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3888) | Mobile / Market / Contract - Create             | 402x874  | Default | all farmers                        |
| [`160:3978`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-3978) | Mobile / Market / Contract - Milestones         | 402x874  | Default | all farmers                        |

### Mobile / Onboarding (12)

| Node                                                                                         | Frame                                        | Size     | State   | Persona      |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- | ------- | ------------ |
| [`14:4109`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4109)   | Mobile / Onboarding / Farm Setup             | 402x1229 | Default | all farmers  |
| [`14:4159`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4159)   | Mobile / Onboarding / Tutorial Welcome       | 402x874  | Default | all farmers  |
| [`24:2718`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-2718)   | Mobile / Onboarding / Completion             | 402x874  | Default | all farmers  |
| [`40:1089`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=40-1089)   | Mobile / Onboarding / ID Verification        | 402x874  | Default | all farmers  |
| [`40:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=40-1134)   | Mobile / Onboarding / Agro ID Welcome        | 402x874  | Default | all farmers  |
| [`57:1210`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1210)   | Mobile / Onboarding / Personalization Bridge | 402x874  | Default | all farmers  |
| [`81:2434`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2434)   | Mobile / Onboarding / Business Verification  | 402x874  | Default | agribusiness |
| [`81:2495`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2495)   | Mobile / Onboarding / Verification Pending   | 402x874  | Default | all farmers  |
| [`106:1004`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1004) | Mobile / Onboarding / Welcome                | 402x874  | Default | all farmers  |
| [`106:1045`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1045) | Mobile / Onboarding / Sign Up                | 402x874  | Default | all farmers  |
| [`106:2059`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-2059) | Mobile / Onboarding / OTP Verify             | 402x874  | Default | all farmers  |
| [`108:1002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1002) | Mobile / Onboarding / Role Select            | 402x874  | Default | all farmers  |

### Mobile / Profile (8)

| Node                                                                                         | Frame                                  | Size     | State   | Persona     |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | -------- | ------- | ----------- |
| [`24:3055`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3055)   | Mobile / Profile / Edit Profile        | 402x957  | Default | all farmers |
| [`24:3151`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=24-3151)   | Mobile / Profile / KYC Verification    | 402x1065 | Default | all farmers |
| [`27:138`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-138)     | Mobile / Profile / Premium Upgrade     | 402x874  | Default | all farmers |
| [`14:1702`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1702)   | Mobile / Profile / Overview            | 402x874  | Default | all farmers |
| [`81:1940`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-1940)   | Mobile / Profile / Agro ID Card        | 402x944  | Default | all farmers |
| [`108:1715`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1715) | Mobile / Profile / Settings            | 402x1263 | Default | all farmers |
| [`108:1852`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1852) | Mobile / Profile / Help                | 402x874  | Default | all farmers |
| [`160:4166`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4166) | Mobile / Profile / Agro ID - QR Export | 402x874  | Default | all farmers |

### Mobile / Scan (5)

| Node                                                                                       | Frame                             | Size    | State   | Persona     |
| ------------------------------------------------------------------------------------------ | --------------------------------- | ------- | ------- | ----------- |
| [`20:265`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-265)   | Mobile / Scan / Camera Permission | 402x874 | Default | all farmers |
| [`20:304`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-304)   | Mobile / Scan / Camera Active     | 402x874 | Default | all farmers |
| [`20:342`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-342)   | Mobile / Scan / Results           | 402x874 | Default | all farmers |
| [`14:1587`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1587) | Mobile / Scan / Crop Scan         | 402x874 | Default | all farmers |
| [`14:5321`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5321) | Mobile / Scan / Crop Analysis     | 402x874 | Default | all farmers |

### Mobile / Settings (9)

| Node                                                                                         | Frame                                  | Size     | State   | Persona          |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | -------- | ------- | ---------------- |
| [`27:230`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=27-230)     | Mobile / Settings / Legal & Privacy    | 402x874  | Default | all farmers      |
| [`14:4785`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4785)   | Mobile / Settings / Preferences        | 402x874  | Default | all farmers      |
| [`14:4854`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4854)   | Mobile / Settings / Offline Mode       | 402x874  | Default | all farmers      |
| [`14:4921`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4921)   | Mobile / Settings / Help & Support     | 402x874  | Default | all farmers      |
| [`14:6333`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6333)   | Mobile / Settings / Data Export        | 402x874  | Default | all farmers      |
| [`14:6992`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-6992)   | Mobile / Settings / Emergency Contacts | 402x874  | Default | all farmers      |
| [`81:2539`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=81-2539)   | Mobile / Settings / AI Admin           | 402x874  | Default | commercial_admin |
| [`89:2171`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=89-2171)   | Mobile / Settings / Notifications v2   | 402x874  | Default | all farmers      |
| [`102:2806`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-2806) | Mobile / Settings / Profile v2         | 402x1804 | Default | all farmers      |

### Mobile / Soko (13)

| Node                                                                                       | Frame                             | Size    | State   | Persona         |
| ------------------------------------------------------------------------------------------ | --------------------------------- | ------- | ------- | --------------- |
| [`53:528`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-528)   | Mobile / Soko / Search            | 402x874 | Default | all farmers     |
| [`53:623`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-623)   | Mobile / Soko / Product Detail    | 402x874 | Default | all farmers     |
| [`53:680`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-680)   | Mobile / Soko / Make Offer        | 402x874 | Default | all farmers     |
| [`53:725`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-725)   | Mobile / Soko / Offer Sent        | 402x874 | Default | all farmers     |
| [`53:769`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-769)   | Mobile / Soko / My Offers         | 402x874 | Default | all farmers     |
| [`53:847`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-847)   | Mobile / Soko / Order Tracking    | 402x874 | Default | all farmers     |
| [`53:913`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-913)   | Mobile / Soko / Price Alerts      | 402x874 | Default | all farmers     |
| [`53:975`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-975)   | Mobile / Soko / Seller Profile    | 402x874 | Default | farmer (seller) |
| [`57:834`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-834)   | Mobile / Soko / Seller Dashboard  | 402x874 | Default | farmer (seller) |
| [`57:916`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-916)   | Mobile / Soko / Create Listing    | 402x874 | Default | all farmers     |
| [`57:986`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-986)   | Mobile / Soko / Seller Offers     | 402x874 | Default | farmer (seller) |
| [`57:1066`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1066) | Mobile / Soko / Order Fulfillment | 402x874 | Default | all farmers     |
| [`57:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=57-1134) | Mobile / Soko / Order History     | 402x874 | Default | all farmers     |

### Mobile / Weather (4)

| Node                                                                                         | Frame                            | Size     | State   | Persona     |
| -------------------------------------------------------------------------------------------- | -------------------------------- | -------- | ------- | ----------- |
| [`14:5916`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-5916)   | Mobile / Weather / Alerts        | 402x874  | Default | all farmers |
| [`102:1002`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=102-1002) | Mobile / Weather / Forecast v2   | 402x1931 | Default | all farmers |
| [`108:1134`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=108-1134) | Mobile / Weather / Radar Map     | 402x874  | Default | all farmers |
| [`160:4077`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=160-4077) | Mobile / Weather / Hourly Detail | 402x874  | Default | all farmers |

### State / AI (9)

| Node                                                                                       | Frame                            | Size    | State               | Persona     |
| ------------------------------------------------------------------------------------------ | -------------------------------- | ------- | ------------------- | ----------- |
| [`50:2113`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2113) | State / AI / Processing          | 402x874 | Processing          | all farmers |
| [`50:2179`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2179) | State / AI / High Confidence     | 402x951 | High Confidence     | all farmers |
| [`50:2247`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2247) | State / AI / Low Confidence      | 402x889 | Low Confidence      | all farmers |
| [`50:2309`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2309) | State / AI / Multiple Diagnoses  | 402x874 | Multiple Diagnoses  | all farmers |
| [`50:2388`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2388) | State / AI / No Plant Detected   | 402x874 | No Plant Detected   | all farmers |
| [`50:2448`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2448) | State / AI / Image Blurry        | 402x874 | Image Blurry        | all farmers |
| [`50:2506`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2506) | State / AI / Service Unavailable | 402x874 | Service Unavailable | all farmers |
| [`50:2561`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2561) | State / AI / Followup Chat       | 402x874 | Followup Chat       | all farmers |
| [`50:2632`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2632) | State / AI / Unsupported Crop    | 402x874 | Unsupported Crop    | all farmers |

### State / App (3)

| Node                                                                                     | Frame                            | Size    | State              | Persona     |
| ---------------------------------------------------------------------------------------- | -------------------------------- | ------- | ------------------ | ----------- |
| [`20:542`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-542) | State / App / Network Error      | 402x874 | Network Error      | all farmers |
| [`20:591`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-591) | State / App / Skeleton Loading   | 402x874 | Skeleton Loading   | all farmers |
| [`20:658`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-658) | State / App / Tooltip Onboarding | 402x874 | Tooltip Onboarding | all farmers |

### State / Empty (9)

| Node                                                                                         | Frame                         | Size    | State         | Persona     |
| -------------------------------------------------------------------------------------------- | ----------------------------- | ------- | ------------- | ----------- |
| [`53:1229`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1229)   | State / Empty / No Farms      | 402x874 | No Farms      | all farmers |
| [`53:1282`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1282)   | State / Empty / No Products   | 402x874 | No Products   | all farmers |
| [`53:1335`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1335)   | State / Empty / No History    | 402x874 | No History    | all farmers |
| [`163:1250`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1250) | State / Empty / No Tasks      | 402x874 | No Tasks      | all farmers |
| [`163:1304`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1304) | State / Empty / No Livestock  | 402x874 | No Livestock  | all farmers |
| [`163:1358`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1358) | State / Empty / No Inventory  | 402x874 | No Inventory  | all farmers |
| [`163:1412`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1412) | State / Empty / No Soil Tests | 402x874 | No Soil Tests | all farmers |
| [`163:1468`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1468) | State / Empty / No Contracts  | 402x874 | No Contracts  | all farmers |
| [`163:1522`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1522) | State / Empty / No Insurance  | 402x874 | No Insurance  | all farmers |

### State / Error (1)

| Node                                                                                       | Frame                   | Size    | State   | Persona     |
| ------------------------------------------------------------------------------------------ | ----------------------- | ------- | ------- | ----------- |
| [`53:1388`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1388) | State / Error / Generic | 402x874 | Generic | all farmers |

### State / IoT (2)

| Node                                                                                         | Frame                        | Size    | State          | Persona     |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ------- | -------------- | ----------- |
| [`163:1125`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1125) | State / IoT / No Devices     | 402x874 | No Devices     | all farmers |
| [`163:1181`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=163-1181) | State / IoT / Device Offline | 402x874 | Device Offline | all farmers |

### State / Market (1)

| Node                                                                                     | Frame                  | Size    | State | Persona     |
| ---------------------------------------------------------------------------------------- | ---------------------- | ------- | ----- | ----------- |
| [`20:492`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=20-492) | State / Market / Empty | 402x874 | Empty | all farmers |

### State / Offline (6)

| Node                                                                                       | Frame                           | Size    | State         | Persona     |
| ------------------------------------------------------------------------------------------ | ------------------------------- | ------- | ------------- | ----------- |
| [`50:2945`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-2945) | State / Offline / Banner        | 402x874 | Banner        | all farmers |
| [`50:3027`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3027) | State / Offline / Sync Queue    | 402x874 | Sync Queue    | all farmers |
| [`50:3096`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3096) | State / Offline / Sync Progress | 402x874 | Sync Progress | all farmers |
| [`50:3165`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3165) | State / Offline / Sync Complete | 402x874 | Sync Complete | all farmers |
| [`50:3204`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3204) | State / Offline / Sync Failed   | 402x874 | Sync Failed   | all farmers |
| [`50:3248`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3248) | State / Offline / AI Fallback   | 402x874 | AI Fallback   | all farmers |

### State / Payment (7)

| Node                                                                                       | Frame                          | Size    | State        | Persona     |
| ------------------------------------------------------------------------------------------ | ------------------------------ | ------- | ------------ | ----------- |
| [`50:3386`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3386) | State / Payment / Review       | 402x874 | Review       | all farmers |
| [`50:3483`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3483) | State / Payment / Processing   | 402x874 | Processing   | all farmers |
| [`50:3523`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3523) | State / Payment / Success      | 402x874 | Success      | all farmers |
| [`50:3608`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3608) | State / Payment / Failed       | 402x874 | Failed       | all farmers |
| [`50:3687`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3687) | State / Payment / Pending      | 402x874 | Pending      | all farmers |
| [`50:3781`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3781) | State / Payment / Insufficient | 402x874 | Insufficient | all farmers |
| [`50:3862`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=50-3862) | State / Payment / Refund       | 402x874 | Refund       | all farmers |

### State / Permission (3)

| Node                                                                                       | Frame                              | Size    | State         | Persona     |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ------- | ------------- | ----------- |
| [`53:1444`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1444) | State / Permission / Camera        | 402x874 | Camera        | all farmers |
| [`53:1512`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1512) | State / Permission / Location      | 402x874 | Location      | all farmers |
| [`53:1580`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=53-1580) | State / Permission / Notifications | 402x874 | Notifications | all farmers |

## Superseded frames (excluded from migration)

| Node                                                                                         | Frame                                               |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`14:4058`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4058)   | [v1 - Superseded] Mobile / Onboarding / Role Select |
| [`14:1317`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1317)   | [v1 - Superseded] Mobile / Farm / Overview          |
| [`14:1385`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1385)   | [v1 - Superseded] Mobile / AI / Chat                |
| [`14:1440`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1440)   | [v1 - Superseded] Mobile / Market / Browse          |
| [`14:1518`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-1518)   | [v1 - Superseded] Mobile / Weather / Forecast       |
| [`14:2490`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-2490)   | [v1 - Superseded] Mobile / Farm / Soil Analysis     |
| [`14:3166`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-3166)   | [v1 - Superseded] Mobile / Finance / Tracker        |
| [`14:4709`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=14-4709)   | [v1 - Superseded] Mobile / Settings / Notifications |
| [`106:1092`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=106-1092) | [v1 - Superseded] Mobile / Onboarding / Farm Setup  |

## Components in Figma

| Node                                                                                     | Component    | Code counterpart           |
| ---------------------------------------------------------------------------------------- | ------------ | -------------------------- |
| [`32:97`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=32-97)   | Button       | `components/ui/Button.tsx` |
| [`32:108`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=32-108) | Status Badge | `components/ui/Badge.tsx`  |
| [`32:117`](https://www.figma.com/design/178jR1R7rV98GJzqsYy4Sp/kilimo.ai?node-id=32-117) | Input Field  | `components/ui/Input.tsx`  |

Only 3 component sets exist in Figma (Button, Status Badge, Input Field). The rest of the UI is drawn per screen, so the shared-primitive list in master prompt §10 has to be derived from repeated screen patterns, not from Figma components. No Figma variables are defined (`get_variable_defs` on 14:1245 returned `{}`), so colour/type tokens must be sampled from frames.
