import { describe, expect, it } from 'vitest';
import { createStorageAdapter, DiskStorageAdapter, MemoryStorageAdapter } from './storage.js';

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
});
