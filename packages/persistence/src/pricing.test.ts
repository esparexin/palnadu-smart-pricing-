import { describe, expect, it } from 'vitest';
import { resolveEffectivePricing } from './pricing.js';

describe('persistence pricing resolution & inheritance', () => {
  const baseProduct = {
    mrpPaise: 50000,
    offerPricePaise: 45000,
    discountType: 'fixed' as const,
    discountValue: 2000,
  };

  it('uses product base pricing when no variant is supplied', () => {
    const result = resolveEffectivePricing(baseProduct);

    expect(result.mrpPaise).toBe(50000);
    expect(result.offerPricePaise).toBe(45000);
    expect(result.discountType).toBe('fixed');
    expect(result.discountValue).toBe(2000);
    expect(result.discountAmountPaise).toBe(2000);
    expect(result.finalUnitPricePaise).toBe(43000);
    expect(result.lineTotalPaise).toBe(43000);
    expect(result.savingsAgainstMrpPaise).toBe(7000);
  });

  it('inherits base pricing when variant has all null pricing fields', () => {
    const result = resolveEffectivePricing(baseProduct, {
      mrpPaise: null,
      offerPricePaise: null,
      discountType: null,
      discountValue: null,
    });

    expect(result.mrpPaise).toBe(50000);
    expect(result.offerPricePaise).toBe(45000);
    expect(result.discountType).toBe('fixed');
    expect(result.discountValue).toBe(2000);
    expect(result.finalUnitPricePaise).toBe(43000);
  });

  it('overrides offer price while inheriting product MRP', () => {
    const result = resolveEffectivePricing(baseProduct, {
      offerPricePaise: 40000,
      discountType: 'none',
      discountValue: 0,
    });

    expect(result.mrpPaise).toBe(50000);
    expect(result.offerPricePaise).toBe(40000);
    expect(result.discountType).toBe('none');
    expect(result.discountValue).toBe(0);
    expect(result.discountAmountPaise).toBe(0);
    expect(result.finalUnitPricePaise).toBe(40000);
    expect(result.savingsAgainstMrpPaise).toBe(10000);
  });

  it('overrides entire pricing with percentage discount and multiple quantity', () => {
    const result = resolveEffectivePricing(
      baseProduct,
      {
        mrpPaise: 60000,
        offerPricePaise: 50000,
        discountType: 'percentage',
        discountValue: 1000, // 10%
      },
      3,
    );

    expect(result.mrpPaise).toBe(60000);
    expect(result.offerPricePaise).toBe(50000);
    expect(result.discountType).toBe('percentage');
    expect(result.discountValue).toBe(1000);
    expect(result.discountAmountPaise).toBe(5000); // 10% of 50000
    expect(result.finalUnitPricePaise).toBe(45000);
    expect(result.quantity).toBe(3);
    expect(result.lineTotalPaise).toBe(135000);
    expect(result.savingsAgainstMrpPaise).toBe(45000); // (60000 - 45000) * 3
  });

  it('defaults discount value to 0 if variant specifies discountType without discountValue', () => {
    const result = resolveEffectivePricing(baseProduct, {
      discountType: 'none',
      discountValue: null,
    });

    expect(result.discountType).toBe('none');
    expect(result.discountValue).toBe(0);
    expect(result.discountAmountPaise).toBe(0);
    expect(result.finalUnitPricePaise).toBe(45000);
  });
});
