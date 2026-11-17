import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import {
  createDatabase,
  migrate,
  provisionAdminUser,
  type DatabaseClient,
} from '@palnadu/persistence';
import type { InjectOptions } from 'fastify';
import { buildServer, SESSION_COOKIE_NAME } from './server.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined) {
  throw new Error('TEST_DATABASE_URL is required for PostgreSQL API integration tests.');
}

const config = parseServerConfig({
  DATABASE_URL: testDatabaseUrl,
  DB_POOL_MAX: '5',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'palnadu-catalogue-test-session-secret-at-least-32-chars-long',
  SESSION_TTL_HOURS: '2',
});

describe('Admin Catalogue API (PostgreSQL Integration)', () => {
  let database: DatabaseClient;
  let server: Awaited<ReturnType<typeof buildServer>>;
  let managerCookie: string;
  let readerCookie: string;
  let unauthorizedCookie: string;

  function req(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    cookie?: string,
    payload?: InjectOptions['payload'],
  ) {
    return server.inject({
      method,
      url,
      headers: {
        host: 'localhost:3001',
        ...(cookie ? { cookie } : {}),
      },
      ...(payload !== undefined ? { payload } : {}),
    });
  }

  beforeAll(async () => {
    database = createDatabase(config);
    const migrationsFolder = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../packages/persistence/drizzle',
    );

    await migrate(database.db, { migrationsFolder });
    await database.ping();

    server = await buildServer({ config, database });

    async function loginAs(email: string, permissions: string[]) {
      const password = 'TestPassword123!';
      await provisionAdminUser(database.db, { email, name: email, password, permissions });
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        headers: { host: 'localhost:3001' },
        payload: { email, password },
      });
      const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
      return `${SESSION_COOKIE_NAME}=${cookie!.value}`;
    }

    managerCookie = await loginAs(`mgr-${randomUUID()}@example.com`, ['catalogue:manage']);
    readerCookie = await loginAs(`rdr-${randomUUID()}@example.com`, ['catalogue:read']);
    unauthorizedCookie = await loginAs(`unauth-${randomUUID()}@example.com`, ['other:permission']);
  });

  afterAll(async () => {
    await server?.close();
    await database?.close();
  });

  describe('Authorization & Permissions', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await req('GET', '/api/v1/admin/brands');
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects authenticated users lacking catalogue permissions with 403', async () => {
      const res = await req('GET', '/api/v1/admin/brands', unauthorizedCookie);
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('allows reader to list brands but rejects brand creation with 403', async () => {
      const listRes = await req('GET', '/api/v1/admin/brands', readerCookie);
      expect(listRes.statusCode).toBe(200);

      const createRes = await req('POST', '/api/v1/admin/brands', readerCookie, {
        name: 'Unauthorized Brand',
        slug: `unauth-brand-${randomUUID().slice(0, 8)}`,
      });
      expect(createRes.statusCode).toBe(403);
      expect(createRes.json().error.code).toBe('FORBIDDEN');
    });
  });

  describe('Brands Administration', () => {
    const slug = `brand-${randomUUID().slice(0, 8)}`;
    let brandId: string;

    it('creates brand and prevents duplicate name or slug', async () => {
      const res = await req('POST', '/api/v1/admin/brands', managerCookie, {
        name: `Brand ${slug}`,
        slug,
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.name).toBe(`Brand ${slug}`);
      expect(body.slug).toBe(slug);
      brandId = body.id;

      // Duplicate slug rejection
      const dupRes = await req('POST', '/api/v1/admin/brands', managerCookie, {
        name: `Different Name`,
        slug: `  ${slug.toUpperCase()}  `,
      });
      expect(dupRes.statusCode).toBe(409);
      expect(dupRes.json().error.code).toBe('DUPLICATE_BRAND');
    });

    it('lists and searches brands', async () => {
      const res = await req('GET', `/api/v1/admin/brands?q=${slug}`, managerCookie);
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.items.some((b: { id: string }) => b.id === brandId)).toBe(true);
    });

    it('retrieves brand details and updates brand', async () => {
      const getRes = await req('GET', `/api/v1/admin/brands/${brandId}`, managerCookie);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().id).toBe(brandId);

      const updateRes = await req('PATCH', `/api/v1/admin/brands/${brandId}`, managerCookie, {
        name: `Updated Brand ${slug}`,
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().name).toBe(`Updated Brand ${slug}`);
    });
  });

  describe('Categories Hierarchy & Cycle Prevention', () => {
    let catAId: string;
    let catBId: string;
    let catCId: string;

    it('creates category hierarchy (A -> B -> C)', async () => {
      const resA = await req('POST', '/api/v1/admin/categories', managerCookie, {
        name: `Cat A ${randomUUID().slice(0, 6)}`,
        slug: `cat-a-${randomUUID().slice(0, 8)}`,
      });
      expect(resA.statusCode).toBe(201);
      catAId = resA.json().id;

      const resB = await req('POST', '/api/v1/admin/categories', managerCookie, {
        name: `Cat B ${randomUUID().slice(0, 6)}`,
        slug: `cat-b-${randomUUID().slice(0, 8)}`,
        parentId: catAId,
      });
      expect(resB.statusCode).toBe(201);
      catBId = resB.json().id;

      const resC = await req('POST', '/api/v1/admin/categories', managerCookie, {
        name: `Cat C ${randomUUID().slice(0, 6)}`,
        slug: `cat-c-${randomUUID().slice(0, 8)}`,
        parentId: catBId,
      });
      expect(resC.statusCode).toBe(201);
      catCId = resC.json().id;
    });

    it('prevents direct self-parenting (A -> A)', async () => {
      const res = await req('PATCH', `/api/v1/admin/categories/${catAId}`, managerCookie, {
        parentId: catAId,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('CYCLE_DETECTED');
    });

    it('prevents indirect cycle (A -> C where C is child of B and B is child of A)', async () => {
      const res = await req('PATCH', `/api/v1/admin/categories/${catAId}`, managerCookie, {
        parentId: catCId,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('CYCLE_DETECTED');
    });

    it('prevents deleting category when subcategories exist', async () => {
      const res = await req('DELETE', `/api/v1/admin/categories/${catAId}`, managerCookie);
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CATEGORY_HAS_CHILDREN');
    });

    it('deletes leaf category cleanly', async () => {
      const res = await req('DELETE', `/api/v1/admin/categories/${catCId}`, managerCookie);
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });
  });

  describe('Products, Variants, Images & Relationships Full Workflow', () => {
    let brandId: string;
    let catId: string;
    let otherCatId: string;
    let productId: string;
    let otherProductId: string;
    let variantId: string;
    let imageId: string;

    beforeAll(async () => {
      const brandRes = await req('POST', '/api/v1/admin/brands', managerCookie, {
        name: `Workflow Brand ${randomUUID().slice(0, 6)}`,
        slug: `wf-brand-${randomUUID().slice(0, 8)}`,
      });
      brandId = brandRes.json().id;

      const catRes = await req('POST', '/api/v1/admin/categories', managerCookie, {
        name: `Workflow Cat ${randomUUID().slice(0, 6)}`,
        slug: `wf-cat-${randomUUID().slice(0, 8)}`,
      });
      catId = catRes.json().id;

      const otherCatRes = await req('POST', '/api/v1/admin/categories', managerCookie, {
        name: `Other Cat ${randomUUID().slice(0, 6)}`,
        slug: `other-cat-${randomUUID().slice(0, 8)}`,
      });
      otherCatId = otherCatRes.json().id;
    });

    it('creates product with base pricing and category associations', async () => {
      const slug = `product-${randomUUID().slice(0, 8)}`;
      const res = await req('POST', '/api/v1/admin/products', managerCookie, {
        brandId,
        categoryIds: [catId],
        name: `Product ${slug}`,
        slug,
        model: 'MODEL-X',
        unit: 'piece',
        mrpPaise: 500000,
        offerPricePaise: 450000,
        discountType: 'percentage',
        discountValue: 1000,
        status: 'draft',
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.slug).toBe(slug);
      expect(body.brand?.id).toBe(brandId);
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0].id).toBe(catId);
      expect(body.effectivePricing.mrpPaise).toBe(500000);
      expect(body.effectivePricing.finalUnitPricePaise).toBe(405000);
      productId = body.id;

      // Second product for relationships
      const otherRes = await req('POST', '/api/v1/admin/products', managerCookie, {
        brandId,
        categoryIds: [catId],
        name: `Other Product ${slug}`,
        slug: `other-${slug}`,
        mrpPaise: 300000,
        offerPricePaise: 270000,
        discountType: 'percentage',
        discountValue: 1000,
        status: 'draft',
      });
      expect(otherRes.statusCode).toBe(201);
      otherProductId = otherRes.json().id;
    });

    it('prevents duplicate product slug', async () => {
      const existingProduct = await req(
        'GET',
        `/api/v1/admin/products/${productId}`,
        managerCookie,
      );
      const res = await req('POST', '/api/v1/admin/products', managerCookie, {
        name: 'Duplicate Product',
        slug: existingProduct.json().slug,
        mrpPaise: 100000,
        offerPricePaise: 90000,
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('DUPLICATE_PRODUCT');
    });

    it('prevents deleting category or brand while product is associated', async () => {
      const delCatRes = await req('DELETE', `/api/v1/admin/categories/${catId}`, managerCookie);
      expect(delCatRes.statusCode).toBe(409);
      expect(delCatRes.json().error.code).toBe('CATEGORY_IN_USE');

      const delBrandRes = await req('DELETE', `/api/v1/admin/brands/${brandId}`, managerCookie);
      expect(delBrandRes.statusCode).toBe(409);
      expect(delBrandRes.json().error.code).toBe('BRAND_IN_USE');
    });

    it('creates variant with pricing override and SKU validation', async () => {
      const sku = `SKU-${randomUUID().slice(0, 8).toUpperCase()}`;
      const res = await req('POST', `/api/v1/admin/products/${productId}/variants`, managerCookie, {
        sku,
        model: 'MODEL-X-RED',
        options: { color: 'red', size: 'XL' },
        mrpPaise: 550000,
        offerPricePaise: 480000,
        discountType: 'percentage',
        discountValue: 1200,
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.sku).toBe(sku);
      expect(body.mrpPaise).toBe(550000);
      variantId = body.id;

      // Duplicate SKU rejection
      const dupRes = await req(
        'POST',
        `/api/v1/admin/products/${otherProductId}/variants`,
        managerCookie,
        { sku: `  ${sku.toLowerCase()}  ` },
      );
      expect(dupRes.statusCode).toBe(409);
      expect(dupRes.json().error.code).toBe('DUPLICATE_SKU');
    });

    it('rejects invalid variant pricing override where offer exceeds mrp', async () => {
      const res = await req('POST', `/api/v1/admin/products/${productId}/variants`, managerCookie, {
        sku: `SKU-INVALID-${randomUUID().slice(0, 6)}`,
        mrpPaise: 200000,
        offerPricePaise: 250000,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_PRICING');
    });

    it('adds product image metadata and enforces variant belonging', async () => {
      // 1. Success with valid variant belonging to same product
      const res = await req('POST', `/api/v1/admin/products/${productId}/images`, managerCookie, {
        url: 'https://images.example.com/product-x.jpg',
        altText: 'Product X Front',
        sortOrder: 1,
        isPrimary: true,
        variantId,
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.url).toBe('https://images.example.com/product-x.jpg');
      expect(body.isPrimary).toBe(true);
      expect(body.variantId).toBe(variantId);
      imageId = body.id;

      // 2. Reject if variant belongs to another product
      const mismatchRes = await req(
        'POST',
        `/api/v1/admin/products/${otherProductId}/images`,
        managerCookie,
        {
          url: 'https://images.example.com/other.jpg',
          variantId,
        },
      );
      expect(mismatchRes.statusCode).toBe(400);
      expect(mismatchRes.json().error.code).toBe('VARIANT_MISMATCH');

      // 3. Reject if variant does not exist
      const notFoundRes = await req(
        'POST',
        `/api/v1/admin/products/${productId}/images`,
        managerCookie,
        {
          url: 'https://images.example.com/missing.jpg',
          variantId: randomUUID(),
        },
      );
      expect(notFoundRes.statusCode).toBe(404);
      expect(notFoundRes.json().error.code).toBe('VARIANT_NOT_FOUND');
    });

    it('manages product relationships and prevents self-relation and duplicates', async () => {
      // 1. Prevent self-relationship
      const selfRes = await req(
        'POST',
        `/api/v1/admin/products/${productId}/relationships`,
        managerCookie,
        {
          targetProductId: productId,
          relationshipType: 'related',
        },
      );
      expect(selfRes.statusCode).toBe(400);
      expect(selfRes.json().error.code).toBe('SELF_RELATION_NOT_ALLOWED');

      // 2. Create valid relationship
      const res = await req(
        'POST',
        `/api/v1/admin/products/${productId}/relationships`,
        managerCookie,
        {
          targetProductId: otherProductId,
          relationshipType: 'compatible',
        },
      );
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.sourceProductId).toBe(productId);
      expect(body.targetProductId).toBe(otherProductId);
      expect(body.relationshipType).toBe('compatible');

      // 3. Prevent duplicate relationship of same type
      const dupRes = await req(
        'POST',
        `/api/v1/admin/products/${productId}/relationships`,
        managerCookie,
        {
          targetProductId: otherProductId,
          relationshipType: 'compatible',
        },
      );
      expect(dupRes.statusCode).toBe(409);
      expect(dupRes.json().error.code).toBe('DUPLICATE_RELATIONSHIP');
    });

    it('retrieves complete product details with brand, categories, variants, images, relationships and pricing', async () => {
      const res = await req('GET', `/api/v1/admin/products/${productId}`, managerCookie);
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(productId);
      expect(body.brand.id).toBe(brandId);
      expect(body.categories).toHaveLength(1);
      expect(body.variants).toHaveLength(1);
      expect(body.variants[0].id).toBe(variantId);
      expect(body.images).toHaveLength(1);
      expect(body.images[0].id).toBe(imageId);
      expect(body.relationships).toHaveLength(1);
      expect(body.relationships[0].targetProductId).toBe(otherProductId);
      expect(body.effectivePricing).toBeDefined();
    });

    it('enforces 2-8 image limits during status updates and deletes, and changes category association', async () => {
      // 1. Attempting to publish with only 1 image must be rejected
      const rejectPubRes = await req(
        'PATCH',
        `/api/v1/admin/products/${productId}`,
        managerCookie,
        {
          status: 'published',
        },
      );
      expect(rejectPubRes.statusCode).toBe(400);
      expect(rejectPubRes.json().error.code).toBe('INSUFFICIENT_IMAGES');

      // 2. Add second image to satisfy 2-8 requirement
      const img2Res = await req(
        'POST',
        `/api/v1/admin/products/${productId}/images`,
        managerCookie,
        {
          url: 'https://images.example.com/product-x-2.jpg',
          altText: 'Product X Back',
        },
      );
      expect(img2Res.statusCode).toBe(201);
      const secondImageId = img2Res.json().id;

      // 3. Now publishing succeeds
      const res = await req('PATCH', `/api/v1/admin/products/${productId}`, managerCookie, {
        name: 'Renamed Product X',
        categoryIds: [otherCatId],
        status: 'published',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe('Renamed Product X');
      expect(body.status).toBe('published');
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0].id).toBe(otherCatId);

      // 4. Deletion of an image when published with only 2 images must be rejected
      const rejectDelRes = await req(
        'DELETE',
        `/api/v1/admin/products/${productId}/images/${secondImageId}`,
        managerCookie,
      );
      expect(rejectDelRes.statusCode).toBe(400);
      expect(rejectDelRes.json().error.code).toBe('INSUFFICIENT_IMAGES');
    });

    it('deletes product and its dependent child entities cleanly', async () => {
      const delRes = await req('DELETE', `/api/v1/admin/products/${productId}`, managerCookie);
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().success).toBe(true);

      // Verify product is gone
      const getRes = await req('GET', `/api/v1/admin/products/${productId}`, managerCookie);
      expect(getRes.statusCode).toBe(404);
    });
  });
});
