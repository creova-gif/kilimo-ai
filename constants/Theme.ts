/**
 * Kilimo AI — design tokens (v2, derived from Figma "2 · Prototype", file 178jR1R7rV98GJzqsYy4Sp).
 *
 * The Figma file has NO variables, so every value below was measured from real
 * frames (fills, strokes, text nodes, auto-layout gaps/padding, radii, shadows).
 * See docs/kilimo-v2/02_DESIGN/DESIGN_TOKENS.md for the frame id each value came
 * from, the near-duplicate Figma values that were collapsed, and which values
 * are DERIVED (dark mode, AA-safe text colors, pressed states) rather than measured.
 *
 * Public shape of `useTheme()` is unchanged (colors.primary/background/card/text/
 * textMute/border..., spacing, radius, shadows). New keys were added, none removed.
 */
import { useColorScheme } from 'react-native';
import { useKilimoStore } from '../store/useKilimoStore';

// ─── Raw palette ─────────────────────────────────────────────────────────────
export const COLORS = {
  // Brand — Figma "olive / forest" (primary CTA fill, active tab, links)
  brandPrimary: '#3C4A2A', // Figma primary — 63 fills across 28 sampled frames
  brandPrimaryBright: '#9BB96A', // DERIVED dark-mode primary (AA on near-black)
  brandPrimaryDim: '#2F3A21', // DERIVED pressed state (Figma has no pressed frame)
  brandShadow: '#1B2214', // Figma shadow tint (rgba(27,34,20,…) on FAB / cards)
  brandAccent: '#4A5D23', // Figma "olive text": badge text, confidence value, selected border

  // Olive ramp. 50/100/600(=primary)/500(=accent)/900 are Figma; the rest are interpolated.
  green: {
    50: '#F2F5EF', // Figma
    100: '#EBF3E6', // Figma
    200: '#D5E2CA', // derived
    300: '#B0C79C', // derived
    400: '#7E9A5E', // derived
    500: '#4A5D23', // Figma
    600: '#3C4A2A', // Figma (primary)
    700: '#2F3A21', // derived (pressed)
    800: '#232B19', // derived
    900: '#1C2216', // Figma (ink)
  },

  // Neutrals (Figma canvas / surfaces)
  bgLight: '#FBFDF9', // Figma screen bg (auth, scan, weather, settings, states)
  bgLightAlt: '#F2F5EF', // Figma screen bg (dashboard, features hub, field detail) + muted surface
  bgDark: '#0F130B', // DERIVED
  cardLight: '#FFFFFF',
  cardDark: '#171D11', // DERIVED
  ivory: '#F2F5EF',
  charcoalDark: '#0F130B',
  ink: '#1C2216', // Figma primary text (214 text nodes)

  // Slate ladder (kept for legacy consumers; not used by Figma v2)
  slate: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Functional accents (Figma StatusBadge frame 32:108 + Input error 32:117)
  success: '#22D15A', // Figma "live" green (fills; NOT for text on white — 2.0:1)
  warning: '#C27D13', // Figma warning
  error: '#D90429', // Figma destructive / error
  info: '#457B9D', // Figma info
};

// ─── Typography ──────────────────────────────────────────────────────────────
// Family names are the keys registered in app/_layout.tsx useFonts(). NOTE: at time of
// writing that map points these keys at Instrument Sans, while Figma is Inter — see
// DESIGN_TOKENS.md "Open inconsistencies". Tokens are family-agnostic on purpose.
export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export interface TypeRole {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/** Roles measured from Figma text nodes (size / weight / rendered line box). */
export const TYPE = {
  display: { fontFamily: FONT.extrabold, fontSize: 38, lineHeight: 46 }, // 14:3820 splash title
  hero: { fontFamily: FONT.extrabold, fontSize: 28, lineHeight: 34 }, // 14:3917 sign-in title
  h1: { fontFamily: FONT.bold, fontSize: 24, lineHeight: 29 }, // 24:2328, 14:3870 screen titles
  h2: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 27 }, // 20:542 state titles
  title: { fontFamily: FONT.bold, fontSize: 20, lineHeight: 24 }, // 14:2835 header, 14:2549
  h3: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 22 }, // card / nav-bar titles
  button: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 19 }, // primary CTA label
  bodyLg: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 19 }, // input text
  body: { fontFamily: FONT.regular, fontSize: 14, lineHeight: 20 }, // paragraphs (14:20 measured)
  label: { fontFamily: FONT.semibold, fontSize: 14, lineHeight: 17 }, // field labels, list titles
  buttonSm: { fontFamily: FONT.bold, fontSize: 14, lineHeight: 17 }, // secondary CTA label
  small: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 16 },
  caption: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 15 },
  captionStrong: { fontFamily: FONT.semibold, fontSize: 12, lineHeight: 15 },
  micro: { fontFamily: FONT.regular, fontSize: 11, lineHeight: 14 }, // tab labels (98 uses)
  microStrong: { fontFamily: FONT.semibold, fontSize: 11, lineHeight: 14 },
  overline: { fontFamily: FONT.bold, fontSize: 10, lineHeight: 12, letterSpacing: 0.5 },
} as const satisfies Record<string, TypeRole>;
export type TypeRoleName = keyof typeof TYPE;

// ─── Spacing / radius / sizing ───────────────────────────────────────────────
/** Figma auto-layout gaps+paddings: 2 4 6 8 10 12 16 20 24 32 40 (48 kept from legacy). */
export const SPACING = {
  xxs: 2,
  xs: 4,
  xs2: 6,
  sm: 8,
  sm2: 10,
  md: 12,
  lg: 16,
  lg2: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  /** Horizontal screen gutter used by dashboards / lists (Figma p20). */
  gutter: 20,
  /** Horizontal screen gutter used by auth / forms / states (Figma p24). */
  gutterWide: 24,
} as const;

/** Figma corner radii: 4 8 12 16 20 24 100. (Device frame's 44 is intentionally excluded.) */
export const RADIUS = {
  xxs: 4, // verified badge, progress track, skeleton lines
  xs: 8, // status badge (rounded), checkbox, icon wrapper, small logo
  sm: 12, // inputs, list groups, inner banners, secondary buttons (network error)
  md: 16, // cards, alerts, state-screen buttons
  lg: 24, // FAB, center AI tab, large icon wrappers
  xl: 20, // troubleshooting / large tinted cards
  xxl: 32,
  full: 999, // pills, chips, auth CTAs (Figma 100)
} as const;

export const BORDER_WIDTH = { hairline: 1, emphasis: 1.5, strong: 2 } as const;

/** Control heights measured in Figma: 44 (input row / small button), 48 (state buttons), 52 (primary). */
export const SIZES = {
  touchTarget: 44, // WCAG 2.5.5 / iOS HIG minimum
  controlSm: 44,
  controlMd: 48,
  controlLg: 52,
  header: 56,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconHero: 48,
  tabBarIcon: 24,
  centerTabButton: 56,
  avatarMd: 40,
} as const;

// ─── Semantic color sets ─────────────────────────────────────────────────────
const lightColors = {
  // Brand
  primary: COLORS.brandPrimary,
  primaryDim: COLORS.brandPrimaryDim,
  primaryPressed: COLORS.brandPrimaryDim,
  primaryLight: '#EBF3E6',
  primarySoft: '#EBF3E6',
  accent: COLORS.brandAccent,
  onPrimary: '#FFFFFF',
  onError: '#FFFFFF',
  green: COLORS.green,

  // Surfaces
  background: COLORS.bgLight,
  backgroundAlt: COLORS.bgLightAlt,
  card: '#FFFFFF',
  cardSolid: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F5EF',

  // Text
  text: COLORS.ink,
  textMute: '#606C55',
  textOnPrimary: '#FFFFFF',
  textLink: COLORS.brandPrimary,
  textDisabled: '#9AA391', // derived
  placeholder: '#6B7264',

  // Lines
  border: '#E4EADF',
  borderSolid: '#E4EADF',
  borderStrong: '#C5CDB3',
  borderFocus: COLORS.brandPrimary,

  // Nav
  tabBar: '#FFFFFF',
  tabActive: COLORS.brandPrimary,
  tabInactive: '#6B6B70',
  glass: 'rgba(255, 255, 255, 0.88)',
  glow: 'rgba(60, 74, 42, 0.09)',
  slate: COLORS.slate,

  // Disabled controls (Figma Input Field/Disabled 32:115)
  disabledBg: '#F2F5EF',
  disabledBorder: '#E5E7EB',

  // Semantic — solid, soft fill, text-safe (AA) variants
  success: COLORS.success,
  successText: COLORS.brandAccent,
  successSoft: '#EBF3E6',
  successSurface: '#EAF9EC',
  onSuccess: '#172114',
  warning: COLORS.warning,
  warningText: '#9B640F', // derived: Figma #C27D13 is 3.07:1 on its own badge bg
  warningSoft: '#FFF3E1',
  warningSurface: '#FFFBEB',
  warningBorder: '#FF9F0A',
  error: COLORS.error,
  errorText: '#D00427', // derived: Figma #D90429 is 4.23:1 on its own badge bg
  errorSoft: '#FDE0E0',
  errorSurface: '#FFF2F2',
  errorBorder: '#FF3B30',
  info: COLORS.info,
  infoText: '#3F708F', // derived: Figma #457B9D is 3.91:1 on its own badge bg
  infoSoft: '#E0EFF9',
  infoBorder: '#93C5FD',

  // Composite patterns
  alert: {
    danger: { bg: '#FFF2F2', border: '#FF3B30', title: '#D32F2F', action: '#D32F2F' }, // 24:2328 alert-weather
    warning: { bg: '#FFFBEB', border: '#FF9F0A', title: '#A26600', action: '#A06500' }, // 24:2328 alert-pest (title derived AA)
    info: { bg: '#E0EFF9', border: '#93C5FD', title: '#3F708F', action: '#3F708F' }, // derived from 32:108 Info + 93C5FD fills
    success: { bg: '#EAF9EC', border: '#22D15A', title: '#1C2216', action: '#4A5D23' }, // 102:1002 alert-card
  },
  banner: {
    offline: { bg: '#FFFDF0', border: '#F5C242', text: '#936E00', icon: '#A37A00' }, // 50:2945
    caution: { bg: '#FFF9E6', border: '#FFCC00', text: '#7A5C00', icon: '#7A5C00' }, // 50:2247
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.5)',
    control: 'rgba(0, 0, 0, 0.38)',
    controlStrong: 'rgba(0, 0, 0, 0.69)',
    onPrimary: 'rgba(255, 255, 255, 0.13)',
    onPrimaryBorder: 'rgba(255, 255, 255, 0.2)',
    onPrimaryText: 'rgba(255, 255, 255, 0.8)',
  },
  skeleton: { base: '#F2F5EF', strong: '#E4EADF' }, // 20:591
  confidence: {
    track: '#F2F5EF',
    fill: COLORS.brandPrimary,
    value: COLORS.brandAccent,
    lowBg: '#FFEBE6',
    lowText: '#BE2A2A',
  },
  chart: { blue: '#2563EB', amber: '#F59E0B', sky: '#93C5FD' },
};

export type ThemeColors = typeof lightColors;

const darkColors: ThemeColors = {
  primary: COLORS.brandPrimaryBright,
  primaryDim: '#86A557',
  primaryPressed: '#86A557',
  primaryLight: '#2C361F',
  primarySoft: '#2C361F',
  accent: '#B4CF85',
  onPrimary: '#10160A',
  onError: '#10160A',
  green: COLORS.green,

  background: COLORS.bgDark,
  backgroundAlt: '#141A0E',
  card: COLORS.cardDark,
  cardSolid: COLORS.cardDark,
  surface: COLORS.cardDark,
  surfaceMuted: '#1E2617',

  text: '#F2F5EF',
  textMute: '#A3AE96',
  textOnPrimary: '#10160A',
  textLink: COLORS.brandPrimaryBright,
  textDisabled: '#66705C',
  placeholder: '#8F9A83',

  border: '#2C3721',
  borderSolid: '#2C3721',
  borderStrong: '#3A472D',
  borderFocus: COLORS.brandPrimaryBright,

  tabBar: COLORS.cardDark,
  tabActive: COLORS.brandPrimaryBright,
  tabInactive: '#8F9A83',
  glass: 'rgba(23, 29, 17, 0.80)',
  glow: 'rgba(155, 185, 106, 0.14)',
  slate: COLORS.slate,

  disabledBg: '#1E2617',
  disabledBorder: '#2C3721',

  success: '#4ADE80',
  successText: '#4ADE80',
  successSoft: '#1F3C23',
  successSurface: '#16261A',
  onSuccess: '#0F130B',
  warning: '#FBBF24',
  warningText: '#FBBF24',
  warningSoft: '#3B3714',
  warningSurface: '#2A2410',
  warningBorder: '#B7791F',
  error: '#F87171',
  errorText: '#F87171',
  errorSoft: '#3B2A20',
  errorSurface: '#2A1A17',
  errorBorder: '#F87171',
  info: '#7FB3D3',
  infoText: '#7FB3D3',
  infoSoft: '#283530',
  infoBorder: '#3F708F',

  alert: {
    danger: { bg: '#2A1A17', border: '#F87171', title: '#F87171', action: '#F87171' },
    warning: { bg: '#2A2410', border: '#B7791F', title: '#FBBF24', action: '#FBBF24' },
    info: { bg: '#1B2A33', border: '#3F708F', title: '#7FB3D3', action: '#7FB3D3' },
    success: { bg: '#16261A', border: '#4ADE80', title: '#F2F5EF', action: '#4ADE80' },
  },
  banner: {
    offline: { bg: '#2A2410', border: '#B7791F', text: '#FBBF24', icon: '#FBBF24' },
    caution: { bg: '#2A2410', border: '#B7791F', text: '#FBBF24', icon: '#FBBF24' },
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.6)',
    control: 'rgba(0, 0, 0, 0.5)',
    controlStrong: 'rgba(0, 0, 0, 0.75)',
    onPrimary: 'rgba(16, 22, 10, 0.13)',
    onPrimaryBorder: 'rgba(16, 22, 10, 0.2)',
    onPrimaryText: 'rgba(16, 22, 10, 0.8)',
  },
  skeleton: { base: '#1E2617', strong: '#2C3721' },
  confidence: {
    track: '#1E2617',
    fill: COLORS.brandPrimaryBright,
    value: '#B4CF85',
    lowBg: '#3B2A20',
    lowText: '#F87171',
  },
  chart: { blue: '#60A5FA', amber: '#FBBF24', sky: '#93C5FD' },
};

export { lightColors, darkColors };

// ─── Shadows (Figma effects: 0/2/8 .05 card, 0/4/12 .08, 0/8/16 .10, 0/8/16 .25 FAB) ──
function buildShadows(isDark: boolean) {
  const k = isDark ? 3 : 1; // shadows read weaker on dark surfaces
  return {
    none: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05 * k,
      shadowRadius: 8,
      elevation: 1,
    },
    md: {
      shadowColor: COLORS.brandShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08 * k,
      shadowRadius: 12,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1 * k,
      shadowRadius: 16,
      elevation: 4,
    },
    premium: {
      shadowColor: COLORS.brandShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: Math.min(0.25 * (isDark ? 2 : 1), 0.6),
      shadowRadius: 16,
      elevation: 6,
    },
  };
}

/** Pure theme factory — usable in tests / non-React code. */
export function getTheme(isDark: boolean) {
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing: SPACING,
    radius: RADIUS,
    shadows: buildShadows(isDark),
    typography: TYPE,
    fonts: FONT,
    borderWidth: BORDER_WIDTH,
    sizes: SIZES,
  };
}

export type Theme = ReturnType<typeof getTheme>;

export const useTheme = (): Theme => {
  const systemScheme = useColorScheme();
  const themePreference = useKilimoStore((s) => s.themePreference);

  let isDark: boolean;
  if (themePreference === 'dark') {
    isDark = true;
  } else if (themePreference === 'light') {
    isDark = false;
  } else {
    isDark = systemScheme === 'dark';
  }

  return getTheme(isDark);
};
