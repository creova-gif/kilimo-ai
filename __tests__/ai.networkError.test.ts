/**
 * scan.tsx branches on AIError.kind === 'network' to offer offline
 * queueing. That branch was unreachable: invokeAI() classified every
 * failure as kind: 'server'.
 *
 * The first attempt at this fix wrapped the invoke() call in try/catch,
 * assuming a connectivity failure makes it reject. It doesn't:
 * FunctionsClient.invoke() (@supabase/functions-js) catches fetch()
 * rejections internally, wraps them as FunctionsFetchError, and *resolves*
 * with `{ data: null, error }` — same shape as FunctionsRelayError (relay
 * couldn't reach the function) and FunctionsHttpError (a valid non-2xx
 * response). A try/catch around invoke() never fires for any of these; only
 * the resolved error's class distinguishes them. These tests pin the real
 * behavior: FunctionsFetchError/FunctionsRelayError -> kind: 'network',
 * FunctionsHttpError (or any other resolved error) -> kind: 'server'.
 */
import { FunctionsFetchError, FunctionsRelayError, FunctionsHttpError } from '@supabase/supabase-js';

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

  it('classifies a resolved FunctionsFetchError (no connectivity) as kind: network', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Failed to fetch')) });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a resolved FunctionsRelayError as kind: network', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsRelayError({}) });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a resolved FunctionsHttpError (valid non-2xx response) as kind: server', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError({ status: 500 }) });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('falls back to kind: server for any other resolved error shape', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('diagnoseCropPhoto preserves kind: network instead of flattening to server', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Network request failed')),
    });

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
