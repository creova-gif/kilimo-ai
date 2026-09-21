import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchListings, type Listing, type ListingFilters } from '../lib/listings';
import { getSupabase } from '../lib/supabase';
import { useKilimoStore } from '../store/useKilimoStore';

export type ListingsError = 'not_configured' | 'error' | null;

/**
 * Real listings from `market_listings`. Empty means empty — there is no seed fallback.
 * Search is debounced; while offline the last results stay on screen (the screen shows a banner).
 */
export function useListings(filters: ListingFilters, debounceMs = 250) {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ListingsError>(null);
  const seq = useRef(0);

  const { search, crop, sellerId } = filters;

  const load = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const r = await fetchListings(getSupabase(), { search, crop, sellerId });
    if (mine !== seq.current) return; // a newer request superseded this one
    if (r.ok) {
      setListings(r.listings);
      setError(null);
      setLoaded(true);
    } else {
      setError(r.reason === 'not_configured' ? 'not_configured' : 'error');
    }
    setLoading(false);
  }, [search, crop, sellerId, isOffline]);

  useEffect(() => {
    const id = setTimeout(load, search ? debounceMs : 0);
    return () => clearTimeout(id);
  }, [load, search, debounceMs]);

  return { listings, loading, loaded, error, isOffline, refresh: load };
}

/** The signed-in user's id (from the persisted session), or null. */
export function useMyUserId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getSupabase()
      ?.auth.getSession()
      .then(({ data }: any) => alive && setId(data?.session?.user?.id ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return id;
}
