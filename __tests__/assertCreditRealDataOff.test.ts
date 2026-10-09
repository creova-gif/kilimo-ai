import fs from 'fs';
import os from 'os';
import path from 'path';

const { findCreditRealDataViolations } = require('../scripts/assert-credit-real-data-off');

const FLAG = 'EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA';

function makeRepo(overrides: { eas?: object; files?: Record<string, string> } = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cre179-'));
  const eas = overrides.eas ?? {
    build: {
      preview: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid' } },
      production: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid' } },
    },
  };
  fs.writeFileSync(path.join(root, 'eas.json'), JSON.stringify(eas));
  fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({ expo: { extra: {} } }));
  const files = { 'app/index.tsx': 'export default 1;\n', ...(overrides.files ?? {}) };
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

const roots: string[] = [];
const repo = (o?: Parameters<typeof makeRepo>[0]) => {
  const r = makeRepo(o);
  roots.push(r);
  return r;
};
afterAll(() => roots.forEach((r) => fs.rmSync(r, { recursive: true, force: true })));

describe('scripts/assert-credit-real-data-off (CRE-179)', () => {
  it('passes on a clean repo', () => {
    expect(findCreditRealDataViolations({ root: repo(), env: { NODE_ENV: 'production' } })).toEqual(
      []
    );
  });

  it('fails when eas.json production env sets the flag', () => {
    const root = repo({ eas: { build: { production: { env: { [FLAG]: 'true' } } } } });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([
      `eas.json build.production.env sets ${FLAG}`,
    ]);
  });

  it('fails when eas.json preview env sets the flag', () => {
    const root = repo({
      eas: { build: { preview: { env: { CREDIT_SCORE_ALLOW_REAL_DATA: 'true' } } } },
    });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([
      'eas.json build.preview.env sets CREDIT_SCORE_ALLOW_REAL_DATA',
    ]);
  });

  it('fails in a production environment when the flag has any value, even "false"', () => {
    const root = repo();
    for (const value of ['true', 'false', '0']) {
      expect(
        findCreditRealDataViolations({ root, env: { NODE_ENV: 'production', [FLAG]: value } })
      ).toHaveLength(1);
    }
    expect(
      findCreditRealDataViolations({ root, env: { EAS_BUILD_PROFILE: 'preview', [FLAG]: 'false' } })
    ).toHaveLength(1);
    // development and test environments may set it (non-production only)
    expect(
      findCreditRealDataViolations({ root, env: { NODE_ENV: 'test', [FLAG]: 'true' } })
    ).toEqual([]);
  });

  it('fails on an allowRealData: true literal in app/, but not under __tests__/', () => {
    const literal = 'computeCreditScore({ ledger, nowISO, allowRealData: true });\n';
    const inApp = repo({ files: { 'app/agro-id.tsx': literal } });
    expect(findCreditRealDataViolations({ root: inApp, env: {} })).toEqual([
      `hard-coded real-data opt-in in ${path.join('app', 'agro-id.tsx')}`,
    ]);
    const inTests = repo({ files: { '__tests__/x.test.ts': literal } });
    expect(findCreditRealDataViolations({ root: inTests, env: {} })).toEqual([]);
  });

  it('fails when a .env.production file sets the flag', () => {
    const root = repo({ files: { '.env.production': `${FLAG}=true\n` } });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([
      `.env.production sets ${FLAG}`,
    ]);
  });

  it('the real repository is clean', () => {
    expect(findCreditRealDataViolations({ root: path.join(__dirname, '..'), env: {} })).toEqual([]);
  });
});
