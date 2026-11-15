import { and, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { productRelationships } from './schema.js';

export async function createProductRelationship(
  db: DbExecutor,
  sourceProductId: string,
  input: {
    targetProductId: string;
    relationshipType: 'related' | 'complementary' | 'compatible';
    confirmedByAdmin?: boolean;
    notes?: string | null;
  },
) {
  const [created] = await db
    .insert(productRelationships)
    .values({
      sourceProductId,
      targetProductId: input.targetProductId,
      relationshipType: input.relationshipType,
      confirmedByAdmin: input.confirmedByAdmin ?? true,
      notes: input.notes ?? null,
    })
    .returning();
  return created;
}

export async function findProductRelationshipById(
  db: DbExecutor,
  sourceProductId: string,
  id: string,
) {
  const rows = await db
    .select()
    .from(productRelationships)
    .where(
      and(
        eq(productRelationships.id, id),
        eq(productRelationships.sourceProductId, sourceProductId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findRelationshipBySourceTargetType(
  db: DbExecutor,
  sourceProductId: string,
  targetProductId: string,
  relationshipType: string,
  excludeId?: string,
) {
  const whereClause = excludeId
    ? and(
        sql`${productRelationships.id} <> ${excludeId}`,
        eq(productRelationships.sourceProductId, sourceProductId),
        eq(productRelationships.targetProductId, targetProductId),
        eq(productRelationships.relationshipType, relationshipType),
      )
    : and(
        eq(productRelationships.sourceProductId, sourceProductId),
        eq(productRelationships.targetProductId, targetProductId),
        eq(productRelationships.relationshipType, relationshipType),
      );

  const rows = await db
    .select({ id: productRelationships.id })
    .from(productRelationships)
    .where(whereClause)
    .limit(1);
  return rows[0] ?? null;
}

export async function listProductRelationships(db: DbExecutor, sourceProductId: string) {
  return db
    .select()
    .from(productRelationships)
    .where(eq(productRelationships.sourceProductId, sourceProductId))
    .orderBy(productRelationships.createdAt);
}

export async function updateProductRelationship(
  db: DbExecutor,
  sourceProductId: string,
  id: string,
  input: {
    relationshipType?: 'related' | 'complementary' | 'compatible';
    confirmedByAdmin?: boolean;
    notes?: string | null;
  },
) {
  const [updated] = await db
    .update(productRelationships)
    .set(input)
    .where(
      and(
        eq(productRelationships.id, id),
        eq(productRelationships.sourceProductId, sourceProductId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function deleteProductRelationship(
  db: DbExecutor,
  sourceProductId: string,
  id: string,
) {
  const deleted = await db
    .delete(productRelationships)
    .where(
      and(
        eq(productRelationships.id, id),
        eq(productRelationships.sourceProductId, sourceProductId),
      ),
    )
    .returning({ id: productRelationships.id });
  return deleted.length > 0;
}
