/**
 * Kilimo AI — Market Intelligence Hook
 *
 * Provides real-time market price feeds via Supabase Realtime.
 * Falls back to cached data when offline.
 * Adds new listings to the global sync queue when offline.
 */

import { useEffect, useState, useCallback } from 'react';
import { useKilimoStore } from '../store/useKilimoStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MarketListing {
  id: string;
  sellerId?: string | null;
  cropName: string;
  cropNameSw: string;
  quantityKg: number;
  pricePerKg: number;
  currency: 'TZS' | 'KES' | 'UGX';
  location: string;
  qualityGrade: 'A' | 'B' | 'C';
  status: 'active' | 'sold' | 'cancelled';
  smartContract: boolean;
  escrowFunded: boolean;
  notes?: string | null;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  createdAt: string;
}

// Seeded mock data — replaced by Supabase query in production
const SEED_LISTINGS: MarketListing[] = [
  {
    id: 'm1',
    cropName: 'Maize',
    cropNameSw: 'Mahindi',
    quantityKg: 5000,
    pricePerKg: 480,
    currency: 'TZS',
    location: 'Mbeya',
    qualityGrade: 'A',
    status: 'active',
    smartContract: true,
    escrowFunded: false,
    trend: 'up',
    changePercent: 12.4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm2',
    cropName: 'Coffee',
    cropNameSw: 'Kahawa',
    quantityKg: 200,
    pricePerKg: 8200,
    currency: 'TZS',
    location: 'Kilimanjaro',
    qualityGrade: 'A',
    status: 'active',
    smartContract: true,
    escrowFunded: true,
    trend: 'stable',
    changePercent: 0.8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm3',
    cropName: 'Beans',
    cropNameSw: 'Maharage',
    quantityKg: 800,
    pricePerKg: 1200,
    currency: 'TZS',
    location: 'Arusha',
    qualityGrade: 'B',
    status: 'active',
    smartContract: false,
    escrowFunded: false,
    trend: 'down',
    changePercent: -3.2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm4',
    cropName: 'Rice',
    cropNameSw: 'Mchele',
    quantityKg: 2500,
    pricePerKg: 1850,
    currency: 'TZS',
    location: 'Morogoro',
    qualityGrade: 'A',
    status: 'active',
    smartContract: false,
    escrowFunded: false,
    trend: 'up',
    changePercent: 5.1,
    createdAt: new Date().toISOString(),
  },
];

let supabase: any = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
} catch {
  // Supabase not yet configured — use mock data
}

export function useMarketIntelligence() {
  const isOffline = useKilimoStore((s) => s.isOffline);
  const addToSyncQueue = useKilimoStore((s) => s.addToSyncQueue);

  const [listings, setListings] = useState<MarketListing[]>(SEED_LISTINGS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // ── Fetch listings ────────────────────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    if (isOffline) return; // Serve cached data offline
    setLoading(true);
    try {
      if (supabase && process.env.EXPO_PUBLIC_SUPABASE_URL) {
        const { data, error } = await supabase
          .from('market_listings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setListings(data.map(mapDbToListing));
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('[Market] Fetch failed, using cache', err);
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    fetchListings();

    if (!supabase || !process.env.EXPO_PUBLIC_SUPABASE_URL) return;

    const channel = supabase
      .channel('market_listings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_listings' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setListings((prev) => [mapDbToListing(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setListings((prev) =>
              prev.map((l) => (l.id === payload.new.id ? mapDbToListing(payload.new) : l))
            );
          } else if (payload.eventType === 'DELETE') {
            setListings((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Create listing (offline-aware) ────────────────────────────────────────
  const createListing = useCallback(
    async (listing: Omit<MarketListing, 'id' | 'createdAt' | 'trend' | 'changePercent'>) => {
      const addLocalOptimistic = () => {
        setListings((prev) => [
          {
            ...listing,
            id: `local_${Date.now()}`,
            createdAt: new Date().toISOString(),
            trend: 'stable',
            changePercent: 0,
          },
          ...prev,
        ]);
      };

      if (isOffline) {
        // sellerId is resolved from the live session at sync time (lib/offline.ts),
        // not here — there is no session to ask while offline.
        addToSyncQueue({ type: 'market_order', payload: listing });
        addLocalOptimistic();
        return;
      }

      if (!supabase) {
        // No backend configured (e.g. local dev without EXPO_PUBLIC_SUPABASE_*).
        // Previously this branch did nothing at all — the caller saw no error
        // and assumed success, but the listing was never saved anywhere, not
        // even locally. Degrade the same way the rest of the app does when
        // unconfigured (see lib/ai.ts's demo fallback): keep it visible for
        // this session instead of silently discarding it.
        addLocalOptimistic();
        return;
      }

      // market_listings' RLS insert policy requires seller_id = auth.uid();
      // without it every real insert is silently rejected by RLS.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const payload = listingToDbRow(listing, user.id);
      const { error } = await supabase.from('market_listings').insert(payload);
      if (error) throw error;
    },
    [isOffline, addToSyncQueue]
  );

  return {
    listings,
    loading,
    lastUpdated,
    refresh: fetchListings,
    createListing,
  };
}

/**
 * Maps a client-side listing (camelCase) to market_listings' snake_case
 * columns. Exported so lib/offline.ts's sync-queue processor can insert a
 * queued market_order with the exact same shape createListing() uses online
 * — previously the queue stored (and, when "synced," discarded) the raw
 * camelCase object, which market_listings' schema doesn't recognize.
 */
export function listingToDbRow(
  listing: Omit<MarketListing, 'id' | 'createdAt' | 'trend' | 'changePercent'>,
  sellerId?: string | null
) {
  return {
    seller_id: sellerId ?? null,
    crop_name: listing.cropName,
    crop_name_sw: listing.cropNameSw,
    quantity_kg: listing.quantityKg,
    price_per_kg: listing.pricePerKg,
    currency: listing.currency,
    location: listing.location,
    quality_grade: listing.qualityGrade,
    status: listing.status,
    smart_contract: listing.smartContract,
    escrow_funded: listing.escrowFunded,
    notes: listing.notes ?? null,
  };
}

function mapDbToListing(row: any): MarketListing {
  return {
    id: row.id,
    sellerId: row.seller_id ?? null,
    cropName: row.crop_name,
    cropNameSw: row.crop_name_sw ?? row.crop_name,
    quantityKg: Number(row.quantity_kg),
    pricePerKg: Number(row.price_per_kg),
    currency: row.currency ?? 'TZS',
    location: row.location ?? '',
    qualityGrade: row.quality_grade ?? 'A',
    status: row.status,
    smartContract: row.smart_contract ?? false,
    escrowFunded: row.escrow_funded ?? false,
    notes: row.notes ?? null,
    trend: 'stable',
    changePercent: 0,
    createdAt: row.created_at,
  };
}
