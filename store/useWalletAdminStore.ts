/**
 * Kilimo AI — Wallet Admin Store
 *
 * Enterprise/Co-op operator surface for:
 *  • Aggregated ledger of M-Pesa transactions across members
 *  • Payout queue with approve / reject / mark-settled lifecycle
 *  • Member account list (linked phone, balance, status)
 *
 * Automated M-Pesa disbursement (Daraja STK push) lands in T205. Until then
 * this is an honest manual-reconciliation tool, not a payment processor:
 * approvePayout() only records the admin's decision; the admin then sends
 * the real payment themselves via their own M-Pesa, and markSettled()
 * requires them to type in the real receipt number they got back — it never
 * fabricates one. Each step mirrors to an in-app notification and an SMS to
 * the member (see lib/sms — itself honest: it logs a "would send" stub with
 * no real credentials configured, rather than pretending to deliver).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSms } from '../lib/sms';
import { useKilimoStore } from './useKilimoStore';
import { normalizeRole } from '../lib/access';

/** Returns true only if the current user has full wallet_admin access. */
function currentUserCanDecide(): boolean {
  const role = useKilimoStore.getState().agroId?.role;
  const canon = normalizeRole(role);
  return canon === 'commercial_admin' || canon === 'coop_leader';
}

export type TxnType = 'deposit' | 'payout' | 'fee' | 'transfer';
export type TxnStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  type: TxnType;
  amountTZS: number;
  status: TxnStatus;
  reference: string; // M-Pesa receipt or internal ref
  note?: string;
  createdAt: string;
}

export type PayoutStatus = 'requested' | 'approved' | 'rejected' | 'settled';

export interface PayoutRequest {
  id: string;
  memberId: string;
  memberName: string;
  amountTZS: number;
  mpesaPhone: string;
  reason: string;
  status: PayoutStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string; // Admin agroId
  rejectionReason?: string;
  settledTxnId?: string;
}

export interface Member {
  id: string;
  name: string;
  mpesaPhone: string; // E.164
  balanceTZS: number;
  status: 'active' | 'suspended';
  joinedAt: string;
}

// ─── Initial state ───────────────────────────────────────────────────────────
// This used to pre-populate every commercial_admin/coop_leader with 5
// fictional cooperative members (with fake M-Pesa numbers and balances
// totalling TSh 3.11M), 5 fake completed/pending transactions with fake
// M-Pesa receipt numbers, and fake payout requests — all persisted to the
// device indefinitely (Zustand `persist`), with nothing in the UI
// disclosing any of it was fabricated. A real cooperative leader opening
// this for the first time would see what looks like an existing
// cooperative with real members and real money, none of which was real.
// Real users start with none of this; every screen here (index.tsx,
// payouts.tsx, transactions.tsx) already has an honest empty state for
// zero members/transactions/payouts.
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

// ─── Store interface ─────────────────────────────────────────────────────────

export interface WalletAdminState {
  members: Member[];
  transactions: Transaction[];
  payouts: PayoutRequest[];

  // Derived helpers
  pendingPayoutCount: () => number;
  totalBalanceTZS: () => number;

  // Actions
  requestPayout: (input: Omit<PayoutRequest, 'id' | 'status' | 'requestedAt'>) => string;
  approvePayout: (id: string, adminName: string) => void;
  rejectPayout: (id: string, adminName: string, reason: string) => void;
  markSettled: (id: string, mpesaReceipt: string) => void;
  recordTransaction: (txn: Omit<Transaction, 'id' | 'createdAt'>) => string;
  reset: () => void;
}

const fresh = (): Pick<WalletAdminState, 'members' | 'transactions' | 'payouts'> => ({
  members: [],
  transactions: [],
  payouts: [],
});

export const useWalletAdminStore = create<WalletAdminState>()(
  persist(
    (set, get) => ({
      ...fresh(),

      pendingPayoutCount: () => get().payouts.filter((p) => p.status === 'requested').length,
      totalBalanceTZS: () => get().members.reduce((s, m) => s + m.balanceTZS, 0),

      requestPayout: (input) => {
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          payouts: [{ ...input, id, status: 'requested', requestedAt: now() }, ...s.payouts],
        }));
        return id;
      },

      approvePayout: (id, adminName) => {
        if (!currentUserCanDecide()) return;
        const target = get().payouts.find((p) => p.id === id);
        if (!target || target.status !== 'requested') return;
        set((s) => ({
          payouts: s.payouts.map((p) =>
            p.id === id ? { ...p, status: 'approved', decidedAt: now(), decidedBy: adminName } : p
          ),
        }));
        // SMS stub fires immediately; real Daraja STK push lands in T205.
        sendSms({
          to: target.mpesaPhone,
          body: `Ombi lako la TSh ${target.amountTZS.toLocaleString()} limeidhinishwa. Pesa zitatumwa hivi karibuni.`,
          event: 'payment_received',
          meta: { payoutId: id },
        }).catch(() => undefined);
        useKilimoStore.getState().addNotification({
          title: 'Malipo yameidhinishwa',
          body: `${target.memberName} — TSh ${target.amountTZS.toLocaleString()}`,
          type: 'success',
        });
      },

      rejectPayout: (id, adminName, reason) => {
        if (!currentUserCanDecide()) return;
        const target = get().payouts.find((p) => p.id === id);
        if (!target || target.status !== 'requested') return;
        set((s) => ({
          payouts: s.payouts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'rejected',
                  decidedAt: now(),
                  decidedBy: adminName,
                  rejectionReason: reason,
                }
              : p
          ),
        }));
        // Mirror rejection to member via SMS stub (consistent with approve path).
        sendSms({
          to: target.mpesaPhone,
          body: `Ombi lako la TSh ${target.amountTZS.toLocaleString()} limekataliwa. Sababu: ${reason}`,
          event: 'payment_received',
          meta: { payoutId: id, decision: 'rejected' },
        }).catch(() => undefined);
        useKilimoStore.getState().addNotification({
          title: 'Malipo yamekataliwa',
          body: `${target.memberName} — ${reason}`,
          type: 'warning',
        });
      },

      markSettled: (id, mpesaReceipt) => {
        if (!currentUserCanDecide()) return;
        const target = get().payouts.find((p) => p.id === id);
        if (!target || target.status !== 'approved') return;

        // Block settlement if member balance would go negative.
        const member = get().members.find((m) => m.id === target.memberId);
        if (member && member.balanceTZS < target.amountTZS) {
          useKilimoStore.getState().addNotification({
            title: 'Salio halitooshi',
            body: `${target.memberName} ana TSh ${member.balanceTZS.toLocaleString()} — malipo ya TSh ${target.amountTZS.toLocaleString()} yanazidi.`,
            type: 'alert',
          });
          return;
        }

        // Create a settlement transaction + decrement member balance atomically.
        const txnId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          payouts: s.payouts.map((p) =>
            p.id === id ? { ...p, status: 'settled', settledTxnId: txnId } : p
          ),
          transactions: [
            {
              id: txnId,
              memberId: target.memberId,
              memberName: target.memberName,
              type: 'payout',
              amountTZS: target.amountTZS,
              status: 'completed',
              reference: mpesaReceipt,
              note: target.reason,
              createdAt: now(),
            },
            ...s.transactions,
          ],
          members: s.members.map((m) =>
            m.id === target.memberId ? { ...m, balanceTZS: m.balanceTZS - target.amountTZS } : m
          ),
        }));
        // Notify member that payout has been sent.
        sendSms({
          to: target.mpesaPhone,
          body: `Malipo yako ya TSh ${target.amountTZS.toLocaleString()} yametumwa. Risiti: ${mpesaReceipt}`,
          event: 'payment_received',
          meta: { payoutId: id, receipt: mpesaReceipt },
        }).catch(() => undefined);
        useKilimoStore.getState().addNotification({
          title: 'Malipo yametumwa',
          body: `${target.memberName} — TSh ${target.amountTZS.toLocaleString()} · ${mpesaReceipt}`,
          type: 'success',
        });
      },

      recordTransaction: (txn) => {
        const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          transactions: [{ ...txn, id, createdAt: now() }, ...s.transactions],
        }));
        return id;
      },

      reset: () => set(fresh()),
    }),
    {
      name: 'kilimo-wallet-admin-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
