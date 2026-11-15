import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { parseServerConfig } from '@palnadu/server-config';
import { createDatabase } from './client.js';
import { brands, productVariants, products } from './schema.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined) {
  throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests.');
}

const database = createDatabase(
  parseServerConfig({
    DATABASE_URL: testDatabaseUrl,
    DB_POOL_MAX: '2',
    NODE_ENV: 'test',
  }),
);

describe('PostgreSQL persistence', () => {
  beforeAll(async () => {
    const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
    await migrate(database.db, { migrationsFolder });
    await migrate(database.db, { migrationsFolder });
    await database.ping();
  });

  afterAll(async () => {
    await database.close();
  });

  it('enforces case- and whitespace-insensitive SKU uniqueness transactionally', async () => {
    const brandId = randomUUID();
    const productId = randomUUID();
    const sku = `phase2-${randomUUID()}`;

    await expect(
      database.db.transaction(async (transaction) => {
        await transaction.insert(brands).values({
          id: brandId,
          name: `Integration ${brandId}`,
        });
        await transaction.insert(products).values({
          id: productId,
          brandId,
          name: 'Integration product',
        });
        await transaction.insert(productVariants).values({ productId, sku });
        await transaction.insert(productVariants).values({
          productId,
          sku: ` ${sku.toUpperCase()} `,
        });
      }),
    ).rejects.toThrow();

    const rolledBackBrand = await database.db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, brandId));

    expect(rolledBackBrand).toHaveLength(0);
  });
});
