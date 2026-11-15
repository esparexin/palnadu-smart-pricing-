import { and, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { productVariants } from './schema.js';

export async function createVariant(
  db: DbExecutor,
  productId: string,
  input: {
    sku?: string | null;
    model?: string | null;
    options?: Record<string, unknown>;
    mrpPaise?: number | null;
    offerPricePaise?: number | null;
    discountType?: string | null;
    discountValue?: number | null;
  },
) {
  const [created] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: input.sku ? input.sku.trim() : null,
      model: input.model ?? null,
      options: input.options ?? {},
      mrpPaise: input.mrpPaise ?? null,
      offerPricePaise: input.offerPricePaise ?? null,
      discountType: input.discountType ?? null,
      discountValue: input.discountValue ?? null,
    })
    .returning();
  return created;
}

export async function findVariantById(db: DbExecutor, productId: string, id: string) {
  const rows = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findVariantByNormalizedSku(db: DbExecutor, sku: string, excludeId?: string) {
  const normalized = sku.trim().toLowerCase();
  const whereClause = excludeId
    ? and(
        sql`${productVariants.id} <> ${excludeId}`,
        eq(sql`lower(btrim(${productVariants.sku}))`, normalized),
      )
    : eq(sql`lower(btrim(${productVariants.sku}))`, normalized);

  const rows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(whereClause)
    .limit(1);
  return rows[0] ?? null;
}

export async function listVariantsByProductId(db: DbExecutor, productId: string) {
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(productVariants.createdAt);
}

export async function updateVariant(
  db: DbExecutor,
  productId: string,
  id: string,
  input: {
    sku?: string | null;
    model?: string | null;
    options?: Record<string, unknown>;
    mrpPaise?: number | null;
    offerPricePaise?: number | null;
    discountType?: string | null;
    discountValue?: number | null;
  },
) {
  const [updated] = await db
    .update(productVariants)
    .set({
      ...input,
      ...(input.sku !== undefined ? { sku: input.sku ? input.sku.trim() : null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)))
    .returning();
  return updated ?? null;
}

export async function deleteVariant(db: DbExecutor, productId: string, id: string) {
  const deleted = await db
    .delete(productVariants)
    .where(and(eq(productVariants.id, id), eq(productVariants.productId, productId)))
    .returning({ id: productVariants.id });
  return deleted.length > 0;
}
