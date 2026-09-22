/**
 * Ledger shape consumed by the credit score (lib/credit/score.ts) and the P&L export, built from
 * the farmer's real `finance_entries` (lib/finance.ts). Signed amounts: + income, − expense.
 */
import type { FinanceEntry } from '../finance';

export interface LedgerEntry {
  id: string;
  date: string; // ISO timestamp (entry day at 00:00 UTC)
  category: string;
  description: string;
  amountTZS: number; // +income / -expense
}

export function ledgerFromFinance(entries: FinanceEntry[]): LedgerEntry[] {
  return entries.map((e) => ({
    id: e.id,
    date: `${e.entryDate}T00:00:00.000Z`,
    category: e.category,
    description: e.description,
    amountTZS: e.kind === 'income' ? e.amountTzs : -e.amountTzs,
  }));
}
