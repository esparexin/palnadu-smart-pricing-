import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AdminBrandCreateSchema,
  AdminCategoryCreateSchema,
  AdminProductCreateSchema,
  PublicProductDtoSchema,
  SlugSchema,
} from './catalogue.js';

describe('Catalogue Contracts (packages/contracts)', () => {
  it('validates URL-safe lowercase slugs and rejects invalid formats', () => {
    expect(SlugSchema.parse('cctv-cameras')).toBe('cctv-cameras');
    expect(SlugSchema.parse('hikvision-4mp-bullet')).toBe('hikvision-4mp-bullet');
    expect(SlugSchema.parse('dvr-16ch-4k')).toBe('dvr-16ch-4k');

    expect(() => SlugSchema.parse('CCTV_Cameras')).toThrow();
    expect(() => SlugSchema.parse('cameras with spaces')).toThrow();
    expect(() => SlugSchema.parse('-leading-hyphen')).toThrow();
    expect(() => SlugSchema.parse('trailing-hyphen-')).toThrow();
    expect(() => SlugSchema.parse('double--hyphens')).toThrow();
    expect(() => SlugSchema.parse('')).toThrow();
  });

  it('validates brand and category creation schemas', () => {
    const brand = AdminBrandCreateSchema.parse({
      name: 'Hikvision',
      slug: 'hikvision',
    });
    expect(brand.name).toBe('Hikvision');

    const parentCategoryId = randomUUID();
    const category = AdminCategoryCreateSchema.parse({
      name: 'IP Cameras',
      slug: 'ip-cameras',
      parentId: parentCategoryId,
    });
    expect(category.parentId).toBe(parentCategoryId);
  });

  it('validates admin product creation with base pricing and variants', () => {
    const product = AdminProductCreateSchema.parse({
      name: '4MP AcuSense Bullet Camera',
      slug: '4mp-acusense-bullet-camera',
      brandId: randomUUID(),
      categoryIds: [randomUUID()],
      model: 'DS-2CD2043G2-I',
      unit: 'piece',
      mrpPaise: 850000,
      offerPricePaise: 680000,
      discountType: 'fixed',
      discountValue: 30000,
      variants: [
        {
          sku: 'HIK-4MP-28MM',
          model: 'DS-2CD2043G2-I-2.8MM',
          options: { lens: '2.8mm' },
          mrpPaise: 850000,
          offerPricePaise: 680000,
        },
      ],
      images: [
        {
          url: 'https://example.com/images/cam-front.webp',
          altText: 'Front angle view of 4MP bullet camera',
          isPrimary: true,
          rightsStatus: 'manual_upload',
        },
      ],
    });

    expect(product.name).toBe('4MP AcuSense Bullet Camera');
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]?.sku).toBe('HIK-4MP-28MM');
  });

  it('ensures PublicProductDtoSchema strictly strips/rejects any private pricing fields', () => {
    const validPublicProduct = {
      id: randomUUID(),
      slug: '4mp-acusense-bullet-camera',
      name: '4MP AcuSense Bullet Camera',
      model: 'DS-2CD2043G2-I',
      description: 'Outdoor AcuSense fixed bullet network camera',
      unit: 'piece',
      specifications: { resolution: '4MP', irRangeMeters: 40 },
      brand: { id: randomUUID(), name: 'Hikvision', slug: 'hikvision' },
      categories: [{ id: randomUUID(), name: 'IP Cameras', slug: 'ip-cameras' }],
      variants: [
        {
          id: randomUUID(),
          sku: 'HIK-4MP-28MM',
          model: 'DS-2CD2043G2-I-2.8MM',
          options: { lens: '2.8mm' },
        },
      ],
      images: [
        {
          url: 'https://example.com/images/cam-front.webp',
          altText: 'Front angle view',
          isPrimary: true,
        },
      ],
    };

    const parsed = PublicProductDtoSchema.parse(validPublicProduct);
    expect(parsed.id).toBe(validPublicProduct.id);
    expect((parsed as Record<string, unknown>).mrpPaise).toBeUndefined();
    expect((parsed as Record<string, unknown>).offerPricePaise).toBeUndefined();
    expect((parsed as Record<string, unknown>).discountValue).toBeUndefined();

    // Strict schema must reject unexpected pricing fields
    expect(() =>
      PublicProductDtoSchema.parse({
        ...validPublicProduct,
        mrpPaise: 850000,
      }),
    ).toThrow();

    expect(() =>
      PublicProductDtoSchema.parse({
        ...validPublicProduct,
        offerPricePaise: 680000,
      }),
    ).toThrow();
  });
});
