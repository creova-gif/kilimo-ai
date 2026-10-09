/**
 * CRE-179 / CRE-83 — Rex's ruling: the public verify-agro-id function is
 * fully off for real farmers. 410 Gone, no ledger reads, no flag to re-enable.
 * Browsers get a readable EN/SW page; API clients get JSON.
 */
import fs from 'fs';
import path from 'path';
import {
  HOLD_MESSAGE,
  prefersHtml,
  verifyAgroIdHoldResponse,
} from '../supabase/functions/verify-agro-id/policy';

const fnDir = path.join(__dirname, '..', 'supabase', 'functions', 'verify-agro-id');
const source = ['index.ts', 'policy.ts']
  .map((f) => fs.readFileSync(path.join(fnDir, f), 'utf8'))
  .join('\n');
const code = source
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

describe('verify-agro-id hard-off (CRE-83)', () => {
  it('returns a JSON 410 with no history for API clients, for any Agro-ID', () => {
    for (const id of ['KAI-2026-000123', 'SYN-TEST-0001', 'anything']) {
      for (const accept of [undefined, null, 'application/json', '*/*']) {
        const r = verifyAgroIdHoldResponse(id, accept);
        expect(r.status).toBe(410);
        expect(r.contentType).toBe('application/json');
        const body = JSON.parse(r.body);
        expect(body).toMatchObject({ verified: false, history: null, reason: 'legal_hold' });
        expect(body).not.toHaveProperty('netBand');
      }
    }
  });

  it('returns a readable EN/SW HTML 410 page to a browser (phone camera QR scan)', () => {
    const r = verifyAgroIdHoldResponse('KAI-2026-000123', BROWSER_ACCEPT);
    expect(r.status).toBe(410);
    expect(r.contentType).toMatch(/^text\/html/);
    expect(r.body).toContain('<!doctype html>');
    expect(r.body).toContain(HOLD_MESSAGE.en);
    expect(r.body).toContain(HOLD_MESSAGE.sw);
    // never echoes the requested ID back
    expect(r.body).not.toContain('KAI-2026-000123');
  });

  it('does not reflect a hostile token into the HTML page', () => {
    const r = verifyAgroIdHoldResponse('<script>alert(1)</script>', BROWSER_ACCEPT);
    expect(r.body).not.toContain('<script>');
  });

  it('negotiates by Accept header', () => {
    expect(prefersHtml(BROWSER_ACCEPT)).toBe(true);
    expect(prefersHtml('application/json, text/html;q=0.5')).toBe(false);
    expect(prefersHtml('application/json')).toBe(false);
    expect(prefersHtml(undefined)).toBe(false);
  });

  it('still rejects a missing token with 400 (JSON or HTML)', () => {
    expect(verifyAgroIdHoldResponse(null).status).toBe(400);
    const html = verifyAgroIdHoldResponse(null, BROWSER_ACCEPT);
    expect(html.status).toBe(400);
    expect(html.contentType).toMatch(/^text\/html/);
  });

  it('stays off with the real-data flag set (no flag path)', () => {
    process.env.CREDIT_SCORE_ALLOW_REAL_DATA = 'true';
    try {
      expect(verifyAgroIdHoldResponse('KAI-2026-000123').status).toBe(410);
    } finally {
      delete process.env.CREDIT_SCORE_ALLOW_REAL_DATA;
    }
  });

  it('the function source has no flag/env path and reads no ledger data', () => {
    expect(code).not.toMatch(/CREDIT_SCORE_ALLOW_REAL_DATA/);
    expect(code).not.toMatch(/Deno\.env/);
    expect(code).not.toMatch(/process\.env/);
    expect(code).not.toMatch(/agro_ledger/);
    expect(code).not.toMatch(/agro_profiles/);
    expect(code).not.toMatch(/createClient|SERVICE_ROLE/);
    expect(code).toMatch(/verifyAgroIdHoldResponse\(\s*agroId,\s*req\.headers\.get\('accept'\)/);
  });
});
