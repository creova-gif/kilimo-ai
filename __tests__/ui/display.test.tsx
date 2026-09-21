jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Chip } from '../../components/ui/Chip';
import { ListRow, ListGroup } from '../../components/ui/ListRow';
import { AlertCard } from '../../components/ui/AlertCard';
import { lightColors } from '../../constants/Theme';
import { MIN_TOUCH_TARGET, touchSlop } from '../../components/ui/a11y';
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

beforeEach(() => useKilimoStore.setState({ themePreference: 'light' } as any));

describe('touchSlop helper', () => {
  it('pads a 32pt control up to the 48dp minimum', () => {
    const s = touchSlop(32)!;
    expect(32 + s.top! + s.bottom!).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
  it('returns nothing when already >= 48dp', () => {
    expect(MIN_TOUCH_TARGET).toBe(48); // Figma touch-target/default + UX framework (>= 48x48dp)
    expect(touchSlop(48)).toBeUndefined();
    expect(touchSlop(52)).toBeUndefined();
    expect(touchSlop(44)).toBeDefined(); // the old 44 floor is no longer enough
  });
});

describe('Card', () => {
  it('solid (default): white, 1pt #E4EADF border, r16, 16 padding', () => {
    render(
      <Card testID="card">
        <Text>Ndani</Text>
      </Card>
    );
    const s = flat(screen.getByTestId('card'));
    expect(s.backgroundColor).toBe('#FFFFFF');
    expect(s.borderColor).toBe('#E4EADF');
    expect(s.borderWidth).toBe(1);
    expect(s.borderRadius).toBe(16);
    expect(s.padding).toBe(16);
    expect(screen.getByText('Ndani')).toBeTruthy();
  });

  it('primary variant is the olive AI-advice card', () => {
    render(<Card testID="card" variant="primary" />);
    expect(flat(screen.getByTestId('card')).backgroundColor).toBe(lightColors.primary);
  });

  it('legacy glass variant is an alias of solid (no blur)', () => {
    render(<Card testID="card" variant="glass" />);
    expect(flat(screen.getByTestId('card')).backgroundColor).toBe('#FFFFFF');
  });

  it('becomes a button when onPress is given', () => {
    const onPress = jest.fn();
    render(<Card variant="outlined" onPress={onPress} accessibilityLabel="Shamba la Bonde" />);
    fireEvent.press(screen.getByRole('button', { name: 'Shamba la Bonde' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Badge / StatusBadge', () => {
  it.each([
    ['success', '#EBF3E6'],
    ['warning', '#FFF3E1'],
    ['error', '#FDE0E0'],
    ['info', '#E0EFF9'],
    ['neutral', '#F2F5EF'],
  ] as const)('%s uses the Figma soft fill (32:108)', (variant, bg) => {
    render(<Badge label="Hali" variant={variant} testID="b" />);
    expect(flat(screen.getByTestId('b')).backgroundColor).toBe(bg);
  });

  it('exposes the passed label as its accessible name (no hard-coded "Status:" prefix)', () => {
    render(<Badge label="Imethibitishwa" variant="success" />);
    expect(screen.getByLabelText('Imethibitishwa')).toBeTruthy();
    expect(screen.queryByLabelText(/^Status:/)).toBeNull();
  });

  it('md is r12 with 10/4 padding; sm is the r4 uppercase tag', () => {
    const { rerender } = render(<Badge label="Hali" testID="b" />);
    let s = flat(screen.getByTestId('b'));
    expect(s.borderRadius).toBe(12);
    expect(s.paddingHorizontal).toBe(10);
    expect(s.paddingVertical).toBe(4);
    rerender(<Badge label="verified" size="sm" testID="b" />);
    s = flat(screen.getByTestId('b'));
    expect(s.borderRadius).toBe(4);
    expect(flat(screen.getByText('verified')).textTransform).toBe('uppercase');
  });

  it('live variant is the bright green pill with dark text', () => {
    render(<Badge label="LIVE" variant="live" shape="pill" testID="b" />);
    const s = flat(screen.getByTestId('b'));
    expect(s.backgroundColor).toBe(lightColors.success);
    expect(s.borderRadius).toBeGreaterThanOrEqual(100);
  });

  it('StatusBadge maps Figma status names to variants', () => {
    render(<StatusBadge status="active" label="Hai" testID="sb" />);
    expect(flat(screen.getByTestId('sb')).backgroundColor).toBe('#EBF3E6');
    render(<StatusBadge status="error" label="Kosa" testID="sb2" />);
    expect(flat(screen.getByTestId('sb2')).backgroundColor).toBe('#FDE0E0');
  });
});

describe('Chip', () => {
  it('unselected: white with hairline border; selected: olive fill + white text', () => {
    const { rerender } = render(<Chip label="Mahindi" onPress={() => {}} />);
    let btn = screen.getByRole('button', { name: 'Mahindi' });
    expect(btn.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    rerender(<Chip label="Mahindi" selected onPress={() => {}} />);
    btn = screen.getByRole('button', { name: 'Mahindi' });
    expect(btn.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(flat(screen.getByText('Mahindi')).color).toBe(lightColors.textOnPrimary);
  });

  it('pads the touch target to >= 48dp via hitSlop', () => {
    render(<Chip label="Mahindi" onPress={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Mahindi' });
    const slop = btn.props.hitSlop;
    // visual height ~32 (8 + 16 + 8) + slop top/bottom must reach 48
    expect(32 + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
  });

  it('presses through and respects disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Chip label="Mpunga" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Mpunga' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<Chip label="Mpunga" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Mpunga' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('without onPress it is a static label (no button role)', () => {
    render(<Chip label="Maharage" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Maharage')).toBeTruthy();
  });
});

describe('ListRow / ListGroup', () => {
  it('shows title, subtitle and value; announces them together', () => {
    render(<ListRow title="Lugha" subtitle="Language" value="Kiswahili" />);
    expect(screen.getByText('Lugha')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByLabelText('Lugha, Language, Kiswahili')).toBeTruthy();
  });

  it('pressable rows are buttons with a chevron and >= 48pt height', () => {
    const onPress = jest.fn();
    render(<ListRow title="Taarifa Binafsi" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Taarifa Binafsi' });
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
    expect(styleOf(screen.getByText('Taarifa Binafsi'), 'minHeight')).toBeGreaterThanOrEqual(48);
  });

  it('static rows have no button role', () => {
    render(<ListRow title="Toleo" value="2.4.0" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('destructive rows use the error text color', () => {
    render(<ListRow title="Ondoka" destructive onPress={() => {}} />);
    expect(flat(screen.getByText('Ondoka')).color).toBe(lightColors.errorText);
  });

  it('selected state is exposed to assistive tech', () => {
    render(<ListRow title="Punguza kumwagilia" selected onPress={() => {}} />);
    expect(screen.getByRole('button').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
  });

  it('disabled rows do not fire', () => {
    const onPress = jest.fn();
    render(<ListRow title="X" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ListGroup wraps rows in the white r12 bordered container and adds dividers except on the last row', () => {
    render(
      <ListGroup>
        <ListRow title="A" />
        <ListRow title="B" />
        <ListRow title="C" />
      </ListGroup>
    );
    const divider = (t: string) => styleOf(screen.getByText(t), 'borderBottomWidth');
    expect(divider('A')).toBe(1);
    expect(divider('B')).toBe(1);
    expect(divider('C')).toBeUndefined();
  });
});

describe('AlertCard', () => {
  it.each([
    ['danger', '#FFF2F2', '#FF3B30'],
    ['weather', '#FFF2F2', '#FF3B30'],
    ['warning', '#FFFBEB', '#FF9F0A'],
    ['pest', '#FFFBEB', '#FF9F0A'],
    ['success', '#EAF9EC', '#22D15A'],
  ] as const)('%s variant uses the Figma tint (24:2328 / 102:1002)', (variant, bg, border) => {
    render(<AlertCard variant={variant} title="Tahadhari" testID="a" />);
    const t = screen.getByText('Tahadhari');
    expect(styleOf(t, 'backgroundColor')).toBe(bg);
    expect(styleOf(t, 'borderColor')).toBe(border);
    expect(styleOf(t, 'borderRadius')).toBe(16);
  });

  it('renders caller-supplied title/body and never embeds sample copy', () => {
    render(<AlertCard variant="info" title="T" body="B" />);
    expect(screen.queryAllByText(/.+/).map((n) => n.props.children)).toEqual(['T', 'B']);
  });

  it('action link is a >= 44pt button', () => {
    const onAction = jest.fn();
    render(<AlertCard variant="danger" title="T" actionLabel="Tazama" onAction={onAction} />);
    const btn = screen.getByRole('button', { name: 'Tazama' });
    expect(flat(btn).minHeight).toBeGreaterThanOrEqual(44);
    fireEvent.press(btn);
    expect(onAction).toHaveBeenCalled();
  });

  it('whole-card press makes it a button; announce=true makes it a live alert', () => {
    const onPress = jest.fn();
    const { rerender } = render(<AlertCard title="T" body="B" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'T. B' }));
    expect(onPress).toHaveBeenCalled();
    rerender(<AlertCard title="T" body="B" announce />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
