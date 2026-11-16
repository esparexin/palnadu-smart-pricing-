import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import type { DatabaseClient } from '@palnadu/persistence';
import { encryptSecret } from '@palnadu/persistence';
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
    'settings:read',
    'settings:write',
    'catalogue:read',
    'catalogue:write',
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

describe('Integrations API Routes', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  afterEach(async () => {
    if (server) await server.close();
  });

  const connectorId = randomUUID();
  const testSecret = 'secret-token-123';

  const mockConnectorRow = {
    id: connectorId,
    provider: 'tally_prime',
    name: 'Tally Head Office',
    enabled: true,
    endpointUrl: 'http://localhost:9000',
    authSecretEncrypted: encryptSecret(testSecret),
    productSsot: 'palnadu_smart_pricing',
    inventorySsot: 'external_erp',
    priceSsot: 'external_erp',
    fieldMappings: {},
    lastSyncAt: new Date(),
    lastSyncStatus: 'success',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJobRow = {
    id: randomUUID(),
    connectorId,
    jobType: 'inventory',
    status: 'completed',
    itemsProcessed: 1,
    itemsCreated: 0,
    itemsUpdated: 1,
    itemsFailed: 0,
    errorLog: null,
    startedAt: new Date(),
    completedAt: new Date(),
  };

  const createMockDb = () => {
    const db = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve(AUTH_ROW),
            }),
          }),
          where: () => {
            const res = Promise.resolve([mockConnectorRow]);
            (res as unknown as { orderBy: () => { limit: () => Promise<unknown[]> } }).orderBy =
              () => ({
                limit: () => Promise.resolve([]),
              });
            return res;
          },
          orderBy: () => Promise.resolve([mockConnectorRow]),
        }),
      }),
      insert: () => ({
        values: (val: Record<string, unknown>) => {
          const row = { ...mockJobRow, ...mockConnectorRow, ...val };
          return {
            returning: () => Promise.resolve([row]),
            onConflictDoUpdate: () => Promise.resolve([row]),
            then: (resolve: (v: unknown) => void) => resolve([row]),
          };
        },
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            const row = { ...mockJobRow, ...mockConnectorRow, ...vals };
            return {
              returning: () => Promise.resolve([row]),
              then: (resolve: (v: unknown) => void) => resolve([row]),
            };
          },
        }),
      }),
      delete: () => ({
        where: () => Promise.resolve({ count: 1 }),
      }),
    };

    return {
      db: db as unknown,
      ping: async () => {},
      close: async () => {},
    } as unknown as DatabaseClient;
  };

  it('lists connectors for admin', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/integrations/connectors',
      headers: reqHeaders(server),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe('Tally Head Office');
  });

  it('creates a new connector for admin', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/integrations/connectors',
      headers: reqHeaders(server),
      payload: {
        provider: 'generic_webhook',
        name: 'Warehouse ERP',
        enabled: true,
        productSsot: 'palnadu_smart_pricing',
        inventorySsot: 'external_erp',
        priceSsot: 'palnadu_smart_pricing',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Warehouse ERP');
  });

  it('triggers manual sync for admin', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/integrations/connectors/${connectorId}/sync`,
      headers: reqHeaders(server),
      payload: {
        jobType: 'inventory',
        payloadData: JSON.stringify([{ sku: 'SKU-001', quantity: 25 }]),
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('completed');
  });

  it('rejects unauthorized webhook push', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/integrations/webhook/${connectorId}`,
      headers: { 'x-api-key': 'wrong-secret' },
      payload: { jobType: 'inventory', payloadData: '[]' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('accepts authorized webhook push with valid secret', async () => {
    const database = createMockDb();
    server = await buildServer({ config, database });

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/integrations/webhook/${connectorId}`,
      headers: { 'x-api-key': testSecret },
      payload: { jobType: 'inventory', payloadData: '[]' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.job).toBeDefined();
  });
});
