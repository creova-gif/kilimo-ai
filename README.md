# Kilimo AI

**An AI-assisted farming companion for East African smallholder farmers — field tracking, market prices, expert consultations, and a voice-driven AI assistant, in one mobile app.**

![Status](https://img.shields.io/badge/status-active_development-yellow)
![License](https://img.shields.io/badge/license-proprietary-red)
![Platform](https://img.shields.io/badge/platform-React_Native_%2F_Expo-blue)

![Kilimo AI onboarding](docs/screenshots/dashboard.png)

## Overview

Kilimo AI is a React Native (Expo) mobile app helping smallholder farmers manage their operations and get expert guidance without leaving their fields.

## Problem

Smallholder farmers in East Africa lack easy access to real-time market pricing, agronomist expertise, and structured record-keeping — information and expertise that exists but is fragmented across phone calls, radio, and informal networks.

## Solution

A single mobile app combining field management, live market listings, agronomist consultations, and a Swahili-aware AI assistant, backed by a real database with row-level security so each farmer's data (income ledger, profile, verification status) is genuinely isolated.

## Key Capabilities

- Field management, farming calendar, contract tracking
- Real market listings (crop name, quantity, price per kg, by region)
- Agronomist consultation flow
- Agro ID — a farmer identity/attestation system, distinct from KYC (see Architecture)
- Voice-driven AI assistant with a Swahili-aware knowledge base (RAG over real agricultural content — pest management, fertilizer guidance, post-harvest storage)
- An income ledger (Agro Ledger) with an aggregated summary that is only readable by the owning farmer

## Architecture

Supabase (Postgres, Auth, Edge Functions) backend with real, enforced RLS on every business table. Two identity flows exist with deliberately distinct semantics — do not conflate them:

- **Home Activation** mints an Agro ID; `pending` means a local retry state, resolved immediately once online.
- **KYC** is a genuine backend review process (24–48 hours) for personal/business verification.

The public `verify-agro-id` endpoint is intentionally callable without a session — it returns only non-PII aggregate financial-health bands (e.g. "healthy," "building"), never raw amounts.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo), Expo Router |
| Backend | Supabase Edge Functions |
| Database | Supabase Postgres, RLS-enforced, pgvector for RAG |
| Offline sync | Zustand-backed local queue (`lib/offline.ts`) |

## Repository Structure

- `app/` — Expo Router screens (fields, market, AI hub, profile, analytics, contracts, consultations, calendar)
- `components/` — shared UI components
- `lib/offline.ts` — the real offline-sync implementation
- `supabase/migrations/` — 11 migrations, verified applied to the live database

## Getting Started

```bash
npm i
npm run dev        # or: npm run android / npm run ios
```

EAS build scripts are available for device builds (`npm run eas:build:preview`, etc.).

## Testing

`npm run test` (Vitest) + build — part of CI.

## Security

- All business tables (farmer profiles, ledger, market listings, notifications, verification requests) have real RLS policies, not just RLS enabled with no policy.
- Leaked-password-protection is currently disabled in Supabase Auth — a dashboard-only setting, not fixable in code.

## Project Status

Actively developed and genuinely hardened relative to most of this portfolio: a documented anti-fabrication remediation sprint removed fake "Live" status claims, a fake AI header, and a fake device fleet across 10+ merged PRs. The database schema (11 migrations) is confirmed applied and matches what the live application code actually queries. Not yet field-tested with real farmer cohorts at scale.

## Roadmap

- [x] Real database schema applied and RLS-verified
- [x] Anti-fabrication UI remediation
- [x] Offline-first task sync
- [ ] Field testing with real farmer cohorts
- [ ] Leaked-password-protection enabled

## Contributing

See the [org-wide CONTRIBUTING.md](https://github.com/creova-gif/.github/blob/main/CONTRIBUTING.md), including the AI-assisted contribution policy.

## License

Proprietary — © CREOVA. All rights reserved.

## Author / Organization

Built by [Justin Mafie](https://github.com/creova-gif) under CREOVA.

## Documentation

See `CLAUDE.md` for AI-agent-specific notes on the KYC-vs-Agro-ID distinction and which patterns to preserve.
