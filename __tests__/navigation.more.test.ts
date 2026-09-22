jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import fs from 'fs';
import path from 'path';
import {
  MORE_GROUPS,
  allMoreRoutes,
  visibleMoreGroups,
} from '../components/profile/moreFeatures';
import type { CanonicalRole, Feature } from '../lib/access';
import { en } from '../lib/i18n/en';

const APP = path.join(__dirname, '..', 'app');

/** Resolve an expo-router path to a file under app/ (ignores (group) segments). */
function routeFile(route: string): string | null {
  const rel = route.replace(/^\//, '');
  for (const candidate of [`${rel}.tsx`, `${rel}/index.tsx`, `${rel}.ts`, `${rel}/index.ts`]) {
    if (fs.existsSync(path.join(APP, candidate))) return candidate;
  }
  return null;
}

// Access levels copied from the behaviour of lib/access.tsx for the cases under test.
const levels = (overrides: Partial<Record<Feature, 'full' | 'basic' | 'none'>>) => (f: Feature) =>
  overrides[f] ?? 'full';

describe('More / Zaidi section (KIL-005)', () => {
  it('every listed route exists as a screen file under app/', () => {
    const missing = allMoreRoutes().filter((r) => routeFile(r) === null);
    expect(missing).toEqual([]);
  });

  it('covers every screen that previously had no in-app entry point', () => {
    const routes = allMoreRoutes();
    for (const r of [
      '/ai-admin',
      '/ai-voice',
      '/insurance',
      '/inventory',
      '/livestock',
      '/map',
      '/mobile-money',
      '/offline-queue',
      '/peer-groups',
      '/upgrade',
      '/legal/privacy',
      '/finance',
      '/consultations',
      '/iot-systems',
      '/farm-twin',
      '/crop-planning',
      '/calendar',
      '/forecast',
    ]) {
      expect(routes).toContain(r);
    }
  });

  it('has no duplicate ids or routes, and every label is a real English key', () => {
    const items = MORE_GROUPS.flatMap((g) => g.items);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.route)).size).toBe(items.length);
    for (const g of MORE_GROUPS) expect(en[g.titleKey]).toBeTruthy();
    for (const i of items) {
      expect(en[i.titleKey]).toBeTruthy();
      expect(en[i.subtitleKey]).toBeTruthy();
    }
  });

  it('shows AI admin only to the commercial admin role', () => {
    const ids = (role: CanonicalRole) =>
      visibleMoreGroups(role, levels({}))
        .flatMap((g) => g.items)
        .map((i) => i.id);
    expect(ids('commercial_admin')).toContain('ai-admin');
    for (const r of ['smallholder', 'farmer', 'farm_manager', 'coop_leader'] as CanonicalRole[]) {
      expect(ids(r)).not.toContain('ai-admin');
    }
  });

  it('hides features the role has no access to, and drops empty groups', () => {
    const groups = visibleMoreGroups(
      'smallholder',
      levels({ livestock: 'none', inventory: 'none', digital_farm_twin: 'none', iot_systems: 'none' })
    );
    const ids = groups.flatMap((g) => g.items).map((i) => i.id);
    expect(ids).not.toContain('livestock');
    expect(ids).not.toContain('inventory');
    expect(ids).not.toContain('farm-twin');
    expect(ids).toContain('finance');

    const nothing = visibleMoreGroups('agribusiness', () => 'none');
    // Only the ungated entries remain (plans, training, videos, legal) — no empty group headers.
    expect(nothing.every((g) => g.items.length > 0)).toBe(true);
    expect(nothing.flatMap((g) => g.items).every((i) => !i.feature && !i.adminOnly)).toBe(true);
  });

  it('wallet admin needs FULL wallet_admin access', () => {
    const has = (lvl: 'full' | 'basic' | 'none') =>
      visibleMoreGroups('farm_manager', levels({ wallet_admin: lvl }))
        .flatMap((g) => g.items)
        .some((i) => i.id === 'wallet-admin');
    expect(has('full')).toBe(true);
    expect(has('basic')).toBe(false);
    expect(has('none')).toBe(false);
  });

  it('legacy /privacy and /terms are redirects to the canonical legal routes (KIL-011)', () => {
    for (const [legacy, target] of [
      ['privacy.tsx', '/legal/privacy'],
      ['terms.tsx', '/legal/terms'],
    ]) {
      const src = fs.readFileSync(path.join(APP, legacy), 'utf8');
      expect(src).toContain('<Redirect');
      expect(src).toContain(`href="${target}"`);
      expect(routeFile(target)).not.toBeNull();
    }
  });
});
