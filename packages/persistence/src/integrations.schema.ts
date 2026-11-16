import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const erpConnectors = pgTable('erp_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  endpointUrl: text('endpoint_url'),
  authSecretEncrypted: text('auth_secret_encrypted'),
  productSsot: text('product_ssot').notNull().default('palnadu_smart_pricing'),
  inventorySsot: text('inventory_ssot').notNull().default('palnadu_smart_pricing'),
  priceSsot: text('price_ssot').notNull().default('palnadu_smart_pricing'),
  fieldMappings: jsonb('field_mappings').default({}),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: text('last_sync_status').default('idle'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const erpSyncJobs = pgTable('erp_sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id')
    .notNull()
    .references(() => erpConnectors.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull(),
  status: text('status').notNull().default('pending'),
  itemsProcessed: integer('items_processed').notNull().default(0),
  itemsCreated: integer('items_created').notNull().default(0),
  itemsUpdated: integer('items_updated').notNull().default(0),
  itemsFailed: integer('items_failed').notNull().default(0),
  errorLog: text('error_log'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
