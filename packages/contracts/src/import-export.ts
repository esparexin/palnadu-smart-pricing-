import { z } from 'zod';
import { PRODUCT_IMAGE_LIMITS } from './catalogue.js';

export const ImportModeSchema = z.enum(['create_only', 'update_existing']);
export type ImportMode = z.infer<typeof ImportModeSchema>;

export const ImportBatchStatusSchema = z.enum(['pending', 'previewing', 'completed', 'failed']);
export type ImportBatchStatus = z.infer<typeof ImportBatchStatusSchema>;

export const ImportRowStatusSchema = z.enum(['pending', 'valid', 'invalid', 'applied', 'skipped']);
export type ImportRowStatus = z.infer<typeof ImportRowStatusSchema>;

export const ImportRowErrorSchema = z.object({
  rowNumber: z.number().int().positive(),
  field: z.string().optional(),
  reason: z.string().min(1),
});
export type ImportRowError = z.infer<typeof ImportRowErrorSchema>;

export const ProductImportRowInputSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  brandName: z.string().max(100).optional(),
  categoryName: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  mrpPaise: z.number().int().nonnegative().optional(),
  sellingPricePaise: z.number().int().nonnegative().optional(),
  costPricePaise: z.number().int().nonnegative().optional(),
  minSellingPricePaise: z.number().int().nonnegative().optional(),
  imageUrls: z
    .array(z.string().url())
    .max(
      PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT,
      `Product cannot have more than ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images`,
    )
    .optional(),
});
export type ProductImportRowInput = z.infer<typeof ProductImportRowInputSchema>;

export const ImportBatchResponseSchema = z.object({
  id: z.string().uuid(),
  templateVersion: z.string(),
  mode: ImportModeSchema,
  status: ImportBatchStatusSchema,
  fileName: z.string().nullable(),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  appliedRows: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ImportBatchResponse = z.infer<typeof ImportBatchResponseSchema>;

export const ImportBatchDetailResponseSchema = ImportBatchResponseSchema.extend({
  errors: z.array(ImportRowErrorSchema),
});
export type ImportBatchDetailResponse = z.infer<typeof ImportBatchDetailResponseSchema>;

export const ImportPreviewRequestSchema = z.object({
  mode: ImportModeSchema,
  csvContent: z.string().min(1),
  fileName: z.string().max(255).optional(),
});
export type ImportPreviewRequest = z.infer<typeof ImportPreviewRequestSchema>;

export const ImportPreviewResponseSchema = z.object({
  batchId: z.string().uuid(),
  mode: ImportModeSchema,
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  errors: z.array(ImportRowErrorSchema),
  previewRows: z.array(z.record(z.string(), z.unknown())),
});
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponseSchema>;

export const ImportConfirmResponseSchema = z.object({
  batchId: z.string().uuid(),
  appliedRows: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  status: ImportBatchStatusSchema,
});
export type ImportConfirmResponse = z.infer<typeof ImportConfirmResponseSchema>;

export const ExportProductsQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  brandId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  includePricing: z.coerce.boolean().optional().default(false),
});
export type ExportProductsQuery = z.infer<typeof ExportProductsQuerySchema>;
