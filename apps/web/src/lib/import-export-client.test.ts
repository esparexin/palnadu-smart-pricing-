import { describe, expect, it, vi } from 'vitest';
import { ImportExportClient } from './import-export-client.js';

describe('ImportExportClient', () => {
  it('calls previewImport with correct endpoint and payload', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        batchId: 'mock-batch',
        totalRows: 10,
        validRows: 9,
        invalidRows: 1,
      }),
    };
    const client = new ImportExportClient(mockExecutor);
    const res = await client.previewImport({
      mode: 'create_only',
      csvContent: 'sku,name\nS1,P1',
    });
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/imports/preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(res.totalRows).toBe(10);
  });

  it('calls confirmImport with correct batch ID', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        batchId: 'batch-123',
        appliedRows: 5,
        skippedRows: 0,
        status: 'completed',
      }),
    };
    const client = new ImportExportClient(mockExecutor);
    const res = await client.confirmImport('batch-123');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/imports/batch-123/confirm',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.appliedRows).toBe(5);
  });

  it('returns template URL and errors export URL', () => {
    const client = new ImportExportClient({ request: vi.fn() });
    expect(client.getTemplateUrl()).toBe('/api/v1/admin/imports/template');
    expect(client.getErrorsExportUrl('batch-abc')).toBe(
      '/api/v1/admin/imports/batches/batch-abc/errors/export',
    );
  });
});
