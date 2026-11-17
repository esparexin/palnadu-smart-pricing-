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

  it('reuses cached products on subsequent calls and deduplicates concurrent calls', async () => {
    const mockProducts = { items: [{ id: 'p1', name: 'Camera' }], total: 1 };
    (mockExecutor.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockProducts);

    const [res1, res2] = await Promise.all([
      client.listProducts({ limit: 12 }),
      client.listProducts({ limit: 12 }),
    ]);
    expect(res1).toEqual(mockProducts);
    expect(res2).toEqual(mockProducts);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    const res3 = await client.listProducts({ limit: 12 });
    expect(res3).toEqual(mockProducts);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    await client.listProducts({ limit: 12, q: 'dome' });
    expect(mockExecutor.request).toHaveBeenCalledTimes(2);
  });

  it('calls getProductBySlug with encoded slug and reuses cache', async () => {
    const mockProduct = { id: 'p1', slug: '4mp-ptz-camera', name: '4MP PTZ Camera' };
    (mockExecutor.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockProduct);

    const [res1, res2] = await Promise.all([
      client.getProductBySlug('4mp-ptz-camera'),
      client.getProductBySlug('4mp-ptz-camera'),
    ]);
    expect(res1).toEqual(mockProduct);
    expect(res2).toEqual(mockProduct);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/products/4mp-ptz-camera');
  });

  it('clears all in-memory caches when clearCache is called', async () => {
    const mockCategories = [{ id: '1', name: 'Cameras', slug: 'cameras', parentId: null }];
    (mockExecutor.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);

    await client.listCategories();
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    client.clearCache();
    await client.listCategories();
    expect(mockExecutor.request).toHaveBeenCalledTimes(2);
  });

  it('calls listCategories with optional search query', async () => {
    await client.listCategories('cameras');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/categories?q=cameras');
  });

  it('reuses cached categories on subsequent calls and deduplicates concurrent calls', async () => {
    const mockCategories = [{ id: '1', name: 'Cameras', slug: 'cameras', parentId: null }];
    (mockExecutor.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);

    const [res1, res2] = await Promise.all([client.listCategories(), client.listCategories()]);
    expect(res1).toEqual(mockCategories);
    expect(res2).toEqual(mockCategories);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    const res3 = await client.listCategories();
    expect(res3).toEqual(mockCategories);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    await client.listCategories('networking');
    expect(mockExecutor.request).toHaveBeenCalledTimes(2);
  });

  it('calls listBrands with optional search query', async () => {
    await client.listBrands('hikvision');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/brands?q=hikvision');
  });

  it('reuses cached brands on subsequent calls and deduplicates concurrent calls', async () => {
    const mockBrands = [{ id: '1', name: 'Hikvision', slug: 'hikvision' }];
    (mockExecutor.request as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrands);

    const [res1, res2] = await Promise.all([client.listBrands(), client.listBrands()]);
    expect(res1).toEqual(mockBrands);
    expect(res2).toEqual(mockBrands);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);

    const res3 = await client.listBrands();
    expect(res3).toEqual(mockBrands);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);
  });

  it('calls getRecommendations with encoded product ID or slug', async () => {
    await client.getRecommendations('prod-123');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/public/products/prod-123/recommendations',
    );
  });

  it('calls submitEnquiry with POST payload', async () => {
    const payload = {
      customerName: 'Kalyan Medaboina',
      customerPhone: '+919876543210',
      items: [{ productId: 'prod-123', quantity: 2 }],
    };
    await client.submitEnquiry(payload);
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});
