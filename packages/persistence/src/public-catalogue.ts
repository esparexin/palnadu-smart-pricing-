import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  PublicProductDto,
  PublicProductQuery,
  PublicRecommendationItem,
  PublicRecommendationListResponseSchema,
} from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { hydratePublicProducts } from './public-catalogue-hydration.js';
import {
  brands,
  categories,
  productCategories,
  productRelationships,
  products,
  productVariants,
} from './schema.js';

export async function findPublicProductBySlug(
  db: DbExecutor,
  slug: string,
): Promise<PublicProductDto | null> {
  const normalized = slug.trim().toLowerCase();
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(eq(sql`lower(btrim(${products.slug}))`, normalized), eq(products.status, 'published')),
    )
    .limit(1);

  if (!product) return null;

  const [dto] = await hydratePublicProducts(db, [product]);
  return dto ?? null;
}

export async function listPublicProducts(
  db: DbExecutor,
  query: PublicProductQuery,
): Promise<{ items: PublicProductDto[]; total: number }> {
  const { limit, offset, q, brandId, categoryId, brandSlug, categorySlug } = query;
  const conditions = [eq(products.status, 'published')];

  if (q) {
    const term = `%${q.trim()}%`;
    const searchFilter = or(
      ilike(products.name, term),
      ilike(products.slug, term),
      ilike(products.model, term),
      sql`EXISTS (SELECT 1 FROM ${productVariants} pv WHERE pv.product_id = ${products.id} AND (pv.sku ILIKE ${term} OR pv.model ILIKE ${term}))`,
      sql`EXISTS (SELECT 1 FROM ${brands} b WHERE b.id = ${products.brandId} AND b.name ILIKE ${term})`,
    );
    if (searchFilter) conditions.push(searchFilter);
  }
  if (brandId) conditions.push(eq(products.brandId, brandId));
  if (brandSlug) {
    const normBrandSlug = brandSlug.trim().toLowerCase();
    conditions.push(
      sql`${products.brandId} IN (SELECT id FROM brands WHERE lower(btrim(slug)) = ${normBrandSlug})`,
    );
  }
  if (categoryId) {
    conditions.push(
      sql`${products.id} IN (SELECT product_id FROM product_categories WHERE category_id = ${categoryId})`,
    );
  }
  if (categorySlug) {
    const normCatSlug = categorySlug.trim().toLowerCase();
    conditions.push(
      sql`${products.id} IN (SELECT pc.product_id FROM product_categories pc JOIN categories c ON pc.category_id = c.id WHERE lower(btrim(c.slug)) = ${normCatSlug})`,
    );
  }

  const filter = and(...conditions);
  const productRows = await db
    .select()
    .from(products)
    .where(filter)
    .limit(limit)
    .offset(offset)
    .orderBy(products.name);

  let total: number;
  if (offset === 0 && productRows.length < limit) {
    total = productRows.length;
  } else {
    const totalResult = await db.select({ count: count() }).from(products).where(filter);
    total = totalResult[0]?.count ?? 0;
  }

  if (productRows.length === 0) {
    return { items: [], total };
  }

  const items = await hydratePublicProducts(db, productRows);
  return { items, total };
}

export async function listPublicRecommendations(
  db: DbExecutor,
  productIdOrSlug: string,
): Promise<PublicRecommendationItem[] | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    productIdOrSlug,
  );
  const [sourceProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        isUuid
          ? eq(products.id, productIdOrSlug)
          : eq(sql`lower(btrim(${products.slug}))`, productIdOrSlug.trim().toLowerCase()),
        eq(products.status, 'published'),
      ),
    )
    .limit(1);

  if (!sourceProduct) return null;

  const relRows = await db
    .select({
      relationshipType: productRelationships.relationshipType,
      notes: productRelationships.notes,
      targetProductId: productRelationships.targetProductId,
    })
    .from(productRelationships)
    .innerJoin(products, eq(productRelationships.targetProductId, products.id))
    .where(
      and(
        eq(productRelationships.sourceProductId, sourceProduct.id),
        eq(productRelationships.confirmedByAdmin, true),
        eq(products.status, 'published'),
      ),
    )
    .orderBy(productRelationships.createdAt);

  if (relRows.length === 0) return [];

  const targetIds = relRows.map((r) => r.targetProductId);
  const targetProducts = await db.select().from(products).where(inArray(products.id, targetIds));
  const targetDtos = await hydratePublicProducts(db, targetProducts);
  const targetMap = new Map(targetDtos.map((d) => [d.id, d]));

  const results: PublicRecommendationItem[] = [];
  for (const rel of relRows) {
    const targetDto = targetMap.get(rel.targetProductId);
    if (targetDto) {
      results.push({
        relationshipType: rel.relationshipType as PublicRecommendationItem['relationshipType'],
        product: targetDto,
        notes: rel.notes,
      });
    }
  }

  return PublicRecommendationListResponseSchema.parse(results);
}

export async function listPublicCategories(
  db: DbExecutor,
  params?: { q?: string },
): Promise<Array<typeof categories.$inferSelect>> {
  const conditions = [
    sql`EXISTS (
      SELECT 1 FROM ${productCategories} pc
      INNER JOIN ${products} p ON pc.product_id = p.id
      WHERE (pc.category_id = ${categories.id} OR pc.category_id IN (
        SELECT sub.id FROM ${categories} sub WHERE sub.parent_id = ${categories.id}
      ))
      AND p.status = 'published'
    )`,
  ];
  if (params?.q) {
    const term = `%${params.q.trim()}%`;
    conditions.push(or(ilike(categories.name, term), ilike(categories.slug, term))!);
  }
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.name);
}

export async function listPublicBrands(
  db: DbExecutor,
  params?: { q?: string },
): Promise<Array<typeof brands.$inferSelect>> {
  const conditions = [
    sql`EXISTS (
      SELECT 1 FROM ${products} p
      WHERE p.brand_id = ${brands.id}
      AND p.status = 'published'
    )`,
  ];
  if (params?.q) {
    const term = `%${params.q.trim()}%`;
    conditions.push(or(ilike(brands.name, term), ilike(brands.slug, term))!);
  }
  return db
    .select()
    .from(brands)
    .where(and(...conditions))
    .orderBy(brands.name);
}
