import { describe, expect, it } from 'vitest';
import { CompanyProfileSchema, UpdateCompanyProfileSchema } from './company-settings.js';

describe('company-settings contracts', () => {
  it('validates a complete company profile', () => {
    const valid = {
      companyName: 'Palnadu Solar & Electricals Ltd',
      tradingName: 'Palnadu Smart Systems',
      registeredAddress: 'Door No. 4-12, Main Bazaar, Narasaraopet, Palnadu, AP 522601',
      contactEmail: 'contact@palnadusmart.in',
      contactPhone: '+91 8647 222333',
      websiteUrl: 'https://palnadusmart.in',
      gstin: '37AAAAA0000A1Z5',
      logoUrl: 'https://palnadusmart.in/logo.png',
      quotationTerms:
        '1. Quotation valid for 15 days.\n2. Payment: 50% advance, balance on dispatch.',
      bankDetails: 'Bank: SBI, A/C: 1234567890, IFSC: SBIN0001234',
    };

    const parsed = CompanyProfileSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates a minimal company profile with required companyName only', () => {
    const minimal = {
      companyName: 'Palnadu Solar',
    };

    const parsed = CompanyProfileSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.companyName).toBe('Palnadu Solar');
      expect(parsed.data.gstin).toBeUndefined();
    }
  });

  it('rejects an empty companyName', () => {
    const invalid = {
      companyName: '   ',
    };

    const parsed = CompanyProfileSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates update payload with partial fields', () => {
    const update = {
      gstin: '37BBBBB1111B2Z6',
      contactPhone: '+91 99999 88888',
    };

    const parsed = UpdateCompanyProfileSchema.safeParse(update);
    expect(parsed.success).toBe(true);
  });
});
