import { and, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { stringifyCsv } from './csv.js';
import { getImportRowsByBatchId } from './catalogue-import-export.js';
import { brands, products, productVariants } from './schema.js';

export async function exportProductsToCsv(
  db: DbExecutor,
  options: {
    status?: 'draft' | 'published' | 'archived';
    brandId?: string;
    categoryId?: string;
    includePricing?: boolean;
  },
): Promise<string> {
  const conditions = [];
  if (options.status) conditions.push(eq(products.status, options.status));
  if (options.brandId) conditions.push(eq(products.brandId, options.brandId));
  if (options.categoryId) {
    conditions.push(
      sql`${products.id} in (select product_id from product_categories where category_id = ${options.categoryId})`,
    );
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      status: products.status,
      brandName: brands.name,
      sku: productVariants.sku,
      mrpPaise: productVariants.mrpPaise,
      offerPricePaise: productVariants.offerPricePaise,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productVariants, eq(products.id, productVariants.productId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(products.createdAt);

  const baseHeaders = ['sku', 'name', 'slug', 'brand_name', 'description', 'status'];
  const headers = options.includePricing
    ? [...baseHeaders, 'mrp_paise', 'selling_price_paise']
    : baseHeaders;

  const exportRows = rows.map(
    (r: {
      sku: string | null;
      name: string;
      slug: string;
      brandName: string | null;
      description: string | null;
      status: string;
      mrpPaise: number | null;
      offerPricePaise: number | null;
    }) => {
      const rowObj: Record<string, unknown> = {
        sku: r.sku ?? '',
        name: r.name,
        slug: r.slug,
        brand_name: r.brandName ?? '',
        description: r.description ?? '',
        status: r.status,
      };
      if (options.includePricing) {
        rowObj.mrp_paise = r.mrpPaise ?? '';
        rowObj.selling_price_paise = r.offerPricePaise ?? '';
      }
      return rowObj;
    },
  );

  return stringifyCsv(headers, exportRows);
}

export async function exportBatchErrorsCsv(db: DbExecutor, batchId: string): Promise<string> {
  const rows = await getImportRowsByBatchId(db, batchId);
  const invalidRows = rows.filter(
    (r: { status: string; errors: unknown }) =>
      r.status === 'invalid' || (Array.isArray(r.errors) && r.errors.length > 0),
  );

  const headers = ['row_number', 'sku', 'name', 'field', 'reason'];
  const exportRows: Record<string, unknown>[] = [];

  for (const r of invalidRows) {
    const raw = r.rawData as Record<string, unknown>;
    const norm = (raw._normalized ?? raw) as Record<string, unknown>;
    const sku = String(norm.sku ?? raw.sku ?? '');
    const name = String(norm.name ?? raw.name ?? '');
    const errors = (r.errors as { field?: string; reason?: string }[]) ?? [];

    if (errors.length === 0) {
      exportRows.push({
        row_number: r.rowNumber,
        sku,
        name,
        field: 'general',
        reason: 'Row invalid',
      });
    } else {
      for (const err of errors) {
        exportRows.push({
          row_number: r.rowNumber,
          sku,
          name,
          field: err.field ?? 'unknown',
          reason: err.reason ?? 'Unknown validation error',
        });
      }
    }
  }

  return stringifyCsv(headers, exportRows);
}
