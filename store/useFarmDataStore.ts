/**
 * Kilimo AI — Farm Data Store
 *
 * One persisted Zustand store backing the six "missing feature" PRD pages:
 *   - Livestock
 *   - Inventory
 *   - Insurance Hub
 *   - Input Supply (orders)
 *   - Peer Groups
 *   - Expert Consultations
 *   - P&L ledger entries (drives the Agro ID PDF export)
 *
 * Phase 1 wires UI + state. Phase 2 swaps `useEffect` data loaders for
 * Supabase queries; the shapes here are already DB-friendly.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Livestock ───────────────────────────────────────────────────────────────
export type LivestockSpecies = 'cattle' | 'goat' | 'sheep' | 'poultry' | 'pig';

export interface LivestockAnimal {
  id: string;
  tag: string; // ear-tag / RFID
  species: LivestockSpecies;
  name?: string;
  birthDate?: string;
  weightKg?: number;
  lastVaccineDate?: string;
  nextVaccineDue?: string;
  healthStatus: 'healthy' | 'attention' | 'sick';
  notes?: string;
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export type InventoryUnit = 'kg' | 'L' | 'bag' | 'piece' | 'pack';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'seed' | 'fertilizer' | 'pesticide' | 'feed' | 'tool' | 'other';
  unit: InventoryUnit;
  qty: number;
  lowStockAt: number;
  costPerUnitTZS?: number;
  expiresOn?: string;
  supplier?: string;
}

// ─── Insurance ───────────────────────────────────────────────────────────────
export type InsurancePolicyStatus = 'browse' | 'pending' | 'active' | 'expired' | 'claimed';

export interface InsurancePolicy {
  id: string;
  product: string; // e.g. "Drought Shield — Maize"
  provider: string;
  coverage: 'crop' | 'livestock';
  premiumTZS: number;
  payoutMaxTZS: number;
  termMonths: number;
  status: InsurancePolicyStatus;
  startedAt?: string;
  expiresAt?: string;
  claimReason?: string;
  claimAmountTZS?: number;
}

// ─── Input Supply ────────────────────────────────────────────────────────────
export type InputOrderStatus = 'cart' | 'placed' | 'dispatched' | 'delivered' | 'cancelled';

export interface InputSupplier {
  id: string;
  name: string;
  vetted: boolean;
  region: string;
  rating: number; // 0–5
  category: string;
}

export interface InputOrder {
  id: string;
  supplierId: string;
  itemName: string;
  qty: number;
  unit: InventoryUnit;
  totalTZS: number;
  status: InputOrderStatus;
  expectedDelivery?: string;
  placedAt: string;
}

// ─── Peer Groups ─────────────────────────────────────────────────────────────
export interface PeerGroup {
  id: string;
  name: string;
  topic: string; // e.g. "Maize · Arusha"
  region: string;
  memberCount: number;
  joined: boolean;
  lastActivity?: string;
}

export interface PeerPost {
  id: string;
  groupId: string;
  author: string;
  body: string;
  createdAt: string;
}

// ─── Expert Consultations ────────────────────────────────────────────────────
export type ConsultationStatus =
  | 'available'
  | 'requested'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export interface Expert {
  id: string;
  name: string;
  specialty: string; // e.g. "Soil & Fertility"
  yearsExperience: number;
  languages: string[];
  ratePerHourTZS: number;
  rating: number;
  avatarUrl?: string;
}

export interface Consultation {
  id: string;
  expertId: string;
  scheduledFor?: string;
  status: ConsultationStatus;
  channel: 'video' | 'chat';
  topic: string;
}

// ─── P&L Ledger ──────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  date: string; // ISO
  category: string; // e.g. "Sale · Maize", "Input · Fertilizer"
  description: string;
  amountTZS: number; // +income / -expense
}

// ─── Store ───────────────────────────────────────────────────────────────────
interface FarmDataState {
  // Collections
  livestock: LivestockAnimal[];
  inventory: InventoryItem[];
  insurance: InsurancePolicy[];
  suppliers: InputSupplier[];
  orders: InputOrder[];
  groups: PeerGroup[];
  posts: PeerPost[];
  experts: Expert[];
  consultations: Consultation[];
  ledger: LedgerEntry[];

  // Livestock
  addAnimal: (a: Omit<LivestockAnimal, 'id'>) => void;
  updateAnimal: (id: string, patch: Partial<LivestockAnimal>) => void;
  removeAnimal: (id: string) => void;

  // Inventory
  addItem: (i: Omit<InventoryItem, 'id'>) => void;
  adjustItem: (id: string, delta: number) => void;
  removeItem: (id: string) => void;

  // Insurance
  enrollPolicy: (id: string) => void;
  fileClaim: (id: string, reason: string, amountTZS: number) => void;

  // Input Supply
  placeOrder: (o: Omit<InputOrder, 'id' | 'placedAt' | 'status'>) => void;
  advanceOrder: (id: string, status: InputOrderStatus) => void;

  // Peer Groups
  joinGroup: (id: string) => void;
  leaveGroup: (id: string) => void;
  addPost: (groupId: string, author: string, body: string) => void;

  // Consultations
  requestConsultation: (expertId: string, topic: string, channel: 'video' | 'chat') => void;
  cancelConsultation: (id: string) => void;

  // Ledger
  addLedgerEntry: (e: Omit<LedgerEntry, 'id'> & { id?: string }) => void;
  removeLedgerEntry: (id: string) => void;
}

// ─── Seeds ───────────────────────────────────────────────────────────────────
const SEED_LIVESTOCK: LivestockAnimal[] = [
  {
    id: 'a1',
    tag: 'TZ-0421',
    species: 'cattle',
    name: 'Sita',
    birthDate: '2022-03-12',
    weightKg: 380,
    lastVaccineDate: '2026-03-05',
    nextVaccineDue: '2026-09-05',
    healthStatus: 'healthy',
  },
  {
    id: 'a2',
    tag: 'TZ-0422',
    species: 'cattle',
    name: 'Bahati',
    birthDate: '2023-08-01',
    weightKg: 290,
    lastVaccineDate: '2026-02-10',
    nextVaccineDue: '2026-08-10',
    healthStatus: 'attention',
    notes: 'Slight limp on rear leg',
  },
  {
    id: 'a3',
    tag: 'GT-118',
    species: 'goat',
    birthDate: '2024-11-20',
    weightKg: 32,
    lastVaccineDate: '2026-04-15',
    nextVaccineDue: '2026-10-15',
    healthStatus: 'healthy',
  },
];

// Inventory starts empty — a hardcoded stock list here would show every new
// user 4 items they never bought, with real quantities and costs, same
// anti-pattern as the other seeds already fixed this sweep. inventory.tsx
// already has a real empty state wired for items.length === 0.
const SEED_INVENTORY: InventoryItem[] = [];

const SEED_INSURANCE: InsurancePolicy[] = [
  {
    id: 'p1',
    product: 'Drought Shield — Maize',
    provider: 'Britam',
    coverage: 'crop',
    premiumTZS: 45_000,
    payoutMaxTZS: 1_200_000,
    termMonths: 6,
    status: 'browse',
  },
  {
    id: 'p2',
    product: 'Cattle Mortality Cover',
    provider: 'ACRE Africa',
    coverage: 'livestock',
    premiumTZS: 80_000,
    payoutMaxTZS: 2_500_000,
    termMonths: 12,
    status: 'active',
    startedAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
    expiresAt: new Date(Date.now() + 275 * 86400_000).toISOString(),
  },
  {
    id: 'p3',
    product: 'Hail & Flood — Mixed Crops',
    provider: 'Jubilee',
    coverage: 'crop',
    premiumTZS: 62_000,
    payoutMaxTZS: 1_800_000,
    termMonths: 6,
    status: 'browse',
  },
];

const SEED_SUPPLIERS: InputSupplier[] = [
  {
    id: 's1',
    name: 'YARA East Africa',
    vetted: true,
    region: 'Arusha',
    rating: 4.7,
    category: 'Fertilizer',
  },
  {
    id: 's2',
    name: 'East African Seed Co.',
    vetted: true,
    region: 'Arusha',
    rating: 4.8,
    category: 'Seed',
  },
  {
    id: 's3',
    name: 'Bayer CropScience',
    vetted: true,
    region: 'Dar es Salaam',
    rating: 4.5,
    category: 'Pesticide',
  },
  {
    id: 's4',
    name: 'Mbeya Agro Supplies',
    vetted: false,
    region: 'Mbeya',
    rating: 4.1,
    category: 'General',
  },
  {
    id: 's5',
    name: 'TANSEED International',
    vetted: true,
    region: 'Arusha',
    rating: 4.6,
    category: 'Seed',
  },
  {
    id: 's6',
    name: 'Syngenta Tanzania',
    vetted: true,
    region: 'Dar es Salaam',
    rating: 4.4,
    category: 'Pesticide',
  },
  {
    id: 's7',
    name: 'Moshi Cooperative Union',
    vetted: true,
    region: 'Kilimanjaro',
    rating: 4.9,
    category: 'General',
  },
  {
    id: 's8',
    name: 'Dodoma Mbolea Ltd',
    vetted: false,
    region: 'Dodoma',
    rating: 3.9,
    category: 'Fertilizer',
  },
  {
    id: 's9',
    name: 'ICM Agro Tanzania',
    vetted: true,
    region: 'Dar es Salaam',
    rating: 4.3,
    category: 'Pesticide',
  },
];

// No real supplier-ordering backend exists anywhere in this codebase (no
// order-placement edge function, no email/SMS/API call to any supplier).
// This used to pre-seed every user with a fake already-"dispatched" order
// for CAN Fertilizer from a real company (YARA East Africa, supplierId
// 's1'), complete with a "Confirm Delivery" button — an order the user
// never placed, from a real named business, that would never actually
// arrive since nothing was ever sent anywhere. Real users start with zero
// orders; see handleOrderSample in app/input-supply.tsx for the matching
// fix to the "Order Sample" button.
const SEED_ORDERS: InputOrder[] = [];

// Public group directory (member counts, topics) is legitimate catalog
// content, same as the real named supplier/expert lists below — a farmer
// can genuinely browse and join any of these. But g1 was seeded as
// `joined: true`, falsely showing every new user as already a member of a
// 482-person community they never joined. Real membership only happens
// through joinGroup().
const SEED_GROUPS: PeerGroup[] = [
  {
    id: 'g1',
    name: 'Wakulima wa Mahindi · Arusha',
    topic: 'Maize · Arusha',
    region: 'Arusha',
    memberCount: 482,
    joined: false,
    lastActivity: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: 'g2',
    name: 'Mpunga Bora Mbeya',
    topic: 'Rice · Mbeya',
    region: 'Mbeya',
    memberCount: 211,
    joined: false,
    lastActivity: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
  {
    id: 'g3',
    name: "Ufugaji wa Ng'ombe · Taifa",
    topic: 'Dairy Cattle',
    region: 'National',
    memberCount: 893,
    joined: false,
    lastActivity: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'g4',
    name: 'Korosho Tanzania · Mtwara',
    topic: 'Cashew · Mtwara',
    region: 'Mtwara',
    memberCount: 1240,
    joined: false,
    lastActivity: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: 'g5',
    name: 'Kahawa ya Kilimanjaro',
    topic: 'Coffee · Kilimanjaro',
    region: 'Kilimanjaro',
    memberCount: 678,
    joined: false,
    lastActivity: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    id: 'g6',
    name: 'Wakulima Wanawake Iringa',
    topic: 'Mixed Crops · Iringa',
    region: 'Iringa',
    memberCount: 344,
    joined: false,
    lastActivity: new Date(Date.now() - 12 * 3600_000).toISOString(),
  },
  {
    id: 'g7',
    name: 'Horticulture Hub · Arusha',
    topic: 'Vegetables · Arusha',
    region: 'Arusha',
    memberCount: 529,
    joined: false,
    lastActivity: new Date(Date.now() - 1 * 3600_000).toISOString(),
  },
];

const SEED_POSTS: PeerPost[] = [
  {
    id: 'p1',
    groupId: 'g1',
    author: 'Asha M.',
    body: 'Bei ya mahindi imepanda Soko la Arusha leo — TZS 920/kg.',
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: 'p2',
    groupId: 'g1',
    author: 'John K.',
    body: 'Nimepata Maize Streak kwenye plot 3. Sasa nasubiri ushauri wa Sankofa.',
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
];

const SEED_EXPERTS: Expert[] = [
  {
    id: 'e1',
    name: 'Dkt. Esther Mushi',
    specialty: 'Udongo & Mbolea',
    yearsExperience: 14,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 35_000,
    rating: 4.9,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200',
  },
  {
    id: 'e2',
    name: 'Bw. Daudi Kileo',
    specialty: 'Wadudu & Magonjwa',
    yearsExperience: 9,
    languages: ['Kiswahili'],
    ratePerHourTZS: 25_000,
    rating: 4.7,
  },
  {
    id: 'e3',
    name: 'Dkt. Neema Kessy',
    specialty: 'Afya ya Mifugo',
    yearsExperience: 18,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 40_000,
    rating: 4.95,
    avatarUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200',
  },
  {
    id: 'e4',
    name: 'Bw. Joseph Mramba',
    specialty: 'Kahawa & Korosho',
    yearsExperience: 22,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 45_000,
    rating: 4.88,
  },
  {
    id: 'e5',
    name: 'Bi. Grace Lyimo',
    specialty: 'Bustani & Mboga',
    yearsExperience: 11,
    languages: ['Kiswahili', 'English', 'French'],
    ratePerHourTZS: 30_000,
    rating: 4.82,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200',
  },
  {
    id: 'e6',
    name: 'Bw. Hassan Juma',
    specialty: 'Umwagiliaji & Maji',
    yearsExperience: 15,
    languages: ['Kiswahili', 'Arabic'],
    ratePerHourTZS: 32_000,
    rating: 4.76,
  },
  {
    id: 'e7',
    name: 'Dkt. Amina Suleiman',
    specialty: 'Mpunga & Nafaka',
    yearsExperience: 12,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 38_000,
    rating: 4.91,
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200',
  },
  {
    id: 'e8',
    name: 'Bw. Peter Nkwame',
    specialty: 'Biashara ya Mazao',
    yearsExperience: 8,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 22_000,
    rating: 4.65,
  },
  {
    id: 'e9',
    name: 'Dkt. Fatuma Rashidi',
    specialty: 'Viumbe-Hai & Organic',
    yearsExperience: 16,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 42_000,
    rating: 4.93,
    avatarUrl: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200',
  },
  {
    id: 'e10',
    name: 'Bw. Emmanuel Tarimo',
    specialty: 'Teknolojia ya Kilimo',
    yearsExperience: 7,
    languages: ['Kiswahili', 'English'],
    ratePerHourTZS: 28_000,
    rating: 4.72,
  },
];

// Consultations start empty — a hardcoded "scheduled" appointment here
// showed every new user a video call with a real-named expert they never
// booked. consultations.tsx already only renders the upcoming section when
// upcoming.length > 0.
const SEED_CONSULTATIONS: Consultation[] = [];

// Ledger starts empty. This one matters more than the other seed fixes: the
// ledger doesn't just render on a P&L screen (app/finance.tsx doesn't even
// read this store) — it's the direct input to lib/credit/score.ts's
// computeCreditScore(), a real, transparent, rule-based credit score shown
// on the Agro-ID screen as if it reflects the farmer's genuine financial
// history, explicitly documented as something "a lender... can see exactly
// why the score is what it is." With this seed, every new user's very first
// Agro-ID view showed an already-established score built from 7 transactions
// that never happened. agro-id.tsx already renders a real empty state for
// ledger.length === 0.
const SEED_LEDGER: LedgerEntry[] = [];

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const useFarmDataStore = create<FarmDataState>()(
  persist(
    (set, get) => ({
      livestock: SEED_LIVESTOCK,
      inventory: SEED_INVENTORY,
      insurance: SEED_INSURANCE,
      suppliers: SEED_SUPPLIERS,
      orders: SEED_ORDERS,
      groups: SEED_GROUPS,
      posts: SEED_POSTS,
      experts: SEED_EXPERTS,
      consultations: SEED_CONSULTATIONS,
      ledger: SEED_LEDGER,

      addAnimal: (a) => set((s) => ({ livestock: [{ ...a, id: uid('a') }, ...s.livestock] })),
      updateAnimal: (id, patch) =>
        set((s) => ({ livestock: s.livestock.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeAnimal: (id) => set((s) => ({ livestock: s.livestock.filter((x) => x.id !== id) })),

      addItem: (i) => set((s) => ({ inventory: [{ ...i, id: uid('i') }, ...s.inventory] })),
      adjustItem: (id, delta) =>
        set((s) => ({
          inventory: s.inventory.map((x) =>
            x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x
          ),
        })),
      removeItem: (id) => set((s) => ({ inventory: s.inventory.filter((x) => x.id !== id) })),

      enrollPolicy: (id) =>
        set((s) => ({
          insurance: s.insurance.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'active',
                  startedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + p.termMonths * 30 * 86400_000).toISOString(),
                }
              : p
          ),
        })),
      fileClaim: (id, reason, amountTZS) =>
        set((s) => ({
          insurance: s.insurance.map((p) =>
            p.id === id
              ? { ...p, status: 'claimed', claimReason: reason, claimAmountTZS: amountTZS }
              : p
          ),
        })),

      placeOrder: (o) =>
        set((s) => ({
          orders: [
            { ...o, id: uid('o'), status: 'placed', placedAt: new Date().toISOString() },
            ...s.orders,
          ],
        })),
      advanceOrder: (id, status) =>
        set((s) => ({
          orders: s.orders.map((x) => (x.id === id ? { ...x, status } : x)),
        })),

      joinGroup: (id) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === id ? { ...g, joined: true, memberCount: g.memberCount + 1 } : g
          ),
        })),
      leaveGroup: (id) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === id ? { ...g, joined: false, memberCount: Math.max(0, g.memberCount - 1) } : g
          ),
        })),
      addPost: (groupId, author, body) =>
        set((s) => ({
          posts: [
            { id: uid('p'), groupId, author, body, createdAt: new Date().toISOString() },
            ...s.posts,
          ],
        })),

      requestConsultation: (expertId, topic, channel) =>
        set((s) => ({
          consultations: [
            {
              id: uid('co'),
              expertId,
              status: 'requested',
              channel,
              topic,
            },
            ...s.consultations,
          ],
        })),
      cancelConsultation: (id) =>
        set((s) => ({
          consultations: s.consultations.map((c) =>
            c.id === id ? { ...c, status: 'cancelled' } : c
          ),
        })),

      addLedgerEntry: (e) =>
        set((s) => {
          // A caller may supply an explicit id for offline-first reconciliation
          // (same client_id added locally then re-synced); skip if it already
          // exists so we never double-count in the income/expense/net reducers.
          const id = e.id ?? uid('l');
          if (s.ledger.some((x) => x.id === id)) return s;
          return { ledger: [{ ...e, id }, ...s.ledger] };
        }),
      removeLedgerEntry: (id) => set((s) => ({ ledger: s.ledger.filter((x) => x.id !== id) })),
    }),
    {
      name: 'kilimo-farm-data',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
