/**
 * Kilimo AI — Global State Store
 * Powered by Zustand with AsyncStorage persistence (MMKV-ready)
 *
 * This is the single source of truth for:
 * - Agro ID & user session
 * - Offline mode & sync queue
 * - Farm vitals (sensor data)
 * - Notifications badge count
 * - Active wallet balance
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgroID {
  id: string;
  name: string;
  role: string;
  location: string;
  tier: 'Free' | 'Premium' | 'Cooperative';
  joinDate: string;
  avatarUrl?: string;
  mpesaLinked: boolean;
  phoneNumber?: string;
  biometricEnabled: boolean;
  coopId?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  nationalId?: string;
  tinNumber?: string;
  businessLicense?: string;
  certifications?: string[];
}

export interface SyncQueueItem {
  id: string;
  type: 'scan_result' | 'task_complete' | 'market_order' | 'irrigation_log' | 'voice_note';
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

export interface FarmVitals {
  soilHealth: number; // 0–100
  moisture: number; // 0–100
  temperature: number; // °C
  yieldEstimate: number; // tonnes
  lastUpdated: string;
  soilPh: number; // 0-14
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: string;
}

export interface WalletState {
  balanceTZS: number;
  mpesaPhone: string | null;
  lastTransaction: string | null;
}

export interface ActivityItem {
  id: string;
  title: string;
  route: string;
  time: string;
  iconName: string;
  iconColor: string;
  status: string;
  detail: string;
}

export interface SankofaMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

// ─── Store State ─────────────────────────────────────────────────────────────

export interface FarmProfile {
  primaryCrops: string[];
  region: string;
  district?: string;
  farmSizeAcres: number;
  mainActivity: 'mazao' | 'mifugo' | 'mchanganyiko';
  hasLivestock: boolean;
  hasIrrigation: boolean;
}

export type AppLanguage = 'sw' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

interface KilimoState {
  // Auth / Identity
  agroId: AgroID | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  language: AppLanguage;
  themePreference: ThemePreference;
  farmProfile: FarmProfile | null;
  registeredIds: string[];

  // Network / Offline
  isOffline: boolean;
  // Offline Sync
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  lastSyncedAt: string | null;

  // Farm Intelligence
  farmVitals: FarmVitals;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Wallet / Finance
  wallet: WalletState;

  // AI Chat History
  sankofaHistory: SankofaMessage[];

  // Feed
  activities: ActivityItem[];

  // AI Training & Settings
  customSystemPrompt: string | null;
  seededDocuments: string[];
  completedModules: string[];
  aiCertified: boolean;
  aiAccuracy: number;

  // Crop Health Logs & Excel Data
  cropHealthLogs: any[];
  activeExcelData: any | null;

  // ─── Actions ───────────────────────────────────────────────────

  // Auth
  setAgroId: (agroId: AgroID) => void;
  updateAgroId: (patch: Partial<AgroID>) => void;
  clearAgroId: () => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setFarmProfile: (profile: FarmProfile) => void;
  resetOnboarding: () => void;
  addRegisteredId: (id: string) => void;

  // Network
  setOffline: (offline: boolean) => void;
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>) => void;
  removeFromSyncQueue: (id: string) => void;
  // Offline Sync
  setOnlineStatus: (status: boolean) => void;
  setLastSyncedAt: (timestamp: string) => void;
  enqueueAction: (action: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>) => void;
  dequeueAction: (id: string) => void;
  clearQueue: () => void;

  // Farm Vitals
  updateFarmVitals: (vitals: Partial<FarmVitals>) => void;

  // Notifications
  addNotification: (notif: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;

  // Wallet
  updateWallet: (wallet: Partial<WalletState>) => void;

  // AI Chat
  appendSankofaMessage: (msg: SankofaMessage) => void;
  clearSankofaHistory: () => void;

  // Feed
  setActivities: (activities: ActivityItem[]) => void;

  // AI Settings Actions
  setCustomSystemPrompt: (prompt: string | null) => void;
  addSeededDocument: (doc: string) => void;
  removeSeededDocument: (doc: string) => void;
  completeModule: (modId: string) => void;
  setAiAccuracy: (acc: number) => void;

  // Crop Health & Excel Actions
  addCropHealthLog: (log: any) => void;
  clearCropHealthLogs: () => void;
  setActiveExcelData: (data: any | null) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useKilimoStore = create<KilimoState>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────
      // Fresh-install defaults — wizard creates real agroId + profile on completion.
      // Existing users hydrate previously-persisted values from AsyncStorage.
      agroId: null,
      isAuthenticated: false,
      onboardingComplete: false,
      language: 'sw',
      themePreference: 'system' as ThemePreference,
      farmProfile: null,
      registeredIds: [],

      isOffline: false,
      isOnline: true,
      syncQueue: [],
      lastSyncedAt: null,

      farmVitals: {
        soilHealth: 84,
        moisture: 42,
        temperature: 24,
        yieldEstimate: 1.2,
        soilPh: 6.8,
        lastUpdated: new Date().toISOString(),
      },

      // No seeded notifications: a new install has none. Real ones come from the backend
      // (user_notifications) or from on-device events.
      notifications: [],
      unreadCount: 0,

      wallet: {
        balanceTZS: 0,
        mpesaPhone: null,
        lastTransaction: null,
      },

      sankofaHistory: [
        {
          id: '1',
          text: 'Jambo! Mimi ni Sankofa AI, mshauri wako wa kilimo. Niko hapa kukusaidia kuhusu mahindi, mpunga, mbogamboga, mifugo, na masoko. Ninaweza kukusaidiaje leo?',
          sender: 'ai',
          timestamp: new Date().toISOString(),
        },
      ],

      activities: [],

      // AI Training & Settings
      customSystemPrompt: null,
      seededDocuments: ['TARI Maize Guide v2.pdf', 'Soil pH Mapping Mbeya.txt'],
      completedModules: [],
      aiCertified: false,
      aiAccuracy: 95.8,

      cropHealthLogs: [],
      activeExcelData: null,

      // ── Auth Actions ───────────────────────────────────────────
      setAgroId: (agroId) => set({ agroId, isAuthenticated: true, onboardingComplete: true }),
      updateAgroId: (patch) =>
        set((state) => ({ agroId: state.agroId ? { ...state.agroId, ...patch } : state.agroId })),
      clearAgroId: () => set({ agroId: null, isAuthenticated: false }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setLanguage: (language) => set({ language }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setFarmProfile: (farmProfile) => set({ farmProfile }),
      resetOnboarding: () =>
        set({ onboardingComplete: false, agroId: null, farmProfile: null, isAuthenticated: false }),
      addRegisteredId: (id) => set((state) => ({ registeredIds: [...state.registeredIds, id] })),

      // ── Network Actions ────────────────────────────────────────
      setOffline: (offline) => set({ isOffline: offline }),

      addToSyncQueue: (item) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              createdAt: new Date().toISOString(),
              retries: 0,
            },
          ],
        })),

      removeFromSyncQueue: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        })),

      // ── Offline Actions ────────────────────────────────────────
      setOnlineStatus: (status) => set({ isOnline: status }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
      enqueueAction: (action) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...action,
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              retries: 0,
            },
          ],
        })),
      dequeueAction: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((q) => q.id !== id),
        })),
      clearQueue: () => set({ syncQueue: [] }),

      // ── Farm Vitals Actions ────────────────────────────────────
      updateFarmVitals: (vitals) =>
        set((state) => ({
          farmVitals: {
            ...state.farmVitals,
            ...vitals,
            lastUpdated: new Date().toISOString(),
          },
        })),

      // ── Notification Actions ───────────────────────────────────
      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif_${Date.now()}`,
              read: false,
              timestamp: new Date().toISOString(),
            },
            ...state.notifications,
          ],
          unreadCount: state.unreadCount + 1,
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      removeNotification: (id) =>
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: Math.max(0, state.unreadCount - (notif && !notif.read ? 1 : 0)),
          };
        }),

      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

      // ── Wallet Actions ─────────────────────────────────────────
      updateWallet: (patch) => set((s) => ({ wallet: { ...s.wallet, ...patch } })),

      // ── AI Chat Actions ────────────────────────────────────────
      appendSankofaMessage: (msg) => set((s) => ({ sankofaHistory: [...s.sankofaHistory, msg] })),
      clearSankofaHistory: () => set({ sankofaHistory: [] }),

      // ── Feed Actions ───────────────────────────────────────────
      setActivities: (activities) => set({ activities }),

      // ── AI Settings Actions ────────────────────────────────────
      setCustomSystemPrompt: (customSystemPrompt) => set({ customSystemPrompt }),
      addSeededDocument: (doc) => set((s) => ({ seededDocuments: [...s.seededDocuments, doc] })),
      removeSeededDocument: (doc) =>
        set((s) => ({ seededDocuments: s.seededDocuments.filter((d) => d !== doc) })),
      completeModule: (modId) =>
        set((s) => {
          const nextModules = s.completedModules.includes(modId)
            ? s.completedModules
            : [...s.completedModules, modId];

          const isCertifiedNow = nextModules.length >= 5;
          const updatedAgroId = s.agroId
            ? {
                ...s.agroId,
                certifications: s.agroId.certifications?.includes('Sankofa AI Certified')
                  ? s.agroId.certifications
                  : [...(s.agroId.certifications || []), 'Sankofa AI Certified'],
              }
            : null;

          return {
            completedModules: nextModules,
            aiCertified: isCertifiedNow ? true : s.aiCertified,
            agroId: isCertifiedNow ? updatedAgroId : s.agroId,
          };
        }),
      setAiAccuracy: (aiAccuracy) => set({ aiAccuracy }),

      addCropHealthLog: (log) =>
        set((s) => ({ cropHealthLogs: [log, ...s.cropHealthLogs].slice(0, 100) })),
      clearCropHealthLogs: () => set({ cropHealthLogs: [] }),
      setActiveExcelData: (activeExcelData) => set({ activeExcelData }),
    }),
    {
      name: 'kilimo-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      // Backfill: pre-v2 stores didn't have `onboardingComplete`. Returning
      // authenticated users (have agroId or were marked authenticated) should
      // skip onboarding instead of being forced back through it.
      migrate: (persisted: any, _version) => {
        if (!persisted) return persisted;
        if (persisted.onboardingComplete == null) {
          persisted.onboardingComplete = Boolean(
            persisted.agroId || persisted.isAuthenticated || persisted.farmProfile
          );
        }
        // v3: purge fabricated seed data that earlier builds wrote to every install.
        const SEED_NOTIFICATION_IDS = ['n1', 'n2', 'n3'];
        const SEED_IDS = ['12345678901234567890', '123456789'];
        if (Array.isArray(persisted.notifications)) {
          persisted.notifications = persisted.notifications.filter(
            (n: any) => !SEED_NOTIFICATION_IDS.includes(n?.id)
          );
          persisted.unreadCount = persisted.notifications.filter((n: any) => !n.read).length;
        }
        if (Array.isArray(persisted.registeredIds)) {
          persisted.registeredIds = persisted.registeredIds.filter(
            (id: string) => !SEED_IDS.includes(id)
          );
        }
        return persisted;
      },
      // Only persist non-sensitive, offline-resilient data
      partialize: (state) => ({
        agroId: state.agroId,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        language: state.language,
        themePreference: state.themePreference,
        farmProfile: state.farmProfile,
        syncQueue: state.syncQueue,
        lastSyncedAt: state.lastSyncedAt,
        farmVitals: state.farmVitals,
        wallet: { ...state.wallet, mpesaPhone: undefined }, // Never persist phone
        notifications: state.notifications.slice(0, 50), // Cap at 50
        unreadCount: state.unreadCount,
        registeredIds: state.registeredIds,
        customSystemPrompt: state.customSystemPrompt,
        seededDocuments: state.seededDocuments,
        completedModules: state.completedModules,
        aiCertified: state.aiCertified,
        aiAccuracy: state.aiAccuracy,
        cropHealthLogs: state.cropHealthLogs,
      }),
    }
  )
);
