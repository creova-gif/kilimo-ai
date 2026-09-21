/**
 * Fetch the signed-in user's saved profile from the backend so a returning
 * farmer (new phone, reinstall, expired local state) lands in the app instead of
 * being pushed back through onboarding.
 *
 * Sources of truth: `get_my_agro_id()` (server-minted identity; only real fields)
 * and `farmer_profiles` (own row). The client is injected for testability.
 */
export interface ServerAgroId {
  id: string;
  name?: string | null;
  role?: string | null;
  location?: string | null;
  joinDate?: string | null;
  phoneNumber?: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified';
}

export interface ServerFarmProfile {
  primaryCrops: string[];
  region: string;
  farmSizeAcres: number;
  mainActivity: 'mazao' | 'mifugo' | 'mchanganyiko';
  hasLivestock: boolean;
  hasIrrigation: boolean;
  language?: string | null;
}

export interface HydrateResult {
  ok: boolean;
  /** true when the server has a minted Agro-ID for this user (i.e. they onboarded before). */
  hasAccount: boolean;
  agro: ServerAgroId | null;
  farm: ServerFarmProfile | null;
  message?: string;
}

const ACTIVITIES = ['mazao', 'mifugo', 'mchanganyiko'];

export function mapFarmRow(row: any): ServerFarmProfile | null {
  if (!row) return null;
  return {
    primaryCrops: Array.isArray(row.primary_crops) ? row.primary_crops : [],
    region: row.region ?? '',
    farmSizeAcres: Number(row.farm_size_acres ?? 0),
    mainActivity: ACTIVITIES.includes(row.main_activity) ? row.main_activity : 'mazao',
    hasLivestock: Boolean(row.has_livestock),
    hasIrrigation: Boolean(row.has_irrigation),
    language: row.language ?? null,
  };
}

export async function fetchMyProfile(client: any | null | undefined): Promise<HydrateResult> {
  if (!client) return { ok: false, hasAccount: false, agro: null, farm: null, message: 'not_configured' };
  try {
    const [agroRes, farmRes] = await Promise.all([
      client.rpc('get_my_agro_id'),
      client.from('farmer_profiles').select('*').maybeSingle(),
    ]);
    if (agroRes.error) throw new Error(agroRes.error.message);
    if (farmRes.error) throw new Error(farmRes.error.message);
    const agroRaw = agroRes.data;
    const agro: ServerAgroId | null = agroRaw
      ? {
          id: agroRaw.id,
          name: agroRaw.name ?? null,
          role: agroRaw.role ?? null,
          location: agroRaw.location ?? null,
          joinDate: agroRaw.joinDate ?? null,
          phoneNumber: agroRaw.phoneNumber ?? null,
          verificationStatus: ['unverified', 'pending', 'verified'].includes(agroRaw.verificationStatus)
            ? agroRaw.verificationStatus
            : 'unverified',
        }
      : null;
    return { ok: true, hasAccount: agro !== null, agro, farm: mapFarmRow(farmRes.data) };
  } catch (e: any) {
    return { ok: false, hasAccount: false, agro: null, farm: null, message: e?.message ?? String(e) };
  }
}
