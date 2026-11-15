import { z } from 'zod';
import {
  BrandResponseSchema,
  CategoryResponseSchema,
  ProductImageInputSchema,
  ProductRelationshipTypeSchema,
  ProductStatusSchema,
  ProductUnitSchema,
  ProductVariantInputSchema,
  SlugSchema,
} from './catalogue.js';
import { PricingDiscountTypeSchema, PricingResultSchema } from './pricing.js';

export const PaginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    q: z.string().trim().max(100).optional(),
  })
  .strict();

export const AdminBrandUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: SlugSchema.optional(),
  })
  .strict();

export const BrandListResponseSchema = z
  .object({
    items: z.array(BrandResponseSchema),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const AdminCategoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: SlugSchema.optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  parentId: z.string().uuid().nullable().optional(),
}).strict();

export const CategoryListResponseSchema = z
  .object({
    items: z.array(CategoryResponseSchema),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const VariantResponseSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sku: z.string().nullable(),
    model: z.string().nullable(),
    options: z.record(z.string(), z.unknown()),
    mrpPaise: z.number().int().nonnegative().nullable(),
    offerPricePaise: z.number().int().nonnegative().nullable(),
    discountType: PricingDiscountTypeSchema.nullable(),
    discountValue: z.number().int().nonnegative().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const AdminVariantCreateSchema = ProductVariantInputSchema;

export const AdminVariantUpdateSchema = z
  .object({
    sku: z.string().trim().min(1).max(100).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    mrpPaise: z.number().int().nonnegative().nullable().optional(),
    offerPricePaise: z.number().int().nonnegative().nullable().optional(),
    discountType: PricingDiscountTypeSchema.nullable().optional(),
    discountValue: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const ImageResponseSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    url: z.string().url(),
    altText: z.string(),
    sortOrder: z.number().int().nonnegative(),
    isPrimary: z.boolean(),
    rightsStatus: z.enum(['manual_upload', 'verified_commercial']),
    createdAt: z.string().datetime(),
  })
  .strict();

export const AdminImageCreateSchema = ProductImageInputSchema.extend({
  variantId: z.string().uuid().nullable().optional(),
}).strict();

export const AdminImageUpdateSchema = z
  .object({
    altText: z.string().trim().max(255).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isPrimary: z.boolean().optional(),
    variantId: z.string().uuid().nullable().optional(),
    rightsStatus: z.enum(['manual_upload', 'verified_commercial']).optional(),
  })
  .strict();

export const RelationshipResponseSchema = z
  .object({
    id: z.string().uuid(),
    sourceProductId: z.string().uuid(),
    targetProductId: z.string().uuid(),
    relationshipType: ProductRelationshipTypeSchema,
    confirmedByAdmin: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const AdminRelationshipCreateSchema = z
  .object({
    targetProductId: z.string().uuid(),
    relationshipType: ProductRelationshipTypeSchema,
    confirmedByAdmin: z.boolean().default(true),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const AdminRelationshipUpdateSchema = z
  .object({
    relationshipType: ProductRelationshipTypeSchema.optional(),
    confirmedByAdmin: z.boolean().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const AdminProductUpdateSchema = z
  .object({
    brandId: z.string().uuid().nullable().optional(),
    categoryIds: z.array(z.string().uuid()).optional(),
    name: z.string().trim().min(1).max(255).optional(),
    slug: SlugSchema.optional(),
    model: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    unit: ProductUnitSchema.optional(),
    specifications: z.record(z.string(), z.unknown()).optional(),
    status: ProductStatusSchema.optional(),
    mrpPaise: z.number().int().nonnegative().optional(),
    offerPricePaise: z.number().int().nonnegative().optional(),
    discountType: PricingDiscountTypeSchema.optional(),
    discountValue: z.number().int().nonnegative().optional(),
  })
  .strict();

export const ProductListQuerySchema = PaginationQuerySchema.extend({
  brandId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: ProductStatusSchema.optional(),
}).strict();

export const AdminProductListItemSchema = z
  .object({
    id: z.string().uuid(),
    brandId: z.string().uuid().nullable(),
    name: z.string(),
    slug: z.string(),
    model: z.string().nullable(),
    unit: z.string(),
    status: ProductStatusSchema,
    mrpPaise: z.number().int().nonnegative(),
    offerPricePaise: z.number().int().nonnegative(),
    discountType: PricingDiscountTypeSchema,
    discountValue: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const AdminProductListResponseSchema = z
  .object({
    items: z.array(AdminProductListItemSchema),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const AdminProductDetailResponseSchema = z
  .object({
    id: z.string().uuid(),
    brandId: z.string().uuid().nullable(),
    name: z.string(),
    slug: z.string(),
    model: z.string().nullable(),
    description: z.string().nullable(),
    unit: z.string(),
    specifications: z.record(z.string(), z.unknown()),
    status: ProductStatusSchema,
    mrpPaise: z.number().int().nonnegative(),
    offerPricePaise: z.number().int().nonnegative(),
    discountType: PricingDiscountTypeSchema,
    discountValue: z.number().int().nonnegative(),
    brand: BrandResponseSchema.nullable(),
    categories: z.array(CategoryResponseSchema),
    variants: z.array(VariantResponseSchema),
    images: z.array(ImageResponseSchema),
    relationships: z.array(RelationshipResponseSchema),
    effectivePricing: PricingResultSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .strict();

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type AdminBrandUpdate = z.infer<typeof AdminBrandUpdateSchema>;
export type BrandListResponse = z.infer<typeof BrandListResponseSchema>;
export type AdminCategoryUpdate = z.infer<typeof AdminCategoryUpdateSchema>;
export type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
export type VariantResponse = z.infer<typeof VariantResponseSchema>;
export type AdminVariantCreate = z.infer<typeof AdminVariantCreateSchema>;
export type AdminVariantUpdate = z.infer<typeof AdminVariantUpdateSchema>;
export type ImageResponse = z.infer<typeof ImageResponseSchema>;
export type AdminImageCreate = z.infer<typeof AdminImageCreateSchema>;
export type AdminImageUpdate = z.infer<typeof AdminImageUpdateSchema>;
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>;
export type AdminRelationshipCreate = z.infer<typeof AdminRelationshipCreateSchema>;
export type AdminRelationshipUpdate = z.infer<typeof AdminRelationshipUpdateSchema>;
export type AdminProductUpdate = z.infer<typeof AdminProductUpdateSchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;
export type AdminProductListItem = z.infer<typeof AdminProductListItemSchema>;
export type AdminProductListResponse = z.infer<typeof AdminProductListResponseSchema>;
export type AdminProductDetailResponse = z.infer<typeof AdminProductDetailResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
