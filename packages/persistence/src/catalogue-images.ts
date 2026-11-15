import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { productImages, productVariants } from './schema.js';

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
  const deleted = await db
    .delete(productImages)
    .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
    .returning({ id: productImages.id });
  return deleted.length > 0;
}
