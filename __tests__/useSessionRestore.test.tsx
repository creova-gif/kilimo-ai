jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const setBackend = (c: any) => {
  (global as any).__TEST_SUPABASE__ = c;
};
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useSessionRestore } from '../hooks/useSessionRestore';
import { useKilimoStore } from '../store/useKilimoStore';

function backend(opts: { session: boolean; agro?: any; farm?: any }) {
  return {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: opts.session ? { user: { id: 'u1' } } : null } }) },
    rpc: jest.fn().mockResolvedValue({ data: opts.agro ?? null, error: null }),
    from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: opts.farm ?? null, error: null }) }) }),
  };
}

beforeEach(() => {
  useKilimoStore.setState({ agroId: null, isAuthenticated: false, onboardingComplete: false, farmProfile: null });
});

describe('useSessionRestore', () => {
  it('restores identity + farm from the server when a session exists and the account is real', async () => {
    setBackend(backend({ session: true, agro: { id: 'AGRO-1', name: 'Amara', role: 'farmer', location: 'Arusha', verificationStatus: 'pending' }, farm: { region: 'Arusha', primary_crops: ['Mpunga (Rice)'], farm_size_acres: 2 } }));
    renderHook(() => useSessionRestore());
    await waitFor(() => expect(useKilimoStore.getState().isAuthenticated).toBe(true));
    const s = useKilimoStore.getState();
    expect(s.agroId?.id).toBe('AGRO-1');
    expect(s.agroId?.name).toBe('Amara');
    expect(s.farmProfile?.region).toBe('Arusha');
    expect(s.onboardingComplete).toBe(true);
  });

  it('does NOT sign the user in when the server has no account (leftover Keychain session)', async () => {
    setBackend(backend({ session: true }));
    renderHook(() => useSessionRestore());
    await new Promise((r) => setTimeout(r, 30));
    expect(useKilimoStore.getState().isAuthenticated).toBe(false);
    expect(useKilimoStore.getState().agroId).toBeNull();
  });

  it('does nothing without a session', async () => {
    const b = backend({ session: false });
    setBackend(b);
    renderHook(() => useSessionRestore());
    await new Promise((r) => setTimeout(r, 30));
    expect(b.rpc).not.toHaveBeenCalled();
    expect(useKilimoStore.getState().isAuthenticated).toBe(false);
  });

  it('does nothing when the backend is not configured', async () => {
    setBackend(null);
    renderHook(() => useSessionRestore());
    await new Promise((r) => setTimeout(r, 30));
    expect(useKilimoStore.getState().isAuthenticated).toBe(false);
  });

  it('leaves an already-signed-in user untouched (no extra network call)', async () => {
    const b = backend({ session: true, agro: { id: 'X', verificationStatus: 'unverified' } });
    setBackend(b);
    useKilimoStore.setState({ isAuthenticated: true, onboardingComplete: true });
    renderHook(() => useSessionRestore());
    await new Promise((r) => setTimeout(r, 30));
    expect(b.auth.getSession).not.toHaveBeenCalled();
  });
});
