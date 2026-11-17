import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
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

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('brands_normalized_name_uq').on(sql`lower(btrim(${table.name}))`),
    uniqueIndex('brands_normalized_slug_uq').on(sql`lower(btrim(${table.slug}))`),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      'categories_no_self_parent_ck',
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
    uniqueIndex('categories_normalized_name_uq').on(sql`lower(btrim(${table.name}))`),
    uniqueIndex('categories_normalized_slug_uq').on(sql`lower(btrim(${table.slug}))`),
    index('categories_parent_id_idx').on(table.parentId),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    model: text('model'),
    description: text('description'),
    unit: text('unit').default('piece').notNull(),
    specifications: jsonb('specifications').$type<Record<string, unknown>>().default({}).notNull(),
    status: text('status').default('draft').notNull(),
    mrpPaise: bigint('mrp_paise', { mode: 'number' }).default(0).notNull(),
    offerPricePaise: bigint('offer_price_paise', { mode: 'number' }).default(0).notNull(),
    discountType: text('discount_type').default('none').notNull(),
    discountValue: bigint('discount_value', { mode: 'number' }).default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    check('products_status_ck', sql`${table.status} in ('draft', 'published', 'archived')`),
    check(
      'products_discount_type_ck',
      sql`${table.discountType} in ('none', 'fixed', 'percentage')`,
    ),
    check(
      'products_offer_le_mrp_ck',
      sql`${table.mrpPaise} = 0 or ${table.offerPricePaise} <= ${table.mrpPaise}`,
    ),
    check('products_mrp_nonnegative_ck', sql`${table.mrpPaise} >= 0`),
    check('products_offer_nonnegative_ck', sql`${table.offerPricePaise} >= 0`),
    check('products_discount_nonnegative_ck', sql`${table.discountValue} >= 0`),
    uniqueIndex('products_normalized_slug_uq').on(sql`lower(btrim(${table.slug}))`),
    index('products_brand_id_idx').on(table.brandId),
    index('products_status_idx').on(table.status),
    index('products_status_name_idx').on(table.status, table.name),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('product_categories_product_category_uq').on(table.productId, table.categoryId),
    index('product_categories_category_id_idx').on(table.categoryId),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    sku: text('sku'),
    model: text('model'),
    options: jsonb('options').$type<Record<string, unknown>>().default({}).notNull(),
    mrpPaise: bigint('mrp_paise', { mode: 'number' }),
    offerPricePaise: bigint('offer_price_paise', { mode: 'number' }),
    discountType: text('discount_type'),
    discountValue: bigint('discount_value', { mode: 'number' }),
    ...timestamps,
  },
  (table) => [
    check(
      'product_variants_sku_nonblank_ck',
      sql`${table.sku} is null or length(btrim(${table.sku})) > 0`,
    ),
    check(
      'product_variants_discount_type_ck',
      sql`${table.discountType} is null or ${table.discountType} in ('none', 'fixed', 'percentage')`,
    ),
    check(
      'product_variants_offer_le_mrp_ck',
      sql`${table.mrpPaise} is null or ${table.offerPricePaise} is null or ${table.mrpPaise} = 0 or ${table.offerPricePaise} <= ${table.mrpPaise}`,
    ),
    check(
      'product_variants_mrp_nonnegative_ck',
      sql`${table.mrpPaise} is null or ${table.mrpPaise} >= 0`,
    ),
    check(
      'product_variants_offer_nonnegative_ck',
      sql`${table.offerPricePaise} is null or ${table.offerPricePaise} >= 0`,
    ),
    check(
      'product_variants_discount_nonnegative_ck',
      sql`${table.discountValue} is null or ${table.discountValue} >= 0`,
    ),
    uniqueIndex('product_variants_normalized_sku_uq')
      .on(sql`lower(btrim(${table.sku}))`)
      .where(sql`${table.sku} is not null`),
    index('product_variants_product_id_idx').on(table.productId),
    index('product_variants_model_idx').on(table.model),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    altText: text('alt_text').default('').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    rightsStatus: text('rights_status').default('manual_upload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'product_images_rights_status_ck',
      sql`${table.rightsStatus} in ('manual_upload', 'verified_commercial')`,
    ),
    check('product_images_sort_order_ck', sql`${table.sortOrder} >= 0`),
    index('product_images_product_id_idx').on(table.productId),
    index('product_images_variant_id_idx').on(table.variantId),
  ],
);

export const productRelationships = pgTable(
  'product_relationships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceProductId: uuid('source_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    targetProductId: uuid('target_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relationshipType: text('relationship_type').notNull(),
    confirmedByAdmin: boolean('confirmed_by_admin').default(true).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'product_relationships_type_ck',
      sql`${table.relationshipType} in ('related', 'complementary', 'compatible')`,
    ),
    check(
      'product_relationships_no_self_ck',
      sql`${table.sourceProductId} <> ${table.targetProductId}`,
    ),
    uniqueIndex('product_relationships_source_target_type_uq').on(
      table.sourceProductId,
      table.targetProductId,
      table.relationshipType,
    ),
    index('product_relationships_target_id_idx').on(table.targetProductId),
  ],
);
