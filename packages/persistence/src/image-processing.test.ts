import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  generateStorageKey,
  MAX_IMAGE_SIZE_BYTES,
  processAndOptimizeImage,
  validateImageFile,
} from './image-processing.js';

describe('image-processing', () => {
  it('generates safe date-partitioned storage keys', () => {
    const key = generateStorageKey('products', 'webp');
    expect(key).toMatch(/^products\/\d{8}\/[0-9a-f-]+\.webp$/);
  });

  it('rejects unsupported MIME types', () => {
    const fakeBuffer = Buffer.from('hello world');
    expect(() => validateImageFile(fakeBuffer, 'application/pdf')).toThrow(
      /Unsupported image type/,
    );
  });

  it('rejects files exceeding max size', () => {
    const oversizedBuffer = { length: MAX_IMAGE_SIZE_BYTES + 10 } as Buffer;
    expect(() => validateImageFile(oversizedBuffer, 'image/jpeg')).toThrow(
      /exceeds maximum permitted size/,
    );
  });

  it('rejects empty buffers', () => {
    const emptyBuffer = Buffer.alloc(0);
    expect(() => validateImageFile(emptyBuffer, 'image/png')).toThrow(/buffer is empty/);
  });

  it('optimizes valid image buffer and outputs WebP', async () => {
    // Generate a valid 200x200 JPEG image using sharp
    const testImageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 128, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processAndOptimizeImage(testImageBuffer, 'image/jpeg');

    expect(result.contentType).toBe('image/webp');
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.key).toMatch(/^products\/\d{8}\//);
  });
});
