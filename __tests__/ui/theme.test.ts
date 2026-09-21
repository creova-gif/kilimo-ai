// AsyncStorage is touched at module load by the store's persist middleware.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  getTheme,
  COLORS,
  TYPE,
  SPACING,
  RADIUS,
  lightColors,
  darkColors,
} from '../../constants/Theme';

// WCAG 2.x relative-luminance contrast ratio for 6-digit hex colors.
function lum(hex: string) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('theme tokens', () => {
  it('keeps the legacy useTheme() public shape so existing screens keep compiling', () => {
    const t = getTheme(false);
    for (const key of [
      'primary',
      'primaryDim',
      'primaryLight',
      'green',
      'background',
      'card',
      'cardSolid',
      'text',
      'textMute',
      'border',
      'borderSolid',
      'tabBar',
      'glass',
      'glow',
      'slate',
      'success',
      'warning',
      'error',
      'info',
    ]) {
      expect(t.colors).toHaveProperty(key);
    }
    for (const key of ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'huge'])
      expect(t.spacing).toHaveProperty(key);
    for (const key of ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'])
      expect(t.radius).toHaveProperty(key);
    for (const key of ['sm', 'md', 'lg', 'premium']) expect(t.shadows).toHaveProperty(key);
    expect(t.isDark).toBe(false);
  });

  it('light and dark palettes expose exactly the same keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
    expect(Object.keys(darkColors.alert).sort()).toEqual(Object.keys(lightColors.alert).sort());
  });

  it('matches the values measured from Figma (light)', () => {
    expect(lightColors.primary).toBe('#3C4A2A'); // Button 32:97
    expect(lightColors.text).toBe('#1C2216'); // 214 text nodes
    expect(lightColors.textMute).toBe('#606C55');
    expect(lightColors.border).toBe('#E4EADF');
    expect(lightColors.background).toBe('#FBFDF9');
    expect(lightColors.backgroundAlt).toBe('#F2F5EF');
    expect(lightColors.error).toBe('#D90429'); // Status Badge / Button destructive
    expect(COLORS.warning).toBe('#C27D13');
    expect(COLORS.info).toBe('#457B9D');
    expect(lightColors.errorSoft).toBe('#FDE0E0');
    expect(lightColors.successSoft).toBe('#EBF3E6');
  });

  it('selects palette by mode', () => {
    expect(getTheme(true).colors).toBe(darkColors);
    expect(getTheme(false).colors).toBe(lightColors);
    expect(getTheme(true).colors.background).not.toBe(getTheme(false).colors.background);
  });

  it('has coherent scales', () => {
    expect(SPACING.sm).toBe(8);
    expect(SPACING.lg).toBe(16);
    expect(RADIUS.md).toBe(16);
    expect(RADIUS.sm).toBe(12);
    expect(RADIUS.full).toBeGreaterThanOrEqual(100);
    for (const [name, role] of Object.entries(TYPE)) {
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize);
      expect(role.fontFamily).toMatch(/^Inter_/);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  describe.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)('%s text contrast (WCAG AA 4.5:1)', (_mode, c) => {
    const solid = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
    it.each([
      ['text on background', c.text, c.background],
      ['text on card', c.text, c.card],
      ['textMute on background', c.textMute, c.background],
      ['textMute on card', c.textMute, c.card],
      ['textMute on surfaceMuted', c.textMute, c.surfaceMuted],
      ['onPrimary on primary', c.textOnPrimary, c.primary],
      ['onError on error', c.onError, c.error],
      ['onSuccess on success', c.onSuccess, c.success],
      ['tabInactive on tabBar', c.tabInactive, c.tabBar],
      ['successText on successSoft', c.successText, c.successSoft],
      ['warningText on warningSoft', c.warningText, c.warningSoft],
      ['errorText on errorSoft', c.errorText, c.errorSoft],
      ['infoText on infoSoft', c.infoText, c.infoSoft],
      ['alert.danger.title on bg', c.alert.danger.title, c.alert.danger.bg],
      ['alert.warning.title on bg', c.alert.warning.title, c.alert.warning.bg],
      ['alert.info.title on bg', c.alert.info.title, c.alert.info.bg],
      ['banner.offline text on bg', c.banner.offline.text, c.banner.offline.bg],
      ['banner.caution text on bg', c.banner.caution.text, c.banner.caution.bg],
      ['confidence.lowText on lowBg', c.confidence.lowText, c.confidence.lowBg],
      ['errorText on errorSurface', c.errorText, c.errorSurface],
    ])('%s', (_name, fg, bg) => {
      expect(solid(fg)).toBe(true);
      expect(solid(bg)).toBe(true);
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
