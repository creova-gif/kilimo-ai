---
version: beta-creova
name: CREOVA Luxury Agritech System
description: An organic yet high-tech design language inspired by modern premium mobile UI kits. Centered around deep forest greens, warm cream/ivory, matte blacks, and soft glassmorphism. It represents a premium global product—polished, minimal, cinematic, and emotionally intelligent.
colors:
  primary: "#3C4A2A"
  primary-bright: "#6E8550"
  surface: "#F2F5EF"
  ink: "#1C2216"
  muted: "#606B56"
  border: "#E4EADF"
  primary-soft: "#EBF3E6"
  destructive: "#D90429"
  charcoal: "#080A08"
  cream-warm: "#FAF7F0"
  ivory: "#FCFBF7"
  text-dark: "#1A211C"
  sage-gray: "#65786C"
  sage-slate: "#92A396"
  border-light: "#E6DFD5"
  border-dark: "rgba(58, 141, 82, 0.15)"
---

# CREOVA — Luxury Agritech Design System

## Color System
- **Olive** (`#3C4A2A` light / `#6E8550` dark): the Figma "kilimo.ai" brand colour, adopted 2026-09 (replaces forest `#2E6F40`). Used for primary CTAs, headers, active tabs and highlights. Surface `#F2F5EF`, ink `#1C2216`, muted text `#606B56`, borders `#E4EADF`.
- **Ivory & Cream** (`#FCFBF7` / `#FAF7F0`): Background colors for Light Mode to establish an editorial, warm feeling.
- **Matte Charcoal** (`#080A08`): Deep near-black background for Dark Mode, ensuring high contrast while avoiding absolute blacks.
- **Sage Slate & Sage Gray** (`#92A396` / `#65786C`): Calm, natural green-grays for secondary text and borders.

## Typography
Display text is styled with **Inter** (weights from Medium 500 to Black 900) with compact line-heights and tight tracking on hero sizes. 
UI body elements use Inter at Regular (400) or SemiBold (600) for high legibility.

## Spacing & Geometry
- Spacing is based on a **4px/8px** baseline: 4, 8, 12, 16, 24, 32, 48.
- Border radius values follow a warm, organic scale:
  - Small elements (badges, indicators): `8px`
  - Medium elements (inputs, buttons): `12px`
  - Cards & Scaffolds: `16px` or `24px`
  - Avatars & Pills: `full` (999px)

## Motion & Interaction
All touch actions use native haptics (`Haptics.impactAsync` or `selectionAsync`). Animations are implemented via `react-native-reanimated` with smooth springs and fades. Glassmorphic details are used selectively via `expo-blur`.
