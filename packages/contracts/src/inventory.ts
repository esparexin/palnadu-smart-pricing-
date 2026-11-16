import { z } from 'zod';

export const StockOwnershipSchema = z.enum(['smart_pricing', 'external_erp']);
export type StockOwnership = z.infer<typeof StockOwnershipSchema>;

export const StockStatusSchema = z.enum([
  'in_stock',
  'low_stock',
  'critical',
  'out_of_stock',
  'untracked',
]);
export type StockStatus = z.infer<typeof StockStatusSchema>;

export const MovementTypeSchema = z.enum(['opening_stock', 'inward', 'outward', 'adjustment']);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const AlertClassSchema = z.enum(['low_stock', 'critical', 'out_of_stock']);
export type AlertClass = z.infer<typeof AlertClassSchema>;

export const AlertStateSchema = z.enum(['active', 'cleared', 'acknowledged']);
export type AlertState = z.infer<typeof AlertStateSchema>;

export const InventoryConfigSchema = z.object({
  enabled: z.boolean(),
  stockOwnership: StockOwnershipSchema,
  defaultThreshold: z.number().int().min(0).default(1),
  updatedAt: z.string().optional(),
});
export type InventoryConfig = z.infer<typeof InventoryConfigSchema>;

export const UpdateInventoryConfigRequestSchema = z.object({
  enabled: z.boolean().optional(),
  stockOwnership: StockOwnershipSchema.optional(),
  defaultThreshold: z.number().int().min(0).optional(),
});
export type UpdateInventoryConfigRequest = z.infer<typeof UpdateInventoryConfigRequestSchema>;

export const CreateStockMovementRequestSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z
    .number()
    .int()
    .refine((q) => q !== 0, { message: 'Quantity cannot be zero' }),
  movementType: MovementTypeSchema,
  location: z.string().max(100).optional(),
  reason: z.string().max(500).optional(),
  externalReference: z.string().max(255).optional(),
  idempotencyKey: z.string().max(255).optional(),
});
export type CreateStockMovementRequest = z.infer<typeof CreateStockMovementRequestSchema>;

export const InventoryBalanceResponseSchema = z.object({
  variantId: z.string().uuid(),
  sku: z.string().nullable(),
  productName: z.string(),
  location: z.string().nullable(),
  availableQuantity: z.number().int(),
  reservedQuantity: z.number().int(),
  lowStockThreshold: z.number().int(),
  stockStatus: StockStatusSchema,
  updatedAt: z.string(),
});
export type InventoryBalanceResponse = z.infer<typeof InventoryBalanceResponseSchema>;

export const InventoryMovementResponseSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  sku: z.string().nullable(),
  productName: z.string(),
  quantity: z.number().int(),
  movementType: MovementTypeSchema,
  location: z.string().nullable(),
  reason: z.string().nullable(),
  externalReference: z.string().nullable(),
  actorName: z.string().nullable(),
  createdAt: z.string(),
});
export type InventoryMovementResponse = z.infer<typeof InventoryMovementResponseSchema>;

export const InventoryAlertResponseSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  sku: z.string().nullable(),
  productName: z.string(),
  alertClass: AlertClassSchema,
  thresholdSnapshot: z.number().int(),
  availableSnapshot: z.number().int(),
  state: AlertStateSchema,
  clearedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type InventoryAlertResponse = z.infer<typeof InventoryAlertResponseSchema>;
