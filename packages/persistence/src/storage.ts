import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

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

export interface CloudinaryStorageOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

export class CloudinaryStorageAdapter implements StoragePort {
  private readonly client: typeof cloudinary;
  private readonly folder?: string;

  constructor(options: CloudinaryStorageOptions) {
    this.client = cloudinary;
    this.client.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });
    this.folder = options.folder;
  }

  public async upload(
    key: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<StorageUploadResult> {
    const publicId = key.replace(/\.[^/.]+$/, '');
    const fullPublicId = this.folder ? `${this.folder}/${publicId}` : publicId;

    return new Promise<StorageUploadResult>((resolve, reject) => {
      const uploadStream = this.client.uploader.upload_stream(
        {
          public_id: fullPublicId,
          resource_type: 'image',
          overwrite: true,
          unique_filename: false,
        },
        (error: unknown, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(error instanceof Error ? error : new Error('Cloudinary upload failed'));
          }
          resolve({
            key,
            url: result.secure_url,
            size: result.bytes || buffer.length,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }

  public async delete(key: string): Promise<void> {
    const publicId = key.replace(/\.[^/.]+$/, '');
    const fullPublicId = this.folder ? `${this.folder}/${publicId}` : publicId;
    try {
      await this.client.uploader.destroy(fullPublicId, { resource_type: 'image' });
    } catch {
      // Ignore if file doesn't exist on remote
    }
  }

  public getUrl(key: string): string {
    const publicId = key.replace(/\.[^/.]+$/, '');
    const fullPublicId = this.folder ? `${this.folder}/${publicId}` : publicId;
    return this.client.url(fullPublicId, { secure: true, format: 'webp' });
  }
}

export interface StorageAdapterFactoryOptions {
  type?: 'memory' | 'disk' | 'cloudinary';
  baseDir?: string;
  baseUrl?: string;
  cloudinary?: CloudinaryStorageOptions;
}

export function createStorageAdapter(options?: StorageAdapterFactoryOptions): StoragePort {
  if (options?.type === 'cloudinary' && options.cloudinary) {
    return new CloudinaryStorageAdapter(options.cloudinary);
  }
  if (options?.type === 'disk' && options.baseDir) {
    return new DiskStorageAdapter(options.baseDir, options.baseUrl);
  }
  return new MemoryStorageAdapter(options?.baseUrl);
}
