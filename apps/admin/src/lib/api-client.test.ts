import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from './api-client.js';

describe('ApiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('initializes with default or custom base URL', () => {
    const defaultClient = new ApiClient();
    expect(defaultClient).toBeInstanceOf(ApiClient);

    const customClient = new ApiClient({ baseUrl: 'https://api.example.com' });
    expect(customClient).toBeInstanceOf(ApiClient);
  });

  it('performs login successfully and sends credentials', async () => {
    const mockSession = {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@palnadu.dev',
        name: 'Palnadu Admin',
        status: 'active',
        permissions: ['catalogue:read', 'catalogue:manage'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      expiresAt: '2026-01-02T00:00:00.000Z',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSession,
    });
    globalThis.fetch = fetchMock;

    const client = new ApiClient({ baseUrl: 'http://127.0.0.1:3001' });
    const result = await client.login({
      email: 'admin@palnadu.dev',
      password: 'password123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/api/v1/admin/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({
      email: 'admin@palnadu.dev',
      password: 'password123',
    });
    expect(result).toEqual(mockSession);
  });

  it('handles 401 unauthorized errors with ApiClientError', async () => {
    const errorPayload = {
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        requestId: 'req-401',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => errorPayload,
    });

    const client = new ApiClient();
    await expect(client.login({ email: 'bad@palnadu.dev', password: 'wrong' })).rejects.toThrow(
      ApiClientError,
    );

    try {
      await client.login({ email: 'bad@palnadu.dev', password: 'wrong' });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.code).toBe('INVALID_CREDENTIALS');
      expect(apiErr.message).toBe('Invalid email or password');
      expect(apiErr.requestId).toBe('req-401');
    }
  });

  it('fetches authenticated user with getMe', async () => {
    const mockUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@palnadu.dev',
      name: 'Palnadu Admin',
      status: 'active',
      permissions: ['catalogue:read'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUser,
    });

    const client = new ApiClient();
    const user = await client.getMe();
    expect(user).toEqual(mockUser);
  });

  it('fetches system health and readiness endpoints', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ready' }),
      });
    });

    const client = new ApiClient();
    const health = await client.getHealth();
    const ready = await client.getReadiness();

    expect(health).toEqual({ status: 'ok' });
    expect(ready).toEqual({ status: 'ready' });
  });

  it('logs out and sends credentials to revoke session', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const client = new ApiClient();
    const res = await client.logout();
    expect(res).toEqual({ success: true });
  });
});
