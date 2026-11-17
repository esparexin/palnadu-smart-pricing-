import { and, count, eq, sql } from 'drizzle-orm';
import { PRODUCT_IMAGE_LIMITS } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { productImages, products, productVariants } from './schema.js';

export async function validateVariantBelongsToProduct(
  db: DbExecutor,
  productId: string,
  variantId: string,
): Promise<'valid' | 'not_found' | 'mismatch'> {
  const [variant] = await db
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) return 'not_found';
  if (variant.productId !== productId) return 'mismatch';
  return 'valid';
}

export async function clearPrimaryImages(db: DbExecutor, productId: string, excludeId?: string) {
  const whereClause = excludeId
    ? and(eq(productImages.productId, productId), eq(productImages.isPrimary, true))
    : eq(productImages.productId, productId);

  await db.update(productImages).set({ isPrimary: false }).where(whereClause);
}

export async function createProductImage(
  db: DbExecutor,
  productId: string,
  input: {
    url: string;
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
    rightsStatus?: 'manual_upload' | 'verified_commercial';
    variantId?: string | null;
  },
) {
  await db.execute(sql`SELECT id, status FROM products WHERE id = ${productId} FOR UPDATE`);

  const [countResult] = await db
    .select({ count: count() })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const currentCount = Number(countResult?.count ?? 0);

  if (currentCount >= PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT) {
    const error = new Error(
      `Product cannot have more than ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images`,
    ) as Error & { code?: string };
    error.code = 'IMAGE_LIMIT_EXCEEDED';
    throw error;
  }

  if (input.isPrimary) {
    await clearPrimaryImages(db, productId);
  }

  const [created] = await db
    .insert(productImages)
    .values({
      productId,
      url: input.url,
      altText: input.altText ?? '',
      sortOrder: input.sortOrder ?? 0,
      isPrimary: input.isPrimary ?? false,
      rightsStatus: input.rightsStatus ?? 'manual_upload',
      variantId: input.variantId ?? null,
    })
    .returning();
  return created;
}

export async function listProductImages(db: DbExecutor, productId: string) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.sortOrder);
}

export async function findProductImageById(db: DbExecutor, productId: string, id: string) {
  const rows = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateProductImage(
  db: DbExecutor,
  productId: string,
  id: string,
  input: {
    url?: string;
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
    variantId?: string | null;
    rightsStatus?: 'manual_upload' | 'verified_commercial';
  },
) {
  if (input.isPrimary) {
    await clearPrimaryImages(db, productId, id);
  }

  const [updated] = await db
    .update(productImages)
    .set(input)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .returning();
  return updated ?? null;
}

export async function deleteProductImage(db: DbExecutor, productId: string, id: string) {
  await db.execute(sql`SELECT id, status FROM products WHERE id = ${productId} FOR UPDATE`);

  const [targetImage] = await db
    .select({ id: productImages.id, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .limit(1);

  if (!targetImage) return false;

  const [product] = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const [countResult] = await db
    .select({ count: count() })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const currentCount = Number(countResult?.count ?? 0);

  if (product?.status === 'published' && currentCount <= PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED) {
    const error = new Error(
      `Published products must have at least ${PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images`,
    ) as Error & { code?: string };
    error.code = 'INSUFFICIENT_IMAGES';
    throw error;
  }

  if (targetImage.isPrimary) {
    const [nextPrimary] = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.productId, productId), sql`${productImages.id} <> ${id}`))
      .orderBy(productImages.sortOrder)
      .limit(1);
    if (nextPrimary) {
      await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, nextPrimary.id));
    }
  }

  const deleted = await db
    .delete(productImages)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .returning({ id: productImages.id });
  return deleted.length > 0;
}
