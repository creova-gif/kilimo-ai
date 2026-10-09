/**
 * CRE-179 / CRE-83 (review #86 Critical 2, Minor 6): the server must fail
 * closed too. The repo has no DB test harness, so this checks the migration
 * text; the policy was also exercised against a throwaway Postgres 17 (see
 * the PR body).
 */
import fs from 'fs';
import path from 'path';

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const file = '20261009000000_agro_ledger_legal_hold.sql';
const sql = fs
  .readFileSync(path.join(dir, file), 'utf8')
  .split('\n')
  .filter((l) => !/^\s*--/.test(l))
  .join('\n')
  .replace(/\s+/g, ' ');

describe(`migration ${file}`, () => {
  it('sorts after the migrations that define the agro_ledger policy and view lockdown', () => {
    for (const earlier of [
      '20260625000000_agro_ledger.sql',
      '20260812000000_knowledge_base_rls.sql',
    ]) {
      expect(fs.existsSync(path.join(dir, earlier))).toBe(true);
      expect(earlier < file).toBe(true);
    }
  });

  it('drops the old self_reported insert policy', () => {
    expect(sql).toMatch(/drop policy if exists "own rows: insert" on public\.agro_ledger;/);
  });

  it('only lets clients insert synthetic, unverified, own rows', () => {
    const m = sql.match(
      /create policy "[^"]+" on public\.agro_ledger for insert with check \((.*?)\);/
    );
    expect(m).not.toBeNull();
    const check = m![1];
    expect(check).toMatch(/auth\.uid\(\) = user_id/);
    expect(check).toMatch(/source = 'synthetic'/);
    expect(check).toMatch(/verified = false/);
    expect(check).not.toMatch(/self_reported/);
  });

  it('ensures the source column exists before the policy uses it', () => {
    expect(sql.indexOf('add column if not exists source')).toBeGreaterThan(-1);
    expect(sql.indexOf('add column if not exists source')).toBeLessThan(
      sql.indexOf('create policy')
    );
  });

  it('keeps synthetic rows out of agro_ledger_summary and keeps it locked down', () => {
    expect(sql).toMatch(
      /create or replace view public\.agro_ledger_summary with \(security_invoker = true\)/
    );
    expect(sql).toMatch(/from public\.agro_ledger where source <> 'synthetic' group by user_id/);
    expect(sql).toMatch(/revoke all on public\.agro_ledger_summary from anon, authenticated;/);
  });

  it('never deletes ledger rows', () => {
    expect(sql).not.toMatch(/\b(delete from|truncate|drop table)\b/i);
  });
});
