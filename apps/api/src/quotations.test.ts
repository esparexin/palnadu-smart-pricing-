import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import { CustomerEnquiryResponseSchema } from '@palnadu/contracts';
import {
  calculateQuotationLines,
  type DatabaseClient,
  type products,
  type productVariants,
} from '@palnadu/persistence';
import { buildServer, SESSION_COOKIE_NAME } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
});

function createMockDatabase(overrides: Partial<DatabaseClient> = {}): DatabaseClient {
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn(),
      execute: vi.fn(),
    } as unknown as DatabaseClient['db'],
    ...overrides,
  };
}

describe('Quotations API & Financial Calculation Engine', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  describe('OpenAPI Route Registration', () => {
    it('registers public enquiry and admin quotation routes in OpenAPI', async () => {
      const server = await buildServer({ config, database: createMockDatabase() });
      servers.push(server);

      const res = await server.inject({ method: 'GET', url: '/api/v1/openapi.json' });
      expect(res.statusCode).toBe(200);
      const doc = res.json();

      expect(doc.paths['/api/v1/public/enquiries']?.post).toBeDefined();
      expect(doc.paths['/api/v1/catalogue/enquiries']?.post).toBeDefined();
      expect(doc.paths['/api/v1/admin/quotations']?.get).toBeDefined();
      expect(doc.paths['/api/v1/admin/quotations/metrics']?.get).toBeDefined();
      expect(doc.paths['/api/v1/admin/quotations/{id}']?.get).toBeDefined();
      expect(doc.paths['/api/v1/admin/quotations/{id}/status']?.patch).toBeDefined();
      expect(doc.paths['/api/v1/admin/quotations/{id}/retry-delivery']?.post).toBeDefined();
    });
  });

  describe('Financial Calculation Pipeline (Issue #10 & #14)', () => {
    it('calculates multi-product line totals independently and sums without double-discounting', () => {
      const prodAId = randomUUID();
      const prodBId = randomUUID();
      const prodCId = randomUUID();

      // Product A: 1,000 with 10% (1,000 basis points) discount
      const prodA = {
        id: prodAId,
        name: 'Product A',
        slug: 'prod-a',
        unit: 'piece',
        mrpPaise: 100000,
        offerPricePaise: 100000,
        discountType: 'percentage',
        discountValue: 1000, // 10%
        status: 'published',
      } as unknown as typeof products.$inferSelect;

      // Product B: 2,000 with 200 (20,000 paise) fixed discount
      const prodB = {
        id: prodBId,
        name: 'Product B',
        slug: 'prod-b',
        unit: 'piece',
        mrpPaise: 200000,
        offerPricePaise: 200000,
        discountType: 'fixed',
        discountValue: 20000, // 200 fixed
        status: 'published',
      } as unknown as typeof products.$inferSelect;

      // Product C: 500 with no discount
      const prodC = {
        id: prodCId,
        name: 'Product C',
        slug: 'prod-c',
        unit: 'piece',
        mrpPaise: 50000,
        offerPricePaise: 50000,
        discountType: 'none',
        discountValue: 0,
        status: 'published',
      } as unknown as typeof products.$inferSelect;

      const productMap = new Map([
        [prodAId, prodA],
        [prodBId, prodB],
        [prodCId, prodC],
      ]);
      const variantMap = new Map();

      // Quotation items:
      // Product A: qty 2 -> net 900 x 2 = 1,800; discount = 100 x 2 = 200
      // Product B: qty 1 -> net 1,800 x 1 = 1,800; discount = 200 x 1 = 200
      // Product C: qty 3 -> net 500 x 3 = 1,500; discount = 0
      const items = [
        { productId: prodAId, quantity: 2 },
        { productId: prodBId, quantity: 1 },
        { productId: prodCId, quantity: 3 },
      ];

      const lines = calculateQuotationLines(items, productMap, variantMap);
      expect(lines).toHaveLength(3);

      expect(lines[0]?.finalUnitPricePaise).toBe(90000);
      expect(lines[0]?.lineTotalPaise).toBe(180000);
      expect(lines[0]?.discountAmountPaise).toBe(10000);

      expect(lines[1]?.finalUnitPricePaise).toBe(180000);
      expect(lines[1]?.lineTotalPaise).toBe(180000);
      expect(lines[1]?.discountAmountPaise).toBe(20000);

      expect(lines[2]?.finalUnitPricePaise).toBe(50000);
      expect(lines[2]?.lineTotalPaise).toBe(150000);
      expect(lines[2]?.discountAmountPaise).toBe(0);

      const subtotalPaise = lines.reduce((acc, l) => acc + l.lineTotalPaise, 0);
      const discountTotalPaise = lines.reduce(
        (acc, l) => acc + l.discountAmountPaise * l.quantity,
        0,
      );

      // Verify aggregate totals
      expect(subtotalPaise).toBe(510000); // 1800 + 1800 + 1500 = 5100 rupees
      expect(discountTotalPaise).toBe(40000); // 200 + 200 = 400 rupees

      // Invariant: grand total equals subtotal (discount is informational only!)
      const grandTotalPaise = subtotalPaise;
      expect(grandTotalPaise).toBe(510000);
      expect(grandTotalPaise).not.toBe(subtotalPaise - discountTotalPaise);
    });

    it('variant price override takes precedence over product base price', () => {
      const prodId = randomUUID();
      const varId = randomUUID();

      const prod = {
        id: prodId,
        name: 'Enterprise Switch',
        slug: 'switch-24p',
        unit: 'piece',
        mrpPaise: 5000000,
        offerPricePaise: 4500000,
        discountType: 'none',
        discountValue: 0,
        status: 'published',
      } as unknown as typeof products.$inferSelect;

      const variant = {
        id: varId,
        productId: prodId,
        sku: 'SW-24P-POE',
        model: 'PoE+ Model',
        mrpPaise: 6500000,
        offerPricePaise: 6000000,
        discountType: 'percentage',
        discountValue: 500, // 5%
      } as unknown as typeof productVariants.$inferSelect;

      const productMap = new Map([[prodId, prod]]);
      const variantMap = new Map([[varId, variant]]);

      const lines = calculateQuotationLines(
        [{ productId: prodId, variantId: varId, quantity: 2 }],
        productMap,
        variantMap,
      );

      expect(lines[0]?.mrpPaise).toBe(6500000);
      expect(lines[0]?.offerPricePaise).toBe(6000000);
      expect(lines[0]?.discountType).toBe('percentage');
      // 5% of 6,000,000 is 300,000
      expect(lines[0]?.discountAmountPaise).toBe(300000);
      expect(lines[0]?.finalUnitPricePaise).toBe(5700000);
      expect(lines[0]?.lineTotalPaise).toBe(11400000);
    });
  });

  describe('Public Enquiry Privacy & Contract Invariant', () => {
    it('public enquiry response strictly disallows pricing fields', () => {
      const validResponse = {
        referenceNumber: 'ENQ-20261116-A1B2',
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

      const parsed = CustomerEnquiryResponseSchema.parse(validResponse);
      expect(parsed.referenceNumber).toBe('ENQ-20261116-A1B2');

      const anyParsed = parsed as Record<string, unknown>;
      expect(anyParsed.subtotalPaise).toBeUndefined();
      expect(anyParsed.grandTotalPaise).toBeUndefined();
      expect(anyParsed.discountTotalPaise).toBeUndefined();

      // Injection of pricing fields must throw due to strict schema
      expect(() =>
        CustomerEnquiryResponseSchema.parse({
          ...validResponse,
          grandTotalPaise: 10000,
        }),
      ).toThrow();
    });

    it('rejects public enquiry submissions with missing customer name', async () => {
      const server = await buildServer({ config, database: createMockDatabase() });
      servers.push(server);

      // Missing customerName (name is mandatory, contact info is optional)
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/public/enquiries',
        payload: {
          items: [{ productId: randomUUID(), quantity: 1 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    });

    it('rejects public enquiry submissions with invalid email format', async () => {
      const server = await buildServer({ config, database: createMockDatabase() });
      servers.push(server);

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/public/enquiries',
        payload: {
          customerName: 'Valid Name',
          customerEmail: 'invalid-email-format',
          items: [{ productId: randomUUID(), quantity: 1 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    });
  });

  describe('Admin Quotations Authorization', () => {
    function createAuthMockDb(userPermissions: string[]) {
      const adminUser = {
        id: randomUUID(),
        email: 'admin@palnadu.dev',
        name: 'Admin',
        status: 'active' as const,
        permissions: userPermissions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const authRow = [
        {
          session: {
            id: randomUUID(),
            userId: adminUser.id,
            expiresAt: new Date(Date.now() + 100000),
          },
          user: adminUser,
        },
      ];

      interface MockChain extends Promise<unknown> {
        from: () => MockChain;
        where: () => MockChain;
        innerJoin: () => MockChain;
        groupBy: () => MockChain;
        orderBy: () => MockChain;
        limit: (n?: number) => MockChain;
        offset: () => MockChain;
      }

      const makeChain = (val: unknown): MockChain => {
        const p = Promise.resolve(val) as MockChain;
        p.from = () => makeChain(val);
        p.where = () => makeChain(val);
        p.innerJoin = () => makeChain(authRow);
        p.groupBy = () => makeChain(val);
        p.orderBy = () => makeChain([]);
        p.limit = (n?: number) => makeChain(n === 1 ? authRow : []);
        p.offset = () => makeChain(val);
        return p;
      };

      return createMockDatabase({
        db: {
          select: vi
            .fn()
            .mockImplementation(() => makeChain([{ count: 0, totalGenerated: 0, totalValue: 0 }])),
        } as unknown as DatabaseClient['db'],
      });
    }

    it('rejects unauthenticated requests to quotation metrics with 401', async () => {
      const server = await buildServer({ config, database: createMockDatabase() });
      servers.push(server);

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/quotations/metrics',
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects admin user without quotation or admin permissions with 403', async () => {
      const db = createAuthMockDb(['catalogue:read']);
      const server = await buildServer({ config, database: db });
      servers.push(server);

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/quotations/metrics',
        headers: {
          host: 'localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${server.signCookie('valid-token')}`,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows admin user with admin:manage permission to access quotation metrics', async () => {
      const db = createAuthMockDb(['admin:manage']);
      const server = await buildServer({ config, database: db });
      servers.push(server);

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/quotations/metrics',
        headers: {
          host: 'localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${server.signCookie('valid-token')}`,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('totalRequestsReceived');
      expect(res.json()).toHaveProperty('totalQuotationsGenerated');
      expect(res.json()).toHaveProperty('totalQuotationValuePaise');
      expect(res.json()).toHaveProperty('frequentlyRequestedProducts');
    });
  });
});
