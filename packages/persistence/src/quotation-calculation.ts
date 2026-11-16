import type { CustomerEnquiryItem } from '@palnadu/contracts';
import { resolveEffectivePricing } from './pricing.js';
import type { products, productVariants } from './schema.js';

export function generateReferenceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ENQ-${dateStr}-${rand}`;
}

export interface CalculatedQuotationLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  unit: string;
  mrpPaise: number;
  offerPricePaise: number;
  discountType: 'none' | 'fixed' | 'percentage';
  discountValue: number;
  discountAmountPaise: number;
  finalUnitPricePaise: number;
  lineTotalPaise: number;
}

export function calculateQuotationLines(
  items: CustomerEnquiryItem[],
  productMap: Map<string, typeof products.$inferSelect>,
  variantMap: Map<string, typeof productVariants.$inferSelect>,
): CalculatedQuotationLine[] {
  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      const err = new Error(`Product ${item.productId} is not available for quotation`) as Error & {
        code?: string;
      };
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const variant = item.variantId ? variantMap.get(item.variantId) : null;
    if (item.variantId && !variant) {
      const err = new Error(`Variant ${item.variantId} is not available for quotation`) as Error & {
        code?: string;
      };
      err.code = 'VARIANT_NOT_FOUND';
      throw err;
    }

    const pricing = resolveEffectivePricing(
      {
        mrpPaise: product.mrpPaise,
        offerPricePaise: product.offerPricePaise,
        discountType: product.discountType as 'none' | 'fixed' | 'percentage',
        discountValue: product.discountValue,
      },
      variant
        ? {
            mrpPaise: variant.mrpPaise,
            offerPricePaise: variant.offerPricePaise,
            discountType: variant.discountType as 'none' | 'fixed' | 'percentage',
            discountValue: variant.discountValue,
          }
        : null,
      item.quantity,
    );

    return {
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      unit: product.unit,
      mrpPaise: pricing.mrpPaise,
      offerPricePaise: pricing.offerPricePaise,
      discountType: pricing.discountType,
      discountValue: pricing.discountValue,
      discountAmountPaise: pricing.discountAmountPaise,
      finalUnitPricePaise: pricing.finalUnitPricePaise,
      lineTotalPaise: pricing.lineTotalPaise,
    };
  });
}
