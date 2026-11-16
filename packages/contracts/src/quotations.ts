import { z } from 'zod';
import { PricingDiscountTypeSchema } from './pricing.js';

export const QuotationStatusSchema = z.enum([
  'submitted',
  'draft',
  'issued',
  'delivered',
  'rejected',
]);

export const CustomerEnquiryItemSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().positive().default(1),
  })
  .strict();

export const CustomerEnquiryCreateSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100),
    customerEmail: z.string().trim().email().nullable().optional(),
    customerPhone: z.string().trim().min(10).max(20).nullable().optional(),
    customerNotes: z.string().trim().max(1000).nullable().optional(),
    items: z.array(CustomerEnquiryItemSchema).min(1).max(100),
    idempotencyKey: z.string().trim().max(128).nullable().optional(),
  })
  .strict()
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: 'Either email or phone must be provided to submit a quotation request',
    path: ['customerPhone'],
  });

export const CustomerEnquiryResponseSchema = z
  .object({
    referenceNumber: z.string(),
    status: z.literal('submitted'),
    createdAt: z.string().datetime(),
  })
  .strict();

export const QuotationLineItemDtoSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    productSlug: z.string(),
    variantId: z.string().uuid().nullable(),
    variantModel: z.string().nullable(),
    sku: z.string().nullable(),
    unit: z.string(),
    quantity: z.number().int().positive(),
    mrpPaise: z.number().int().nonnegative(),
    offerPricePaise: z.number().int().nonnegative(),
    discountType: PricingDiscountTypeSchema,
    discountValue: z.number().int().nonnegative(),
    discountAmountPaise: z.number().int().nonnegative(),
    finalUnitPricePaise: z.number().int().nonnegative(),
    lineTotalPaise: z.number().int().nonnegative(),
  })
  .strict();

export const AdminQuotationDetailSchema = z
  .object({
    id: z.string().uuid(),
    referenceNumber: z.string(),
    customerName: z.string(),
    customerEmail: z.string().nullable(),
    customerPhone: z.string().nullable(),
    customerNotes: z.string().nullable(),
    status: QuotationStatusSchema,
    subtotalPaise: z.number().int().nonnegative(),
    discountTotalPaise: z.number().int().nonnegative(),
    grandTotalPaise: z.number().int().nonnegative(),
    items: z.array(QuotationLineItemDtoSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const AdminQuotationListQuerySchema = z
  .object({
    status: QuotationStatusSchema.optional(),
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const AdminQuotationListResponseSchema = z
  .object({
    items: z.array(AdminQuotationDetailSchema),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const AdminQuotationStatusUpdateSchema = z
  .object({
    status: QuotationStatusSchema,
  })
  .strict();

export type QuotationStatus = z.infer<typeof QuotationStatusSchema>;
export type CustomerEnquiryItem = z.infer<typeof CustomerEnquiryItemSchema>;
export type CustomerEnquiryCreate = z.infer<typeof CustomerEnquiryCreateSchema>;
export type CustomerEnquiryResponse = z.infer<typeof CustomerEnquiryResponseSchema>;
export type QuotationLineItemDto = z.infer<typeof QuotationLineItemDtoSchema>;
export type AdminQuotationDetail = z.infer<typeof AdminQuotationDetailSchema>;
export type AdminQuotationListQuery = z.infer<typeof AdminQuotationListQuerySchema>;
export type AdminQuotationListResponse = z.infer<typeof AdminQuotationListResponseSchema>;
export type AdminQuotationStatusUpdate = z.infer<typeof AdminQuotationStatusUpdateSchema>;
