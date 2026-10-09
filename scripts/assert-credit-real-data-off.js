/**
 * CRE-179 legal hold: the Agro-ID credit score runs on synthetic data only
 * until Legal (Rex) clears it. This assertion fails the build if the
 * real-data flag is set anywhere a production or preview build can see it.
 *
 * The flag has two spellings, both checked:
 *   EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA  (app, inlined by Expo)
 *   CREDIT_SCORE_ALLOW_REAL_DATA              (server / edge / Worker)
 *
 * Fails on ANY non-empty value (even "false"): presence alone is an error,
 * so nobody "temporarily" flips it. Checked:
 *   1. eas.json: EVERY build profile (development included), with `extends`
 *      chains resolved
 *   2. app.json expo.extra
 *   3. env files: .env.production* always; a committed .env / .env.local
 *      always; and every .env* file Expo would load (.env, .env.local,
 *      .env.<mode>, .env.<mode>.local) during a production or EAS build
 *   4. process.env when NODE_ENV=production or inside any EAS build
 *      (EAS_BUILD / EAS_BUILD_PROFILE), which includes EAS dashboard env and
 *      secrets via the eas-build-pre-install hook in package.json
 *   5. the flag NAME anywhere in repo config or code (json, yml, toml,
 *      .replit, app.config.*, babel/metro/tsconfig, any extends target)
 *      outside the few files that implement the guard
 *   6. hard-coded opt-ins in code (.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts):
 *      allowRealData: true | !0 | 1 | 'true', `const allowRealData = true`,
 *      realDataAllowed({ raw: 'true' ... }) / isProduction: false,
 *      parseAllowRealData('true'), assertScorableLedger(x, true), ...
 *      outside __tests__/, lib/credit/fixtures/ and the guard
 *
 * Runs in five places, so it does not depend on Metro's transform cache:
 * metro.config.js (every Metro start / export, cached or not),
 * babel.config.js, CI (ci-validate.yml, before the export, which also uses
 * --clear), eas-build.yml (on the GitHub runner), and the
 * eas-build-pre-install npm hook (on the EAS worker, with dashboard env).
 *
 * Lifting the hold is a deliberate, reviewed change: link Rex's written
 * clearance in CRE-179, then edit LEGAL_CLEARANCE below in a PR. Setting an
 * env var alone is never enough. (Production builds stay closed regardless:
 * see realDataAllowed in lib/credit/dataSourceGuard.ts.)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEGAL_CLEARANCE = Object.freeze({ cleared: false, reference: null });

const FLAGS = ['CREDIT_SCORE_ALLOW_REAL_DATA', 'EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA'];
const FLAG_NAME_RE = /CREDIT_SCORE_ALLOW_REAL_DATA/;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'artifacts',
  'dist',
  'web-build',
  'docs',
  '.expo',
  '.cache',
  'build',
]);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const CONFIG_EXT = /\.(json|jsonc|json5|ya?ml|toml|ini|cfg|conf|nix)$/;
const CONFIG_NAMES = new Set(['.replit', 'replit.nix', '.npmrc', 'Procfile', 'Dockerfile']);

const TRUTHY = String.raw`(?:true|!0|!!1|1(?![\d.])|['"\x60]true['"\x60])`;
const LITERAL_PATTERNS = [
  // allowRealData: true / !0 / 1 / 'true'  and  allowRealData = true
  new RegExp(String.raw`\ballowRealData\s*[:=]\s*` + TRUTHY),
  // const allowRealData = true; ... { allowRealData }  (shorthand)
  new RegExp(
    String.raw`\b(?:const|let|var)\s+\w*(?:allowReal|ALLOW_REAL)\w*\s*(?::\s*\w+\s*)?=\s*` + TRUTHY
  ),
  // ALLOW_REAL_DATA = true, CREDIT_ALLOW_REAL: true, process.env.X = 'true'
  new RegExp(String.raw`\b\w*ALLOW_REAL\w*\s*[:=]\s*` + TRUTHY),
  // realDataAllowed({ raw: 'true', ... }) or isProduction: false
  new RegExp(String.raw`realDataAllowed\(\s*\{[^}]*raw\s*:\s*['"\x60]true`),
  /\bisProduction\s*:\s*(?:false|!1|0(?![\d.]))/,
  // parseAllowRealData('true')
  /parseAllowRealData\(\s*['"`]true/,
  // assertScorableLedger(x, true)
  new RegExp(String.raw`assertScorableLedger\([^)]*,\s*` + TRUTHY + String.raw`\s*\)`),
];

const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== '';

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flagsIn(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return FLAGS.filter((f) => isSet(obj[f]));
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

function committedFiles(root, names) {
  if (!names.length) return new Set();
  try {
    const out = execFileSync('git', ['ls-files', '--', ...names], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(out.toString().split('\n').filter(Boolean));
  } catch {
    return new Set(); // not a git checkout: nothing committed to check
  }
}

/** Merge env through an eas.json `extends` chain (child wins), cycle-safe. */
function resolveEasEnv(profiles, name, seen = new Set()) {
  const p = profiles[name];
  if (!p || seen.has(name)) return {};
  seen.add(name);
  const parent = typeof p.extends === 'string' ? resolveEasEnv(profiles, p.extends, seen) : {};
  return { ...parent, ...(p.env || {}) };
}

/**
 * Returns a list of violations (empty = clean). Pure apart from reading `root`.
 */
function findCreditRealDataViolations({ root, env = {} }) {
  const errors = [];
  if (LEGAL_CLEARANCE.cleared === true) return errors;

  // 1. eas.json: every profile, with `extends` chains resolved
  const eas = readJson(path.join(root, 'eas.json'));
  const profiles = (eas && eas.build) || {};
  for (const profile of Object.keys(profiles)) {
    for (const f of flagsIn(resolveEasEnv(profiles, profile))) {
      errors.push(`eas.json build.${profile}.env sets ${f}`);
    }
  }

  // 2. app.json expo.extra
  const app = readJson(path.join(root, 'app.json'));
  for (const f of flagsIn(app?.expo?.extra)) errors.push(`app.json expo.extra sets ${f}`);

  // 3. env files
  const easBuild = env.EAS_BUILD === 'true' || isSet(env.EAS_BUILD_PROFILE);
  const prodLike = env.NODE_ENV === 'production' || easBuild;
  const allEnvFiles = fs
    .readdirSync(root)
    .filter((n) => /^\.env(\..+)?$/.test(n) && !/\.(example|sample|template)$/.test(n));
  const committed = committedFiles(root, allEnvFiles);
  const envFiles = allEnvFiles.filter(
    (n) => prodLike || /^\.env\.production/.test(n) || committed.has(n)
  );
  for (const name of envFiles) {
    const vars = parseDotEnv(fs.readFileSync(path.join(root, name), 'utf8'));
    for (const f of flagsIn(vars)) errors.push(`${name} sets ${f}`);
  }

  // 4. process.env for production builds and ANY EAS build (dev profile too)
  if (prodLike) {
    for (const f of flagsIn(env)) {
      errors.push(
        `${f} is set in the environment of a ${
          easBuild
            ? `EAS ${env.EAS_BUILD_PROFILE || ''} build`.replace('  ', ' ')
            : 'production build'
        }`
      );
    }
  }

  // 5 + 6. repo scan: flag name in config/code, hard-coded opt-ins in code
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const NAME_ALLOWED = new Set([
    'lib/credit/dataSourceGuard.ts',
    'lib/credit/realDataFlag.ts',
    'scripts/assert-credit-real-data-off.js',
  ]);
  const LITERAL_ALLOWED = new Set([
    'lib/credit/dataSourceGuard.ts',
    'scripts/assert-credit-real-data-off.js',
  ]);
  const isTestOrFixture = (r) =>
    r.startsWith('__tests__/') || r.includes('/__tests__/') || r.startsWith('lib/credit/fixtures/');
  const files = [];
  (function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (CODE_EXT.test(ent.name) || CONFIG_EXT.test(ent.name) || CONFIG_NAMES.has(ent.name)) {
        files.push(p);
      }
    }
  })(root);
  for (const file of files) {
    const r = rel(file);
    if (isTestOrFixture(r)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!NAME_ALLOWED.has(r) && r !== 'eas.json' && r !== 'app.json' && FLAG_NAME_RE.test(text)) {
      errors.push(
        `real-data flag referenced in ${r} (only lib/credit/realDataFlag.ts may read it)`
      );
    }
    if (CODE_EXT.test(file) && !LITERAL_ALLOWED.has(r)) {
      if (LITERAL_PATTERNS.some((re) => re.test(text))) {
        errors.push(`hard-coded real-data opt-in in ${r}`);
      }
    }
  }

  return errors;
}

function assertCreditRealDataOff(opts = {}) {
  const root = opts.root || path.join(__dirname, '..');
  const env = opts.env || process.env;
  const errors = findCreditRealDataViolations({ root, env });
  if (errors.length) {
    throw new Error(
      'credit-score legal hold (CRE-179): real-data flag must not be set for production or preview builds:\n  - ' +
        errors.join('\n  - ')
    );
  }
}

if (require.main === module) {
  try {
    assertCreditRealDataOff();
    console.log('credit-score legal hold (CRE-179): OK, real-data flag is off');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else {
  // Loaded from babel.config.js: fail the bundle.
  assertCreditRealDataOff();
}

module.exports = { assertCreditRealDataOff, findCreditRealDataViolations, FLAGS };
