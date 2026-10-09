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
 *   1. eas.json build.production.env and build.preview.env
 *   2. app.json expo.extra
 *   3. .env.production* files, and .env if it is committed to git
 *   4. process.env when NODE_ENV=production or EAS_BUILD_PROFILE is
 *      production/preview
 *   5. source scan: no `allowRealData: true` / `ALLOW_REAL_DATA = true`
 *      literals outside __tests__/, lib/credit/fixtures/ and the guard
 *
 * Runs in three places: Babel (babel.config.js, so no bundle can be built),
 * CI (ci-validate.yml), and before EAS builds (eas-build.yml).
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
const GATED_EAS_PROFILES = ['production', 'preview'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'artifacts',
  'dist',
  'web-build',
  'docs',
  '.expo',
]);
const LITERAL_PATTERNS = [/\ballowRealData\s*:\s*true\b/, /\bALLOW_REAL_DATA\s*=\s*true\b/];

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

function dotEnvIsCommitted(root) {
  try {
    const out = execFileSync('git', ['ls-files', '--', '.env'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.toString().trim() === '.env';
  } catch {
    return false; // not a git checkout: nothing committed to check
  }
}

/**
 * Returns a list of violations (empty = clean). Pure apart from reading `root`.
 */
function findCreditRealDataViolations({ root, env = {} }) {
  const errors = [];
  if (LEGAL_CLEARANCE.cleared === true) return errors;

  // 1. eas.json
  const eas = readJson(path.join(root, 'eas.json'));
  for (const profile of GATED_EAS_PROFILES) {
    for (const f of flagsIn(eas?.build?.[profile]?.env)) {
      errors.push(`eas.json build.${profile}.env sets ${f}`);
    }
  }

  // 2. app.json expo.extra
  const app = readJson(path.join(root, 'app.json'));
  for (const f of flagsIn(app?.expo?.extra)) errors.push(`app.json expo.extra sets ${f}`);

  // 3. .env.production* (any), and .env only if committed
  const envFiles = fs
    .readdirSync(root)
    .filter((n) => /^\.env\.production/.test(n) && !/\.example$/.test(n));
  if (fs.existsSync(path.join(root, '.env')) && dotEnvIsCommitted(root)) envFiles.push('.env');
  for (const name of envFiles) {
    const vars = parseDotEnv(fs.readFileSync(path.join(root, name), 'utf8'));
    for (const f of flagsIn(vars)) errors.push(`${name} sets ${f}`);
  }

  // 4. process.env for production / preview builds
  const prodLike =
    env.NODE_ENV === 'production' || GATED_EAS_PROFILES.includes(env.EAS_BUILD_PROFILE);
  if (prodLike) {
    for (const f of flagsIn(env)) {
      errors.push(
        `${f} is set in the environment of a ${env.EAS_BUILD_PROFILE || 'production'} build`
      );
    }
  }

  // 5. source scan for hard-coded opens
  const guardPath = path.join(root, 'lib', 'credit', 'dataSourceGuard.ts');
  const fixturesDir = `${path.sep}lib${path.sep}credit${path.sep}fixtures${path.sep}`;
  const files = [];
  (function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) files.push(p);
    }
  })(root);
  for (const file of files) {
    if (file === guardPath) continue;
    if (file === __filename) continue;
    if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
    if (file.includes(fixturesDir)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (LITERAL_PATTERNS.some((re) => re.test(text))) {
      errors.push(`hard-coded real-data opt-in in ${path.relative(root, file)}`);
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
