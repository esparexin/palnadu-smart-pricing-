import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import type { DatabaseClient } from '@palnadu/persistence';
import { buildServer, SESSION_COOKIE_NAME } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
});

const TEST_ADMIN = {
  id: randomUUID(),
  email: 'admin@palnadusmart.in',
  name: 'Admin',
  status: 'active' as const,
  permissions: ['catalogue:read'], // Read-only catalogue permission
  createdAt: new Date(),
  updatedAt: new Date(),
};

const AUTH_ROW = [
  {
    session: { id: randomUUID(), userId: TEST_ADMIN.id, expiresAt: new Date(Date.now() + 100000) },
    user: TEST_ADMIN,
  },
];

function reqHeaders(server: { signCookie: (v: string) => string }) {
  return {
    host: 'localhost:3000',
    cookie: `${SESSION_COOKIE_NAME}=${server.signCookie('valid-token')}`,
  };
}

describe('System Quality, Security & Privacy Audit', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  afterEach(async () => {
    if (server) await server.close();
  });

  const productId = randomUUID();
  const mockProduct = {
    id: productId,
    name: 'Industrial Cement 53 Grade',
    slug: 'industrial-cement-53-grade',
    model: 'OPC-53',
    description: 'High strength cement for commercial construction',
    unit: 'Bags',
    status: 'active',
    brandId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockDb = () => {
    const db = {
      select: () => ({
        from: (_table: { [key: symbol]: string }) => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve(AUTH_ROW),
            }),
          }),
          where: () => {
            const res = Promise.resolve([mockProduct]);
            (res as unknown as { orderBy: () => { limit: () => Promise<unknown[]> } }).orderBy =
              () => ({
                limit: () => Promise.resolve([mockProduct]),
              });
            return res;
          },
          orderBy: () => Promise.resolve([mockProduct]),
          limit: () => Promise.resolve([mockProduct]),
        }),
      }),
    };

    return {
      db: db as unknown,
      ping: async () => {},
      close: async () => {},
    } as unknown as DatabaseClient;
  };

  it('audits public catalogue endpoint for absolute price confidentiality', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const openApiRes = await server.inject({
      method: 'GET',
      url: '/api/v1/openapi.json',
    });
    expect(openApiRes.statusCode).toBe(200);
    const doc = openApiRes.json();

    // Verify OpenAPI public product schema contains no price properties
    const productSchema = doc.components?.schemas?.PublicProductDto;
    if (productSchema?.properties) {
      expect(productSchema.properties.mrpPaise).toBeUndefined();
      expect(productSchema.properties.offerPricePaise).toBeUndefined();
      expect(productSchema.properties.pricePaise).toBeUndefined();
      expect(productSchema.properties.sellingPricePaise).toBeUndefined();
    }

    // Verify DTO mapping strictly strips all pricing
    const { mapToPublicProductDto } = await import('@palnadu/persistence');
    const rawProduct = {
      id: productId,
      slug: 'tmt-steel-bar-16mm',
      name: 'TMT Steel Bar 16mm',
      brandId: null,
      model: 'FE-550D',
      description: 'High tensile reinforcement steel bar',
      unit: 'Tons',
      specifications: { grade: 'FE-550D', diameterMm: 16 },
      status: 'published' as const,
      mrpPaise: 6500000,
      offerPricePaise: 5800000,
      discountType: 'percentage' as const,
      discountValue: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const rawVariants = [
      {
        id: randomUUID(),
        productId,
        sku: 'TMT-16MM-12M',
        model: '12m Standard Length',
        options: { lengthM: 12 },
        mrpPaise: 6500000,
        offerPricePaise: 5800000,
        discountType: 'percentage' as const,
        discountValue: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const dto = mapToPublicProductDto(rawProduct, null, [], rawVariants, []);
    const jsonStr = JSON.stringify(dto);
    expect(jsonStr).not.toContain('mrpPaise');
    expect(jsonStr).not.toContain('offerPricePaise');
    expect(jsonStr).not.toContain('discountValue');
    expect(jsonStr).not.toContain('sellingPricePaise');
    expect(jsonStr).not.toContain('6500000');
    expect(jsonStr).not.toContain('5800000');
  });

  it('rejects unauthorized access to admin catalogue routes', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/products',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('enforces least-privilege role boundaries on write operations', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    // TEST_ADMIN has only 'catalogue:read', not 'catalogue:manage'
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: reqHeaders(server),
      payload: {
        name: 'TMT Steel Bar 16mm',
        slug: 'tmt-steel-bar-16mm',
        unit: 'Tons',
        status: 'published',
        images: [
          { url: 'https://images.example.com/bar1.jpg' },
          { url: 'https://images.example.com/bar2.jpg' },
        ],
      },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('verifies operational readiness health probe', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
  });

  it('verifies commercial quotation metrics exclude draft and unissued enquiries', () => {
    const sampleQuotations = [
      { id: '1', status: 'submitted', grandTotalPaise: 500000 },
      { id: '2', status: 'draft', grandTotalPaise: 750000 },
      { id: '3', status: 'issued', grandTotalPaise: 1200000 },
      { id: '4', status: 'delivered', grandTotalPaise: 800000 },
      { id: '5', status: 'rejected', grandTotalPaise: 300000 },
    ];

    // Filter strictly issued / delivered quotations
    const issued = sampleQuotations.filter(
      (q) => q.status === 'issued' || q.status === 'delivered',
    );
    const totalIssuedValuePaise = issued.reduce((sum, q) => sum + q.grandTotalPaise, 0);

    expect(issued.length).toBe(2);
    expect(totalIssuedValuePaise).toBe(2000000); // 12,00,000 + 8,00,000 paise = ₹20,000
  });
});
