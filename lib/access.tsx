/**
 * Kilimo AI — Role-Based Access Control
 *
 * Implements the PRD feature matrix (Section 2.1) for the five user roles.
 * Each feature is gated as 'full' | 'basic' | 'none'.
 *
 * Usage:
 *   const access = useAccess('ai_chat');             // 'full' | 'basic' | 'none'
 *   const can = useCan('contract_farming');          // boolean (full OR basic)
 *   <Gate feature="livestock"> <LivestockPage /> </Gate>
 */

import React from 'react';
import { useKilimoStore } from '../store/useKilimoStore';

export type AccessLevel = 'full' | 'basic' | 'none';

// Canonical role identifiers — map Swahili display roles → canonical
export type CanonicalRole =
  | 'smallholder'
  | 'farmer'
  | 'commercial_farmer'
  | 'farm_manager'
  | 'commercial_admin'
  | 'agribusiness'
  | 'coop_leader'
  | 'extension_officer';

export type Feature =
  | 'ai_chat'
  | 'photo_diagnosis'
  | 'voice_assistant'
  | 'crop_planning'
  | 'farm_mapping'
  | 'task_management'
  | 'livestock'
  | 'inventory'
  | 'market_prices'
  | 'marketplace'
  | 'contract_farming'
  | 'input_supply'
  | 'finance_tracker'
  | 'mobile_money'
  | 'insurance'
  | 'agro_id'
  | 'analytics_predictive'
  | 'digital_farm_twin'
  | 'expert_consultations'
  | 'weather_alerts'
  | 'offline_mode'
  | 'peer_groups'
  | 'wallet_admin'
  | 'iot_systems'
  | 'soil_analysis'
  | 'crop_library';

// Matrix mirrors PRD Section 2.1
const MATRIX: Record<CanonicalRole, Record<Feature, AccessLevel>> = {
  smallholder: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'basic',
    farm_mapping: 'basic',
    task_management: 'basic',
    livestock: 'none',
    inventory: 'none',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'none',
    input_supply: 'none',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'full',
    agro_id: 'basic',
    analytics_predictive: 'none',
    digital_farm_twin: 'none',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'none',
    iot_systems: 'none',
    soil_analysis: 'basic',
  },
  farmer: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'full',
    farm_mapping: 'full',
    task_management: 'full',
    livestock: 'full',
    inventory: 'full',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'full',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'full',
    agro_id: 'full',
    analytics_predictive: 'none',
    digital_farm_twin: 'none',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'none',
    iot_systems: 'basic',
    soil_analysis: 'full',
  },
  farm_manager: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'full',
    farm_mapping: 'full',
    task_management: 'full',
    livestock: 'full',
    inventory: 'full',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'full',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'full',
    agro_id: 'none',
    analytics_predictive: 'full',
    digital_farm_twin: 'full',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'basic',
    iot_systems: 'full',
    soil_analysis: 'full',
  },
  agribusiness: {
    ai_chat: 'none',
    photo_diagnosis: 'none',
    voice_assistant: 'none',
    crop_library: 'full',
    crop_planning: 'none',
    farm_mapping: 'none',
    task_management: 'none',
    livestock: 'none',
    inventory: 'none',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'full',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'none',
    agro_id: 'full',
    analytics_predictive: 'full',
    digital_farm_twin: 'none',
    expert_consultations: 'none',
    weather_alerts: 'none',
    offline_mode: 'none',
    peer_groups: 'none',
    wallet_admin: 'basic',
    iot_systems: 'none',
    soil_analysis: 'none',
  },
  coop_leader: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'full',
    farm_mapping: 'full',
    task_management: 'none',
    livestock: 'none',
    inventory: 'none',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'none',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'none',
    agro_id: 'full',
    analytics_predictive: 'basic',
    digital_farm_twin: 'none',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'full',
    iot_systems: 'none',
    soil_analysis: 'basic',
  },
  commercial_farmer: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'full',
    farm_mapping: 'full',
    task_management: 'full',
    livestock: 'full',
    inventory: 'full',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'full',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'full',
    agro_id: 'full',
    analytics_predictive: 'full',
    digital_farm_twin: 'basic',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'basic',
    iot_systems: 'full',
    soil_analysis: 'full',
  },
  commercial_admin: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'full',
    farm_mapping: 'full',
    task_management: 'full',
    livestock: 'full',
    inventory: 'full',
    market_prices: 'full',
    marketplace: 'full',
    contract_farming: 'full',
    input_supply: 'full',
    finance_tracker: 'full',
    mobile_money: 'full',
    insurance: 'full',
    agro_id: 'full',
    analytics_predictive: 'full',
    digital_farm_twin: 'full',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'full',
    iot_systems: 'full',
    soil_analysis: 'full',
  },
  extension_officer: {
    ai_chat: 'full',
    photo_diagnosis: 'full',
    voice_assistant: 'full',
    crop_library: 'full',
    crop_planning: 'basic',
    farm_mapping: 'basic',
    task_management: 'full',
    livestock: 'basic',
    inventory: 'none',
    market_prices: 'full',
    marketplace: 'none',
    contract_farming: 'none',
    input_supply: 'basic',
    finance_tracker: 'none',
    mobile_money: 'none',
    insurance: 'basic',
    agro_id: 'none',
    analytics_predictive: 'full',
    digital_farm_twin: 'none',
    expert_consultations: 'full',
    weather_alerts: 'full',
    offline_mode: 'full',
    peer_groups: 'full',
    wallet_admin: 'none',
    iot_systems: 'none',
    soil_analysis: 'full',
  },
};

const FEATURE_LABELS: Record<Feature, string> = {
  ai_chat: 'AI Chat',
  photo_diagnosis: 'Photo Crop Diagnosis',
  crop_library: 'Crop Library',
  voice_assistant: 'Voice Assistant',
  crop_planning: 'Crop Planning',
  farm_mapping: 'Farm Mapping',
  task_management: 'Task Management',
  livestock: 'Livestock Tracking',
  inventory: 'Inventory Management',
  market_prices: 'Market Prices',
  marketplace: 'Marketplace',
  contract_farming: 'Contract Farming',
  input_supply: 'Input Supply',
  finance_tracker: 'Finance Tracker',
  mobile_money: 'Mobile Money',
  insurance: 'Insurance Hub',
  agro_id: 'Agro ID',
  analytics_predictive: 'Predictive Analytics',
  digital_farm_twin: 'Digital Farm Twin',
  expert_consultations: 'Expert Consultations',
  weather_alerts: 'Weather & Alerts',
  offline_mode: 'Offline Mode',
  peer_groups: 'Peer Groups',
  wallet_admin: 'Wallet Admin',
  iot_systems: 'IoT & Drone Systems',
  soil_analysis: 'Soil Analysis',
};

const ROLE_LABELS: Record<CanonicalRole, string> = {
  smallholder: 'Mkulima Mdogo (Smallholder)',
  farmer: 'Mkulima (Farmer)',
  commercial_farmer: 'Mkulima wa Biashara (Commercial Farmer)',
  farm_manager: 'Msimamizi wa Shamba (Farm Manager)',
  commercial_admin: 'Msimamizi Mkuu (Commercial Admin)',
  agribusiness: 'Agribiashara (Agribusiness)',
  coop_leader: 'Kiongozi wa Ushirika (Co-op Leader)',
  extension_officer: 'Afisa Ugani / NGO (Extension Officer)',
};

export const ROLE_DESCRIPTIONS: Record<CanonicalRole, string> = {
  smallholder: 'Shamba dogo (0–5 ekari). AI advice + utambuzi wa magonjwa.',
  farmer: 'Mkulima huru (5+ ekari). Mpango wa msimu + uongezaji wa mazao.',
  commercial_farmer: 'Uzalishaji wa biashara. Mikataba, fedha, na uchambuzi.',
  farm_manager: 'Unasimamia mashamba mengi. Kazi za timu + ripoti.',
  commercial_admin: 'Operesheni za kibiashara — udhibiti kamili wa jukwaa.',
  agribusiness: 'Mnunuzi au msambazaji wa pembejeo. Soko + mikataba.',
  coop_leader: 'Kiongozi wa kikundi cha wakulima. Mauzo ya pamoja.',
  extension_officer: 'Afisa ugani au NGO. Fuatilia wakulima + mafunzo.',
};

// Map AgroID.role free-form string → canonical role.
// Defaults to 'farmer' which is a sensible middle ground.
export function normalizeRole(role: string | undefined | null): CanonicalRole {
  if (!role) return 'farmer';
  // Canonical key direct match
  if ((Object.keys(ROLE_LABELS) as string[]).includes(role)) return role as CanonicalRole;
  const r = role.toLowerCase();
  if (r.includes('extension') || r.includes('ugani') || r.includes('ngo'))
    return 'extension_officer';
  if (r.includes('coop') || r.includes('ushirika') || r.includes('amcos')) return 'coop_leader';
  if (r.includes('admin')) return 'commercial_admin';
  if (r.includes('commercial') || r.includes('biashara mkubwa')) return 'commercial_farmer';
  if (r.includes('agri') || r.includes('biashara') || r.includes('buyer') || r.includes('supplier'))
    return 'agribusiness';
  if (r.includes('manager') || r.includes('msimamizi') || r.includes('mkuu')) return 'farm_manager';
  if (r.includes('small') || r.includes('mdogo')) return 'smallholder';
  return 'farmer';
}

export function featureLabel(f: Feature): string {
  return FEATURE_LABELS[f];
}
export function roleLabel(r: CanonicalRole): string {
  return ROLE_LABELS[r];
}
export function allFeatures(): Feature[] {
  return Object.keys(FEATURE_LABELS) as Feature[];
}
export function allRoles(): CanonicalRole[] {
  return Object.keys(ROLE_LABELS) as CanonicalRole[];
}

/** Pure lookup: access level for a feature given a free-form Agro ID role. */
export function accessFor(role: string | undefined | null, feature: Feature): AccessLevel {
  return MATRIX[normalizeRole(role)][feature];
}

/** Hook: returns access level for a feature based on the current Agro ID role. */
export function useAccess(feature: Feature): AccessLevel {
  const role = useKilimoStore((s) => s.agroId?.role);
  return accessFor(role, feature);
}

/** Hook: returns true if user has any access (full OR basic). */
export function useCan(feature: Feature): boolean {
  return useAccess(feature) !== 'none';
}

/** Hook: returns true only for full access. */
export function useHasFullAccess(feature: Feature): boolean {
  return useAccess(feature) === 'full';
}

/** Component: only renders children if user has access. */
export function Gate({
  feature,
  fallback = null,
  children,
}: {
  feature: Feature;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const access = useAccess(feature);
  if (access === 'none') return <>{fallback}</>;
  return <>{children}</>;
}
