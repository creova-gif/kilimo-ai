/**
 * scan.tsx branches on AIError.kind === 'network' to offer offline
 * queueing. That branch was unreachable: invokeAI() always classified a
 * failure — including a genuine connectivity loss where
 * supabase.functions.invoke() itself throws — as kind: 'server'. These
 * tests pin the fix: a thrown invoke() rejection must surface as
 * kind: 'network', while a valid non-2xx response still surfaces as
 * kind: 'server'.
 */
jest.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

import { chat, diagnoseCropPhoto, AIError } from '../lib/ai';
import { supabase } from '../lib/supabase';

const invoke = (supabase as any).functions.invoke as jest.Mock;

describe('invokeAI network vs server error classification', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('classifies a thrown invoke() rejection (no connectivity) as kind: network', async () => {
    invoke.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a valid non-2xx response as kind: server, not network', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('diagnoseCropPhoto preserves kind: network instead of flattening to server', async () => {
    invoke.mockRejectedValue(new TypeError('Network request failed'));

    let caught: AIError | null = null;
    try {
      await diagnoseCropPhoto('base64data', { mimeType: 'image/jpeg' });
    } catch (e) {
      caught = e as AIError;
    }

    expect(caught).toBeInstanceOf(AIError);
    expect(caught?.kind).toBe('network');
  });
});
