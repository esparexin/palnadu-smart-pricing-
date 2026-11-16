import { inArray, sql } from 'drizzle-orm';
import {
  ProductImportRowInputSchema,
  type ImportMode,
  type ImportRowError,
} from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { parseCsv } from './csv.js';
import { createImportBatch, insertImportRows } from './catalogue-import-export.js';
import { productVariants } from './schema.js';
import { normalizeRow } from './import-template.js';

function validateRowItem(
  norm: Record<string, unknown>,
  rowNum: number,
  seenSkuRowMap: Map<string, number>,
  existing: { id: string; productId: string } | undefined,
  mode: ImportMode,
): ImportRowError[] {
  const rowErrors: ImportRowError[] = [];
  const parseResult = ProductImportRowInputSchema.safeParse(norm);

  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      rowErrors.push({
        rowNumber: rowNum,
        field: issue.path.join('.'),
        reason: issue.message,
      });
    }
  }

  const skuNorm = String(norm.sku ?? '')
    .trim()
    .toLowerCase();
  if (skuNorm) {
    const firstRow = seenSkuRowMap.get(skuNorm);
    if (firstRow !== undefined) {
      rowErrors.push({
        rowNumber: rowNum,
        field: 'sku',
        reason: `Duplicate SKU '${norm.sku}' already appeared on row ${firstRow}`,
      });
    } else {
      seenSkuRowMap.set(skuNorm, rowNum);
    }
  }

  if (mode === 'create_only' && existing) {
    rowErrors.push({
      rowNumber: rowNum,
      field: 'sku',
      reason: `SKU '${norm.sku}' already exists in database (create_only mode)`,
    });
  }

  if (
    typeof norm.sellingPricePaise === 'number' &&
    typeof norm.mrpPaise === 'number' &&
    norm.sellingPricePaise > norm.mrpPaise
  ) {
    rowErrors.push({
      rowNumber: rowNum,
      field: 'sellingPricePaise',
      reason: 'Selling price cannot exceed MRP',
    });
  }

  return rowErrors;
}

async function fetchExistingSkuMap(
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

export async function validateAndPreviewImport(
  db: DbExecutor,
  params: {
    csvContent: string;
    mode: ImportMode;
    fileName?: string | null;
    creatorId?: string | null;
    idempotencyKey?: string | null;
  },
) {
  const { rows } = parseCsv(params.csvContent);
  if (rows.length === 0) throw new Error('CSV file contains no data rows');

  const normalizedRows = rows.map((r, idx) => ({
    rowNum: idx + 2,
    raw: r,
    norm: normalizeRow(r),
  }));

  const allSkus = Array.from(
    new Set(
      normalizedRows
        .map((r) =>
          String(r.norm.sku ?? '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );

  const existingSkuMap = await fetchExistingSkuMap(db, allSkus);
  const seenSkuRowMap = new Map<string, number>();

  const validatedRows: {
    rowNumber: number;
    rawData: Record<string, unknown>;
    status: 'valid' | 'invalid';
    errors: ImportRowError[];
    productId?: string | null;
  }[] = [];
  const allErrors: ImportRowError[] = [];

  for (const { rowNum, raw, norm } of normalizedRows) {
    const skuNorm = String(norm.sku ?? '')
      .trim()
      .toLowerCase();
    const existing = existingSkuMap.get(skuNorm);
    const rowErrors = validateRowItem(norm, rowNum, seenSkuRowMap, existing, params.mode);

    const isValid = rowErrors.length === 0;
    if (!isValid) allErrors.push(...rowErrors);

    validatedRows.push({
      rowNumber: rowNum,
      rawData: { ...raw, _normalized: norm },
      status: isValid ? 'valid' : 'invalid',
      errors: rowErrors,
      productId: existing ? existing.productId : null,
    });
  }

  const validCount = validatedRows.filter((r) => r.status === 'valid').length;
  const invalidCount = validatedRows.filter((r) => r.status === 'invalid').length;

  const batch = await createImportBatch(db, {
    creatorId: params.creatorId,
    mode: params.mode,
    fileName: params.fileName,
    idempotencyKey: params.idempotencyKey,
    totalRows: validatedRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
  });

  await insertImportRows(
    db,
    validatedRows.map((r) => ({
      batchId: batch.id,
      rowNumber: r.rowNumber,
      rawData: r.rawData,
      status: r.status,
      errors: r.errors.length > 0 ? r.errors : null,
      productId: r.productId,
    })),
  );

  return {
    batchId: batch.id,
    mode: params.mode,
    totalRows: validatedRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    errors: allErrors,
    previewRows: validatedRows.slice(0, 10).map((r) => ({
      rowNumber: r.rowNumber,
      status: r.status,
      data: (r.rawData._normalized as Record<string, unknown>) ?? r.rawData,
      errors: r.errors,
    })),
  };
}
