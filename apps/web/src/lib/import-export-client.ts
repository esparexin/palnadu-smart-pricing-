import type {
  ExportProductsQuery,
  ImportBatchDetailResponse,
  ImportBatchResponse,
  ImportConfirmResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
} from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

export class ImportExportClient {
  private readonly executor: RequestExecutor;

  constructor(executor: RequestExecutor) {
    this.executor = executor;
  }

  public previewImport(payload: ImportPreviewRequest): Promise<ImportPreviewResponse> {
    return this.executor.request<ImportPreviewResponse>('/api/v1/admin/imports/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public confirmImport(batchId: string): Promise<ImportConfirmResponse> {
    return this.executor.request<ImportConfirmResponse>(
      `/api/v1/admin/imports/${batchId}/confirm`,
      { method: 'POST' },
    );
  }

  public listBatches(params?: { limit?: number; offset?: number }): Promise<ImportBatchResponse[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return this.executor.request<ImportBatchResponse[]>(
      `/api/v1/admin/imports/batches${qs ? `?${qs}` : ''}`,
    );
  }

  public getBatch(batchId: string): Promise<ImportBatchDetailResponse> {
    return this.executor.request<ImportBatchDetailResponse>(
      `/api/v1/admin/imports/batches/${batchId}`,
    );
  }

  public getTemplateUrl(): string {
    return '/api/v1/admin/imports/template';
  }

  public getErrorsExportUrl(batchId: string): string {
    return `/api/v1/admin/imports/batches/${batchId}/errors/export`;
  }

  public async exportProducts(options: ExportProductsQuery): Promise<string> {
    const res = await fetch('/api/v1/admin/exports/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
    return res.text();
  }
}
