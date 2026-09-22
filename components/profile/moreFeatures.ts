/**
 * Kilimo AI — "More / Zaidi" section of the Profile tab (KIL-005).
 *
 * Every screen that has no other in-app entry point is listed here, grouped by what a farmer is
 * trying to do. Each entry is gated with lib/access.tsx: an entry is hidden when the person's role
 * has no access to its feature. `adminOnly` entries are shown only to the commercial_admin role.
 *
 * __tests__/profile.more.test.tsx asserts that every `route` below exists as a file under app/,
 * so a renamed or deleted screen fails CI instead of becoming a dead link.
 */
import type { CanonicalRole, Feature } from '../../lib/access';
import type { TranslationKey } from '../../lib/i18n';

export type MoreGroupId = 'farm' | 'money' | 'advice' | 'system';

export interface MoreItem {
  id: string;
  /** expo-router path, e.g. '/livestock' or '/legal/privacy'. */
  route: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  /** Hidden when the role's access to this feature is 'none'. Omit for features everyone has. */
  feature?: Feature;
  /** Shown only to the commercial_admin role. */
  adminOnly?: boolean;
  /** When set, only roles with FULL access to `feature` see the entry. */
  requireFull?: boolean;
}

export interface MoreGroup {
  id: MoreGroupId;
  titleKey: TranslationKey;
  items: MoreItem[];
}

export const MORE_GROUPS: MoreGroup[] = [
  {
    id: 'farm',
    titleKey: 'profile.more.group.farm',
    items: [
      { id: 'map', route: '/map', titleKey: 'profile.more.map', subtitleKey: 'profile.more.map.sub', feature: 'farm_mapping' },
      { id: 'crop-planning', route: '/crop-planning', titleKey: 'profile.more.cropPlanning', subtitleKey: 'profile.more.cropPlanning.sub', feature: 'crop_planning' },
      { id: 'calendar', route: '/calendar', titleKey: 'profile.more.calendar', subtitleKey: 'profile.more.calendar.sub', feature: 'task_management' },
      { id: 'livestock', route: '/livestock', titleKey: 'profile.more.livestock', subtitleKey: 'profile.more.livestock.sub', feature: 'livestock' },
      { id: 'inventory', route: '/inventory', titleKey: 'profile.more.inventory', subtitleKey: 'profile.more.inventory.sub', feature: 'inventory' },
      { id: 'farm-twin', route: '/farm-twin', titleKey: 'profile.more.farmTwin', subtitleKey: 'profile.more.farmTwin.sub', feature: 'digital_farm_twin' },
      { id: 'iot-systems', route: '/iot-systems', titleKey: 'profile.more.iot', subtitleKey: 'profile.more.iot.sub', feature: 'iot_systems' },
      { id: 'vra-setup', route: '/vra-setup', titleKey: 'profile.more.vra', subtitleKey: 'profile.more.vra.sub', feature: 'crop_planning' },
      { id: 'soil-analysis', route: '/soil-analysis', titleKey: 'profile.more.soil', subtitleKey: 'profile.more.soil.sub', feature: 'soil_analysis' },
    ],
  },
  {
    id: 'money',
    titleKey: 'profile.more.group.money',
    items: [
      { id: 'finance', route: '/finance', titleKey: 'profile.more.finance', subtitleKey: 'profile.more.finance.sub', feature: 'finance_tracker' },
      { id: 'mobile-money', route: '/mobile-money', titleKey: 'profile.more.mobileMoney', subtitleKey: 'profile.more.mobileMoney.sub', feature: 'mobile_money' },
      { id: 'insurance', route: '/insurance', titleKey: 'profile.more.insurance', subtitleKey: 'profile.more.insurance.sub', feature: 'insurance' },
      { id: 'upgrade', route: '/upgrade', titleKey: 'profile.more.upgrade', subtitleKey: 'profile.more.upgrade.sub' },
    ],
  },
  {
    id: 'advice',
    titleKey: 'profile.more.group.advice',
    items: [
      { id: 'forecast', route: '/forecast', titleKey: 'profile.more.forecast', subtitleKey: 'profile.more.forecast.sub', feature: 'weather_alerts' },
      { id: 'ai-voice', route: '/ai-voice', titleKey: 'profile.more.aiVoice', subtitleKey: 'profile.more.aiVoice.sub', feature: 'voice_assistant' },
      { id: 'consultations', route: '/consultations', titleKey: 'profile.more.consultations', subtitleKey: 'profile.more.consultations.sub', feature: 'expert_consultations' },
      { id: 'peer-groups', route: '/peer-groups', titleKey: 'profile.more.peerGroups', subtitleKey: 'profile.more.peerGroups.sub', feature: 'peer_groups' },
      { id: 'ai-training-hub', route: '/ai-training-hub', titleKey: 'profile.more.aiTraining', subtitleKey: 'profile.more.aiTraining.sub' },
      { id: 'video-hub', route: '/video-hub', titleKey: 'profile.more.videoHub', subtitleKey: 'profile.more.videoHub.sub' },
    ],
  },
  {
    id: 'system',
    titleKey: 'profile.more.group.system',
    items: [
      { id: 'offline-queue', route: '/offline-queue', titleKey: 'profile.more.offlineQueue', subtitleKey: 'profile.more.offlineQueue.sub', feature: 'offline_mode' },
      { id: 'wallet-admin', route: '/wallet-admin', titleKey: 'profile.more.walletAdmin', subtitleKey: 'profile.more.walletAdmin.sub', feature: 'wallet_admin', requireFull: true },
      { id: 'ai-admin', route: '/ai-admin', titleKey: 'profile.more.aiAdmin', subtitleKey: 'profile.more.aiAdmin.sub', adminOnly: true },
      { id: 'privacy', route: '/legal/privacy', titleKey: 'profile.more.privacy', subtitleKey: 'profile.more.privacy.sub' },
      { id: 'terms', route: '/legal/terms', titleKey: 'profile.more.terms', subtitleKey: 'profile.more.terms.sub' },
    ],
  },
];

export const ADMIN_ROLE: CanonicalRole = 'commercial_admin';

/** Every route listed in the More section (used by the route-existence test). */
export function allMoreRoutes(): string[] {
  return MORE_GROUPS.flatMap((g) => g.items.map((i) => i.route));
}

/**
 * Pure visibility filter. `accessOf` returns the role's access level for a feature (the Profile
 * screen passes one built from lib/access.tsx hooks; tests pass a stub).
 */
export function visibleMoreGroups(
  role: CanonicalRole,
  accessOf: (f: Feature) => 'full' | 'basic' | 'none'
): MoreGroup[] {
  return MORE_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (item.adminOnly) return role === ADMIN_ROLE;
      if (!item.feature) return true;
      const level = accessOf(item.feature);
      return item.requireFull ? level === 'full' : level !== 'none';
    }),
  })).filter((g) => g.items.length > 0);
}
