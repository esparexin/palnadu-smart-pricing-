import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { parseServerConfig } from '@palnadu/server-config';
import {
  buildServer,
  requireAdminPermission,
  validateCsrfProtection,
  SESSION_COOKIE_NAME,
} from './server.js';
import type { DatabaseClient } from '@palnadu/persistence';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'palnadu-test-secret-at-least-32-characters-long-for-testing',
});

function createMockDatabase(overrides: Partial<DatabaseClient> = {}): DatabaseClient {
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {} as unknown as DatabaseClient['db'],
    ...overrides,
  };
}

describe('Admin Authentication API (unit)', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('rejects unauthenticated requests to /me with 401', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  });

  it('rejects tampered session cookies with 401', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      cookies: {
        [SESSION_COOKIE_NAME]: 'tampered-unsigned-cookie-value',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  });

  it('enforces cross-origin CSRF protection on state-changing requests with mismatched origin', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
        origin: 'https://evil-attacker-site.com',
      },
      payload: {
        email: 'admin@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CSRF_ERROR',
        message: 'Cross-origin request rejected',
      },
    });
  });

  it('rejects requests missing the Host header on mutating routes with 400', async () => {
    const mockRequest = {
      id: 'req-missing-host',
      method: 'POST',
      headers: { host: undefined },
    } as unknown as FastifyRequest;

    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await validateCsrfProtection(mockRequest, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Missing Host header',
        }),
      }),
    );
  });

  it('rejects malformed or null Origin headers with 403', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
        origin: 'null',
      },
      payload: {
        email: 'admin@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CSRF_ERROR',
        message: 'Malformed origin header',
      },
    });
  });

  it('rejects origins with unexpected non-http schemes (e.g. ftp:) with 403', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
        origin: 'ftp://localhost:3001',
      },
      payload: {
        email: 'admin@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CSRF_ERROR',
        message: 'Malformed origin header',
      },
    });
  });

  it('rejects cross-origin Referer when Origin is absent with 403', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
        referer: 'https://attacker-site.com/malicious-page',
      },
      payload: {
        email: 'admin@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CSRF_ERROR',
        message: 'Cross-origin request rejected',
      },
    });
  });

  it('rejects referers with unexpected non-http schemes (e.g. ftp:) with 403', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
        referer: 'ftp://localhost:3001/malicious-page',
      },
      payload: {
        email: 'admin@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CSRF_ERROR',
        message: 'Malformed referer header',
      },
    });
  });

  it('does not block safe GET requests even if cross-origin headers are present', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: {
        host: 'localhost:3001',
        origin: 'https://attacker-site.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('rejects malformed host header containing invalid characters or spaces with 400', async () => {
    const mockRequest = {
      id: 'req-malformed-host',
      method: 'POST',
      headers: { host: 'evil.com localhost:3001' },
    } as unknown as FastifyRequest;

    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await validateCsrfProtection(mockRequest, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Missing Host header',
        }),
      }),
    );
  });

  it('does not permit client-controlled X-Forwarded-For to spoof request.ip', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    // Register a test route that returns request.ip
    server.get('/api/v1/test-ip', async (req) => ({ ip: req.ip }));

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/test-ip',
      headers: {
        'x-forwarded-for': '203.0.113.195',
      },
    });

    expect(response.statusCode).toBe(200);
    // When trustProxy is disabled, request.ip remains 127.0.0.1 and ignores X-Forwarded-For
    expect(response.json()).toEqual({ ip: '127.0.0.1' });
  });

  it('permits same-origin requests matching Host and Origin with port normalization', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'api.palnadu.dev:443',
        origin: 'https://api.palnadu.dev',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  });

  it('handles logout idempotently even when cookie is absent or tampered', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const resNoCookie = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: { host: 'localhost:3001' },
    });
    expect(resNoCookie.statusCode).toBe(200);
    expect(resNoCookie.json()).toEqual({ success: true });

    const resBadCookie = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: { host: 'localhost:3001' },
      cookies: { [SESSION_COOKIE_NAME]: 'tampered-signature-cookie' },
    });
    expect(resBadCookie.statusCode).toBe(200);
    expect(resBadCookie.json()).toEqual({ success: true });
  });

  it('does not crash when login request body has a non-string email', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: {
        email: 12345,
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
  });

  it('enforces permission authorization guards', async () => {
    const reqWithNoAuth = {
      id: 'req-1',
      admin: undefined,
    } as unknown as FastifyRequest;
    const replyMock = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const guard = requireAdminPermission('catalogue:write');
    await guard(reqWithNoAuth, replyMock);
    expect(replyMock.status).toHaveBeenCalledWith(401);

    const reqWithMissingPermission = {
      id: 'req-2',
      admin: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'viewer@example.com',
        name: 'Viewer Admin',
        status: 'active' as const,
        permissions: ['catalogue:read'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as unknown as FastifyRequest;

    const replyMock2 = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await guard(reqWithMissingPermission, replyMock2);
    expect(replyMock2.status).toHaveBeenCalledWith(403);
    expect(replyMock2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Missing required permission: catalogue:write',
        }),
      }),
    );
  });

  it('enforces shared Zod contracts from @palnadu/contracts as SSOT', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:80' },
      payload: {
        email: 'not-an-email',
        password: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Request could not be processed');
  });

  it('permits cross-origin mutations when Origin matches ALLOWED_ORIGINS', async () => {
    const customConfig = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
      ALLOWED_ORIGINS: 'https://admin.staging.vercel.app',
    });
    const database = createMockDatabase();
    const server = await buildServer({ config: customConfig, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'api.staging.onrender.com',
        origin: 'https://admin.staging.vercel.app',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  });

  it('rejects cross-origin mutations when Origin does NOT match ALLOWED_ORIGINS', async () => {
    const customConfig = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
      ALLOWED_ORIGINS: 'https://admin.staging.vercel.app',
    });
    const database = createMockDatabase();
    const server = await buildServer({ config: customConfig, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'api.staging.onrender.com',
        origin: 'https://evil-untrusted-site.com',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CSRF_ERROR');
  });

  it('rejects state-changing mutations with session cookie when both Origin and Referer are missing', async () => {
    const database = createMockDatabase();
    const server = await buildServer({ config, database });
    servers.push(server);

    const signedToken = server.signCookie('valid-test-session-token');

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'localhost:3001',
      },
      cookies: {
        [SESSION_COOKIE_NAME]: signedToken,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CSRF_ERROR');
    expect(response.json().error.message).toContain('requires Origin or Referer header');
  });

  it('rejects spoofed X-Forwarded-Host when Origin is not in ALLOWED_ORIGINS', async () => {
    const customConfig = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
      ALLOWED_ORIGINS: 'https://admin.staging.vercel.app',
    });
    const database = createMockDatabase();
    const server = await buildServer({ config: customConfig, database });
    servers.push(server);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'api.staging.onrender.com',
        'x-forwarded-host': 'admin.staging.vercel.app',
        origin: 'https://attacker.com',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CSRF_ERROR');
  });

  it('handles CORS preflight OPTIONS requests from allowed origins', async () => {
    const customConfig = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
      ALLOWED_ORIGINS: 'https://admin.staging.vercel.app',
    });
    const database = createMockDatabase();
    const server = await buildServer({ config: customConfig, database });
    servers.push(server);

    const response = await server.inject({
      method: 'OPTIONS',
      url: '/api/v1/admin/auth/login',
      headers: {
        origin: 'https://admin.staging.vercel.app',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://admin.staging.vercel.app',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
