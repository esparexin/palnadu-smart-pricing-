import { sql } from 'drizzle-orm';
import {
  check,
  index,
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
    ...timestamps,
  },
  (table) => [uniqueIndex('brands_normalized_name_uq').on(sql`lower(btrim(${table.name}))`)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('categories_normalized_name_uq').on(sql`lower(btrim(${table.name}))`)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    model: text('model'),
    description: text('description'),
    specifications: jsonb('specifications').$type<Record<string, unknown>>().default({}).notNull(),
    status: text('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    check('products_status_ck', sql`${table.status} in ('draft', 'published', 'archived')`),
    index('products_brand_id_idx').on(table.brandId),
    index('products_status_idx').on(table.status),
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
    ...timestamps,
  },
  (table) => [
    check(
      'product_variants_sku_nonblank_ck',
      sql`${table.sku} is null or length(btrim(${table.sku})) > 0`,
    ),
    uniqueIndex('product_variants_normalized_sku_uq')
      .on(sql`lower(btrim(${table.sku}))`)
      .where(sql`${table.sku} is not null`),
    index('product_variants_product_id_idx').on(table.productId),
  ],
);
