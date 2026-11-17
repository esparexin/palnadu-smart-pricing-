import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AdminQuotationDetailSchema,
  CustomerEnquiryCreateSchema,
  CustomerEnquiryResponseSchema,
  QuotationLineItemDtoSchema,
} from './quotations.js';

describe('Quotation Contracts', () => {
  it('validates CustomerEnquiryCreateSchema with name only (email and phone optional)', () => {
    const valid = CustomerEnquiryCreateSchema.parse({
      customerName: 'Kalyan Medaboina',
      items: [{ productId: randomUUID(), quantity: 2 }],
    });
    expect(valid.customerName).toBe('Kalyan Medaboina');
    expect(valid.customerPhone).toBeUndefined();
    expect(valid.customerEmail).toBeUndefined();
    expect(valid.items[0]?.quantity).toBe(2);

    // Also accepts when optional phone is provided
    const withPhone = CustomerEnquiryCreateSchema.parse({
      customerName: 'Kalyan Medaboina',
      customerPhone: '+919876543210',
      items: [{ productId: randomUUID(), quantity: 2 }],
    });
    expect(withPhone.customerPhone).toBe('+919876543210');

    // Also accepts when optional email is provided
    const withEmail = CustomerEnquiryCreateSchema.parse({
      customerName: 'Kalyan Medaboina',
      customerEmail: 'kalyan@example.com',
      items: [{ productId: randomUUID(), quantity: 2 }],
    });
    expect(withEmail.customerEmail).toBe('kalyan@example.com');

    // Rejects empty customerName
    expect(() =>
      CustomerEnquiryCreateSchema.parse({
        customerName: '   ',
        items: [{ productId: randomUUID(), quantity: 1 }],
      }),
    ).toThrow();

    // Rejects empty items
    expect(() =>
      CustomerEnquiryCreateSchema.parse({
        customerName: 'Kalyan Medaboina',
        items: [],
      }),
    ).toThrow();
  });

  it('validates CustomerEnquiryResponseSchema without exposing pricing', () => {
    const res = CustomerEnquiryResponseSchema.parse({
      referenceNumber: 'ENQ-2026-ABCD1',
      status: 'submitted',
      createdAt: new Date().toISOString(),
    });
    expect(res.referenceNumber).toBe('ENQ-2026-ABCD1');
    expect(res.status).toBe('submitted');

    // Rejects if any pricing is included
    expect(() =>
      CustomerEnquiryResponseSchema.parse({
        ...res,
        grandTotalPaise: 50000,
      }),
    ).toThrow();
  });

  it('validates QuotationLineItemDtoSchema and AdminQuotationDetailSchema', () => {
    const lineItem = QuotationLineItemDtoSchema.parse({
      id: randomUUID(),
      productId: randomUUID(),
      productName: '4MP PTZ Camera',
      productSlug: '4mp-ptz-camera',
      variantId: null,
      variantModel: null,
      sku: 'PTZ-400',
      unit: 'piece',
      quantity: 2,
      mrpPaise: 100000,
      offerPricePaise: 90000,
      discountType: 'percentage',
      discountValue: 1000,
      discountAmountPaise: 9000,
      finalUnitPricePaise: 81000,
      lineTotalPaise: 162000,
    });
    expect(lineItem.finalUnitPricePaise).toBe(81000);
    expect(lineItem.lineTotalPaise).toBe(162000);

    const quotation = AdminQuotationDetailSchema.parse({
      id: randomUUID(),
      referenceNumber: 'ENQ-2026-TEST',
      customerName: 'Enterprise Client',
      customerEmail: 'client@enterprise.com',
      customerPhone: '+919999999999',
      customerNotes: 'Require urgent commercial quote',
      status: 'submitted',
      subtotalPaise: 162000,
      discountTotalPaise: 18000,
      grandTotalPaise: 162000,
      items: [lineItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(quotation.subtotalPaise).toBe(162000);
    expect(quotation.grandTotalPaise).toBe(162000);
  });
});
