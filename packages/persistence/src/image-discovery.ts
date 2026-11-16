export interface ImageDiscoveryQuery {
  productId: string;
  brandName?: string | null;
  model?: string | null;
  productName: string;
  sku?: string | null;
}

export type CandidateSourceType = 'manufacturer' | 'distributor' | 'commercial_feed' | 'web_search';
export type CandidateMatchConfidence = 'exact_model' | 'prefix_match' | 'brand_only' | 'uncertain';
export type CandidateLicenceType =
  'public_domain' | 'commercial_allowed' | 'attribution_required' | 'unverified';

export interface DiscoveredCandidate {
  productId: string;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  sourceDomain: string;
  providerName: string;
  sourceType: CandidateSourceType;
  matchConfidence: CandidateMatchConfidence;
  modelMatched?: string | null;
  licenceType: CandidateLicenceType;
  attributionText?: string | null;
}

export interface ImageDiscoveryProvider {
  readonly name: string;
  readonly sourceType: CandidateSourceType;
  search(query: ImageDiscoveryQuery): Promise<DiscoveredCandidate[]>;
}

export function determineMatchConfidence(
  query: ImageDiscoveryQuery,
  candidateModel?: string | null,
  candidateBrand?: string | null,
): CandidateMatchConfidence {
  const normQueryModel = query.model ? query.model.trim().toLowerCase() : '';
  const normCandModel = candidateModel ? candidateModel.trim().toLowerCase() : '';
  const normQueryBrand = query.brandName ? query.brandName.trim().toLowerCase() : '';
  const normCandBrand = candidateBrand ? candidateBrand.trim().toLowerCase() : '';

  if (normQueryModel && normCandModel) {
    if (normQueryModel === normCandModel) {
      return 'exact_model';
    }
    if (normCandModel.includes(normQueryModel) || normQueryModel.includes(normCandModel)) {
      return 'prefix_match';
    }
  }

  if (normQueryBrand && normCandBrand && normQueryBrand === normCandBrand) {
    return 'brand_only';
  }

  return 'uncertain';
}

export class MockManufacturerProvider implements ImageDiscoveryProvider {
  public readonly name = 'official_manufacturer_catalogue';
  public readonly sourceType: CandidateSourceType = 'manufacturer';
  private readonly mockCatalog: Array<{
    brand: string;
    model: string;
    imageUrl: string;
    attribution: string;
  }>;

  constructor(
    mockCatalog: Array<{
      brand: string;
      model: string;
      imageUrl: string;
      attribution: string;
    }> = [],
  ) {
    this.mockCatalog = mockCatalog;
  }

  public async search(query: ImageDiscoveryQuery): Promise<DiscoveredCandidate[]> {
    const results: DiscoveredCandidate[] = [];
    for (const item of this.mockCatalog) {
      const confidence = determineMatchConfidence(query, item.model, item.brand);
      if (confidence !== 'uncertain') {
        const urlObj = new URL(item.imageUrl);
        results.push({
          productId: query.productId,
          sourceUrl: item.imageUrl,
          thumbnailUrl: item.imageUrl,
          sourceDomain: urlObj.hostname,
          providerName: this.name,
          sourceType: this.sourceType,
          matchConfidence: confidence,
          modelMatched: item.model,
          licenceType: 'commercial_allowed',
          attributionText: item.attribution,
        });
      }
    }
    return results;
  }
}

export class MockDistributorProvider implements ImageDiscoveryProvider {
  public readonly name = 'authorized_distributor_feed';
  public readonly sourceType: CandidateSourceType = 'distributor';
  private readonly mockFeed: Array<{
    brand: string;
    model: string;
    imageUrl: string;
    distributor: string;
  }>;

  constructor(
    mockFeed: Array<{
      brand: string;
      model: string;
      imageUrl: string;
      distributor: string;
    }> = [],
  ) {
    this.mockFeed = mockFeed;
  }

  public async search(query: ImageDiscoveryQuery): Promise<DiscoveredCandidate[]> {
    const results: DiscoveredCandidate[] = [];
    for (const item of this.mockFeed) {
      const confidence = determineMatchConfidence(query, item.model, item.brand);
      if (confidence !== 'uncertain') {
        const urlObj = new URL(item.imageUrl);
        results.push({
          productId: query.productId,
          sourceUrl: item.imageUrl,
          thumbnailUrl: item.imageUrl,
          sourceDomain: urlObj.hostname,
          providerName: this.name,
          sourceType: this.sourceType,
          matchConfidence: confidence,
          modelMatched: item.model,
          licenceType: 'commercial_allowed',
          attributionText: `Authorized distribution feed from ${item.distributor}`,
        });
      }
    }
    return results;
  }
}

const CONFIDENCE_RANK: Record<CandidateMatchConfidence, number> = {
  exact_model: 4,
  prefix_match: 3,
  brand_only: 2,
  uncertain: 1,
};

export class HybridImageDiscoveryService {
  private readonly providers: ImageDiscoveryProvider[];

  constructor(providers: ImageDiscoveryProvider[]) {
    this.providers = providers;
  }

  public async discover(query: ImageDiscoveryQuery): Promise<DiscoveredCandidate[]> {
    const allCandidates: DiscoveredCandidate[] = [];
    const seenUrls = new Set<string>();

    for (const provider of this.providers) {
      try {
        const found = await provider.search(query);
        for (const candidate of found) {
          if (!seenUrls.has(candidate.sourceUrl)) {
            seenUrls.add(candidate.sourceUrl);
            allCandidates.push(candidate);
          }
        }
      } catch {
        // Silently continue to next provider if one provider encounters an error
      }
    }

    // Sort by confidence rank descending
    allCandidates.sort(
      (a, b) => CONFIDENCE_RANK[b.matchConfidence] - CONFIDENCE_RANK[a.matchConfidence],
    );

    return allCandidates;
  }
}
