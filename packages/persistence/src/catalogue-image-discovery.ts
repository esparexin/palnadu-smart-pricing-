import { desc, eq } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { productImageCandidates } from './image-discovery.schema.js';
import { createProductImage } from './catalogue-images.js';

export type CandidateInsert = Omit<
  typeof productImageCandidates.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;

export async function saveImageCandidates(db: DbExecutor, candidates: CandidateInsert[]) {
  if (candidates.length === 0) return [];
  return db.insert(productImageCandidates).values(candidates).returning();
}

export async function listImageCandidates(db: DbExecutor, productId: string) {
  return db
    .select()
    .from(productImageCandidates)
    .where(eq(productImageCandidates.productId, productId))
    .orderBy(desc(productImageCandidates.createdAt));
}

export async function getCandidateById(db: DbExecutor, candidateId: string) {
  const [candidate] = await db
    .select()
    .from(productImageCandidates)
    .where(eq(productImageCandidates.id, candidateId))
    .limit(1);
  return candidate ?? null;
}

export async function updateCandidateStatus(
  db: DbExecutor,
  candidateId: string,
  status: 'pending' | 'approved' | 'rejected',
) {
  const [updated] = await db
    .update(productImageCandidates)
    .set({ status, updatedAt: new Date() })
    .where(eq(productImageCandidates.id, candidateId))
    .returning();
  return updated ?? null;
}

export async function approveCandidateAndCreateImage(
  db: DbExecutor,
  candidateId: string,
  options: {
    isPrimary?: boolean;
    altText?: string;
    variantId?: string | null;
  } = {},
) {
  const candidate = await getCandidateById(db, candidateId);
  if (!candidate) {
    throw new Error('Image candidate not found');
  }

  const createdImage = await createProductImage(db, candidate.productId, {
    url: candidate.sourceUrl,
    altText: options.altText || candidate.attributionText || '',
    isPrimary: options.isPrimary ?? false,
    variantId: options.variantId ?? null,
    rightsStatus: 'verified_commercial',
  });

  const [approved] = await db
    .update(productImageCandidates)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(productImageCandidates.id, candidateId))
    .returning();

  return { candidate: approved, image: createdImage };
}
