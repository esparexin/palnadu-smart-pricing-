import { describe, expect, it } from 'vitest';
import {
  CreateStockMovementRequestSchema,
  InventoryConfigSchema,
  InventoryBalanceResponseSchema,
  InventoryAlertResponseSchema,
} from './inventory.js';

describe('inventory contracts', () => {
  it('validates inventory configuration schema', () => {
    const config = {
      enabled: true,
      stockOwnership: 'smart_pricing' as const,
      defaultThreshold: 5,
    };
    const parsed = InventoryConfigSchema.parse(config);
    expect(parsed.enabled).toBe(true);
    expect(parsed.defaultThreshold).toBe(5);
  });

  it('validates stock movement request schema', () => {
    const movement = {
      variantId: 'a0000000-0000-4000-8000-000000000001',
      quantity: 10,
      movementType: 'inward' as const,
      reason: 'Purchase order #123',
    };
    const parsed = CreateStockMovementRequestSchema.parse(movement);
    expect(parsed.quantity).toBe(10);
    expect(parsed.movementType).toBe('inward');
  });

  it('rejects stock movement with zero quantity', () => {
    const movement = {
      variantId: 'a0000000-0000-4000-8000-000000000001',
      quantity: 0,
      movementType: 'inward' as const,
    };
    expect(() => CreateStockMovementRequestSchema.parse(movement)).toThrow();
  });

  it('validates inventory balance response schema', () => {
    const balance = {
      variantId: 'a0000000-0000-4000-8000-000000000001',
      sku: 'SKU-001',
      productName: 'Solar Inverter',
      location: 'Warehouse A',
      availableQuantity: 15,
      reservedQuantity: 0,
      lowStockThreshold: 2,
      stockStatus: 'in_stock' as const,
      updatedAt: new Date().toISOString(),
    };
    const parsed = InventoryBalanceResponseSchema.parse(balance);
    expect(parsed.availableQuantity).toBe(15);
    expect(parsed.stockStatus).toBe('in_stock');
  });

  it('validates inventory alert response schema', () => {
    const alert = {
      id: 'a0000000-0000-4000-8000-000000000002',
      variantId: 'a0000000-0000-4000-8000-000000000001',
      sku: 'SKU-001',
      productName: 'Solar Inverter',
      alertClass: 'low_stock' as const,
      thresholdSnapshot: 2,
      availableSnapshot: 1,
      state: 'active' as const,
      clearedAt: null,
      createdAt: new Date().toISOString(),
    };
    const parsed = InventoryAlertResponseSchema.parse(alert);
    expect(parsed.alertClass).toBe('low_stock');
    expect(parsed.availableSnapshot).toBe(1);
  });
});
