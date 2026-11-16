import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from './api-client.js';

describe('Storefront ApiClient', () => {
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
    expect(defaultClient.storefront).toBeDefined();

    const customClient = new ApiClient({ baseUrl: 'https://api.example.com' });
    expect(customClient).toBeInstanceOf(ApiClient);
  });

  it('performs health check request successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });
    globalThis.fetch = fetchMock;

    const client = new ApiClient({ baseUrl: 'http://127.0.0.1:3001' });
    const result = await client.getHealth();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/api/v1/health');
    expect(result).toEqual({ status: 'ok' });
  });

  it('performs readiness check request successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ready' }),
    });
    globalThis.fetch = fetchMock;

    const client = new ApiClient({ baseUrl: 'http://127.0.0.1:3001' });
    const result = await client.getReadiness();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/api/v1/ready');
    expect(result).toEqual({ status: 'ready' });
  });

  it('handles API error responses with ApiClientError', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
          requestId: 'req-123',
        },
      }),
    });
    globalThis.fetch = fetchMock;

    const client = new ApiClient();
    await expect(client.request('/api/v1/public/products/missing')).rejects.toThrow(ApiClientError);
  });
});
