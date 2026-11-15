import { z } from 'zod';
import { PricingDiscountTypeSchema } from './pricing.js';

export const ProductStatusSchema = z.enum(['draft', 'published', 'archived']);

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and single hyphens',
  });

export const ProductUnitSchema = z.string().trim().min(1).max(50).default('piece');

export const AdminBrandCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: SlugSchema,
  })
  .strict();

export const BrandResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const AdminCategoryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: SlugSchema,
    parentId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const CategoryResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    parentId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const ProductVariantInputSchema = z
  .object({
    sku: z.string().trim().min(1).max(100).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
    options: z.record(z.string(), z.unknown()).default({}),
    mrpPaise: z.number().int().nonnegative().nullable().optional(),
    offerPricePaise: z.number().int().nonnegative().nullable().optional(),
    discountType: PricingDiscountTypeSchema.nullable().optional(),
    discountValue: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const ProductImageInputSchema = z
  .object({
    url: z.string().url(),
    altText: z.string().trim().max(255).default(''),
    sortOrder: z.number().int().nonnegative().default(0),
    isPrimary: z.boolean().default(false),
    rightsStatus: z.enum(['manual_upload', 'verified_commercial']).default('manual_upload'),
  })
  .strict();

export const ProductRelationshipTypeSchema = z.enum(['related', 'complementary', 'compatible']);

export const AdminProductCreateSchema = z
  .object({
    brandId: z.string().uuid().nullable().optional(),
    categoryIds: z.array(z.string().uuid()).default([]),
    name: z.string().trim().min(1).max(255),
    slug: SlugSchema,
    model: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    unit: ProductUnitSchema,
    specifications: z.record(z.string(), z.unknown()).default({}),
    status: ProductStatusSchema.default('draft'),
    mrpPaise: z.number().int().nonnegative().default(0),
    offerPricePaise: z.number().int().nonnegative().default(0),
    discountType: PricingDiscountTypeSchema.default('none'),
    discountValue: z.number().int().nonnegative().default(0),
    variants: z.array(ProductVariantInputSchema).default([]),
    images: z.array(ProductImageInputSchema).default([]),
  })
  .strict()
  .refine((data) => data.mrpPaise === 0 || data.offerPricePaise <= data.mrpPaise, {
    message: 'Base offer price cannot exceed base MRP',
    path: ['offerPricePaise'],
  });

export const PublicProductDtoSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    model: z.string().nullable(),
    description: z.string().nullable(),
    unit: z.string(),
    specifications: z.record(z.string(), z.unknown()),
    brand: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
      })
      .nullable(),
    categories: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
      }),
    ),
    variants: z.array(
      z.object({
        id: z.string().uuid(),
        sku: z.string().nullable(),
        model: z.string().nullable(),
        options: z.record(z.string(), z.unknown()),
      }),
    ),
    images: z.array(
      z.object({
        url: z.string(),
        altText: z.string(),
        isPrimary: z.boolean(),
      }),
    ),
  })
  .strict();

export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type AdminBrandCreate = z.infer<typeof AdminBrandCreateSchema>;
export type BrandResponse = z.infer<typeof BrandResponseSchema>;
export type AdminCategoryCreate = z.infer<typeof AdminCategoryCreateSchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;
export type ProductImageInput = z.infer<typeof ProductImageInputSchema>;
export type ProductRelationshipType = z.infer<typeof ProductRelationshipTypeSchema>;
export type AdminProductCreate = z.infer<typeof AdminProductCreateSchema>;
export type PublicProductDto = z.infer<typeof PublicProductDtoSchema>;
