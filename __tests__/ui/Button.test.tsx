jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui/Button';
import { lightColors } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { darkColors } from '../../constants/Theme';

const flat = (el: any) => StyleSheet.flatten(el.props.style);

describe('Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKilimoStore.setState({ themePreference: 'light' } as any);
  });

  it('renders the passed label and exposes role=button with that accessible name', () => {
    render(<Button label="Jaribu Tena" onPress={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Jaribu Tena' });
    expect(btn).toBeTruthy();
    expect(screen.getByText('Jaribu Tena')).toBeTruthy();
  });

  it('never embeds its own copy (only renders what it is given)', () => {
    render(<Button label="Sasa" />);
    expect(screen.queryAllByText(/.+/).map((n) => n.props.children)).toEqual(['Sasa']);
  });

  it('primary uses the Figma olive fill with white label (32:97)', () => {
    render(<Button label="Go" />);
    const btn = screen.getByRole('button');
    expect(flat(btn).backgroundColor).toBe(lightColors.primary);
    expect(flat(screen.getByText('Go')).color).toBe(lightColors.textOnPrimary);
  });

  it('secondary is white with a 1.5pt olive border and olive label', () => {
    render(<Button label="Go" variant="secondary" />);
    const s = flat(screen.getByRole('button'));
    expect(s.backgroundColor).toBe(lightColors.card);
    expect(s.borderColor).toBe(lightColors.primary);
    expect(s.borderWidth).toBe(1.5);
    expect(flat(screen.getByText('Go')).color).toBe(lightColors.primary);
  });

  it('ghost uses the tinted #EBF3E6 fill from Figma', () => {
    render(<Button label="Go" variant="ghost" />);
    expect(flat(screen.getByRole('button')).backgroundColor).toBe('#EBF3E6');
  });

  it('destructive uses the error fill', () => {
    render(<Button label="Go" variant="destructive" />);
    expect(flat(screen.getByRole('button')).backgroundColor).toBe(lightColors.error);
    expect(flat(screen.getByText('Go')).color).toBe(lightColors.onError);
  });

  it('pill shape is fully rounded, rounded shape is r16', () => {
    const { rerender } = render(<Button label="Go" />);
    expect(flat(screen.getByRole('button')).borderRadius).toBeGreaterThanOrEqual(100);
    rerender(<Button label="Go" shape="rounded" />);
    expect(flat(screen.getByRole('button')).borderRadius).toBe(16);
  });

  it.each(['sm', 'md', 'lg'] as const)('size %s keeps a >= 44pt touch target', (size) => {
    render(<Button label="Go" size={size} />);
    expect(flat(screen.getByRole('button')).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('fires onPress and a haptic when enabled', () => {
    const onPress = jest.fn();
    render(<Button label="Go" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('can turn haptics off', () => {
    render(<Button label="Go" haptics={false} onPress={() => {}} />);
    fireEvent.press(screen.getByRole('button'));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('disabled: no press, accessibilityState.disabled, dimmed', () => {
    const onPress = jest.fn();
    render(<Button label="Go" disabled onPress={onPress} />);
    const btn = screen.getByRole('button');
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(flat(btn).opacity).toBe(0.5);
  });

  it('loading: busy + disabled, hides label text, ignores presses', () => {
    const onPress = jest.fn();
    render(<Button label="Go" loading onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true })
    );
    expect(screen.queryByText('Go')).toBeNull();
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('accessibilityLabel overrides the visible label for screen readers', () => {
    render(<Button label="OK" accessibilityLabel="Confirm payment" />);
    expect(screen.getByRole('button', { name: 'Confirm payment' })).toBeTruthy();
  });

  it('follows dark mode tokens', () => {
    useKilimoStore.setState({ themePreference: 'dark' } as any);
    render(<Button label="Go" />);
    expect(flat(screen.getByRole('button')).backgroundColor).toBe(darkColors.primary);
    expect(flat(screen.getByText('Go')).color).toBe(darkColors.textOnPrimary);
  });
});
