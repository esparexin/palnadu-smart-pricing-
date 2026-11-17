import { eq } from 'drizzle-orm';
import { resolveCanonicalBrand } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import {
  getImportBatchById,
  getImportRowsByBatchId,
  updateImportBatchStatus,
} from './catalogue-import-export.js';
import { createBrand, findBrandByNormalizedNameOrSlug } from './catalogue-brands.js';
import { createCategory, findCategoryByNormalizedNameOrSlug } from './catalogue-categories.js';
import { createProduct } from './catalogue-products.js';
import { importRows, productImages, products, productVariants } from './schema.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function resolveBrand(db: DbExecutor, name?: string): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const resolution = resolveCanonicalBrand(trimmed);

  if (resolution.status === 'ambiguous') {
    throw new Error(`Ambiguous brand '${trimmed}'. ${resolution.reason}`);
  }

  if (resolution.status === 'canonical' || resolution.status === 'alias') {
    const canonical = resolution.brand;
    const existing =
      (await findBrandByNormalizedNameOrSlug(db, canonical.name, canonical.slug)) ||
      (await findBrandByNormalizedNameOrSlug(db, trimmed));

    if (existing) return existing.id;

    const created = await createBrand(db, {
      name: canonical.name,
      slug: canonical.slug,
    });
    return created.id;
  }

  const existing = await findBrandByNormalizedNameOrSlug(db, trimmed);
  if (existing) return existing.id;

  const cleanSlug = slugify(trimmed);
  if (!cleanSlug) {
    throw new Error(`Cannot generate valid slug for brand '${trimmed}'`);
  }

  const created = await createBrand(db, {
    name: trimmed,
    slug: cleanSlug,
  });
  return created.id;
}

async function resolveCategory(db: DbExecutor, name?: string): Promise<string | null> {
  if (!name) return null;
  const existing = await findCategoryByNormalizedNameOrSlug(db, name);
  if (existing) return existing.id;
  const created = await createCategory(db, {
    name,
    slug: slugify(name) || 'category-' + Date.now(),
  });
  return created.id;
}

interface NormalizedRowData {
  sku: string;
  name: string;
  slug?: string;
  brandName?: string;
  categoryName?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  mrpPaise?: number;
  sellingPricePaise?: number;
  imageUrls?: string[];
}

async function updateExistingProductRow(
  db: DbExecutor,
  productId: string,
  norm: NormalizedRowData,
  brandId: string | null,
): Promise<string> {
  await db
    .update(products)
    .set({
      name: norm.name,
      description: norm.description ?? null,
      status: norm.status ?? 'draft',
      brandId: brandId ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await db
    .update(productVariants)
    .set({
      mrpPaise: norm.mrpPaise ?? null,
      offerPricePaise: norm.sellingPricePaise ?? null,
    })
    .where(eq(productVariants.productId, productId));

  if (norm.imageUrls && norm.imageUrls.length > 0) {
    await db.delete(productImages).where(eq(productImages.productId, productId));
    await db.insert(productImages).values(
      norm.imageUrls.map((url, idx) => ({
        productId,
        url,
        altText: `${norm.name} image ${idx + 1}`,
        sortOrder: idx,
        isPrimary: idx === 0,
        rightsStatus: 'manual_upload' as const,
      })),
    );
  }

  return productId;
}

async function createNewProductRow(
  db: DbExecutor,
  norm: NormalizedRowData,
  brandId: string | null,
  categoryId: string | null,
): Promise<string> {
  const generatedSlug =
    norm.slug || slugify(norm.name) || `product-${norm.sku.toLowerCase()}-${Date.now()}`;

  const images = norm.imageUrls?.map((url, idx) => ({
    url,
    altText: `${norm.name} image ${idx + 1}`,
    sortOrder: idx,
    isPrimary: idx === 0,
    rightsStatus: 'manual_upload' as const,
  }));

  const product = await createProduct(db, {
    name: norm.name,
    slug: generatedSlug,
    brandId: brandId ?? null,
    categoryIds: categoryId ? [categoryId] : [],
    description: norm.description ?? null,
    status: norm.status ?? 'draft',
    images: images && images.length > 0 ? images : undefined,
    variants: [
      {
        sku: norm.sku,
        mrpPaise: norm.mrpPaise ?? null,
        offerPricePaise: norm.sellingPricePaise ?? null,
      },
    ],
  });
  return product.id;
}

async function applyImportRow(
  db: DbExecutor,
  mode: string,
  productId: string | null,
  norm: NormalizedRowData,
  brandId: string | null,
  categoryId: string | null,
): Promise<string | null> {
  if (mode === 'update_existing' && productId) {
    return updateExistingProductRow(db, productId, norm, brandId);
  }
  return createNewProductRow(db, norm, brandId, categoryId);
}

export async function commitImportBatch(db: DbExecutor, batchId: string) {
  const batch = await getImportBatchById(db, batchId);
  if (!batch) throw new Error(`Import batch '${batchId}' not found`);
  if (batch.status === 'completed') {
    return {
      batchId: batch.id,
      appliedRows: batch.appliedRows,
      skippedRows: batch.totalRows - batch.appliedRows,
      status: batch.status,
    };
  }

  const rows = await getImportRowsByBatchId(db, batchId);
  const validRows = rows.filter((r: { status: string }) => r.status === 'valid');
  let appliedCount = 0;

  for (const row of validRows) {
    const rawData = row.rawData as Record<string, unknown>;
    const norm = (rawData._normalized ?? rawData) as NormalizedRowData;

    const brandId = await resolveBrand(db, norm.brandName);
    const categoryId = await resolveCategory(db, norm.categoryName);

    const resultingId = await applyImportRow(
      db,
      batch.mode,
      row.productId,
      norm,
      brandId,
      categoryId,
    );

    await db
      .update(importRows)
      .set({
        status: 'applied',
        productId: resultingId,
      })
      .where(eq(importRows.id, row.id));

    appliedCount++;
  }

  const finalStatus = appliedCount > 0 || batch.totalRows === 0 ? 'completed' : 'failed';

  await updateImportBatchStatus(db, batchId, {
    status: finalStatus,
    appliedRows: appliedCount,
  });

  return {
    batchId: batch.id,
    appliedRows: appliedCount,
    skippedRows: batch.totalRows - appliedCount,
    status: finalStatus,
  };
}
