# 04 — Design Deviations

Every intentional difference from Figma is recorded here, with the reason. Anything not listed should match Figma.

## Tokens

| #   | Figma                                         | Code                                                | Reason                                                                                                                                                                                                  |
| --- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Secondary text `#6B7760` / `#717D6E`          | `textMute` = `#606B56`                              | Figma values are 4.3:1 on surface/white and fail WCAG AA for small text. `#606B56` (also used in Figma) is 5.1:1 on surface and 5.6:1 on white.                                                         |
| D2  | Bright green `#22D15A` used as text in places | Allowed for dots/fills only                         | 2.0:1 on white as text.                                                                                                                                                                                 |
| D3  | No dark-mode frames                           | Dark primary `#6E8550`                              | No Figma source. White text on it is 4.1:1, the same trade-off as the previous `#3A8D52`. **A11y debt:** add an `onPrimary` token (dark ink in dark mode) so primary buttons reach 4.5:1 in both modes. |
| D4  | No Figma variables defined                    | Tokens sampled from frames 14:1245, 102:2118, 32:97 | Ask the designer to publish variables so tokens can be synced instead of sampled.                                                                                                                       |

## Typography

| #   | Figma      | Code                                                                         | Reason / plan                                                                                                                                          |
| --- | ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | Inter only | Inter (real files since `968f0a1`) **plus** Instrument Serif on 207 headings | Serif headings are pre-Figma styling; replace per screen during Phase D (not aliased globally so the size/weight of each heading can be set properly). |

## Components

| #   | Figma                                             | Code                  | Reason                                                                                                                          |
| --- | ------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Button: Primary / Secondary / Ghost / Destructive | Same four + `outline` | `outline` is part of the existing Button API (no screen uses it today); kept as a neutral bordered variant rather than removed. |

## Navigation

| #   | Figma                                                 | Code                                          | Reason                                                |
| --- | ----------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| N1  | Soko tab shown to everyone                            | Hidden for roles without `marketplace` access | Role matrix in `lib/access.tsx` (extension officers). |
| N2  | Centre leaf button target unknown (no prototype link) | Opens Features hub                            | Existing behaviour kept until the designer confirms.  |

## Auth

| #   | Figma                                        | Code      | Reason                             |
| --- | -------------------------------------------- | --------- | ---------------------------------- |
| A1  | Password sign-in, reset, new-password frames | Not built | Owner decision C2: phone OTP only. |
