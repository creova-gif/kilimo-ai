/**
 * CRE-179 / CRE-83 — Rex's ruling: the public verify-agro-id function is
 * fully off for real farmers. 410 Gone, no ledger reads, no flag to re-enable.
 */
import fs from 'fs';
import path from 'path';
import { verifyAgroIdHoldResponse } from '../supabase/functions/verify-agro-id/policy';

const fnDir = path.join(__dirname, '..', 'supabase', 'functions', 'verify-agro-id');
const source = ['index.ts', 'policy.ts']
  .map((f) => fs.readFileSync(path.join(fnDir, f), 'utf8'))
  .join('\n');
const code = source
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

describe('verify-agro-id hard-off (CRE-83)', () => {
  it('returns 410 Gone with no history for any Agro-ID', () => {
    for (const id of ['KAI-2026-000123', 'SYN-TEST-0001', 'anything']) {
      const r = verifyAgroIdHoldResponse(id);
      expect(r.status).toBe(410);
      expect(r.body).toMatchObject({ verified: false, history: null, reason: 'legal_hold' });
      expect(r.body).not.toHaveProperty('netBand');
    }
  });

  it('still rejects a missing token with 400', () => {
    expect(verifyAgroIdHoldResponse(null).status).toBe(400);
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
    expect(code).toMatch(/verifyAgroIdHoldResponse\(agroId\)/);
  });
});
