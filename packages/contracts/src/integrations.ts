import { z } from 'zod';

export const ErpProviderTypeSchema = z.enum(['tally_prime', 'generic_webhook', 'custom_erp']);
export type ErpProviderType = z.infer<typeof ErpProviderTypeSchema>;

export const EntitySourceOfTruthSchema = z.enum(['palnadu_smart_pricing', 'external_erp']);
export type EntitySourceOfTruth = z.infer<typeof EntitySourceOfTruthSchema>;

export const ErpConnectorConfigSchema = z.object({
  id: z.string().uuid(),
  provider: ErpProviderTypeSchema,
  name: z.string(),
  enabled: z.boolean(),
  endpointUrl: z.string().nullable().optional(),
  productSsot: EntitySourceOfTruthSchema,
  inventorySsot: EntitySourceOfTruthSchema,
  priceSsot: EntitySourceOfTruthSchema,
  fieldMappings: z.record(z.string(), z.string()).default({}),
  hasAuthSecret: z.boolean(),
  lastSyncAt: z.string().nullable().optional(),
  lastSyncStatus: z.enum(['idle', 'in_progress', 'success', 'failed']).default('idle'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ErpConnectorConfig = z.infer<typeof ErpConnectorConfigSchema>;

export const CreateErpConnectorRequestSchema = z.object({
  provider: ErpProviderTypeSchema,
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(false),
  endpointUrl: z.string().max(500).optional(),
  authSecret: z.string().min(1).max(500).optional(),
  productSsot: EntitySourceOfTruthSchema.default('palnadu_smart_pricing'),
  inventorySsot: EntitySourceOfTruthSchema.default('palnadu_smart_pricing'),
  priceSsot: EntitySourceOfTruthSchema.default('palnadu_smart_pricing'),
  fieldMappings: z.record(z.string(), z.string()).default({}),
});
export type CreateErpConnectorRequest = z.infer<typeof CreateErpConnectorRequestSchema>;

export const UpdateErpConnectorRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  endpointUrl: z.string().max(500).optional(),
  authSecret: z.string().min(1).max(500).optional(),
  productSsot: EntitySourceOfTruthSchema.optional(),
  inventorySsot: EntitySourceOfTruthSchema.optional(),
  priceSsot: EntitySourceOfTruthSchema.optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
});
export type UpdateErpConnectorRequest = z.infer<typeof UpdateErpConnectorRequestSchema>;

export const ErpSyncJobSchema = z.object({
  id: z.string().uuid(),
  connectorId: z.string().uuid(),
  jobType: z.enum(['products', 'inventory', 'full']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  itemsProcessed: z.number().int(),
  itemsCreated: z.number().int(),
  itemsUpdated: z.number().int(),
  itemsFailed: z.number().int(),
  errorLog: z.string().nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});
export type ErpSyncJob = z.infer<typeof ErpSyncJobSchema>;

export const TriggerSyncRequestSchema = z.object({
  jobType: z.enum(['products', 'inventory', 'full']).default('full'),
  payloadData: z.string().optional(),
});
export type TriggerSyncRequest = z.infer<typeof TriggerSyncRequestSchema>;
