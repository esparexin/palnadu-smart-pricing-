import { describe, expect, it } from 'vitest';
import {
  ExportProductsQuerySchema,
  ImportBatchResponseSchema,
  ImportPreviewRequestSchema,
  ImportPreviewResponseSchema,
  ProductImportRowInputSchema,
} from './import-export.js';

describe('import-export contracts', () => {
  it('validates a correct product import row', () => {
    const validRow = {
      sku: 'WIDGET-001',
      name: 'Standard Widget',
      slug: 'standard-widget',
      brandName: 'Acme',
      categoryName: 'Tools',
      description: 'Durable widget',
      status: 'draft' as const,
      mrpPaise: 10000,
      sellingPricePaise: 8000,
    };
    const parsed = ProductImportRowInputSchema.parse(validRow);
    expect(parsed.sku).toBe('WIDGET-001');
    expect(parsed.mrpPaise).toBe(10000);
  });

  it('rejects invalid product import row missing required fields', () => {
    const invalidRow = {
      name: 'Missing SKU',
    };
    expect(() => ProductImportRowInputSchema.parse(invalidRow)).toThrow();
  });

  it('validates import preview request schema', () => {
    const req = {
      mode: 'create_only' as const,
      csvContent: 'sku,name\nW-01,Test',
      fileName: 'catalog.csv',
    };
    const parsed = ImportPreviewRequestSchema.parse(req);
    expect(parsed.mode).toBe('create_only');
  });

  it('validates import preview response schema', () => {
    const res = {
      batchId: 'a0000000-0000-4000-8000-000000000001',
      mode: 'create_only' as const,
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
      previewRows: [{ sku: 'W-01', name: 'Test' }],
    };
    const parsed = ImportPreviewResponseSchema.parse(res);
    expect(parsed.validRows).toBe(1);
  });

  it('validates export products query schema', () => {
    const query = {
      status: 'published' as const,
      includePricing: 'true',
    };
    const parsed = ExportProductsQuerySchema.parse(query);
    expect(parsed.status).toBe('published');
    expect(parsed.includePricing).toBe(true);
  });

  it('validates import batch response schema', () => {
    const batch = {
      id: 'a0000000-0000-4000-8000-000000000001',
      templateVersion: 'v1',
      mode: 'create_only' as const,
      status: 'completed' as const,
      fileName: 'test.csv',
      totalRows: 5,
      validRows: 5,
      invalidRows: 0,
      appliedRows: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = ImportBatchResponseSchema.parse(batch);
    expect(parsed.appliedRows).toBe(5);
  });

  describe('ProductImportRowInputSchema imageUrls validation', () => {
    const baseRow = {
      sku: 'WIDGET-002',
      name: 'Widget with Images',
    };

    it('accepts product import row with up to 8 image URLs', () => {
      const parsed = ProductImportRowInputSchema.parse({
        ...baseRow,
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      });
      expect(parsed.imageUrls).toHaveLength(2);
    });

    it('rejects product import row with 9 image URLs', () => {
      const nineImages = Array.from({ length: 9 }, (_, i) => `https://example.com/img${i + 1}.jpg`);
      expect(() =>
        ProductImportRowInputSchema.parse({
          ...baseRow,
          imageUrls: nineImages,
        }),
      ).toThrow(/more than 8 images/);
    });
  });
});
