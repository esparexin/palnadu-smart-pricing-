import { z } from 'zod';
import type {
  AdminProductDetailResponse,
  ImageResponse,
  RelationshipResponse,
  VariantResponse,
} from '@palnadu/contracts';
import type { fetchProductDetail, findCategoryById, findVariantById } from '@palnadu/persistence';

export const IdParamSchema = z.object({ id: z.string().uuid() }).strict();
export const ProductIdParamSchema = z.object({ productId: z.string().uuid() }).strict();
export const VariantIdParamSchema = z
  .object({ productId: z.string().uuid(), id: z.string().uuid() })
  .strict();

export function formatCategory(c: NonNullable<Awaited<ReturnType<typeof findCategoryById>>>) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function formatBrand(b: {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toVariantDto(
  v: NonNullable<Awaited<ReturnType<typeof findVariantById>>>,
): VariantResponse {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    model: v.model,
    options: v.options,
    mrpPaise: v.mrpPaise,
    offerPricePaise: v.offerPricePaise,
    discountType: v.discountType as VariantResponse['discountType'],
    discountValue: v.discountValue,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function toProductDetailDto(
  p: NonNullable<Awaited<ReturnType<typeof fetchProductDetail>>>,
): AdminProductDetailResponse {
  return {
    ...p,
    status: p.status as AdminProductDetailResponse['status'],
    discountType: p.discountType as AdminProductDetailResponse['discountType'],
    brand: p.brand
      ? {
          ...p.brand,
          createdAt: p.brand.createdAt.toISOString(),
          updatedAt: p.brand.updatedAt.toISOString(),
        }
      : null,
    categories: p.categories.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    variants: p.variants.map((v) => ({
      ...v,
      discountType: v.discountType as VariantResponse['discountType'],
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    images: p.images.map((img) => ({
      ...img,
      rightsStatus: img.rightsStatus as ImageResponse['rightsStatus'],
      createdAt: img.createdAt.toISOString(),
    })),
    relationships: p.relationships.map((r) => ({
      ...r,
      relationshipType: r.relationshipType as RelationshipResponse['relationshipType'],
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
