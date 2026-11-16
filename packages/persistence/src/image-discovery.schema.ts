import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { products } from './catalogue.schema.js';

export const productImageCandidates = pgTable(
  'product_image_candidates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    sourceDomain: text('source_domain').notNull(),
    providerName: text('provider_name').notNull(),
    sourceType: text('source_type').notNull(),
    matchConfidence: text('match_confidence').notNull(),
    modelMatched: text('model_matched'),
    licenceType: text('licence_type').notNull(),
    attributionText: text('attribution_text'),
    status: text('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'product_image_candidates_source_type_ck',
      sql`${table.sourceType} in ('manufacturer', 'distributor', 'commercial_feed', 'web_search')`,
    ),
    check(
      'product_image_candidates_confidence_ck',
      sql`${table.matchConfidence} in ('exact_model', 'prefix_match', 'brand_only', 'uncertain')`,
    ),
    check(
      'product_image_candidates_licence_ck',
      sql`${table.licenceType} in ('public_domain', 'commercial_allowed', 'attribution_required', 'unverified')`,
    ),
    check(
      'product_image_candidates_status_ck',
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    index('product_image_candidates_product_id_idx').on(table.productId),
    index('product_image_candidates_status_idx').on(table.status),
  ],
);
