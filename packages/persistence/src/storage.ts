import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export interface StoragePort {
  upload(key: string, buffer: Buffer, contentType: string): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class MemoryStorageAdapter implements StoragePort {
  private readonly files = new Map<string, { buffer: Buffer; contentType: string }>();
  private readonly baseUrl: string;

  constructor(baseUrl = 'https://cdn.palnadusmart.in/media') {
    this.baseUrl = baseUrl;
  }

  public async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<StorageUploadResult> {
    this.files.set(key, { buffer, contentType });
    return {
      key,
      url: this.getUrl(key),
      size: buffer.length,
    };
  }

  public async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  public getUrl(key: string): string {
    return `${this.baseUrl}/${encodeURIComponent(key)}`;
  }

  public getFile(key: string) {
    return this.files.get(key);
  }
}

export class DiskStorageAdapter implements StoragePort {
  private readonly baseDir: string;
  private readonly publicBaseUrl: string;

  constructor(baseDir: string, publicBaseUrl = '/uploads') {
    this.baseDir = baseDir;
    this.publicBaseUrl = publicBaseUrl;
  }

  public async upload(
    key: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<StorageUploadResult> {
    const fullPath = join(this.baseDir, key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return {
      key,
      url: this.getUrl(key),
      size: buffer.length,
    };
  }

  public async delete(key: string): Promise<void> {
    try {
      const fullPath = join(this.baseDir, key);
      await unlink(fullPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  public getUrl(key: string): string {
    return `${this.publicBaseUrl}/${encodeURI(key)}`;
  }
}

export function createStorageAdapter(options?: {
  type?: 'memory' | 'disk';
  baseDir?: string;
  baseUrl?: string;
}): StoragePort {
  if (options?.type === 'disk' && options.baseDir) {
    return new DiskStorageAdapter(options.baseDir, options.baseUrl);
  }
  return new MemoryStorageAdapter(options?.baseUrl);
}
