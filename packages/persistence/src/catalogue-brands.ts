import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { brands, products } from './schema.js';

export async function createBrand(db: DbExecutor, input: { name: string; slug: string }) {
  const [created] = await db
    .insert(brands)
    .values({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
    })
    .returning();
  return created;
}

export async function findBrandById(db: DbExecutor, id: string) {
  const rows = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findBrandByNormalizedNameOrSlug(
  db: DbExecutor,
  name?: string,
  slug?: string,
  excludeId?: string,
) {
  const conditions = [];
  if (name) {
    conditions.push(eq(sql`lower(btrim(${brands.name}))`, name.trim().toLowerCase()));
  }
  if (slug) {
    conditions.push(eq(sql`lower(btrim(${brands.slug}))`, slug.trim().toLowerCase()));
  }
  if (conditions.length === 0) return null;

  const whereClause = excludeId
    ? and(sql`${brands.id} <> ${excludeId}`, or(...conditions))
    : or(...conditions);

  const rows = await db.select({ id: brands.id }).from(brands).where(whereClause).limit(1);
  return rows[0] ?? null;
}

export async function listBrands(
  db: DbExecutor,
  params: { q?: string; limit?: number; offset?: number },
) {
  const { limit = 50, offset = 0, q } = params;
  const filter = q
    ? or(ilike(brands.name, `%${q.trim()}%`), ilike(brands.slug, `%${q.trim()}%`))
    : undefined;

  const [items, totalResult] = await Promise.all([
    db.select().from(brands).where(filter).limit(limit).offset(offset).orderBy(brands.name),
    db.select({ count: count() }).from(brands).where(filter),
  ]);

  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function updateBrand(
  db: DbExecutor,
  id: string,
  input: { name?: string; slug?: string },
) {
  const [updated] = await db
    .update(brands)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id))
    .returning();
  return updated ?? null;
}

export async function countProductsByBrandId(db: DbExecutor, brandId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.brandId, brandId));
  return result?.count ?? 0;
}

export async function deleteBrand(db: DbExecutor, id: string) {
  const deleted = await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
  return deleted.length > 0;
}
