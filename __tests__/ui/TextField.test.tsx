jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../../components/ui/TextField';
import { Input } from '../../components/ui/Input';
import { lightColors } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';

// Find a style prop by climbing from a host node to the nearest ancestor that sets it.
function styleOf(el: any, key: string) {
  for (let n = el; n; n = n.parent) {
    const v = StyleSheet.flatten(n.props?.style)?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}
const field = (key: string) => styleOf(screen.getByLabelText('Namba ya Simu'), key);

describe('TextField', () => {
  beforeEach(() => useKilimoStore.setState({ themePreference: 'light' } as any));

  it('renders the label and labels the input for assistive tech', () => {
    render(<TextField label="Namba ya Simu" placeholder="712 345 678" />);
    expect(screen.getByText('Namba ya Simu')).toBeTruthy();
    expect(screen.getByLabelText('Namba ya Simu')).toBeTruthy();
    expect(screen.getByPlaceholderText('712 345 678')).toBeTruthy();
  });

  it('falls back to the placeholder as accessible name when there is no label', () => {
    render(<TextField placeholder="Tafuta mazao" />);
    expect(screen.getByLabelText('Tafuta mazao')).toBeTruthy();
  });

  it('default state: white fill, 1pt #E4EADF border, r12, >= 48pt tall (Figma 32:117)', () => {
    render(<TextField label="Namba ya Simu" />);
    expect(field('backgroundColor')).toBe(lightColors.card);
    expect(field('borderColor')).toBe('#E4EADF');
    expect(field('borderWidth')).toBe(1);
    expect(field('borderRadius')).toBe(12);
    expect(field('minHeight')).toBeGreaterThanOrEqual(48);
  });

  it('size md is 48pt, lg is 52pt', () => {
    const { rerender } = render(<TextField label="Namba ya Simu" size="md" />);
    expect(field('minHeight')).toBe(48);
    rerender(<TextField label="Namba ya Simu" size="lg" />);
    expect(field('minHeight')).toBe(52);
  });

  it('focus state switches the border to olive and back on blur', () => {
    render(<TextField label="Namba ya Simu" />);
    const input = screen.getByLabelText('Namba ya Simu');
    fireEvent(input, 'focus');
    expect(field('borderColor')).toBe(lightColors.primary);
    fireEvent(input, 'blur');
    expect(field('borderColor')).toBe(lightColors.border);
  });

  it('error state: red border + tinted fill, message announced as an alert, exposed as the hint', () => {
    render(<TextField label="Namba ya Simu" error="Namba si sahihi" />);
    expect(field('borderColor')).toBe(lightColors.error);
    expect(field('backgroundColor')).toBe(lightColors.errorSurface);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Namba si sahihi')).toBeTruthy();
    expect(screen.getByLabelText('Namba ya Simu').props.accessibilityHint).toBe('Namba si sahihi');
  });

  it('shows the hint when there is no error, and hides it when an error appears', () => {
    const { rerender } = render(<TextField label="Namba ya Simu" hint="Anza na 7" />);
    expect(screen.getByText('Anza na 7')).toBeTruthy();
    rerender(<TextField label="Namba ya Simu" hint="Anza na 7" error="Batili" />);
    expect(screen.queryByText('Anza na 7')).toBeNull();
    expect(screen.getByText('Batili')).toBeTruthy();
  });

  it('disabled state: not editable, muted fill, exposes disabled state', () => {
    render(<TextField label="Namba ya Simu" disabled />);
    const input = screen.getByLabelText('Namba ya Simu');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(field('backgroundColor')).toBe(lightColors.disabledBg);
    expect(field('borderColor')).toBe(lightColors.disabledBorder);
  });

  it('forwards text changes and renders leading/trailing icons', () => {
    const onChangeText = jest.fn();
    render(
      <TextField
        label="Namba ya Simu"
        onChangeText={onChangeText}
        leftIcon={<Text>L</Text>}
        rightIcon={<Text>R</Text>}
      />
    );
    fireEvent.changeText(screen.getByLabelText('Namba ya Simu'), '712');
    expect(onChangeText).toHaveBeenCalledWith('712');
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('legacy <Input> import is the same component', () => {
    expect(Input).toBe(TextField);
  });
});
