jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import InventoryScreen from '../app/inventory';
import {
  expiryStatus,
  inventorySummary,
  isLowStock,
  mapItemRow,
  movementDelta,
  recordMovement,
  runningBalances,
  stockAfter,
  validateItemInput,
  validateMovementInput,
  emptyItemInput,
  emptyMovementInput,
  type Item,
  type Movement,
} from '../lib/inventory';
import { useKilimoStore } from '../store/useKilimoStore';

const NOW = new Date(2026, 8, 21, 12);

const item = (p: Partial<Item> = {}): Item => ({
  id: 'i1',
  name: 'Maize seed',
  category: 'seed',
  quantity: 10,
  unit: 'kg',
  lowStockThreshold: null,
  unitCost: null,
  location: null,
  expiryDate: null,
  notes: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...p,
});

const itemRow = {
  id: 'i1',
  name: 'DAP fertiliser',
  category: 'fertiliser',
  quantity: '2',
  unit: 'bag',
  low_stock_threshold: '3',
  unit_cost: '65000',
  location: 'Store',
  expiry_date: null,
  notes: null,
  created_at: 't',
  updated_at: 't',
};

describe('inventory stock math', () => {
  it('signs movements by reason', () => {
    expect(movementDelta('purchase', 5)).toBe(5);
    expect(movementDelta('use', 5)).toBe(-5);
    expect(movementDelta('sale', 5)).toBe(-5);
    expect(movementDelta('loss', 5)).toBe(-5);
    expect(movementDelta('adjustment', 5, 'in')).toBe(5);
    expect(movementDelta('adjustment', 5, 'out')).toBe(-5);
  });

  it('never lets stock go below zero and avoids float noise', () => {
    expect(stockAfter(10, -10)).toBe(0);
    expect(stockAfter(10, -10.5)).toBeNull();
    expect(stockAfter(0.1, 0.2)).toBe(0.3);
  });

  it('computes running balances newest-first from the current quantity', () => {
    const mv = (id: string, delta: number): Movement => ({
      id,
      itemId: 'i1',
      delta,
      reason: delta > 0 ? 'purchase' : 'use',
      movementDate: '2026-09-01',
      note: null,
      createdAt: 't',
    });
    // opening 10, +5, -3 => current 12; newest first: -3 then +5 then opening +10
    expect(runningBalances(12, [mv('c', -3), mv('b', 5), mv('a', 10)])).toEqual([12, 15, 10]);
  });

  it('flags low stock only when a threshold is set', () => {
    expect(isLowStock(item({ quantity: 2, lowStockThreshold: null }))).toBe(false);
    expect(isLowStock(item({ quantity: 3, lowStockThreshold: 3 }))).toBe(true);
    expect(isLowStock(item({ quantity: 4, lowStockThreshold: 3 }))).toBe(false);
  });

  it('classifies expiry by calendar day', () => {
    expect(expiryStatus(item({ expiryDate: null }), NOW).state).toBe('none');
    expect(expiryStatus(item({ expiryDate: '2026-09-20' }), NOW)).toEqual({
      state: 'expired',
      daysLeft: -1,
    });
    expect(expiryStatus(item({ expiryDate: '2026-09-21' }), NOW)).toEqual({
      state: 'soon',
      daysLeft: 0,
    });
    expect(expiryStatus(item({ expiryDate: '2027-01-01' }), NOW).state).toBe('ok');
  });

  it('values only items with a recorded cost and counts the rest', () => {
    const s = inventorySummary(
      [item({ quantity: 2, unitCost: 1000 }), item({ id: 'i2', unitCost: null })],
      NOW
    );
    expect(s.totalValue).toBe(2000);
    expect(s.unvalued).toBe(1);
    expect(s.itemCount).toBe(2);
  });
});

describe('inventory validation', () => {
  it('requires a name and rejects negative opening stock', () => {
    const e = validateItemInput({ ...emptyItemInput(), quantity: '-1' }, true);
    expect(e.name).toBe('required');
    expect(e.quantity).toBe('invalid');
  });

  it('ignores the quantity field when editing (stock only changes through movements)', () => {
    expect(
      validateItemInput({ ...emptyItemInput(), name: 'x', quantity: '-1' }, false).quantity
    ).toBeUndefined();
  });

  it('rejects a movement that would take stock below zero, and future dates', () => {
    const m = { ...emptyMovementInput(NOW), reason: 'use' as const, amount: '11' };
    expect(validateMovementInput(m, 10, NOW).amount).toBe('insufficient');
    expect(
      validateMovementInput({ ...m, amount: '1', movementDate: '2026-09-22' }, 10, NOW).movementDate
    ).toBe('future');
  });

  it('maps numeric strings from PostgREST into numbers', () => {
    expect(mapItemRow(itemRow)).toMatchObject({
      quantity: 2,
      lowStockThreshold: 3,
      unitCost: 65000,
    });
  });
});

describe('recordMovement', () => {
  it('does not call the backend when stock is insufficient', async () => {
    const from = jest.fn();
    const r = await recordMovement(
      { from },
      { id: 'i1', quantity: 1 },
      { ...emptyMovementInput(NOW), reason: 'use', amount: '2' },
      NOW
    );
    expect(r).toMatchObject({ ok: false, reason: 'insufficient_stock' });
    expect(from).not.toHaveBeenCalled();
  });

  it('maps a database check violation (another device spent the stock) to insufficient_stock', async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { code: '23514', message: 'nonneg' } });
    const client = { from: () => ({ insert: () => ({ select: () => ({ single }) }) }) };
    const r = await recordMovement(
      client,
      { id: 'i1', quantity: 5 },
      { ...emptyMovementInput(NOW), reason: 'use', amount: '2' },
      NOW
    );
    expect(r).toMatchObject({ ok: false, reason: 'insufficient_stock' });
  });

  it('is not_configured without a backend', async () => {
    const r = await recordMovement(
      null,
      { id: 'i1', quantity: 5 },
      { ...emptyMovementInput(NOW), amount: '1' },
      NOW
    );
    expect(r).toMatchObject({ ok: false, reason: 'not_configured' });
  });
});

/** Minimal PostgREST fake: every query on a table resolves to the fixture. */
function backend(tables: Record<string, { data: any; error: any }>) {
  const from = jest.fn((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const b: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') return (res: any) => Promise.resolve(result).then(res);
          return () => b;
        },
      }
    );
    return b;
  });
  return { from };
}

describe('Inventory screen', () => {
  beforeEach(() => {
    useKilimoStore.setState({ isOffline: false, language: 'en' } as any);
  });

  it('shows an honest empty state for a new user (no seeded items)', async () => {
    (global as any).__TEST_SUPABASE__ = backend({ inventory_items: { data: [], error: null } });
    render(<InventoryScreen />);
    await waitFor(() => expect(screen.getByText('No items yet')).toBeTruthy());
    expect(screen.queryByText('Maize seed')).toBeNull();
  });

  it('lists real items with low-stock alerts and value', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      inventory_items: { data: [itemRow], error: null },
    });
    render(<InventoryScreen />);
    await waitFor(() => expect(screen.getByText('DAP fertiliser')).toBeTruthy());
    expect(screen.getByText('Running low')).toBeTruthy();
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0);
  });

  it('shows an error with retry, never an empty-looking success, when loading fails', async () => {
    (global as any).__TEST_SUPABASE__ = backend({
      inventory_items: { data: null, error: { message: 'boom' } },
    });
    render(<InventoryScreen />);
    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy());
    expect(screen.queryByText('No items yet')).toBeNull();
  });

  it('renders in Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    (global as any).__TEST_SUPABASE__ = backend({ inventory_items: { data: [], error: null } });
    render(<InventoryScreen />);
    await waitFor(() => expect(screen.getByText('Hakuna bidhaa bado')).toBeTruthy());
    expect(screen.queryByText('No items yet')).toBeNull();
  });
});
