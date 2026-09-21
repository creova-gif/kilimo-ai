jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: jest.fn(() => false) }));

import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { SkeletonBlock, SkeletonGroup } from '../../components/ui/SkeletonBlock';
import { ConfidenceMeter } from '../../components/ui/ConfidenceMeter';
import { AppText } from '../../components/ui/AppText';
import { getTabBarScreenOptions, TabBarCenterButton } from '../../components/ui/tabBar';
import { getTheme, lightColors } from '../../constants/Theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useKilimoStore } from '../../store/useKilimoStore';

const flat = (el: any) => StyleSheet.flatten(el.props.style);

// Find a style prop by climbing from a host node to the nearest ancestor that sets it.
function styleOf(el: any, key: string) {
  for (let n = el; n; n = n.parent) {
    const v = StyleSheet.flatten(n.props?.style)?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

beforeEach(() => {
  useKilimoStore.setState({ themePreference: 'light' } as any);
  (useReducedMotion as jest.Mock).mockReturnValue(false);
});

describe('ScreenHeader', () => {
  it('nav variant: title is a header; no back button unless requested', () => {
    render(<ScreenHeader title="Ripoti ya Uchunguzi" />);
    expect(screen.getByRole('header')).toBeTruthy();
    expect(screen.getByText('Ripoti ya Uchunguzi')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('back button uses the caller-provided label, fires onBack, and has a 44pt hit area', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="T" showBack onBack={onBack} backLabel="Rudi" />);
    const back = screen.getByRole('button', { name: 'Rudi' });
    expect(flat(back).width).toBeGreaterThanOrEqual(44);
    expect(flat(back).height).toBeGreaterThanOrEqual(44);
    fireEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('large variant shows overline above a 24pt title and a trailing slot', () => {
    render(
      <ScreenHeader
        variant="large"
        overline="Habari"
        title="Ijumaa"
        trailing={<Text>trail</Text>}
      />
    );
    expect(screen.getByText('Habari')).toBeTruthy();
    expect(flat(screen.getByText('Ijumaa')).fontSize).toBe(24);
    expect(screen.getByText('trail')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders caller copy and a 120pt tinted circle for the icon', () => {
    render(
      <EmptyState
        testID="empty"
        icon={<Text>icon</Text>}
        title="Bado Huna Shamba"
        description="Ongeza shamba lako"
      />
    );
    expect(screen.getByText('Bado Huna Shamba')).toBeTruthy();
    expect(screen.getByText('Ongeza shamba lako')).toBeTruthy();
    const icon = screen.getByText('icon');
    expect(styleOf(icon, 'width')).toBe(120);
    expect(styleOf(icon, 'backgroundColor')).toBe(lightColors.primarySoft);
  });

  it('primary and secondary actions are buttons and fire', () => {
    const a = jest.fn();
    const b = jest.fn();
    render(
      <EmptyState
        title="T"
        actionLabel="Ongeza"
        onAction={a}
        secondaryActionLabel="Baadaye"
        onSecondaryAction={b}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'Ongeza' }));
    fireEvent.press(screen.getByRole('button', { name: 'Baadaye' }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('renders no buttons when no action is provided', () => {
    render(<EmptyState title="T" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('is announced as an alert, shows code, and retry fires', () => {
    const onRetry = jest.fn();
    render(
      <ErrorState
        title="Hitilafu Imetokea"
        description="Jaribu tena baadaye"
        code="Kosa: ERR-500"
        retryLabel="Jaribu Tena"
        onRetry={onRetry}
      />
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Kosa: ERR-500')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Jaribu Tena' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('secondary action renders when provided, retry hidden without a handler', () => {
    const onSecondary = jest.fn();
    render(
      <ErrorState title="T" retryLabel="Retry" secondaryLabel="Report" onSecondary={onSecondary} />
    );
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Report' }));
    expect(onSecondary).toHaveBeenCalled();
  });

  it('uses the danger-tinted circle', () => {
    render(<ErrorState title="T" icon={<Text>x</Text>} />);
    expect(styleOf(screen.getByText('x'), 'backgroundColor')).toBe(lightColors.errorSurface);
  });
});

describe('OfflineBanner', () => {
  it('shows the message as a polite live alert with the Figma amber strip', () => {
    render(<OfflineBanner message="Huna Mtandao" />);
    const msg = screen.getByRole('alert');
    expect(msg.props.accessibilityLiveRegion).toBe('polite');
    expect(styleOf(msg, 'backgroundColor')).toBe('#FFFDF0');
    expect(styleOf(msg, 'borderBottomColor')).toBe('#F5C242');
    expect(styleOf(msg, 'minHeight')).toBeGreaterThanOrEqual(36);
    expect(screen.getByText('Huna Mtandao')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    render(<OfflineBanner message="Huna Mtandao" visible={false} />);
    expect(screen.queryByText('Huna Mtandao')).toBeNull();
  });

  it('optional action is a >= 44pt button', () => {
    const onAction = jest.fn();
    render(<OfflineBanner message="M" actionLabel="Angalia" onAction={onAction} />);
    const btn = screen.getByRole('button', { name: 'Angalia' });
    expect(flat(btn).minHeight).toBeGreaterThanOrEqual(44);
    fireEvent.press(btn);
    expect(onAction).toHaveBeenCalled();
  });
});

describe('SkeletonBlock', () => {
  it('is decorative (hidden from screen readers) and sized/colored from tokens', () => {
    render(<SkeletonBlock width={100} height={24} tone="strong" />);
    const b = screen.getByTestId('skeleton-block', { includeHiddenElements: true });
    expect(b.props.accessibilityElementsHidden).toBe(true);
    const s = flat(b);
    expect(s.width).toBe(100);
    expect(s.height).toBe(24);
    expect(s.backgroundColor).toBe(lightColors.skeleton.strong);
    expect(s.borderRadius).toBe(4);
  });

  it('circle radius is half the height', () => {
    render(<SkeletonBlock width={40} height={40} radius="circle" />);
    expect(
      flat(screen.getByTestId('skeleton-block', { includeHiddenElements: true })).borderRadius
    ).toBe(20);
  });

  it('animates by default and holds still under Reduce Motion', () => {
    const loopSpy = jest.spyOn(Animated, 'loop');
    render(<SkeletonBlock />);
    expect(loopSpy).toHaveBeenCalledTimes(1);

    loopSpy.mockClear();
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(<SkeletonBlock />);
    expect(loopSpy).not.toHaveBeenCalled();
    loopSpy.mockRestore();
  });

  it('SkeletonGroup announces one busy progressbar with the given label', () => {
    render(
      <SkeletonGroup label="Inapakia">
        <SkeletonBlock />
      </SkeletonGroup>
    );
    const g = screen.getByRole('progressbar', { name: 'Inapakia' });
    expect(g.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
  });
});

describe('ConfidenceMeter', () => {
  it('exposes a progressbar with min/max/now and the value text', () => {
    render(<ConfidenceMeter value={87} label="Uhakika wa AI" />);
    const m = screen.getByRole('progressbar', { name: 'Uhakika wa AI' });
    expect(m.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 87, text: '87%' });
    expect(screen.getByText('87%')).toBeTruthy();
  });

  it('fill width tracks the value and is clamped to 0-100', () => {
    const { rerender } = render(<ConfidenceMeter value={42} />);
    expect(flat(screen.getByTestId('confidence-fill')).width).toBe('42%');
    rerender(<ConfidenceMeter value={250} />);
    expect(flat(screen.getByTestId('confidence-fill')).width).toBe('100%');
    rerender(<ConfidenceMeter value={-5} />);
    expect(flat(screen.getByTestId('confidence-fill')).width).toBe('0%');
  });

  it('low treatment is opt-in (explicit or via threshold); no built-in threshold', () => {
    const { rerender } = render(<ConfidenceMeter value={10} />);
    expect(flat(screen.getByTestId('confidence-fill')).backgroundColor).toBe(
      lightColors.confidence.fill
    );
    rerender(<ConfidenceMeter value={10} lowThreshold={50} />);
    expect(flat(screen.getByTestId('confidence-fill')).backgroundColor).toBe(lightColors.error);
    rerender(<ConfidenceMeter value={90} lowThreshold={50} />);
    expect(flat(screen.getByTestId('confidence-fill')).backgroundColor).toBe(
      lightColors.confidence.fill
    );
    rerender(<ConfidenceMeter value={90} low />);
    expect(flat(screen.getByTestId('confidence-fill')).backgroundColor).toBe(lightColors.error);
  });

  it('lets callers localize the value text and its spoken form', () => {
    render(<ConfidenceMeter value={87} valueText="87 %" accessibilityValueText="asilimia 87" />);
    const m = screen.getByRole('progressbar');
    expect(m.props.accessibilityValue.text).toBe('asilimia 87');
    expect(screen.getByText('87 %')).toBeTruthy();
  });
});

describe('AppText', () => {
  it('applies the type role and tone tokens', () => {
    render(<AppText variant="h1">Habari</AppText>);
    const s = flat(screen.getByText('Habari'));
    expect(s.fontSize).toBe(24);
    expect(s.lineHeight).toBe(29);
    expect(s.color).toBe(lightColors.text);
  });

  it('muted tone + uppercase', () => {
    render(
      <AppText variant="caption" tone="muted" uppercase>
        eyebrow
      </AppText>
    );
    const s = flat(screen.getByText('eyebrow'));
    expect(s.color).toBe(lightColors.textMute);
    expect(s.textTransform).toBe('uppercase');
  });
});

describe('tab bar helpers', () => {
  it('maps Figma bottom-nav tokens to Tabs screenOptions', () => {
    const o = getTabBarScreenOptions(getTheme(false), { bottomInset: 20 });
    expect(o.tabBarActiveTintColor).toBe('#3C4A2A');
    expect(o.tabBarInactiveTintColor).toBe('#6B6B70');
    expect(o.tabBarStyle.backgroundColor).toBe('#FFFFFF');
    expect(o.tabBarStyle.borderTopColor).toBe('#E4EADF');
    expect(o.tabBarStyle.paddingBottom).toBe(20);
    expect(o.tabBarItemStyle.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('center AI button is a labelled 56pt button', () => {
    const onPress = jest.fn();
    render(
      <TabBarCenterButton accessibilityLabel="Uliza AI" onPress={onPress}>
        <Text>leaf</Text>
      </TabBarCenterButton>
    );
    const b = screen.getByRole('button', { name: 'Uliza AI' });
    expect(flat(b).width).toBe(56);
    expect(flat(b).borderRadius).toBe(24);
    fireEvent.press(b);
    expect(onPress).toHaveBeenCalled();
  });
});
