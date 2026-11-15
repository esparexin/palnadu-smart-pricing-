import { and, eq } from 'drizzle-orm';
import { calculatePricing, type PricingDiscountType, type PricingResult } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { products, productVariants } from './schema.js';

export interface ProductBasePricing {
  mrpPaise: number;
  offerPricePaise: number;
  discountType?: PricingDiscountType;
  discountValue?: number;
}

export interface VariantPricingOverride {
  mrpPaise?: number | null;
  offerPricePaise?: number | null;
  discountType?: PricingDiscountType | null;
  discountValue?: number | null;
}

export interface GetProductEffectivePricingParams {
  productId: string;
  variantId?: string;
  quantity?: number;
}

function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function resolveDiscount(
  productDiscountType: PricingDiscountType,
  productDiscountValue: number,
  variant?: VariantPricingOverride | null,
): { discountType: PricingDiscountType; discountValue: number } {
  if (hasValue(variant?.discountType)) {
    return {
      discountType: variant.discountType,
      discountValue: hasValue(variant?.discountValue) ? variant.discountValue : 0,
    };
  }

  return {
    discountType: productDiscountType,
    discountValue: hasValue(variant?.discountValue) ? variant.discountValue : productDiscountValue,
  };
}

/**
 * Resolves effective pricing by applying variant overrides over product-level base pricing,
 * delegating all arithmetic and rounding to the @palnadu/contracts pricing engine.
 */
export function resolveEffectivePricing(
  product: ProductBasePricing,
  variant?: VariantPricingOverride | null,
  quantity = 1,
): PricingResult {
  const mrpPaise = hasValue(variant?.mrpPaise) ? variant.mrpPaise : product.mrpPaise;
  const offerPricePaise = hasValue(variant?.offerPricePaise)
    ? variant.offerPricePaise
    : product.offerPricePaise;
  const { discountType, discountValue } = resolveDiscount(
    product.discountType ?? 'none',
    product.discountValue ?? 0,
    variant,
  );

  return calculatePricing({
    mrpPaise,
    offerPricePaise,
    discountType,
    discountValue,
    quantity,
  });
}

/**
 * Queries the database for a product and optional variant, resolves pricing inheritance,
 * and calculates the authoritative pricing result via @palnadu/contracts.
 * Returns null if the product or requested variant is not found.
 */
export async function getProductEffectivePricing(
  db: DbExecutor,
  params: GetProductEffectivePricingParams,
): Promise<PricingResult | null> {
  const [productRow] = await db
    .select({
      id: products.id,
      mrpPaise: products.mrpPaise,
      offerPricePaise: products.offerPricePaise,
      discountType: products.discountType,
      discountValue: products.discountValue,
    })
    .from(products)
    .where(eq(products.id, params.productId))
    .limit(1);

  if (!productRow) {
    return null;
  }

  let variantOverride: VariantPricingOverride | null = null;

  if (params.variantId) {
    const [variantRow] = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        mrpPaise: productVariants.mrpPaise,
        offerPricePaise: productVariants.offerPricePaise,
        discountType: productVariants.discountType,
        discountValue: productVariants.discountValue,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, params.variantId),
          eq(productVariants.productId, params.productId),
        ),
      )
      .limit(1);

    if (!variantRow) {
      return null;
    }

    variantOverride = {
      mrpPaise: variantRow.mrpPaise,
      offerPricePaise: variantRow.offerPricePaise,
      discountType: variantRow.discountType as PricingDiscountType | null,
      discountValue: variantRow.discountValue,
    };
  }

  return resolveEffectivePricing(
    {
      mrpPaise: productRow.mrpPaise,
      offerPricePaise: productRow.offerPricePaise,
      discountType: productRow.discountType as PricingDiscountType,
      discountValue: productRow.discountValue,
    },
    variantOverride,
    params.quantity ?? 1,
  );
}
