import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  permissions: ['catalogue:manage', 'catalogue:read', 'catalogue:write', 'admin:manage'],
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

describe('Import & Export API Routes', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  afterEach(async () => {
    if (server) await server.close();
  });

  it('rejects unauthorized access without session cookie', async () => {
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: { select: vi.fn() } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/imports/template',
    });
    expect(res.statusCode).toBe(401);
  });

  it('downloads the import template CSV', async () => {
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: {
        select: vi.fn().mockReturnValue({
          from: () => ({
            innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/imports/template',
      headers: reqHeaders(server),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('sku,name');
  });

  it('previews an import batch', async () => {
    const batchId = randomUUID();
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: {
        select: vi.fn().mockReturnValue({
          from: () => ({
            innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
            where: () => Promise.resolve([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: () => ({
            returning: vi.fn().mockResolvedValue([
              {
                id: batchId,
                mode: 'create_only',
                totalRows: 1,
                validRows: 1,
                invalidRows: 0,
              },
            ]),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/imports/preview',
      headers: reqHeaders(server),
      payload: {
        mode: 'create_only',
        csvContent: 'sku,name,mrp_paise,selling_price_paise\nSKU-1,Prod 1,1000,800',
        fileName: 'test.csv',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalRows).toBe(1);
    expect(body.validRows).toBe(1);
    expect(body.batchId).toBe(batchId);
  });

  it('confirms and commits an import batch', async () => {
    const batchId = randomUUID();
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: {
        select: vi.fn().mockReturnValue({
          from: () => ({
            innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
            where: () => ({
              limit: vi.fn().mockResolvedValue([
                {
                  id: batchId,
                  mode: 'create_only',
                  status: 'previewing',
                  totalRows: 1,
                  appliedRows: 0,
                },
              ]),
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: randomUUID(),
                  batchId,
                  rowNumber: 2,
                  status: 'valid',
                  rawData: { sku: 'SKU-1', name: 'Prod 1' },
                },
              ]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: () => ({
            returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: () => ({
            where: () => ({
              returning: vi
                .fn()
                .mockResolvedValue([{ id: batchId, status: 'completed', appliedRows: 1 }]),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/imports/${batchId}/confirm`,
      headers: reqHeaders(server),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.appliedRows).toBe(1);
    expect(body.status).toBe('completed');
  });

  it('exports products CSV', async () => {
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: {
        select: vi.fn().mockReturnValue({
          from: () => ({
            innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: vi.fn().mockResolvedValue([
                    {
                      id: randomUUID(),
                      name: 'Widget X',
                      slug: 'widget-x',
                      status: 'published',
                      sku: 'WX-1',
                      brandName: 'Acme',
                      mrpPaise: 1000,
                      offerPricePaise: 800,
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/exports/products',
      headers: reqHeaders(server),
      payload: { status: 'published', includePricing: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('Widget X');
    expect(res.payload).toContain('1000');
  });
});
