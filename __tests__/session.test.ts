import { signOutEverywhere } from '../lib/session';

function deps(over: Partial<Parameters<typeof signOutEverywhere>[0]> = {}) {
  const calls: string[] = [];
  const client = {
    auth: {
      signOut: jest.fn(async () => {
        calls.push('remote');
        return { error: null };
      }),
      stopAutoRefresh: jest.fn(() => calls.push('stopRefresh')),
    },
  };
  return {
    calls,
    client,
    d: {
      client,
      removePersistedSession: jest.fn(async () => void calls.push('removePersisted')),
      clearLegacyToken: jest.fn(async () => void calls.push('clearLegacy')),
      clearUserData: jest.fn(() => void calls.push('clearUser')),
      ...over,
    } as Parameters<typeof signOutEverywhere>[0],
  };
}

describe('signOutEverywhere', () => {
  it('revokes on the server AND clears local session + user data when online', async () => {
    const { d, calls } = deps();
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: true });
    expect(calls).toEqual(['remote', 'stopRefresh', 'removePersisted', 'clearLegacy', 'clearUser']);
  });

  it('OFFLINE: still removes the persisted session and clears data (no zombie session at next launch)', async () => {
    const { d, client, calls } = deps();
    client.auth.signOut.mockResolvedValue({ error: { message: 'Network request failed' } });
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.removePersistedSession).toHaveBeenCalled();
    expect(d.clearUserData).toHaveBeenCalled();
    expect(calls).toContain('removePersisted');
  });

  it('a THROWN network error is handled the same way', async () => {
    const { d, client } = deps();
    client.auth.signOut.mockRejectedValue(new Error('boom'));
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.clearUserData).toHaveBeenCalled();
  });

  it('works with no backend configured (client null)', async () => {
    const { d } = deps({ client: null });
    await expect(signOutEverywhere(d)).resolves.toEqual({ revokedRemotely: false });
    expect(d.removePersistedSession).toHaveBeenCalled();
    expect(d.clearUserData).toHaveBeenCalled();
  });

  it('clears user data even if removing the persisted session throws', async () => {
    const { d } = deps({
      removePersistedSession: jest.fn(async () => {
        throw new Error('keychain locked');
      }),
    });
    await signOutEverywhere(d);
    expect(d.clearUserData).toHaveBeenCalled();
  });
});
