import { describe, expect, it, vi } from 'vitest';
import { InventoryClient } from './inventory-client.js';

describe('InventoryClient', () => {
  it('calls getConfig on correct endpoint', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        enabled: true,
        stockOwnership: 'smart_pricing',
        defaultThreshold: 2,
      }),
    };
    const client = new InventoryClient(mockExecutor);
    const res = await client.getConfig();
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/inventory/config');
    expect(res.enabled).toBe(true);
  });

  it('calls updateConfig with patch payload', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        enabled: true,
        stockOwnership: 'smart_pricing',
        defaultThreshold: 5,
      }),
    };
    const client = new InventoryClient(mockExecutor);
    const res = await client.updateConfig({ defaultThreshold: 5 });
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/inventory/config',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(res.defaultThreshold).toBe(5);
  });

  it('calls recordMovement with correct payload', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        movement: { id: 'm-1' },
        stockStatus: 'in_stock',
      }),
    };
    const client = new InventoryClient(mockExecutor);
    const res = await client.recordMovement({
      variantId: 'a0000000-0000-4000-8000-000000000001',
      quantity: 5,
      movementType: 'inward',
    });
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/inventory/movements',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.stockStatus).toBe('in_stock');
  });

  it('calls acknowledgeAlert with alert ID', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({ success: true }),
    };
    const client = new InventoryClient(mockExecutor);
    const res = await client.acknowledgeAlert('alert-123');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/inventory/alerts/alert-123/acknowledge',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.success).toBe(true);
  });
});
