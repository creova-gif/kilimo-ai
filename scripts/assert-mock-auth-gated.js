/**
 * Build-time assertion: mock OTP acceptance stays behind __DEV__.
 * Babel loads this file (see babel.config.js), so a production bundle
 * cannot be produced if the gate is removed.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const policyPath = path.join(root, 'lib/auth/mockAuthPolicy.ts');
const hookPath = path.join(root, 'hooks/useAgroAuth.ts');

function fail(msg) {
  throw new Error(`mock-auth build assertion: ${msg}`);
}

function assertMockAuthGated() {
  const policy = fs.readFileSync(policyPath, 'utf8');
  const hook = fs.readFileSync(hookPath, 'utf8');

  if (!policy.includes('return dev === true;')) {
    fail('mockAuthAllowed must return true only when dev === true');
  }
  const acceptIdx = policy.indexOf('export function acceptMockOtp');
  const devGuard = policy.indexOf('if (dev !== true) return false;', acceptIdx);
  const compare = policy.indexOf('token === MOCK_OTP', acceptIdx);
  if (acceptIdx < 0 || devGuard < 0 || compare < 0 || !(devGuard < compare)) {
    fail('acceptMockOtp must refuse non-dev callers before comparing the OTP');
  }
  if (hook.includes('123456')) {
    fail('useAgroAuth must not contain the mock OTP literal');
  }
  if (!hook.includes('mockAuthAllowed(__DEV__)')) {
    fail('useAgroAuth must gate mock auth on mockAuthAllowed(__DEV__)');
  }
  if (!hook.includes('acceptMockOtp(')) {
    fail('useAgroAuth must verify mock OTPs through acceptMockOtp');
  }

  const skip = new Set([
    'node_modules',
    '.git',
    'artifacts',
    'dist',
    'web-build',
    'docs',
    '.expo',
  ]);
  const files = [];
  (function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) files.push(p);
    }
  })(root);

  for (const file of files) {
    if (file === policyPath) continue;
    if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
    if (file.endsWith('assert-mock-auth-gated.js')) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/token\s*===?\s*['"]123456['"]/.test(text)) {
      fail(`mock OTP comparison found in ${path.relative(root, file)}`);
    }
  }
}

assertMockAuthGated();

module.exports = { assertMockAuthGated };
