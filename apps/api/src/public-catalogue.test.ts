import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import {
  PublicProductDtoSchema,
  PublicProductQuerySchema,
  type PublicProductDto,
} from '@palnadu/contracts';
import { mapToPublicProductDto, type DatabaseClient } from '@palnadu/persistence';
import { buildServer } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
});

function createMockDatabase(overrides: Partial<DatabaseClient> = {}): DatabaseClient {
  const queryBuilder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue(queryBuilder),
      execute: vi.fn(),
    } as unknown as DatabaseClient['db'],
    ...overrides,
  };
}

describe('Public Catalogue API & Price Confidentiality', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  describe('OpenAPI & Route Registration', () => {
    it('registers public catalogue endpoints in OpenAPI under both /public and /catalogue', async () => {
      const server = await buildServer({
        config,
        database: createMockDatabase(),
      });
      servers.push(server);

      const response = await server.inject({ method: 'GET', url: '/api/v1/openapi.json' });
      expect(response.statusCode).toBe(200);
      const doc = response.json();

      // Check both /api/v1/public and /api/v1/catalogue routes exist
      expect(doc.paths['/api/v1/public/products']?.get).toBeDefined();
      expect(doc.paths['/api/v1/public/products/{slug}']?.get).toBeDefined();
      expect(doc.paths['/api/v1/public/products/{productId}/recommendations']?.get).toBeDefined();
      expect(doc.paths['/api/v1/public/categories']?.get).toBeDefined();
      expect(doc.paths['/api/v1/public/brands']?.get).toBeDefined();

      expect(doc.paths['/api/v1/catalogue/products']?.get).toBeDefined();
      expect(doc.paths['/api/v1/catalogue/products/{slug}']?.get).toBeDefined();
      expect(
        doc.paths['/api/v1/catalogue/products/{productId}/recommendations']?.get,
      ).toBeDefined();
      expect(doc.paths['/api/v1/catalogue/categories']?.get).toBeDefined();
      expect(doc.paths['/api/v1/catalogue/brands']?.get).toBeDefined();
    });
  });

  describe('Price Confidentiality Invariants', () => {
    it('strictly omits all pricing and discount fields from PublicProductDto', () => {
      const rawProduct = {
        id: randomUUID(),
        slug: 'ptz-dome-camera',
        name: '4MP PTZ Dome Camera',
        brandId: randomUUID(),
        model: 'PTZ-400',
        description: 'Commercial IP surveillance camera',
        unit: 'piece',
        specifications: { resolution: '4MP', opticalZoom: '25x' },
        status: 'published',
        mrpPaise: 4500000,
        offerPricePaise: 3800000,
        discountType: 'percentage',
        discountValue: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rawBrand = {
        id: rawProduct.brandId,
        name: 'Hikvision',
        slug: 'hikvision',
      };

      const rawCategories = [
        { id: randomUUID(), name: 'IP Cameras', slug: 'ip-cameras' },
        { id: randomUUID(), name: 'Commercial', slug: 'commercial' },
      ];

      const rawVariants = [
        {
          id: randomUUID(),
          productId: rawProduct.id,
          sku: 'PTZ-400-W',
          model: 'PTZ-400-White',
          options: { color: 'white' },
          mrpPaise: 4500000,
          offerPricePaise: 3800000,
          discountType: 'percentage',
          discountValue: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const rawImages = [
        {
          id: randomUUID(),
          productId: rawProduct.id,
          variantId: null,
          url: 'https://images.palnadu.dev/camera-1.jpg',
          altText: 'Hikvision 4MP PTZ Camera',
          sortOrder: 0,
          isPrimary: true,
          rightsStatus: 'verified_commercial',
          createdAt: new Date(),
        },
      ];

      const dto: PublicProductDto = mapToPublicProductDto(
        rawProduct,
        rawBrand,
        rawCategories,
        rawVariants,
        rawImages,
      );

      // Verify valid DTO
      expect(dto.id).toBe(rawProduct.id);
      expect(dto.slug).toBe('ptz-dome-camera');
      expect(dto.name).toBe('4MP PTZ Dome Camera');
      expect(dto.brand?.name).toBe('Hikvision');
      expect(dto.categories).toHaveLength(2);
      expect(dto.variants).toHaveLength(1);
      expect(dto.images).toHaveLength(1);

      // Verify ZERO price exposure on product
      const dtoAny = dto as Record<string, unknown>;
      expect(dtoAny.mrpPaise).toBeUndefined();
      expect(dtoAny.offerPricePaise).toBeUndefined();
      expect(dtoAny.discountType).toBeUndefined();
      expect(dtoAny.discountValue).toBeUndefined();
      expect(dtoAny.status).toBeUndefined();

      // Verify ZERO price exposure on variant
      const variantAny = dto.variants[0] as Record<string, unknown>;
      expect(variantAny.mrpPaise).toBeUndefined();
      expect(variantAny.offerPricePaise).toBeUndefined();
      expect(variantAny.discountType).toBeUndefined();
      expect(variantAny.discountValue).toBeUndefined();

      // Strict validation guarantees no extraneous keys
      expect(() => PublicProductDtoSchema.parse(dto)).not.toThrow();
    });

    it('rejects unexpected pricing fields if injected into PublicProductDtoSchema', () => {
      const payloadWithPricing = {
        id: randomUUID(),
        slug: 'test-product',
        name: 'Test Product',
        model: 'TP-1',
        description: 'Test',
        unit: 'piece',
        specifications: {},
        brand: null,
        categories: [],
        variants: [],
        images: [],
        mrpPaise: 1000, // ILLEGAL field
      };

      expect(() => PublicProductDtoSchema.parse(payloadWithPricing)).toThrow();
    });
  });

  describe('Input Validation & Error Responses', () => {
    it('rejects invalid query parameters with 400 validation error', async () => {
      const server = await buildServer({
        config,
        database: createMockDatabase(),
      });
      servers.push(server);

      // Limit exceeds max 100
      const resLimit = await server.inject({
        method: 'GET',
        url: '/api/v1/public/products?limit=200',
      });
      expect(resLimit.statusCode).toBe(400);
      expect(resLimit.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });

      // Negative offset
      const resOffset = await server.inject({
        method: 'GET',
        url: '/api/v1/public/products?offset=-1',
      });
      expect(resOffset.statusCode).toBe(400);

      // Invalid slug format (uppercase / special characters)
      const resSlug = await server.inject({
        method: 'GET',
        url: '/api/v1/public/products/INVALID_SLUG!!',
      });
      expect(resSlug.statusCode).toBe(400);
    });

    it('validates public product query schema bounds', () => {
      expect(() => PublicProductQuerySchema.parse({ limit: 150 })).toThrow();
      expect(() => PublicProductQuerySchema.parse({ offset: -1 })).toThrow();
      expect(() => PublicProductQuerySchema.parse({ brandSlug: 'UPPERCASE_INVALID' })).toThrow();

      const valid = PublicProductQuerySchema.parse({
        limit: 25,
        offset: 10,
        brandSlug: 'hikvision',
        categorySlug: 'ip-cameras',
      });
      expect(valid.limit).toBe(25);
      expect(valid.offset).toBe(10);
      expect(valid.brandSlug).toBe('hikvision');
    });
  });

  describe('Edge Caching & Performance', () => {
    it('returns public Cache-Control headers on categories and brands endpoints', async () => {
      const server = await buildServer({
        config,
        database: createMockDatabase(),
      });
      servers.push(server);

      const resCategories = await server.inject({
        method: 'GET',
        url: '/api/v1/public/categories',
      });
      expect(resCategories.statusCode).toBe(200);
      expect(resCategories.headers['cache-control']).toBe(
        'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
      );

      const resBrands = await server.inject({
        method: 'GET',
        url: '/api/v1/public/brands',
      });
      expect(resBrands.statusCode).toBe(200);
      expect(resBrands.headers['cache-control']).toBe(
        'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
      );
    });
  });
});
