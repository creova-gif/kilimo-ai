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

  it('fails when the development profile sets the flag', () => {
    const root = repo({ eas: { build: { development: { env: { [FLAG]: 'true' } } } } });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([
      `eas.json build.development.env sets ${FLAG}`,
    ]);
  });

  it('follows eas.json extends chains', () => {
    const root = repo({
      eas: {
        build: {
          base: { env: { [FLAG]: 'true' } },
          staging: { extends: 'base' },
          production: { extends: 'staging', env: { OTHER: '1' } },
        },
      },
    });
    expect(findCreditRealDataViolations({ root, env: {} }).sort()).toEqual(
      [
        `eas.json build.base.env sets ${FLAG}`,
        `eas.json build.production.env sets ${FLAG}`,
        `eas.json build.staging.env sets ${FLAG}`,
      ].sort()
    );
  });

  it('survives an extends cycle', () => {
    const root = repo({
      eas: { build: { a: { extends: 'b' }, b: { extends: 'a', env: { [FLAG]: 'x' } } } },
    });
    expect(findCreditRealDataViolations({ root, env: {} })).toHaveLength(2);
  });

  it('checks .env / .env.local during production and EAS builds, not plain local dev', () => {
    const root = repo({ files: { '.env.local': `${FLAG}=true\n`, '.env': `${FLAG}=1\n` } });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([]);
    expect(findCreditRealDataViolations({ root, env: { NODE_ENV: 'production' } })).toHaveLength(2);
    expect(
      findCreditRealDataViolations({ root, env: { EAS_BUILD_PROFILE: 'development' } })
    ).toHaveLength(2);
  });

  it('fails inside any EAS build (dashboard env/secrets), development profile included', () => {
    const root = repo();
    expect(
      findCreditRealDataViolations({
        root,
        env: { EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'development', [FLAG]: 'true' },
      })
    ).toHaveLength(1);
  });

  it.each([
    ['.replit', `[env]\n${FLAG} = "true"\n`],
    ['babel.config.js', `process.env.${FLAG} = process.env.${FLAG};\n`],
    ['tsconfig.base.json', `{ "compilerOptions": {}, "x": "${FLAG}" }\n`],
    ['app.config.ts', `export default { extra: { k: process.env.${FLAG} } };\n`],
    ['config/eas-base.yml', `env:\n  CREDIT_SCORE_ALLOW_REAL_DATA: "true"\n`],
    ['app/screen.tsx', `const x = process.env.${FLAG};\n`],
  ])('fails when the flag name appears in %s', (rel, text) => {
    const root = repo({ files: { [rel]: text } });
    const errors = findCreditRealDataViolations({ root, env: {} });
    expect(errors.some((e: string) => e.includes('real-data flag referenced in'))).toBe(true);
  });

  it.each([
    ['app/a.tsx', 'computeCreditScore({ ledger, nowISO, allowRealData: !0 });'],
    ['app/b.tsx', "f({ allowRealData: 'true' });"],
    ['app/c.tsx', 'const allowRealData = true;\nf({ ledger, allowRealData });'],
    ['app/d.tsx', "realDataAllowed({ raw: 'true', isProduction: false });"],
    ['app/e.tsx', 'realDataAllowed({ raw: x, isProduction: !1 });'],
    ['app/f.tsx', "parseAllowRealData('true');"],
    ['lib/g.ts', 'assertScorableLedger(ledger, true);'],
    ['lib/h.ts', 'export const CREDIT_ALLOW_REAL = true;'],
    ['lib/i.mjs', 'export default { allowRealData: true };'],
    ['lib/j.cjs', 'module.exports = { allowRealData: 1 };'],
  ])('fails on a hard-coded opt-in in %s', (rel, text) => {
    const root = repo({ files: { [rel]: text + '\n' } });
    expect(findCreditRealDataViolations({ root, env: {} })).toContain(
      `hard-coded real-data opt-in in ${rel}`
    );
  });

  it('does not flag ordinary code', () => {
    const root = repo({
      files: {
        'app/ok.tsx':
          'tryComputeCreditScore({ ledger, nowISO, allowRealData: CREDIT_ALLOW_REAL });\nconst isProduction = env === "production";\n',
      },
    });
    expect(findCreditRealDataViolations({ root, env: {} })).toEqual([]);
  });

  it('the real repository is clean', () => {
    expect(findCreditRealDataViolations({ root: path.join(__dirname, '..'), env: {} })).toEqual([]);
  });
});
