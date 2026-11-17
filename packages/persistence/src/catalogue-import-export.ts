import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { importBatches, importRows } from './import.schema.js';
import { productImages, productVariants } from './schema.js';

export async function createImportBatch(
  db: DbExecutor,
  data: {
    creatorId?: string | null;
    mode: 'create_only' | 'update_existing';
    templateVersion?: string;
    fileName?: string | null;
    idempotencyKey?: string | null;
    totalRows: number;
    validRows: number;
    invalidRows: number;
  },
) {
  const [batch] = await db
    .insert(importBatches)
    .values({
      creatorId: data.creatorId ?? null,
      mode: data.mode,
      templateVersion: data.templateVersion ?? 'v1',
      status: 'previewing',
      totalRows: data.totalRows,
      validRows: data.validRows,
      invalidRows: data.invalidRows,
      fileName: data.fileName ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
    })
    .returning();
  return batch;
}

export async function getImportBatchById(db: DbExecutor, id: string) {
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  return batch ?? null;
}

export async function listImportBatches(db: DbExecutor, limit = 50, offset = 0) {
  return db
    .select()
    .from(importBatches)
    .orderBy(desc(importBatches.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function insertImportRows(
  db: DbExecutor,
  rows: {
    batchId: string;
    rowNumber: number;
    rawData: Record<string, unknown>;
    status: 'pending' | 'valid' | 'invalid' | 'applied' | 'skipped';
    errors?: unknown;
    productId?: string | null;
  }[],
) {
  if (rows.length === 0) return [];
  return db
    .insert(importRows)
    .values(
      rows.map((r) => ({
        batchId: r.batchId,
        rowNumber: r.rowNumber,
        rawData: r.rawData,
        status: r.status,
        errors: r.errors ?? null,
        productId: r.productId ?? null,
      })),
    )
    .returning();
}

export async function getImportRowsByBatchId(db: DbExecutor, batchId: string) {
  return db
    .select()
    .from(importRows)
    .where(eq(importRows.batchId, batchId))
    .orderBy(importRows.rowNumber);
}

export async function updateImportBatchStatus(
  db: DbExecutor,
  batchId: string,
  data: {
    status: 'pending' | 'previewing' | 'completed' | 'failed';
    appliedRows?: number;
    errorSummary?: string | null;
  },
) {
  const [updated] = await db
    .update(importBatches)
    .set({
      status: data.status,
      appliedRows: data.appliedRows,
      errorSummary: data.errorSummary,
      updatedAt: new Date(),
    })
    .where(eq(importBatches.id, batchId))
    .returning();
  return updated;
}

export async function fetchExistingSkuMap(
  db: DbExecutor,
  skus: string[],
): Promise<Map<string, { id: string; productId: string }>> {
  const map = new Map<string, { id: string; productId: string }>();
  if (skus.length === 0) return map;

  const found = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: sql<string>`lower(btrim(${productVariants.sku}))`,
    })
    .from(productVariants)
    .where(inArray(sql`lower(btrim(${productVariants.sku}))`, skus));

  for (const v of found) {
    if (v.sku) map.set(v.sku, { id: v.id, productId: v.productId });
  }
  return map;
}

export async function fetchExistingImageCounts(
  db: DbExecutor,
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select({ productId: productImages.productId, count: count() })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .groupBy(productImages.productId);
  for (const r of rows) {
    map.set(r.productId, Number(r.count));
  }
  return map;
}
