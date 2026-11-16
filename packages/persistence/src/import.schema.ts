import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { adminUsers } from './auth.schema.js';
import { products } from './catalogue.schema.js';

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    creatorId: uuid('creator_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    templateVersion: text('template_version').default('v1').notNull(),
    mode: text('mode').notNull(),
    status: text('status').default('pending').notNull(),
    totalRows: integer('total_rows').default(0).notNull(),
    validRows: integer('valid_rows').default(0).notNull(),
    invalidRows: integer('invalid_rows').default(0).notNull(),
    appliedRows: integer('applied_rows').default(0).notNull(),
    fileName: text('file_name'),
    idempotencyKey: text('idempotency_key'),
    errorSummary: text('error_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('import_batches_mode_ck', sql`${table.mode} in ('create_only', 'update_existing')`),
    check(
      'import_batches_status_ck',
      sql`${table.status} in ('pending', 'previewing', 'completed', 'failed')`,
    ),
    index('import_batches_creator_id_idx').on(table.creatorId),
    index('import_batches_idempotency_key_idx').on(table.idempotencyKey),
    index('import_batches_status_idx').on(table.status),
  ],
);

export const importRows = pgTable(
  'import_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => importBatches.id, { onDelete: 'cascade' }),
    rowNumber: integer('row_number').notNull(),
    rawData: jsonb('raw_data').notNull(),
    status: text('status').default('pending').notNull(),
    errors: jsonb('errors'),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'import_rows_status_ck',
      sql`${table.status} in ('pending', 'valid', 'invalid', 'applied', 'skipped')`,
    ),
    index('import_rows_batch_id_idx').on(table.batchId),
    index('import_rows_batch_row_number_idx').on(table.batchId, table.rowNumber),
  ],
);
