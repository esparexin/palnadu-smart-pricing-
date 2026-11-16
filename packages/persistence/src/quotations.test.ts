import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { DbExecutor } from './client.js';
import { createQuotationEnquiry } from './quotations.js';

describe('Quotation Persistence & Idempotency', () => {
  it('returns existing quotation enquiry when same idempotency key is submitted', async () => {
    const existing = {
      id: randomUUID(),
      referenceNumber: 'ENQ-20261116-TEST',
      customerName: 'Existing Customer',
      customerEmail: 'existing@example.com',
      customerPhone: '+919876543210',
      customerNotes: null,
      status: 'submitted',
      idempotencyKey: 'idemp-stable-key-1',
      subtotalPaise: 10000,
      discountTotalPaise: 0,
      grandTotalPaise: 10000,
      companySnapshot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [existing],
          }),
        }),
      }),
      insert: vi.fn(),
    } as unknown as DbExecutor;

    const result = await createQuotationEnquiry(mockDb, {
      customerName: 'Existing Customer',
      idempotencyKey: 'idemp-stable-key-1',
      items: [{ productId: randomUUID(), quantity: 1 }],
    });

    expect(result.id).toBe(existing.id);
    expect(result.referenceNumber).toBe(existing.referenceNumber);
    expect(result.idempotencyKey).toBe('idemp-stable-key-1');
  });

  it('safely handles concurrent conflict resolution on idempotencyKey', async () => {
    const productId = randomUUID();
    const existingConcurrent = {
      id: randomUUID(),
      referenceNumber: 'ENQ-20261116-CONC',
      customerName: 'Concurrent Customer',
      customerEmail: null,
      customerPhone: null,
      customerNotes: null,
      status: 'submitted',
      idempotencyKey: 'idemp-concurrent-key',
      subtotalPaise: 5000,
      discountTotalPaise: 0,
      grandTotalPaise: 5000,
      companySnapshot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let selectCount = 0;
    const mockTx = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCount++;
            if (selectCount === 1) {
              // First idempotency check finds nothing (concurrent race)
              return { limit: () => [] };
            }
            if (selectCount === 2) {
              // Product query finds published product
              return [
                {
                  id: productId,
                  name: 'Smart Camera',
                  slug: 'smart-camera',
                  status: 'published',
                  unit: 'piece',
                  mrpPaise: 5000,
                  offerPricePaise: 5000,
                  discountType: 'none',
                  discountValue: 0,
                },
              ];
            }
            // Third query after conflict resolves existing record
            return { limit: () => [existingConcurrent] };
          },
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => [], // Conflict on insert: yields 0 rows
          }),
        }),
      }),
    };

    const mockDb = {
      transaction: async (cb: (tx: DbExecutor) => Promise<unknown>) =>
        cb(mockTx as unknown as DbExecutor),
    } as unknown as DbExecutor;

    const result = await createQuotationEnquiry(mockDb, {
      customerName: 'Concurrent Customer',
      idempotencyKey: 'idemp-concurrent-key',
      items: [{ productId, quantity: 1 }],
    });

    expect(result.id).toBe(existingConcurrent.id);
    expect(result.referenceNumber).toBe(existingConcurrent.referenceNumber);
  });

  it('throws PRODUCT_NOT_FOUND when requested product is missing or unpublished', async () => {
    const missingProductId = randomUUID();
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => [], // Product not found
        }),
      }),
    } as unknown as DbExecutor;

    await expect(
      createQuotationEnquiry(mockDb, {
        customerName: 'Client Name',
        items: [{ productId: missingProductId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
    });
  });
});
