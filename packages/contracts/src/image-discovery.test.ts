import { describe, expect, it } from 'vitest';
import {
  ApproveCandidateRequestSchema,
  CandidateLicenceTypeSchema,
  CandidateMatchConfidenceSchema,
  CandidateSourceTypeSchema,
  CandidateStatusSchema,
  ImageCandidateResponseSchema,
} from './image-discovery.js';

describe('Image Discovery Schemas', () => {
  it('validates candidate source and match types', () => {
    expect(CandidateSourceTypeSchema.safeParse('manufacturer').success).toBe(true);
    expect(CandidateSourceTypeSchema.safeParse('distributor').success).toBe(true);
    expect(CandidateSourceTypeSchema.safeParse('invalid_source').success).toBe(false);

    expect(CandidateMatchConfidenceSchema.safeParse('exact_model').success).toBe(true);
    expect(CandidateMatchConfidenceSchema.safeParse('uncertain').success).toBe(true);
    expect(CandidateMatchConfidenceSchema.safeParse('random').success).toBe(false);

    expect(CandidateLicenceTypeSchema.safeParse('commercial_allowed').success).toBe(true);
    expect(CandidateStatusSchema.safeParse('pending').success).toBe(true);
  });

  it('validates ImageCandidateResponseSchema correctly', () => {
    const validCandidate = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      sourceUrl: 'https://manufacturer.example.com/products/cam100.jpg',
      thumbnailUrl: 'https://manufacturer.example.com/products/cam100-thumb.jpg',
      sourceDomain: 'manufacturer.example.com',
      providerName: 'cp_plus_official_feed',
      sourceType: 'manufacturer' as const,
      matchConfidence: 'exact_model' as const,
      modelMatched: 'CP-UNC-TA41ZL4-MDS',
      licenceType: 'commercial_allowed' as const,
      attributionText: 'Official CP Plus Product Catalog 2026',
      status: 'pending' as const,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
    };

    const parsed = ImageCandidateResponseSchema.safeParse(validCandidate);
    expect(parsed.success).toBe(true);
  });

  it('validates ApproveCandidateRequestSchema', () => {
    const res = ApproveCandidateRequestSchema.safeParse({
      isPrimary: true,
      altText: 'Front angle camera view',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.isPrimary).toBe(true);
      expect(res.data.altText).toBe('Front angle camera view');
    }
  });
});
