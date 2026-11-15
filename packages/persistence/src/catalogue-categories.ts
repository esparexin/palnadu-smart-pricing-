import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { categories, productCategories } from './schema.js';

export async function createCategory(
  db: DbExecutor,
  input: { name: string; slug: string; parentId?: string | null },
) {
  const [created] = await db
    .insert(categories)
    .values({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      parentId: input.parentId ?? null,
    })
    .returning();
  return created;
}

export async function findCategoryById(db: DbExecutor, id: string) {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findCategoryByNormalizedNameOrSlug(
  db: DbExecutor,
  name?: string,
  slug?: string,
  excludeId?: string,
) {
  const conditions = [];
  if (name) {
    conditions.push(eq(sql`lower(btrim(${categories.name}))`, name.trim().toLowerCase()));
  }
  if (slug) {
    conditions.push(eq(sql`lower(btrim(${categories.slug}))`, slug.trim().toLowerCase()));
  }
  if (conditions.length === 0) return null;

  const whereClause = excludeId
    ? and(sql`${categories.id} <> ${excludeId}`, or(...conditions))
    : or(...conditions);

  const rows = await db.select({ id: categories.id }).from(categories).where(whereClause).limit(1);
  return rows[0] ?? null;
}

export async function listCategories(
  db: DbExecutor,
  params: { q?: string; parentId?: string | null; limit?: number; offset?: number },
) {
  const { limit = 50, offset = 0, q, parentId } = params;
  const conditions = [];

  if (q) {
    conditions.push(
      or(ilike(categories.name, `%${q.trim()}%`), ilike(categories.slug, `%${q.trim()}%`)),
    );
  }
  if (parentId !== undefined) {
    conditions.push(
      parentId === null ? sql`${categories.parentId} is null` : eq(categories.parentId, parentId),
    );
  }

  const filter = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db.select().from(categories).where(filter).limit(limit).offset(offset).orderBy(categories.name),
    db.select({ count: count() }).from(categories).where(filter),
  ]);

  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function assertNoCategoryCycle(
  db: DbExecutor,
  categoryId: string,
  newParentId: string,
): Promise<void> {
  if (newParentId === categoryId) {
    const error = new Error('Category cannot be its own parent') as Error & { code?: string };
    error.code = 'CYCLE_DETECTED';
    throw error;
  }

  await db.execute(
    sql`SELECT id FROM categories WHERE id IN (${categoryId}, ${newParentId}) FOR UPDATE`,
  );

  const [parent] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, newParentId))
    .limit(1);

  if (!parent) {
    const error = new Error('Parent category does not exist') as Error & { code?: string };
    error.code = 'PARENT_NOT_FOUND';
    throw error;
  }

  const cycleResult = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM categories WHERE id = ${newParentId}
      UNION ALL
      SELECT c.id, c.parent_id FROM categories c JOIN ancestors a ON c.id = a.parent_id
    )
    SELECT id FROM ancestors WHERE id = ${categoryId} LIMIT 1
  `);

  if (cycleResult.length > 0) {
    const error = new Error('Circular category hierarchy detected') as Error & { code?: string };
    error.code = 'CYCLE_DETECTED';
    throw error;
  }
}

export async function updateCategory(
  db: DbExecutor,
  id: string,
  input: { name?: string; slug?: string; parentId?: string | null },
) {
  const [updated] = await db
    .update(categories)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();
  return updated ?? null;
}

export async function countSubcategories(db: DbExecutor, categoryId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(categories)
    .where(eq(categories.parentId, categoryId));
  return result?.count ?? 0;
}

export async function countCategoryProducts(db: DbExecutor, categoryId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(productCategories)
    .where(eq(productCategories.categoryId, categoryId));
  return result?.count ?? 0;
}

export async function deleteCategory(db: DbExecutor, id: string) {
  const deleted = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return deleted.length > 0;
}
