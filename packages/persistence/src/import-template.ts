import { stringifyCsv } from './csv.js';

export function getImportTemplateCsv(): string {
  const headers = [
    'sku',
    'name',
    'slug',
    'brand_name',
    'category_name',
    'description',
    'status',
    'mrp_paise',
    'selling_price_paise',
    'cost_price_paise',
    'min_selling_price_paise',
    'image_urls',
  ];
  const sampleRows = [
    {
      sku: 'PROD-001',
      name: 'Industrial Widget A',
      slug: 'industrial-widget-a',
      brand_name: 'Acme Heavy',
      category_name: 'Tools & Machinery',
      description: 'Heavy-duty industrial widget for high torque applications',
      status: 'draft',
      mrp_paise: 150000,
      selling_price_paise: 120000,
      cost_price_paise: 90000,
      min_selling_price_paise: 110000,
    },
    {
      sku: 'PROD-002',
      name: 'Standard Precision Drill',
      slug: 'standard-precision-drill',
      brand_name: 'Acme Heavy',
      category_name: 'Tools & Machinery',
      description: 'Precision electric drill 500W',
      status: 'draft',
      mrp_paise: 250000,
      selling_price_paise: 210000,
      cost_price_paise: 160000,
      min_selling_price_paise: 195000,
    },
  ];
  return stringifyCsv(headers, sampleRows);
}

export function parsePaise(val: unknown, isRupees = false): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (isNaN(num) || num < 0) return undefined;
  return isRupees ? Math.round(num * 100) : Math.round(num);
}

function parseAmount(
  raw: Record<string, string>,
  paiseKeys: string[],
  rupeeKeys: string[],
): number | undefined {
  for (const k of paiseKeys) {
    if (raw[k] !== undefined && raw[k] !== '') {
      return parsePaise(raw[k], false);
    }
  }
  for (const k of rupeeKeys) {
    if (raw[k] !== undefined && raw[k] !== '') {
      return parsePaise(raw[k], true);
    }
  }
  return undefined;
}

export function normalizeRow(raw: Record<string, string>): Record<string, unknown> {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== '') return raw[k];
    }
    return undefined;
  };
  const sku = (findVal('sku', 'SKU', 'Sku') ?? '').trim();
  const name = (findVal('name', 'Name', 'product_name', 'Product Name') ?? '').trim();
  const slug = (findVal('slug', 'Slug') ?? '').trim();
  const brandName = (findVal('brand_name', 'brand', 'Brand', 'Brand Name') ?? '').trim();
  const categoryName = (
    findVal('category_name', 'category', 'Category', 'Category Name') ?? ''
  ).trim();
  const description = (findVal('description', 'Description', 'desc') ?? '').trim();
  const status = (findVal('status', 'Status') ?? 'draft').trim().toLowerCase();

  return {
    sku,
    name,
    slug: slug || undefined,
    brandName: brandName || undefined,
    categoryName: categoryName || undefined,
    description: description || undefined,
    status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
    mrpPaise: parseAmount(raw, ['mrp_paise'], ['mrp', 'MRP']),
    sellingPricePaise: parseAmount(
      raw,
      ['selling_price_paise'],
      ['selling_price', 'price', 'Price'],
    ),
    costPricePaise: parseAmount(raw, ['cost_price_paise'], ['cost_price']),
    minSellingPricePaise: parseAmount(
      raw,
      ['min_selling_price_paise'],
      ['min_selling_price', 'min_price'],
    ),
    imageUrls: (() => {
      const v = (findVal('image_urls', 'images', 'image_url', 'Image URLs', 'Images') ?? '').trim();
      if (!v) return undefined;
      const urls = v
        .split(/[;|]/)
        .map((u) => u.trim())
        .filter(Boolean);
      return urls.length > 0 ? urls : undefined;
    })(),
  };
}
