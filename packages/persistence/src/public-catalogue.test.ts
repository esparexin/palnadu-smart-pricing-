import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { DbExecutor } from './client.js';
import {
  findPublicProductBySlug,
  listPublicBrands,
  listPublicCategories,
  listPublicProducts,
} from './public-catalogue.js';

describe('Public Catalogue Persistence Queries', () => {
  describe('listPublicProducts', () => {
    it('executes select query with published filter and search term', async () => {
      const mockProduct = {
        id: randomUUID(),
        brandId: randomUUID(),
        name: '4MP AcuSense Network Dome Camera',
        slug: '4mp-acusense-dome-camera',
        model: 'DS-2CD2143G2-I',
        description: 'Fixed dome network camera with deep learning capabilities',
        unit: 'piece',
        specifications: { resolution: '4MP', lens: '2.8mm' },
        status: 'published',
        mrpPaise: 850000,
        offerPricePaise: 680000,
        discountType: 'percentage',
        discountValue: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBrand = {
        id: mockProduct.brandId,
        name: 'Hikvision',
        slug: 'hikvision',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockImage = {
        id: randomUUID(),
        productId: mockProduct.id,
        variantId: null,
        url: 'https://images.example.com/hikvision-1.jpg',
        altText: 'Hikvision AcuSense Dome Front',
        sortOrder: 0,
        isPrimary: true,
        rightsStatus: 'verified_commercial',
        createdAt: new Date(),
      };

      // Mock hydration by providing Promise-compatible chaining
      const queryChain = {
        where: vi.fn().mockImplementation(() => {
          const res = [mockBrand];
          return Object.assign(Promise.resolve(res), {
            orderBy: () => Promise.resolve([mockImage]),
            limit: () => ({
              offset: () => ({
                orderBy: () => Promise.resolve([mockProduct]),
              }),
            }),
          });
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(Promise.resolve([])),
        }),
        orderBy: vi.fn().mockReturnValue(Promise.resolve([mockImage])),
      };

      const flexibleDb = {
        select: vi.fn().mockImplementation((fields?: unknown) => {
          if (fields && typeof fields === 'object' && 'count' in fields) {
            return {
              from: () => ({
                where: () => Promise.resolve([{ count: 1 }]),
              }),
            };
          }
          return {
            from: () => queryChain,
          };
        }),
      } as unknown as DbExecutor;

      const result = await listPublicProducts(flexibleDb, {
        limit: 12,
        offset: 0,
        q: 'DS-2CD2143G2-I',
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe(mockProduct.name);
      expect(result.items[0].model).toBe('DS-2CD2143G2-I');
      // Price confidentiality verification: zero price fields in PublicProductDto
      expect((result.items[0] as unknown as Record<string, unknown>).mrpPaise).toBeUndefined();
      expect(
        (result.items[0] as unknown as Record<string, unknown>).offerPricePaise,
      ).toBeUndefined();
    });

    it('returns empty result when no published products match', async () => {
      const mockDb = {
        select: vi.fn().mockImplementation((fields?: unknown) => {
          if (fields && typeof fields === 'object' && 'count' in fields) {
            return {
              from: () => ({
                where: () => Promise.resolve([{ count: 0 }]),
              }),
            };
          }
          return {
            from: () => ({
              where: () => ({
                limit: () => ({
                  offset: () => ({
                    orderBy: () => Promise.resolve([]),
                  }),
                }),
              }),
            }),
          };
        }),
      } as unknown as DbExecutor;

      const result = await listPublicProducts(mockDb, {
        limit: 12,
        offset: 0,
        q: 'nonexistent-model',
      });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('findPublicProductBySlug', () => {
    it('returns null when product is not published', async () => {
      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      } as unknown as DbExecutor;

      const result = await findPublicProductBySlug(mockDb, 'draft-product');
      expect(result).toBeNull();
    });
  });

  describe('listPublicCategories', () => {
    it('queries categories filtered by published product existence', async () => {
      const mockCategories = [
        {
          id: randomUUID(),
          name: 'CCTV & Surveillance',
          slug: 'cctv-surveillance',
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve(mockCategories),
            }),
          }),
        }),
      } as unknown as DbExecutor;

      const result = await listPublicCategories(mockDb);
      expect(result).toEqual(mockCategories);
    });
  });

  describe('listPublicBrands', () => {
    it('queries brands filtered by published product existence', async () => {
      const mockBrands = [
        {
          id: randomUUID(),
          name: 'Hikvision',
          slug: 'hikvision',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve(mockBrands),
            }),
          }),
        }),
      } as unknown as DbExecutor;

      const result = await listPublicBrands(mockDb);
      expect(result).toEqual(mockBrands);
    });
  });
});
