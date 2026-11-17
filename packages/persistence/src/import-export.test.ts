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

  it('validates image count limits for published products and max 8 images per product', async () => {
    const csvContent = [
      'sku,name,status,mrp_paise,selling_price_paise,image_urls',
      // Row 2: published with 0 images -> invalid
      'SKU-PUB-0,Pub 0,published,10000,8000,',
      // Row 3: published with 1 image -> invalid
      'SKU-PUB-1,Pub 1,published,10000,8000,https://example.com/1.jpg',
      // Row 4: published with 2 images -> valid
      'SKU-PUB-2,Pub 2,published,10000,8000,https://example.com/1.jpg;https://example.com/2.jpg',
      // Row 5: draft with 9 images -> invalid (exceeds max 8)
      'SKU-DFT-9,Draft 9,draft,10000,8000,' +
        Array.from({ length: 9 }, (_, i) => `https://example.com/${i + 1}.jpg`).join(';'),
    ].join('\n');

    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-batch-images' }]),
        }),
      }),
    } as unknown as DbExecutor;

    const preview = await validateAndPreviewImport(fakeDb, {
      csvContent,
      mode: 'create_only',
    });

    expect(preview.totalRows).toBe(4);
    expect(preview.validRows).toBe(1); // Only SKU-PUB-2 is valid
    expect(preview.invalidRows).toBe(3);

    const pub0Error = preview.errors.find((e) => e.rowNumber === 2);
    expect(pub0Error?.reason).toContain('Published products must have between 2 and 8 images');

    const pub1Error = preview.errors.find((e) => e.rowNumber === 3);
    expect(pub1Error?.reason).toContain('Published products must have between 2 and 8 images');

    const dft9Error = preview.errors.find((e) => e.rowNumber === 5);
    expect(dft9Error?.reason).toContain('Product cannot have more than 8 images');
  });

  it('detects ambiguous brands and allows canonical brands during import preview', async () => {
    const csvContent = [
      'sku,name,brand_name,status',
      'SKU-AMB,Ambiguous Product,Panasonic / i-PRO,draft',
      'SKU-CANON,Valid Product,Axis Communications,draft',
      'SKU-ALIAS,Alias Product,UNV,draft',
    ].join('\n');

    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-batch-brands' }]),
        }),
      }),
    } as unknown as DbExecutor;

    const preview = await validateAndPreviewImport(fakeDb, {
      csvContent,
      mode: 'create_only',
    });

    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(2);
    expect(preview.invalidRows).toBe(1);

    const ambError = preview.errors.find((e) => e.rowNumber === 2);
    expect(ambError?.field).toBe('brandName');
    expect(ambError?.reason).toContain('Ambiguous brand');
  });
});
