import { describe, expect, it, vi } from 'vitest';
import { MediaClient, type RequestExecutor } from './media-client';

describe('MediaClient', () => {
  const mockExecutor: RequestExecutor = {
    request: vi.fn(),
  };

  it('uploads media file to /api/v1/admin/media/upload', async () => {
    const client = new MediaClient(mockExecutor);
    const mockFile = new Blob(['sample-bytes'], { type: 'image/png' });
    vi.mocked(mockExecutor.request).mockResolvedValueOnce({
      url: 'https://cdn.palnadusmart.in/media/products/20261116/uuid.webp',
      key: 'products/20261116/uuid.webp',
      size: 1200,
      width: 800,
      height: 600,
      contentType: 'image/webp',
    });

    const res = await client.uploadMedia(mockFile);

    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/media/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(res.url).toContain('https://cdn.palnadusmart.in');
  });

  it('uploads product image to /api/v1/admin/products/:id/images/upload with metadata', async () => {
    const client = new MediaClient(mockExecutor);
    const mockFile = new Blob(['sample-bytes'], { type: 'image/png' });
    const productId = 'prod-123';

    vi.mocked(mockExecutor.request).mockResolvedValueOnce({
      id: 'img-1',
      productId,
      url: 'https://cdn.palnadusmart.in/media/products/prod-123/uuid.webp',
      altText: 'Front angle',
      isPrimary: true,
      variantId: null,
      sortOrder: 0,
      rightsStatus: 'manual_upload',
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
    });

    const res = await client.uploadProductImage(productId, mockFile, {
      altText: 'Front angle',
      isPrimary: true,
      variantId: null,
    });

    expect(mockExecutor.request).toHaveBeenCalledWith(
      `/api/v1/admin/products/${productId}/images/upload`,
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(res.id).toBe('img-1');
    expect(res.isPrimary).toBe(true);
  });
});
