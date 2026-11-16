import { describe, expect, it } from 'vitest';
import {
  determineMatchConfidence,
  HybridImageDiscoveryService,
  MockDistributorProvider,
  MockManufacturerProvider,
  type ImageDiscoveryQuery,
} from './image-discovery.js';

describe('Image Discovery Engine', () => {
  const query: ImageDiscoveryQuery = {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    brandName: 'CP Plus',
    model: 'CP-UNC-TA41ZL4-MDS',
    productName: 'CP Plus 4MP Network Camera',
    sku: 'CP-4MP-DOME',
  };

  it('determines match confidence accurately', () => {
    // Exact model
    expect(determineMatchConfidence(query, 'CP-UNC-TA41ZL4-MDS', 'CP Plus')).toBe('exact_model');

    // Case-insensitive exact model
    expect(determineMatchConfidence(query, 'cp-unc-ta41zl4-mds', 'cp plus')).toBe('exact_model');

    // Prefix match
    expect(determineMatchConfidence(query, 'CP-UNC-TA41ZL4', 'CP Plus')).toBe('prefix_match');

    // Brand only match
    expect(determineMatchConfidence(query, 'CP-E25A', 'CP Plus')).toBe('brand_only');

    // Uncertain (different brand and model)
    expect(determineMatchConfidence(query, 'DS-2CD2143G2-I', 'Hikvision')).toBe('uncertain');
  });

  it('hybrid discovery queries providers in order and deduplicates results', async () => {
    const manufacturer = new MockManufacturerProvider([
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4-MDS',
        imageUrl: 'https://manufacturer.example.com/images/ta41zl4.jpg',
        attribution: 'CP Plus India Official 2026',
      },
    ]);

    const distributor = new MockDistributorProvider([
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4-MDS',
        imageUrl: 'https://manufacturer.example.com/images/ta41zl4.jpg', // Duplicate URL
        distributor: 'Palnadu Distribution Hub',
      },
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4', // Prefix match
        imageUrl: 'https://distributor.example.com/images/ta41-series.jpg',
        distributor: 'Palnadu Distribution Hub',
      },
    ]);

    const service = new HybridImageDiscoveryService([manufacturer, distributor]);
    const candidates = await service.discover(query);

    // Should contain 2 deduplicated candidates
    expect(candidates).toHaveLength(2);

    // Exact model from manufacturer should be first
    expect(candidates[0]?.matchConfidence).toBe('exact_model');
    expect(candidates[0]?.providerName).toBe('official_manufacturer_catalogue');
    expect(candidates[0]?.sourceUrl).toBe('https://manufacturer.example.com/images/ta41zl4.jpg');

    // Prefix match from distributor should be second
    expect(candidates[1]?.matchConfidence).toBe('prefix_match');
    expect(candidates[1]?.sourceUrl).toBe('https://distributor.example.com/images/ta41-series.jpg');
  });

  it('handles provider failures gracefully', async () => {
    const brokenProvider = {
      name: 'broken_provider',
      sourceType: 'web_search' as const,
      search: async () => {
        throw new Error('Network timeout');
      },
    };

    const healthyProvider = new MockManufacturerProvider([
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4-MDS',
        imageUrl: 'https://cp-plus.example.com/cam.webp',
        attribution: 'Official CP Plus',
      },
    ]);

    const service = new HybridImageDiscoveryService([brokenProvider, healthyProvider]);
    const candidates = await service.discover(query);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.providerName).toBe('official_manufacturer_catalogue');
  });
});
