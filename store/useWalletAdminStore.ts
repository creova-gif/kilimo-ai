/**
 * Kilimo AI — Wallet Admin state.
 *
 * There is no co-op wallet backend yet: no table or edge function holds member balances,
 * payout requests or an aggregated M-Pesa ledger. Earlier builds shipped a seeded in-memory store
 * (invented members, balances and payouts) and persisted it to every device; that is gone. The
 * wallet-admin screens show an honest "not available yet" state until a real data source exists.
 *
 * On load this module deletes the seeded data earlier builds persisted under LEGACY_STORAGE_KEY.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const LEGACY_STORAGE_KEY = 'kilimo-wallet-admin-v1';

export interface WalletAdminState {
  /** True only once a real wallet-admin service is wired up. */
  backendAvailable: boolean;
}

export const useWalletAdminStore = create<WalletAdminState>()(() => ({
  backendAvailable: false,
}));

/** Remove the invented members/transactions/payouts older builds persisted. Best-effort. */
export async function purgeLegacyWalletAdminData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to purge */
  }
}

void purgeLegacyWalletAdminData();
