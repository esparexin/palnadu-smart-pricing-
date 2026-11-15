import { describe, expect, it } from 'vitest';
import {
  calculatePricing,
  QuotationTaxPreferenceSchema,
  TAX_EXCLUSIVE_LABEL,
  TAX_EXCLUSIVE_NOTE,
  TAX_INCLUSIVE_LABEL,
  TAX_INCLUSIVE_NOTE,
} from './pricing.js';

describe('Pricing Calculation Engine (packages/contracts)', () => {
  it('Scenario 1: calculates MRP without discount correctly', () => {
    const result = calculatePricing({
      mrpPaise: 500000, // ₹5,000.00
      offerPricePaise: 500000, // ₹5,000.00
      discountType: 'none',
      discountValue: 0,
      quantity: 1,
    });

    expect(result.finalUnitPricePaise).toBe(500000);
    expect(result.discountAmountPaise).toBe(0);
    expect(result.lineTotalPaise).toBe(500000);
    expect(result.savingsAgainstMrpPaise).toBe(0);
  });

  it('Scenario 2: calculates Offer Price below MRP correctly', () => {
    const result = calculatePricing({
      mrpPaise: 500000, // ₹5,000.00
      offerPricePaise: 420000, // ₹4,200.00
      discountType: 'none',
      discountValue: 0,
      quantity: 1,
    });

    expect(result.finalUnitPricePaise).toBe(420000);
    expect(result.discountAmountPaise).toBe(0);
    expect(result.lineTotalPaise).toBe(420000);
    expect(result.savingsAgainstMrpPaise).toBe(80000); // ₹800.00 savings
  });

  it('Scenario 3: applies fixed-value discount deducted from offer price', () => {
    const result = calculatePricing({
      mrpPaise: 500000, // ₹5,000.00
      offerPricePaise: 420000, // ₹4,200.00
      discountType: 'fixed',
      discountValue: 30000, // ₹300.00
      quantity: 1,
    });

    expect(result.finalUnitPricePaise).toBe(390000); // ₹3,900.00
    expect(result.discountAmountPaise).toBe(30000);
    expect(result.lineTotalPaise).toBe(390000);
    expect(result.savingsAgainstMrpPaise).toBe(110000); // ₹1,100.00 savings
  });

  it('Scenario 4: applies percentage discount with integer precision', () => {
    const result = calculatePricing({
      mrpPaise: 500000, // ₹5,000.00
      offerPricePaise: 420000, // ₹4,200.00
      discountType: 'percentage',
      discountValue: 1500, // 15.00%
      quantity: 1,
    });

    // 420,000 * 0.15 = 63,000 paise
    expect(result.discountAmountPaise).toBe(63000);
    expect(result.finalUnitPricePaise).toBe(357000); // ₹3,570.00
    expect(result.lineTotalPaise).toBe(357000);
    expect(result.savingsAgainstMrpPaise).toBe(143000); // ₹1,430.00 savings
  });

  it('Scenario 5: rounds fractional percentage discounts half-up to nearest paise', () => {
    const result = calculatePricing({
      mrpPaise: 500000, // ₹5,000.00
      offerPricePaise: 425500, // ₹4,255.00
      discountType: 'percentage',
      discountValue: 1250, // 12.50%
      quantity: 1,
    });

    // 425,500 * 0.125 = 53,187.5 paise -> rounds half-up to 53,188 paise (₹531.88)
    expect(result.discountAmountPaise).toBe(53188);
    expect(result.finalUnitPricePaise).toBe(372312); // ₹3,723.12
    expect(result.lineTotalPaise).toBe(372312);
  });

  it('Scenario 6: calculates line totals and aggregate savings for quantities > 1', () => {
    const result = calculatePricing({
      mrpPaise: 500000,
      offerPricePaise: 420000,
      discountType: 'fixed',
      discountValue: 20000, // ₹200.00 -> unit: ₹4,000.00
      quantity: 5,
    });

    expect(result.finalUnitPricePaise).toBe(400000);
    expect(result.lineTotalPaise).toBe(2000000); // ₹20,000.00
    expect(result.savingsAgainstMrpPaise).toBe(500000); // ₹1,000.00 * 5 = ₹5,000.00
  });

  it('Scenario 7: supports unpriced/zero MRP items where offer price is direct', () => {
    const result = calculatePricing({
      mrpPaise: 0,
      offerPricePaise: 150000, // ₹1,500.00
      discountType: 'none',
      discountValue: 0,
      quantity: 2,
    });

    expect(result.finalUnitPricePaise).toBe(150000);
    expect(result.lineTotalPaise).toBe(300000);
    expect(result.savingsAgainstMrpPaise).toBe(0);
  });

  it('Scenario 8: rejects contradictory inputs with descriptive Zod errors', () => {
    // Offer Price exceeds MRP
    expect(() =>
      calculatePricing({
        mrpPaise: 100000,
        offerPricePaise: 120000,
        discountType: 'none',
        discountValue: 0,
        quantity: 1,
      }),
    ).toThrow('Offer price cannot exceed MRP');

    // Fixed discount exceeds offer price
    expect(() =>
      calculatePricing({
        mrpPaise: 100000,
        offerPricePaise: 80000,
        discountType: 'fixed',
        discountValue: 90000,
        quantity: 1,
      }),
    ).toThrow('Fixed discount amount cannot exceed offer price');

    // Percentage discount exceeds 100%
    expect(() =>
      calculatePricing({
        mrpPaise: 100000,
        offerPricePaise: 80000,
        discountType: 'percentage',
        discountValue: 10001,
        quantity: 1,
      }),
    ).toThrow('Percentage discount cannot exceed 100%');

    // Discount value > 0 when discount type is 'none'
    expect(() =>
      calculatePricing({
        mrpPaise: 100000,
        offerPricePaise: 80000,
        discountType: 'none',
        discountValue: 500,
        quantity: 1,
      }),
    ).toThrow('Discount value must be 0 when discount type is none');
  });
});

describe('Quotation Tax Preference Schema & Display Constants', () => {
  it('validates quotation tax preference schema', () => {
    expect(QuotationTaxPreferenceSchema.parse({ isTaxInclusive: true })).toEqual({
      isTaxInclusive: true,
    });

    expect(QuotationTaxPreferenceSchema.parse({ isTaxInclusive: false })).toEqual({
      isTaxInclusive: false,
    });

    expect(() => QuotationTaxPreferenceSchema.parse({ isTaxInclusive: 'yes' })).toThrow();
  });

  it('verifies exact required quotation tax display labels and notes', () => {
    expect(TAX_INCLUSIVE_LABEL).toBe('Tax Inclusive');
    expect(TAX_INCLUSIVE_NOTE).toBe('Applicable taxes are included in this estimate.');
    expect(TAX_EXCLUSIVE_LABEL).toBe('Taxes Extra');
    expect(TAX_EXCLUSIVE_NOTE).toBe('Applicable taxes will be charged at the time of billing.');
  });
});
