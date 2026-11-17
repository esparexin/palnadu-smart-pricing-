import { describe, expect, it } from 'vitest';
import { PRICING_DISCLOSURES } from './pricing-disclosures.js';

describe('Pricing Disclosures', () => {
  it('defines the mandatory primary pricing transparency disclosure', () => {
    expect(PRICING_DISCLOSURES.PRIMARY).toContain(
      'All displayed prices are indicative estimates/quotation prices and may vary at the time of purchase',
    );
    expect(PRICING_DISCLOSURES.PRIMARY).toContain('market-challenging quotation process');
    expect(PRICING_DISCLOSURES.PRIMARY).toContain(
      'Final pricing and commercial terms will be confirmed during quotation.',
    );
  });

  it('defines the compact product card disclosure', () => {
    expect(PRICING_DISCLOSURES.COMPACT).toBe(
      'Indicative quotation price. Actual purchase price may vary. Additional offers may be available at purchase.',
    );
  });

  it('defines the quotation basket disclosure', () => {
    expect(PRICING_DISCLOSURES.BASKET).toBe(
      'Your quotation is an estimate based on the available pricing information. Final pricing may change at the time of purchase, and additional offers may be available. Our team will confirm the applicable commercial terms.',
    );
  });

  it('defines the WhatsApp automation quotation disclosure note', () => {
    expect(PRICING_DISCLOSURES.WHATSAPP_NOTE).toContain(
      'All communicated prices are indicative estimate/quotation prices',
    );
    expect(PRICING_DISCLOSURES.WHATSAPP_NOTE).toContain(
      'automated quotation estimate, not a confirmed purchase or order',
    );
  });

  it('does not contain misleading guaranteed claims', () => {
    const combined = Object.values(PRICING_DISCLOSURES).join(' ').toLowerCase();
    expect(combined).not.toContain('guaranteed lowest');
    expect(combined).not.toContain('fixed final price');
    expect(combined).not.toContain('guaranteed discount');
    expect(combined).not.toContain('cheapest price');
  });
});
