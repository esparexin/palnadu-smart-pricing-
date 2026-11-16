import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorefrontClient, type RequestExecutor } from './storefront-client';

describe('StorefrontClient', () => {
  let mockExecutor: RequestExecutor;
  let client: StorefrontClient;

  beforeEach(() => {
    mockExecutor = {
      request: vi.fn().mockResolvedValue({}),
    };
    client = new StorefrontClient(mockExecutor);
  });

  it('calls listProducts with query parameters', async () => {
    await client.listProducts({
      limit: 20,
      offset: 0,
      q: 'camera',
      brandSlug: 'hikvision',
      categorySlug: 'ip-cameras',
    });
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/public/products?limit=20&offset=0&q=camera&brandSlug=hikvision&categorySlug=ip-cameras',
    );
  });

  it('calls getProductBySlug with encoded slug', async () => {
    await client.getProductBySlug('4mp-ptz-camera');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/products/4mp-ptz-camera');
  });

  it('calls listCategories with optional search query', async () => {
    await client.listCategories('cameras');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/categories?q=cameras');
  });

  it('calls listBrands with optional search query', async () => {
    await client.listBrands('hikvision');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/brands?q=hikvision');
  });

  it('calls getRecommendations with encoded product ID or slug', async () => {
    await client.getRecommendations('prod-123');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/public/products/prod-123/recommendations',
    );
  });
});
