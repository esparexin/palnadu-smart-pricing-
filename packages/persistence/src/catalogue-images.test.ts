import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { DbExecutor } from './client.js';
import { createProductImage, deleteProductImage, updateProductImage } from './catalogue-images.js';

describe('Catalogue Images Persistence & Concurrency Invariant', () => {
  it('enforces maximum 8 images on product image creation', async () => {
    const productId = randomUUID();

    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 8 }]),
        }),
      }),
    } as unknown as DbExecutor;

    await expect(
      createProductImage(mockDb, productId, {
        url: 'https://example.com/ninth.jpg',
      }),
    ).rejects.toThrow(/Product cannot have more than 8 images/);
  });

  it('safely serializes concurrent uploads exceeding 8 images', async () => {
    const productId = randomUUID();
    let currentImageCount = 7;
    let lockHolder: Promise<void> | null = null;
    let lockReleaseFn: (() => void) | undefined;

    // Simulate PostgreSQL row-level locking (SELECT ... FOR UPDATE) and transaction execution
    const createLockingDb = () => {
      return {
        execute: vi.fn(async () => {
          // If another transaction holds lock, wait for it
          while (lockHolder) {
            await lockHolder;
          }
          let releaseLock: () => void;
          lockHolder = new Promise((resolve) => {
            releaseLock = resolve;
          });
          lockReleaseFn = () => {
            lockHolder = null;
            releaseLock();
          };
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn(async () => [{ count: currentImageCount }]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn(async () => {
              currentImageCount++;
              return [
                {
                  id: randomUUID(),
                  productId,
                  url: `https://example.com/img-${currentImageCount}.jpg`,
                  isPrimary: false,
                },
              ];
            }),
          }),
        }),
      } as unknown as DbExecutor;
    };

    const db1 = createLockingDb();
    const db2 = createLockingDb();

    // Run two uploads
    const results = await Promise.allSettled([
      (async () => {
        try {
          const res = await createProductImage(db1, productId, {
            url: 'https://example.com/a.jpg',
          });
          return res;
        } finally {
          lockReleaseFn?.();
        }
      })(),
      (async () => {
        try {
          const res = await createProductImage(db2, productId, {
            url: 'https://example.com/b.jpg',
          });
          return res;
        } finally {
          lockReleaseFn?.();
        }
      })(),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one upload succeeds (8th image), the other is rejected as the 9th image!
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('more than 8 images');
    expect(currentImageCount).toBe(8);
  });

  it('safely serializes concurrent deletions below 2 images for published products', async () => {
    const productId = randomUUID();
    const image1Id = randomUUID();
    const image2Id = randomUUID();

    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            const res = [{ id: image1Id, status: 'published', count: 2, isPrimary: false }];
            return Object.assign(Promise.resolve(res), {
              limit: vi.fn().mockResolvedValue(res),
            });
          }),
        })),
      })),
    } as unknown as DbExecutor;

    // Both attempt deletion on a 2-image published product
    const results = await Promise.allSettled([
      deleteProductImage(mockDb, productId, image1Id),
      deleteProductImage(mockDb, productId, image2Id),
    ]);

    // Both must be rejected to protect the 2-image minimum!
    expect(results[0].status).toBe('rejected');
    expect((results[0] as PromiseRejectedResult).reason.message).toContain('at least 2 images');
    expect(results[1].status).toBe('rejected');
    expect((results[1] as PromiseRejectedResult).reason.message).toContain('at least 2 images');
  });

  it('allows replacement of an image in-place keeping count intact', async () => {
    const productId = randomUUID();
    const imageId = randomUUID();

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: imageId,
                productId,
                url: 'https://example.com/replaced.webp',
                altText: 'Replaced image',
                sortOrder: 0,
                isPrimary: true,
              },
            ]),
          }),
        }),
      }),
    } as unknown as DbExecutor;

    const updated = await updateProductImage(mockDb, productId, imageId, {
      url: 'https://example.com/replaced.webp',
      altText: 'Replaced image',
    });

    expect(updated).toBeDefined();
    expect(updated?.url).toBe('https://example.com/replaced.webp');
  });

  it('allows deletion down to 0 images for draft products', async () => {
    const productId = randomUUID();
    const imageId = randomUUID();

    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: imageId, isPrimary: false }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ status: 'draft' }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: imageId }]),
        }),
      }),
    } as unknown as DbExecutor;

    const result = await deleteProductImage(mockDb, productId, imageId);
    expect(result).toBe(true);
  });
});
