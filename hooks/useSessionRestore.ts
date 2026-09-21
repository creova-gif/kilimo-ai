import { useEffect } from 'react';
import { agroFromProfile, fetchMyProfile } from '../lib/hydrateProfile';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

/**
 * Restore a signed-in farmer at app boot, from the SERVER — once, in the root layout.
 *
 * The session itself is persisted by the shared Supabase client (Keychain). If a session exists
 * but the local profile is missing (reinstall, cleared data, new phone) we fetch the real profile
 * with `get_my_agro_id()` + `farmer_profiles` and only then mark the user signed in.
 *
 * It never signs anyone in from a bare token, and if the server has no account for this session
 * (the user quit mid-onboarding) it does nothing, so onboarding runs normally. Replaces the old
 * `restoreSession`, which cast a narrow `agro_profiles` row to the full AgroID type and marked the
 * user authenticated with an empty identity.
 */
export function useSessionRestore() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (useKilimoStore.getState().isAuthenticated) return;
      const client = getSupabase();
      if (!client) return;
      try {
        const { data } = await client.auth.getSession();
        if (!data?.session) return;
        const mine = await fetchMyProfile(client);
        const agro = agroFromProfile(mine);
        if (cancelled || !agro) return;
        const s = useKilimoStore.getState();
        if (mine.farm) s.setFarmProfile(mine.farm);
        if (mine.farm?.language === 'sw' || mine.farm?.language === 'en')
          s.setLanguage(mine.farm.language);
        s.setAgroId(agro as any); // marks authenticated + onboarding complete
      } catch (err) {
        console.warn('[SessionRestore] failed:', err);
      }
    }

    if (useKilimoStore.persist.hasHydrated()) run();
    else {
      const unsub = useKilimoStore.persist.onFinishHydration(() => run());
      return () => {
        cancelled = true;
        unsub();
      };
    }
    return () => {
      cancelled = true;
    };
  }, []);
}
