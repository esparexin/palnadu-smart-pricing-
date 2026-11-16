import type { ImageResponse } from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

export interface UploadImageOptions {
  altText?: string;
  isPrimary?: boolean;
  variantId?: string | null;
}

export interface MediaUploadResult {
  url: string;
  key: string;
  size: number;
  width: number;
  height: number;
  contentType: string;
}

export class MediaClient {
  private readonly executor: RequestExecutor;

  constructor(executor: RequestExecutor) {
    this.executor = executor;
  }

  public uploadMedia(file: File | Blob): Promise<MediaUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.executor.request<MediaUploadResult>('/api/v1/admin/media/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public uploadProductImage(
    productId: string,
    file: File | Blob,
    options?: UploadImageOptions,
  ): Promise<ImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.altText) {
      formData.append('altText', options.altText);
    }
    if (options?.isPrimary !== undefined) {
      formData.append('isPrimary', String(options.isPrimary));
    }
    if (options?.variantId) {
      formData.append('variantId', options.variantId);
    }

    return this.executor.request<ImageResponse>(
      `/api/v1/admin/products/${productId}/images/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
  }
}
