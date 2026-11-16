import { z } from 'zod';

export const CandidateSourceTypeSchema = z.enum([
  'manufacturer',
  'distributor',
  'commercial_feed',
  'web_search',
]);
export type CandidateSourceType = z.infer<typeof CandidateSourceTypeSchema>;

export const CandidateMatchConfidenceSchema = z.enum([
  'exact_model',
  'prefix_match',
  'brand_only',
  'uncertain',
]);
export type CandidateMatchConfidence = z.infer<typeof CandidateMatchConfidenceSchema>;

export const CandidateLicenceTypeSchema = z.enum([
  'public_domain',
  'commercial_allowed',
  'attribution_required',
  'unverified',
]);
export type CandidateLicenceType = z.infer<typeof CandidateLicenceTypeSchema>;

export const CandidateStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;

export const ImageCandidateResponseSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sourceUrl: z.string().url(),
    thumbnailUrl: z.string().url().nullable().optional(),
    sourceDomain: z.string(),
    providerName: z.string(),
    sourceType: CandidateSourceTypeSchema,
    matchConfidence: CandidateMatchConfidenceSchema,
    modelMatched: z.string().nullable().optional(),
    licenceType: CandidateLicenceTypeSchema,
    attributionText: z.string().nullable().optional(),
    status: CandidateStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type ImageCandidateResponse = z.infer<typeof ImageCandidateResponseSchema>;

export const ImageCandidateListResponseSchema = z.array(ImageCandidateResponseSchema);
export type ImageCandidateListResponse = z.infer<typeof ImageCandidateListResponseSchema>;

export const ApproveCandidateRequestSchema = z
  .object({
    isPrimary: z.boolean().default(false),
    altText: z.string().max(200).optional(),
    variantId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type ApproveCandidateRequest = z.infer<typeof ApproveCandidateRequestSchema>;
