/**
 * Marketplace ("Soko") data layer — phase 1: discover, create, mark sold, contact the seller.
 *
 * Backed by `public.market_listings` (RLS: any signed-in user can read; a seller can write only their
 * own rows; escrow / smart-contract flags are server-only — migration 20260921000000). Nothing here
 * invents data: an empty table is an empty marketplace. The Supabase client is injected for tests.
 */
import { normalizePhone } from './phone';

export interface Listing {
  id: string;
  sellerId: string | null;
  cropName: string;
  cropNameSw: string | null;
  quantityKg: number;
  pricePerKg: number;
  currency: string;
  location: string | null;
  qualityGrade: string | null;
  status: 'active' | 'sold' | 'expired' | 'draft';
  notes: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export function mapListingRow(row: any): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id ?? null,
    cropName: row.crop_name,
    cropNameSw: row.crop_name_sw ?? null,
    quantityKg: Number(row.quantity_kg),
    pricePerKg: Number(row.price_per_kg),
    currency: row.currency ?? 'TZS',
    location: row.location ?? null,
    qualityGrade: row.quality_grade ?? null,
    status: row.status,
    notes: row.notes ?? null,
    contactPhone: row.contact_phone ?? null,
    createdAt: row.created_at,
  };
}

/* ── queries ─────────────────────────────────────────────────────────────────────────────── */
export interface ListingFilters {
  search?: string;
  crop?: string;
  /** Only this seller's listings (any status). */
  sellerId?: string;
}

export interface ListingsResult {
  ok: boolean;
  listings: Listing[];
  reason?: 'not_configured' | 'error';
  message?: string;
}

/** Strip characters that would alter a PostgREST ilike pattern. */
const clean = (s: string) => s.replace(/[%*,()\\]/g, ' ').trim();

export async function fetchListings(
  client: any | null | undefined,
  filters: ListingFilters = {}
): Promise<ListingsResult> {
  if (!client) return { ok: false, listings: [], reason: 'not_configured' };
  try {
    let q = client.from('market_listings').select('*');
    if (filters.sellerId) q = q.eq('seller_id', filters.sellerId);
    else q = q.eq('status', 'active');
    if (filters.crop) q = q.eq('crop_name', filters.crop);
    const term = filters.search ? clean(filters.search) : '';
    if (term) q = q.or(`crop_name.ilike.%${term}%,crop_name_sw.ilike.%${term}%,location.ilike.%${term}%`);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
    if (error) return { ok: false, listings: [], reason: 'error', message: error.message };
    return { ok: true, listings: (data ?? []).map(mapListingRow) };
  } catch (e: any) {
    return { ok: false, listings: [], reason: 'error', message: e?.message ?? String(e) };
  }
}

export async function fetchListing(client: any | null | undefined, id: string) {
  if (!client) return { ok: false as const, listing: null, reason: 'not_configured' as const };
  try {
    const { data, error } = await client.from('market_listings').select('*').eq('id', id).maybeSingle();
    if (error) return { ok: false as const, listing: null, reason: 'error' as const, message: error.message };
    return { ok: true as const, listing: data ? mapListingRow(data) : null };
  } catch (e: any) {
    return { ok: false as const, listing: null, reason: 'error' as const, message: e?.message ?? String(e) };
  }
}

/* ── create / update ─────────────────────────────────────────────────────────────────────── */
export interface NewListingInput {
  cropName: string;
  cropNameSw?: string;
  quantityKg: string;
  pricePerKg: string;
  location: string;
  notes?: string;
  contactPhone?: string;
}

export interface ListingErrors {
  cropName?: boolean;
  quantityKg?: boolean;
  pricePerKg?: boolean;
  location?: boolean;
  contactPhone?: boolean;
}

/** Field-level validation (booleans, so the UI supplies localized messages). */
export function validateListingInput(i: NewListingInput): ListingErrors {
  const errors: ListingErrors = {};
  if (!i.cropName.trim()) errors.cropName = true;
  const q = parseFloat(i.quantityKg);
  if (!(q > 0)) errors.quantityKg = true;
  const p = parseFloat(i.pricePerKg);
  if (!(p > 0)) errors.pricePerKg = true;
  if (!i.location.trim()) errors.location = true;
  if (i.contactPhone?.trim() && !normalizePhone(i.contactPhone)) errors.contactPhone = true;
  return errors;
}

export const hasErrors = (e: ListingErrors) => Object.values(e).some(Boolean);

export async function createListing(client: any | null | undefined, userId: string, i: NewListingInput) {
  if (!client) return { ok: false as const, reason: 'not_configured' as const };
  if (hasErrors(validateListingInput(i))) return { ok: false as const, reason: 'invalid' as const };
  try {
    const phone = i.contactPhone?.trim() ? normalizePhone(i.contactPhone) : null;
    const { data, error } = await client
      .from('market_listings')
      .insert({
        seller_id: userId,
        crop_name: i.cropName.trim(),
        crop_name_sw: i.cropNameSw?.trim() || null,
        quantity_kg: parseFloat(i.quantityKg),
        price_per_kg: parseFloat(i.pricePerKg),
        location: i.location.trim(),
        notes: i.notes?.trim() || null,
        contact_phone: phone,
      })
      .select('*')
      .single();
    if (error) return { ok: false as const, reason: 'error' as const, message: error.message };
    return { ok: true as const, listing: mapListingRow(data) };
  } catch (e: any) {
    return { ok: false as const, reason: 'error' as const, message: e?.message ?? String(e) };
  }
}

export async function markListingSold(client: any | null | undefined, id: string) {
  if (!client) return { ok: false, reason: 'not_configured' as const };
  try {
    const { error } = await client.from('market_listings').update({ status: 'sold' }).eq('id', id);
    return error ? { ok: false, reason: 'error' as const, message: error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'error' as const, message: e?.message ?? String(e) };
  }
}

/* ── presentation helpers ────────────────────────────────────────────────────────────────── */
export function formatMoney(amount: number, currency = 'TZS'): string {
  const rounded = Math.round(amount);
  return `${currency} ${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export const telUrl = (phone: string) => `tel:${phone}`;
export const smsUrl = (phone: string, body?: string) =>
  `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
export const whatsappUrl = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
