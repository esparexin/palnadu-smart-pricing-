import { z } from 'zod';

export const PricingDiscountTypeSchema = z.enum(['none', 'fixed', 'percentage']);

export const PricingInputSchema = z
  .object({
    mrpPaise: z.number().int().nonnegative(),
    offerPricePaise: z.number().int().nonnegative(),
    discountType: PricingDiscountTypeSchema.default('none'),
    discountValue: z.number().int().nonnegative().default(0),
    quantity: z.number().int().positive().default(1),
  })
  .strict()
  .refine((data) => data.mrpPaise === 0 || data.offerPricePaise <= data.mrpPaise, {
    message: 'Offer price cannot exceed MRP',
    path: ['offerPricePaise'],
  })
  .refine((data) => data.discountType !== 'none' || data.discountValue === 0, {
    message: 'Discount value must be 0 when discount type is none',
    path: ['discountValue'],
  })
  .refine((data) => data.discountType !== 'fixed' || data.discountValue <= data.offerPricePaise, {
    message: 'Fixed discount amount cannot exceed offer price',
    path: ['discountValue'],
  })
  .refine((data) => data.discountType !== 'percentage' || data.discountValue <= 10000, {
    message: 'Percentage discount cannot exceed 100% (10,000 basis points)',
    path: ['discountValue'],
  });

export const PricingResultSchema = z
  .object({
    mrpPaise: z.number().int().nonnegative(),
    offerPricePaise: z.number().int().nonnegative(),
    discountType: PricingDiscountTypeSchema,
    discountValue: z.number().int().nonnegative(),
    discountAmountPaise: z.number().int().nonnegative(),
    finalUnitPricePaise: z.number().int().nonnegative(),
    quantity: z.number().int().positive(),
    lineTotalPaise: z.number().int().nonnegative(),
    savingsAgainstMrpPaise: z.number().int().nonnegative(),
  })
  .strict();

export type PricingDiscountType = z.infer<typeof PricingDiscountTypeSchema>;
export type PricingInput = z.infer<typeof PricingInputSchema>;
export type PricingResult = z.infer<typeof PricingResultSchema>;

export function calculatePricing(rawInput: PricingInput): PricingResult {
  const input = PricingInputSchema.parse(rawInput);
  const base = input.offerPricePaise;
  let discountAmountPaise = 0;

  if (input.discountType === 'fixed') {
    discountAmountPaise = input.discountValue;
  } else if (input.discountType === 'percentage') {
    discountAmountPaise = Math.round((base * input.discountValue) / 10000);
  }

  // Ensure discount amount does not exceed offer price
  discountAmountPaise = Math.min(discountAmountPaise, base);
  const finalUnitPricePaise = Math.max(0, base - discountAmountPaise);
  const lineTotalPaise = finalUnitPricePaise * input.quantity;
  const savingsPerUnit = input.mrpPaise > 0 ? Math.max(0, input.mrpPaise - finalUnitPricePaise) : 0;
  const savingsAgainstMrpPaise = savingsPerUnit * input.quantity;

  return {
    mrpPaise: input.mrpPaise,
    offerPricePaise: input.offerPricePaise,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmountPaise,
    finalUnitPricePaise,
    quantity: input.quantity,
    lineTotalPaise,
    savingsAgainstMrpPaise,
  };
}

export const QuotationTaxPreferenceSchema = z
  .object({
    isTaxInclusive: z.boolean(),
  })
  .strict();

export type QuotationTaxPreference = z.infer<typeof QuotationTaxPreferenceSchema>;

export const TAX_INCLUSIVE_LABEL = 'Tax Inclusive';
export const TAX_INCLUSIVE_NOTE = 'Applicable taxes are included in this estimate.';
export const TAX_EXCLUSIVE_LABEL = 'Taxes Extra';
export const TAX_EXCLUSIVE_NOTE = 'Applicable taxes will be charged at the time of billing.';
