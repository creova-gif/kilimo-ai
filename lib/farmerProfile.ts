/**
 * Persist the farm profile to `public.farmer_profiles` (own-row RLS).
 *
 * Shared by onboarding and Edit Profile. Before this, onboarding kept the
 * profile only in local state, so a reinstall or new phone lost it and the
 * server-side AI context (rag-chat reads this table) was always empty.
 *
 * The client is injected so this is unit-testable. Local state stays the source
 * of truth for offline-first UX: callers save locally first, then call this and
 * surface a truthful notice if it returns ok:false — never claim "synced" when
 * it did not.
 */
export interface FarmerProfileInput {
  name: string;
  role: string;
  region: string;
  primaryCrops: string[];
  farmSizeAcres: number;
  mainActivity: 'mazao' | 'mifugo' | 'mchanganyiko';
  hasLivestock: boolean;
  hasIrrigation: boolean;
  language: string;
}

/** Flat (not a discriminated union): this repo compiles with `strict: false`, where unions do not narrow. */
export interface SaveProfileResult {
  ok: boolean;
  reason?: 'not_configured' | 'not_signed_in' | 'error';
  message?: string;
}

export function toFarmerProfileRow(userId: string, p: FarmerProfileInput, now = new Date()) {
  return {
    user_id: userId,
    name: p.name,
    role: p.role,
    region: p.region,
    primary_crops: p.primaryCrops,
    farm_size_acres: p.farmSizeAcres,
    main_activity: p.mainActivity,
    has_livestock: p.hasLivestock,
    has_irrigation: p.hasIrrigation,
    language: p.language,
    updated_at: now.toISOString(),
  };
}

export async function saveFarmerProfile(
  client: any | null | undefined,
  input: FarmerProfileInput
): Promise<SaveProfileResult> {
  if (!client) return { ok: false, reason: 'not_configured' };
  try {
    const { data } = await client.auth.getSession();
    const userId: string | undefined = data?.session?.user?.id;
    if (!userId) return { ok: false, reason: 'not_signed_in' };
    const { error } = await client.from('farmer_profiles').upsert(toFarmerProfileRow(userId, input));
    if (error) return { ok: false, reason: 'error', message: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'error', message: e?.message ?? String(e) };
  }
}
