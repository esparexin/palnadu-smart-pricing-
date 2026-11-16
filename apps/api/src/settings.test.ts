import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import type { DatabaseClient } from '@palnadu/persistence';
import { buildServer } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
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

describe('Company Settings API', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('registers company settings routes in OpenAPI document', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    const res = await server.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json();

    expect(doc.paths['/api/v1/admin/settings/company']?.get).toBeDefined();
    expect(doc.paths['/api/v1/admin/settings/company']?.put).toBeDefined();
  });

  it('rejects unauthenticated requests to company settings', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/settings/company',
    });
    expect(res.statusCode).toBe(401);
  });
});
