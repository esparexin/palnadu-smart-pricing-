import { describe, expect, it } from 'vitest';
import { parseCsv, stringifyCsv } from './csv.js';

describe('CSV parser and serializer', () => {
  it('parses basic CSV content', () => {
    const csv = 'sku,name,price\nSKU-1,Widget A,100\nSKU-2,Widget B,200';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['sku', 'name', 'price']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      sku: 'SKU-1',
      name: 'Widget A',
      price: '100',
    });
  });

  it('handles quotes, commas, and escaped quotes according to RFC 4180', () => {
    const csv = 'sku,name,description\nSKU-1,"Widget, Super","He said ""Hello"" and left"';
    const result = parseCsv(csv);
    expect(result.rows[0].sku).toBe('SKU-1');
    expect(result.rows[0].name).toBe('Widget, Super');
    expect(result.rows[0].description).toBe('He said "Hello" and left');
  });

  it('handles CRLF line endings and strips UTF-8 BOM', () => {
    const csv = '\uFEFFsku,name\r\nSKU-1,Widget A\r\nSKU-2,Widget B\r\n';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['sku', 'name']);
    expect(result.rows).toHaveLength(2);
  });

  it('handles multiline fields within quotes', () => {
    const csv = 'sku,description\nSKU-1,"Line 1\nLine 2\nLine 3"';
    const result = parseCsv(csv);
    expect(result.rows[0].description).toBe('Line 1\nLine 2\nLine 3');
  });

  it('stringifies rows with appropriate quoting and escaping', () => {
    const headers = ['sku', 'name', 'desc'];
    const rows = [
      { sku: 'SKU-1', name: 'Widget, Super', desc: 'Says "Hi"' },
      { sku: 'SKU-2', name: 'Standard', desc: 'Normal' },
    ];
    const output = stringifyCsv(headers, rows);
    expect(output).toContain('"Widget, Super"');
    expect(output).toContain('"Says ""Hi"""');
    const parsedBack = parseCsv(output);
    expect(parsedBack.rows[0].name).toBe('Widget, Super');
    expect(parsedBack.rows[0].desc).toBe('Says "Hi"');
  });
});
