import { describe, expect, it, vi } from 'vitest';
import { determineStockStatus, recordStockMovement } from './inventory.js';
import type { DbExecutor } from './client.js';

describe('Inventory Persistence and Stock Engine', () => {
  it('determines stock status correctly based on available quantity and thresholds', () => {
    expect(determineStockStatus(0, 2)).toBe('out_of_stock');
    expect(determineStockStatus(-5, 2)).toBe('out_of_stock');
    expect(determineStockStatus(1, 2)).toBe('critical');
    expect(determineStockStatus(2, 2)).toBe('low_stock');
    expect(determineStockStatus(5, 2)).toBe('in_stock');
  });

  it('rejects stock movement when external ERP owns stock', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                enabled: true,
                stockOwnership: 'external_erp',
                defaultThreshold: 1,
              },
            ]),
          }),
        }),
      }),
    } as unknown as DbExecutor;

    await expect(
      recordStockMovement(
        fakeDb,
        {
          variantId: 'a0000000-0000-4000-8000-000000000001',
          quantity: 10,
          movementType: 'inward',
        },
        'user-1',
      ),
    ).rejects.toThrow('Smart Pricing cannot mutate stock when external ERP owns stock.');
  });

  it('records inward stock movement, updates balance and creates alert when stock is low', async () => {
    const variantId = 'a0000000-0000-4000-8000-000000000001';
    let balanceState: Record<string, unknown> | null = null;

    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              if (balanceState) return Promise.resolve([balanceState]);
              return Promise.resolve([
                {
                  enabled: true,
                  stockOwnership: 'smart_pricing',
                  defaultThreshold: 2,
                },
              ]);
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => ({
          returning: vi.fn().mockImplementation(() => {
            if (val.availableQuantity !== undefined) {
              balanceState = { ...val, id: 'bal-1', version: 1 };
              return Promise.resolve([balanceState]);
            }
            return Promise.resolve([{ id: 'movement-1', ...val }]);
          }),
        })),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockImplementation(() =>
                Promise.resolve([{ id: 'bal-1', availableQuantity: 1, version: 1 }]),
              ),
          }),
        }),
      }),
    } as unknown as DbExecutor;

    // Inward of 1 unit (threshold is 2 -> critical alert)
    const result = await recordStockMovement(
      fakeDb,
      {
        variantId,
        quantity: 1,
        movementType: 'inward',
        reason: 'Initial stock',
      },
      'admin-1',
    );

    expect(result.stockStatus).toBe('critical');
    expect(result.balance.availableQuantity).toBe(1);
    expect(fakeDb.insert).toHaveBeenCalled();
  });
});
