import { describe, expect, it, vi } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import {
  CloudinaryStorageAdapter,
  createStorageAdapter,
  DiskStorageAdapter,
  MemoryStorageAdapter,
} from './storage.js';

describe('Storage Adapters', () => {
  it('uploads and deletes using MemoryStorageAdapter', async () => {
    const memory = new MemoryStorageAdapter('https://cdn.example.com');
    const buffer = Buffer.from('image data');

    const result = await memory.upload('test/image.webp', buffer, 'image/webp');
    expect(result.key).toBe('test/image.webp');
    expect(result.url).toBe('https://cdn.example.com/test%2Fimage.webp');
    expect(result.size).toBe(buffer.length);

    expect(memory.getFile('test/image.webp')?.buffer).toEqual(buffer);

    await memory.delete('test/image.webp');
    expect(memory.getFile('test/image.webp')).toBeUndefined();
  });

  it('creates default memory adapter via factory', () => {
    const adapter = createStorageAdapter();
    expect(adapter).toBeInstanceOf(MemoryStorageAdapter);
  });

  it('creates disk adapter via factory when requested with baseDir', () => {
    const adapter = createStorageAdapter({ type: 'disk', baseDir: '/tmp/test-uploads' });
    expect(adapter).toBeInstanceOf(DiskStorageAdapter);
  });

  it('creates cloudinary adapter via factory when requested with cloudinary options', () => {
    const adapter = createStorageAdapter({
      type: 'cloudinary',
      cloudinary: {
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        folder: 'test-folder',
      },
    });
    expect(adapter).toBeInstanceOf(CloudinaryStorageAdapter);
  });

  it('formats cloudinary public URLs properly', () => {
    const adapter = new CloudinaryStorageAdapter({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      folder: 'smart-pricing',
    });

    const url = adapter.getUrl('products/sample-image.webp');
    expect(url).toContain('smart-pricing/products/sample-image');
    expect(url).toContain('https://res.cloudinary.com/test-cloud');
  });

  it('uploads buffer to Cloudinary successfully via mocked upload_stream', async () => {
    const adapter = new CloudinaryStorageAdapter({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      folder: 'smart-pricing',
    });

    const mockUploadStream = vi.fn().mockImplementation((_options, callback) => {
      return {
        end: (buf: Buffer) => {
          callback(null, {
            secure_url:
              'https://res.cloudinary.com/test-cloud/image/upload/smart-pricing/test.webp',
            bytes: buf.length,
          });
        },
      };
    });

    vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(mockUploadStream);

    const buffer = Buffer.from('fake image binary');
    const result = await adapter.upload('products/123/main.webp', buffer, 'image/webp');

    expect(result.key).toBe('products/123/main.webp');
    expect(result.url).toBe(
      'https://res.cloudinary.com/test-cloud/image/upload/smart-pricing/test.webp',
    );
    expect(result.size).toBe(buffer.length);
  });

  it('handles Cloudinary upload stream errors cleanly', async () => {
    const adapter = new CloudinaryStorageAdapter({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });

    const mockUploadStream = vi.fn().mockImplementation((_options, callback) => {
      return {
        end: () => {
          callback(new Error('Network error connecting to Cloudinary'));
        },
      };
    });

    vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(mockUploadStream);

    const buffer = Buffer.from('fake image');
    await expect(adapter.upload('test.webp', buffer, 'image/webp')).rejects.toThrow(
      'Network error connecting to Cloudinary',
    );
  });

  it('deletes image from Cloudinary via mocked destroy', async () => {
    const adapter = new CloudinaryStorageAdapter({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      folder: 'smart-pricing',
    });

    const destroySpy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });

    await adapter.delete('products/test.webp');
    expect(destroySpy).toHaveBeenCalledWith('smart-pricing/products/test', {
      resource_type: 'image',
    });
  });
});
