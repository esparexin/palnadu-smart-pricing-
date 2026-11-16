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
  permissions: [
    'catalogue:manage',
    'catalogue:read',
    'catalogue:write',
    'settings:read',
    'settings:write',
    'admin:manage',
  ],
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

describe('Inventory API Routes', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  afterEach(async () => {
    if (server) await server.close();
  });

  it('gets inventory config', async () => {
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
                  id: 'default',
                  enabled: true,
                  stockOwnership: 'smart_pricing',
                  defaultThreshold: 2,
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/inventory/config',
      headers: reqHeaders(server),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.enabled).toBe(true);
    expect(body.defaultThreshold).toBe(2);
  });

  it('updates inventory config', async () => {
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
                  id: 'default',
                  enabled: false,
                  stockOwnership: 'smart_pricing',
                  defaultThreshold: 1,
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: () => ({
            onConflictDoUpdate: () => ({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'default',
                  enabled: true,
                  stockOwnership: 'smart_pricing',
                  defaultThreshold: 5,
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/admin/inventory/config',
      headers: reqHeaders(server),
      payload: { enabled: true, defaultThreshold: 5 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.enabled).toBe(true);
    expect(body.defaultThreshold).toBe(5);
  });

  it('records a stock movement', async () => {
    const variantId = randomUUID();
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
                  enabled: true,
                  stockOwnership: 'smart_pricing',
                  defaultThreshold: 2,
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: () => ({
            returning: vi.fn().mockResolvedValue([
              {
                id: randomUUID(),
                variantId,
                quantity: 10,
                availableQuantity: 10,
                stockStatus: 'in_stock',
              },
            ]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: () => ({
            where: () => ({
              returning: vi.fn().mockResolvedValue([{ id: randomUUID(), availableQuantity: 10 }]),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/inventory/movements',
      headers: reqHeaders(server),
      payload: {
        variantId,
        quantity: 10,
        movementType: 'inward',
        reason: 'Restock',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.stockStatus).toBeDefined();
  });

  it('acknowledges an active inventory alert', async () => {
    const alertId = randomUUID();
    const db: DatabaseClient = {
      close: vi.fn(),
      ping: vi.fn().mockResolvedValue(undefined),
      db: {
        select: vi.fn().mockReturnValue({
          from: () => ({
            innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: () => ({
            where: () => ({
              returning: vi.fn().mockResolvedValue([{ id: alertId, state: 'acknowledged' }]),
            }),
          }),
        }),
      } as unknown as DatabaseClient['db'],
    };
    server = await buildServer({ config, database: db });
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/inventory/alerts/${alertId}/acknowledge`,
      headers: reqHeaders(server),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});
