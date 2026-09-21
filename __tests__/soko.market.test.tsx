jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import SokoScreen from '../app/(tabs)/market';
import { useKilimoStore } from '../store/useKilimoStore';

const row = (over: Partial<any> = {}) => ({
  id: 'l1',
  seller_id: 's1',
  crop_name: 'Maize',
  crop_name_sw: 'Mahindi',
  quantity_kg: 500,
  price_per_kg: 480,
  currency: 'TZS',
  location: 'Mbeya',
  quality_grade: 'A',
  status: 'active',
  notes: null,
  contact_phone: null,
  created_at: new Date().toISOString(),
  ...over,
});

function backend(result: { data?: any[]; error?: { message: string } | null }) {
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (res: any) => Promise.resolve(result).then(res);
        return () => builder;
      },
    }
  );
  return { from: () => builder };
}

beforeEach(() => {
  mockPush.mockClear();
  useKilimoStore.setState({ language: 'sw', isOffline: false } as any);
});

describe('Soko discover', () => {
  it('shows an honest EMPTY marketplace (no seed listings) with a way to add one', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ data: [], error: null });
    render(<SokoScreen />);
    expect(await screen.findByText('Hakuna matangazo bado')).toBeTruthy();
    fireEvent.press(screen.getAllByText('Weka tangazo')[0]);
    expect(mockPush).toHaveBeenCalledWith('/soko/create');
    expect(screen.queryByText(/TZS/)).toBeNull(); // no invented prices
  });

  it('renders real listings with localized crop name and price', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ data: [row()], error: null });
    render(<SokoScreen />);
    expect(await screen.findByText('TZS 480/kg')).toBeTruthy();
    expect(screen.getByText('Mbeya', { exact: false })).toBeTruthy();
    expect(screen.getAllByText('Mahindi').length).toBeGreaterThan(0); // Swahili name in SW UI
    fireEvent.press(screen.getByText('TZS 480/kg'));
    expect(mockPush).toHaveBeenCalledWith('/soko/l1');
  });

  it('shows the English crop name when the UI language is English', async () => {
    useKilimoStore.setState({ language: 'en' } as any);
    (global as any).__TEST_SUPABASE__ = backend({ data: [row()], error: null });
    render(<SokoScreen />);
    await screen.findByText('TZS 480/kg');
    expect(screen.getAllByText('Maize').length).toBeGreaterThan(0);
  });

  it('shows an error state with retry when the backend fails (not an empty market)', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ data: undefined, error: { message: 'boom' } });
    render(<SokoScreen />);
    expect(await screen.findByText('Imeshindwa kupakia soko')).toBeTruthy();
    expect(screen.getByText('Jaribu tena')).toBeTruthy();
  });

  it('says the market is unavailable when no backend is configured', async () => {
    (global as any).__TEST_SUPABASE__ = null;
    render(<SokoScreen />);
    await waitFor(() =>
      expect(screen.getByText('Soko halipatikani kwenye kifaa hiki bado.')).toBeTruthy()
    );
  });

  it('shows the offline banner and does not pretend to fetch when offline', async () => {
    useKilimoStore.setState({ isOffline: true } as any);
    (global as any).__TEST_SUPABASE__ = backend({ data: [row()], error: null });
    render(<SokoScreen />);
    expect(await screen.findByText(/nje ya mtandao/)).toBeTruthy();
  });
});
