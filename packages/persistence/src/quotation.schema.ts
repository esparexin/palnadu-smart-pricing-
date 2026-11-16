import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { products, productVariants } from './catalogue.schema.js';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const quotationRequests = pgTable(
  'quotation_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    referenceNumber: text('reference_number').notNull(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    customerNotes: text('customer_notes'),
    status: text('status').default('submitted').notNull(),
    idempotencyKey: text('idempotency_key'),
    subtotalPaise: bigint('subtotal_paise', { mode: 'number' }).default(0).notNull(),
    discountTotalPaise: bigint('discount_total_paise', { mode: 'number' }).default(0).notNull(),
    grandTotalPaise: bigint('grand_total_paise', { mode: 'number' }).default(0).notNull(),
    companySnapshot: jsonb('company_snapshot'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('quotation_requests_ref_uq').on(table.referenceNumber),
    uniqueIndex('quotation_requests_idempotency_uq')
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    check(
      'quotation_requests_status_ck',
      sql`${table.status} in ('submitted', 'draft', 'issued', 'delivered', 'rejected')`,
    ),
    check('quotation_requests_subtotal_nonnegative_ck', sql`${table.subtotalPaise} >= 0`),
    check('quotation_requests_discount_nonnegative_ck', sql`${table.discountTotalPaise} >= 0`),
    check('quotation_requests_grand_total_nonnegative_ck', sql`${table.grandTotalPaise} >= 0`),
    index('quotation_requests_status_idx').on(table.status),
    index('quotation_requests_created_at_idx').on(table.createdAt),
  ],
);

export const quotationItems = pgTable(
  'quotation_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotationRequests.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    quantity: integer('quantity').default(1).notNull(),
    unit: text('unit').default('piece').notNull(),
    mrpPaise: bigint('mrp_paise', { mode: 'number' }).default(0).notNull(),
    offerPricePaise: bigint('offer_price_paise', { mode: 'number' }).default(0).notNull(),
    discountType: text('discount_type').default('none').notNull(),
    discountValue: bigint('discount_value', { mode: 'number' }).default(0).notNull(),
    discountAmountPaise: bigint('discount_amount_paise', { mode: 'number' }).default(0).notNull(),
    finalUnitPricePaise: bigint('final_unit_price_paise', { mode: 'number' }).default(0).notNull(),
    lineTotalPaise: bigint('line_total_paise', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('quotation_items_quantity_positive_ck', sql`${table.quantity} > 0`),
    check(
      'quotation_items_discount_type_ck',
      sql`${table.discountType} in ('none', 'fixed', 'percentage')`,
    ),
    check('quotation_items_mrp_nonnegative_ck', sql`${table.mrpPaise} >= 0`),
    check('quotation_items_offer_nonnegative_ck', sql`${table.offerPricePaise} >= 0`),
    check('quotation_items_discount_val_nonnegative_ck', sql`${table.discountValue} >= 0`),
    check('quotation_items_discount_amt_nonnegative_ck', sql`${table.discountAmountPaise} >= 0`),
    check('quotation_items_unit_price_nonnegative_ck', sql`${table.finalUnitPricePaise} >= 0`),
    check('quotation_items_line_total_nonnegative_ck', sql`${table.lineTotalPaise} >= 0`),
    index('quotation_items_quotation_id_idx').on(table.quotationId),
    index('quotation_items_product_id_idx').on(table.productId),
  ],
);
