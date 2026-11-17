import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import { buildServer, LOGGER_REDACT_PATHS } from './server.js';
import type { DatabaseClient } from '@palnadu/persistence';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
});

function createMockDatabase(overrides: Partial<DatabaseClient> = {}): DatabaseClient {
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {} as unknown as DatabaseClient['db'],
    ...overrides,
  };
}

describe('API foundation', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('serves health and readiness using the shared response contracts', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const health = await server.inject({ method: 'GET', url: '/api/v1/health' });
    const readiness = await server.inject({ method: 'GET', url: '/api/v1/ready' });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok' });
    expect(health.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
    expect(health.headers['server-timing']).toMatch(/app;dur=\d+(\.\d+)?/);
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toEqual({ status: 'ready' });
    expect(database.ping).toHaveBeenCalledOnce();
  });

  it('returns a safe error response when the database is unavailable', async () => {
    const database = createMockDatabase({
      ping: vi.fn().mockRejectedValue(new Error('secret connection detail')),
    });
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/api/v1/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is not ready',
      },
    });
    expect(response.body).not.toContain('secret connection detail');
  });

  it('exposes an OpenAPI document derived from registered routes', async () => {
    const server = await buildServer({
      config,
      database: createMockDatabase(),
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    const document = response.json();

    expect(response.statusCode).toBe(200);
    expect(document.paths['/api/v1/health'].get.responses['200']).toBeDefined();
    expect(document.paths['/api/v1/admin/auth/login'].post.responses['200']).toBeDefined();
    expect(document.paths['/api/v1/admin/auth/logout'].post.responses['200']).toBeDefined();
    expect(document.paths['/api/v1/admin/auth/me'].get.responses['200']).toBeDefined();
  });

  it('returns the shared error contract for unknown routes', async () => {
    const server = await buildServer({
      config,
      database: createMockDatabase(),
    });
    servers.push(server);

    const response = await server.inject({ method: 'GET', url: '/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('accepts only bounded safe request identifiers', async () => {
    const server = await buildServer({
      config,
      database: createMockDatabase(),
    });

    servers.push(server);

    const valid = await server.inject({
      method: 'GET',
      url: '/missing',
      headers: { 'x-request-id': 'client-request-123' },
    });
    const invalid = await server.inject({
      method: 'GET',
      url: '/missing',
      headers: { 'x-request-id': 'sensitive value' },
    });

    expect(valid.json().error.requestId).toBe('client-request-123');
    expect(invalid.json().error.requestId).not.toBe('sensitive value');
    expect(invalid.json().error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('defines comprehensive redaction paths for sensitive credentials and tokens', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    expect(LOGGER_REDACT_PATHS).toContain('*.password');
    expect(LOGGER_REDACT_PATHS).toContain('*.passwordHash');
    expect(LOGGER_REDACT_PATHS).toContain('*.secret');
    expect(LOGGER_REDACT_PATHS).toContain('*.sessionSecret');
    expect(LOGGER_REDACT_PATHS).toContain('*.sessionToken');
    expect(LOGGER_REDACT_PATHS).toContain('*.token');
    expect(LOGGER_REDACT_PATHS).toContain('req.headers.authorization');
    expect(LOGGER_REDACT_PATHS).toContain('req.headers.cookie');
    expect(LOGGER_REDACT_PATHS).toContain('req.headers["x-api-key"]');
    expect(LOGGER_REDACT_PATHS).toContain('res.headers["set-cookie"]');
  });
});
