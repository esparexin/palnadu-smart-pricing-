import { describe, expect, it, vi } from 'vitest';
import type { DbExecutor } from './client.js';
import { getImportTemplateCsv, normalizeRow, parsePaise } from './import-template.js';
import { validateAndPreviewImport } from './import-service.js';
import { exportBatchErrorsCsv } from './export-service.js';
import { parseCsv } from './csv.js';

describe('import-export service', () => {
  it('generates valid import template CSV with expected headers', () => {
    const csv = getImportTemplateCsv();
    const parsed = parseCsv(csv);
    expect(parsed.headers).toContain('sku');
    expect(parsed.headers).toContain('name');
    expect(parsed.headers).toContain('mrp_paise');
    expect(parsed.headers).toContain('selling_price_paise');
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  it('normalizes row data and parses paise correctly', () => {
    expect(parsePaise('100')).toBe(100);
    expect(parsePaise('99.50', true)).toBe(9950);
    expect(parsePaise(undefined)).toBeUndefined();

    const raw = {
      SKU: 'TEST-SKU',
      'Product Name': 'Test Product',
      mrp: '150.00',
      price: '120.00',
      Brand: 'Test Brand',
    };
    const norm = normalizeRow(raw);
    expect(norm.sku).toBe('TEST-SKU');
    expect(norm.name).toBe('Test Product');
    expect(norm.mrpPaise).toBe(15000);
    expect(norm.sellingPricePaise).toBe(12000);
    expect(norm.brandName).toBe('Test Brand');
  });

  it('validates rows, detects duplicates within file, and reports row errors', async () => {
    const csvContent = [
      'sku,name,mrp_paise,selling_price_paise',
      'SKU-1,Product 1,10000,8000',
      'SKU-2,Product 2,5000,6000', // Error: selling > mrp
      'SKU-1,Product 1 Dup,10000,8000', // Error: duplicate SKU
      ',Product Missing SKU,1000,800', // Error: missing SKU
    ].join('\n');

    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-batch-id' }]),
        }),
      }),
    } as unknown as DbExecutor;

    const preview = await validateAndPreviewImport(fakeDb, {
      csvContent,
      mode: 'create_only',
    });

    expect(preview.totalRows).toBe(4);
    expect(preview.validRows).toBe(1);
    expect(preview.invalidRows).toBe(3);
    expect(preview.errors.length).toBeGreaterThanOrEqual(3);

    const dupError = preview.errors.find((e) => e.reason.includes('Duplicate SKU'));
    expect(dupError).toBeDefined();

    const priceError = preview.errors.find((e) => e.reason.includes('cannot exceed MRP'));
    expect(priceError).toBeDefined();
  });

  it('handles large catalogue import preview (500 rows) efficiently', async () => {
    const lines = ['sku,name,mrp_paise,selling_price_paise'];
    for (let i = 1; i <= 500; i++) {
      lines.push(`BULK-SKU-${i},Bulk Product ${i},10000,8000`);
    }
    const csvContent = lines.join('\n');

    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-batch-500' }]),
        }),
      }),
    } as unknown as DbExecutor;

    const start = Date.now();
    const preview = await validateAndPreviewImport(fakeDb, {
      csvContent,
      mode: 'create_only',
    });
    const duration = Date.now() - start;

    expect(preview.totalRows).toBe(500);
    expect(preview.validRows).toBe(500);
    expect(preview.invalidRows).toBe(0);
    expect(duration).toBeLessThan(2000); // Efficient processing under 2s
  });

  it('generates downloadable error correction CSV', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                rowNumber: 2,
                rawData: { sku: 'SKU-ERR', name: 'Error Prod' },
                status: 'invalid',
                errors: [{ field: 'sku', reason: 'Duplicate SKU' }],
              },
            ]),
          }),
        }),
      }),
    } as unknown as DbExecutor;

    const errorsCsv = await exportBatchErrorsCsv(fakeDb, 'batch-id-123');
    const parsed = parseCsv(errorsCsv);
    expect(parsed.headers).toEqual(['row_number', 'sku', 'name', 'field', 'reason']);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].reason).toBe('Duplicate SKU');
  });
});
