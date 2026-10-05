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
 *
 * AI calls now go through invokeAuthedFunction (JWT-gated). This suite mocks
 * that helper so classification stays independent of auth wiring.
 */
import { FunctionsFetchError, FunctionsRelayError, FunctionsHttpError } from '@supabase/supabase-js';

const mockInvokeAuthed = jest.fn();

jest.mock('../lib/supabase', () => ({
  getSupabase: () => ({}),
  supabase: {},
  invokeAuthedFunction: (...args: unknown[]) => mockInvokeAuthed(...args),
}));

import { chat, diagnoseCropPhoto, AIError } from '../lib/ai';

describe('invokeAI network vs server error classification', () => {
  beforeEach(() => {
    mockInvokeAuthed.mockReset();
  });

  it('classifies a resolved FunctionsFetchError (no connectivity) as kind: network', async () => {
    mockInvokeAuthed.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Failed to fetch')),
    });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a resolved FunctionsRelayError as kind: network', async () => {
    mockInvokeAuthed.mockResolvedValue({ data: null, error: new FunctionsRelayError({}) });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a resolved FunctionsHttpError (valid non-2xx response) as kind: server', async () => {
    mockInvokeAuthed.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({ status: 500 }),
    });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('falls back to kind: server for any other resolved error shape', async () => {
    mockInvokeAuthed.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('classifies not_authenticated as kind: unauthorized', async () => {
    mockInvokeAuthed.mockResolvedValue({
      data: null,
      error: { message: 'not_authenticated', status: 401 },
    });

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('diagnoseCropPhoto preserves kind: network instead of flattening to server', async () => {
    mockInvokeAuthed.mockResolvedValue({
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
