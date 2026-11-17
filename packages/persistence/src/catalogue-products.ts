import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { PRODUCT_IMAGE_LIMITS } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { findBrandById } from './catalogue-brands.js';
import { getProductEffectivePricing } from './pricing.js';
import {
  categories,
  productCategories,
  productImages,
  productRelationships,
  products,
  productVariants,
} from './schema.js';

export interface ProductVariantItemInput {
  sku?: string | null;
  model?: string | null;
  options?: Record<string, unknown>;
  mrpPaise?: number | null;
  offerPricePaise?: number | null;
  discountType?: 'none' | 'fixed' | 'percentage' | null;
  discountValue?: number | null;
}

export interface ProductImageItemInput {
  url: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  rightsStatus?: 'manual_upload' | 'verified_commercial';
}

export interface ProductInputPayload {
  name: string;
  slug: string;
  brandId?: string | null;
  categoryIds?: string[];
  model?: string | null;
  description?: string | null;
  unit?: string;
  specifications?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'archived';
  mrpPaise?: number;
  offerPricePaise?: number;
  discountType?: 'none' | 'fixed' | 'percentage';
  discountValue?: number;
  variants?: ProductVariantItemInput[];
  images?: ProductImageItemInput[];
}

function validateImageCount(count: number, isPublished: boolean) {
  if (isPublished) {
    if (
      count < PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED ||
      count > PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT
    ) {
      const err = new Error(
        `Published products must have between ${PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} and ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images`,
      ) as Error & { code?: string };
      err.code = 'INSUFFICIENT_IMAGES';
      throw err;
    }
  } else if (count > PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT) {
    const err = new Error(
      `Product cannot have more than ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images`,
    ) as Error & { code?: string };
    err.code = 'IMAGE_LIMIT_EXCEEDED';
    throw err;
  }
}

export async function createProduct(db: DbExecutor, input: ProductInputPayload) {
  const { brandId, categoryIds, variants, images, ...data } = input;
  validateImageCount(images?.length ?? 0, data.status === 'published');

  const [created] = await db
    .insert(products)
    .values({ ...data, brandId: brandId ?? null, slug: data.slug.trim().toLowerCase() })
    .returning();

  if (categoryIds?.length) {
    await db
      .insert(productCategories)
      .values(categoryIds.map((categoryId) => ({ productId: created.id, categoryId })));
  }
  if (variants?.length) {
    await db.insert(productVariants).values(variants.map((v) => ({ ...v, productId: created.id })));
  }
  if (images?.length) {
    await db.insert(productImages).values(images.map((img) => ({ ...img, productId: created.id })));
  }
  return created;
}

export async function findProductById(db: DbExecutor, id: string) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findProductByNormalizedSlug(
  db: DbExecutor,
  slug: string,
  excludeId?: string,
) {
  const normalized = slug.trim().toLowerCase();
  const whereClause = excludeId
    ? and(sql`${products.id} <> ${excludeId}`, eq(sql`lower(btrim(${products.slug}))`, normalized))
    : eq(sql`lower(btrim(${products.slug}))`, normalized);

  const rows = await db.select({ id: products.id }).from(products).where(whereClause).limit(1);
  return rows[0] ?? null;
}

export async function listProducts(
  db: DbExecutor,
  params: {
    q?: string;
    brandId?: string;
    categoryId?: string;
    status?: 'draft' | 'published' | 'archived';
    limit?: number;
    offset?: number;
  },
) {
  const { limit = 50, offset = 0, q, brandId, categoryId, status } = params;
  const conditions = [];

  if (q) {
    conditions.push(
      or(ilike(products.name, `%${q.trim()}%`), ilike(products.slug, `%${q.trim()}%`)),
    );
  }
  if (brandId) conditions.push(eq(products.brandId, brandId));
  if (status) conditions.push(eq(products.status, status));
  if (categoryId) {
    conditions.push(
      sql`${products.id} IN (SELECT product_id FROM product_categories WHERE category_id = ${categoryId})`,
    );
  }

  const filter = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(filter)
      .limit(limit)
      .offset(offset)
      .orderBy(products.createdAt),
    db.select({ count: count() }).from(products).where(filter),
  ]);

  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function updateProduct(
  db: DbExecutor,
  id: string,
  input: Partial<ProductInputPayload>,
) {
  const { categoryIds, brandId, slug, ...data } = input;

  if (data.status === 'published') {
    await db.execute(sql`SELECT id, status FROM products WHERE id = ${id} FOR UPDATE`);
    const [imgResult] = await db
      .select({ count: count() })
      .from(productImages)
      .where(eq(productImages.productId, id));
    validateImageCount(Number(imgResult?.count ?? 0), true);
  }

  if (categoryIds !== undefined) {
    await db.delete(productCategories).where(eq(productCategories.productId, id));
    if (categoryIds.length > 0) {
      await db
        .insert(productCategories)
        .values(categoryIds.map((categoryId) => ({ productId: id, categoryId })));
    }
  }

  const [updated] = await db
    .update(products)
    .set({
      ...data,
      ...(slug ? { slug: slug.trim().toLowerCase() } : {}),
      ...(brandId !== undefined ? { brandId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteProduct(db: DbExecutor, id: string) {
  await db.delete(productCategories).where(eq(productCategories.productId, id));
  await db.delete(productImages).where(eq(productImages.productId, id));
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  const deleted = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id });
  return deleted.length > 0;
}

export async function fetchProductDetail(db: DbExecutor, productId: string) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return null;

  const [brandRow, catRows, variantRows, imageRows, relRows, effectivePricing] = await Promise.all([
    product.brandId ? findBrandById(db, product.brandId) : Promise.resolve(null),
    db
      .select({ category: categories })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, productId)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.createdAt),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder),
    db
      .select()
      .from(productRelationships)
      .where(eq(productRelationships.sourceProductId, productId))
      .orderBy(productRelationships.createdAt),
    getProductEffectivePricing(db, { productId }),
  ]);

  return {
    ...product,
    brand: brandRow,
    categories: catRows.map((r) => r.category),
    variants: variantRows,
    images: imageRows,
    relationships: relRows,
    effectivePricing: effectivePricing!,
  };
}
