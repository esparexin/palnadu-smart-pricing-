import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './auth.schema.js';
import { productVariants } from './catalogue.schema.js';

export const inventoryConfiguration = pgTable(
  'inventory_configuration',
  {
    id: text('id').primaryKey().default('default'),
    enabled: boolean('enabled').default(false).notNull(),
    stockOwnership: text('stock_ownership').default('smart_pricing').notNull(),
    defaultThreshold: integer('default_threshold').default(1).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'inventory_config_ownership_ck',
      sql`${table.stockOwnership} in ('smart_pricing', 'external_erp')`,
    ),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    location: text('location'),
    quantity: integer('quantity').notNull(),
    movementType: text('movement_type').notNull(),
    reason: text('reason'),
    externalReference: text('external_reference'),
    actorId: uuid('actor_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'inventory_movements_type_ck',
      sql`${table.movementType} in ('opening_stock', 'inward', 'outward', 'adjustment')`,
    ),
    index('inventory_movements_variant_id_idx').on(table.variantId),
    index('inventory_movements_idempotency_key_idx').on(table.idempotencyKey),
    index('inventory_movements_created_at_idx').on(table.createdAt),
  ],
);

export const inventoryBalances = pgTable(
  'inventory_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    location: text('location'),
    availableQuantity: integer('available_quantity').default(0).notNull(),
    reservedQuantity: integer('reserved_quantity').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(1).notNull(),
    version: integer('version').default(1).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('inventory_balances_variant_id_idx').on(table.variantId)],
);

export const inventoryAlerts = pgTable(
  'inventory_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    alertClass: text('alert_class').notNull(),
    thresholdSnapshot: integer('threshold_snapshot').notNull(),
    availableSnapshot: integer('available_snapshot').notNull(),
    state: text('state').default('active').notNull(),
    clearedAt: timestamp('cleared_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'inventory_alerts_class_ck',
      sql`${table.alertClass} in ('low_stock', 'critical', 'out_of_stock')`,
    ),
    check(
      'inventory_alerts_state_ck',
      sql`${table.state} in ('active', 'cleared', 'acknowledged')`,
    ),
    index('inventory_alerts_variant_id_idx').on(table.variantId),
    index('inventory_alerts_state_idx').on(table.state),
  ],
);
