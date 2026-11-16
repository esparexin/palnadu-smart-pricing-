import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ProcessedImageResult {
  buffer: Buffer;
  contentType: string;
  width?: number;
  height?: number;
  originalSize: number;
  processedSize: number;
  key: string;
}

export function validateImageFile(buffer: Buffer, mimeType: string): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error(`Unsupported image type: '${mimeType}'. Allowed types: JPG, PNG, WebP, AVIF.`);
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum permitted size of 10 MB.`,
    );
  }

  if (buffer.length === 0) {
    throw new Error('Image file buffer is empty.');
  }
}

export function generateStorageKey(prefix = 'products', extension = 'webp'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}/${dateStr}/${randomUUID()}.${extension}`;
}

export async function processAndOptimizeImage(
  inputBuffer: Buffer,
  mimeType: string,
  storagePrefix = 'products',
): Promise<ProcessedImageResult> {
  validateImageFile(inputBuffer, mimeType);

  const transformer = sharp(inputBuffer)
    .rotate() // auto-orient based on EXIF before stripping
    .resize({
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 });

  const [processedBuffer, metadata] = await Promise.all([
    transformer.toBuffer(),
    transformer.metadata(),
  ]);

  return {
    buffer: processedBuffer,
    contentType: 'image/webp',
    width: metadata.width,
    height: metadata.height,
    originalSize: inputBuffer.length,
    processedSize: processedBuffer.length,
    key: generateStorageKey(storagePrefix, 'webp'),
  };
}
