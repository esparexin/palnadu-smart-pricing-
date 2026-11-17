import { describe, expect, it } from 'vitest';
import type { AdminQuotationDetail } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import {
  dispatchQuotationWhatsAppEstimate,
  formatQuotationEstimateText,
} from './quotation-delivery.js';
import { encryptSecret } from './whatsapp-crypto.js';

describe('Quotation WhatsApp Delivery Pipeline', () => {
  const sampleQuotation: AdminQuotationDetail = {
    id: '11111111-1111-1111-1111-111111111111',
    referenceNumber: 'EST-202611-0001',
    customerName: 'Srikanth Rao',
    customerEmail: null,
    customerPhone: '+919876543210',
    customerNotes: 'Deliver estimate promptly',
    status: 'submitted',
    deliveryStatus: 'not_applicable',
    deliveryAttempts: 0,
    subtotalPaise: 100000,
    discountTotalPaise: 10000,
    grandTotalPaise: 90000,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Commercial Rice Mill 5HP',
        productSlug: 'commercial-rice-mill-5hp',
        variantId: null,
        variantModel: 'Model X',
        sku: 'MILL-5HP',
        unit: 'unit',
        quantity: 1,
        mrpPaise: 100000,
        offerPricePaise: 90000,
        discountType: 'fixed',
        discountValue: 10000,
        discountAmountPaise: 10000,
        finalUnitPricePaise: 90000,
        lineTotalPaise: 90000,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('formats itemised quotation estimate text without order terminology', () => {
    const text = formatQuotationEstimateText(sampleQuotation);
    expect(text).toContain('Quotation Estimate #EST-202611-0001');
    expect(text).toContain('Commercial Rice Mill 5HP (Model X) x1 unit');
    expect(text).toContain('Subtotal: ₹1000.00');
    expect(text).toContain('Discount: -₹100.00');
    expect(text).toContain('Estimated Total: ₹900.00');
    expect(text).toContain('automated quotation estimate, not a confirmed purchase or order');
    expect(text.toLowerCase()).not.toContain('checkout');
    expect(text.toLowerCase()).not.toContain('order confirmed');
  });

  it('sets not_applicable if customer has no phone number', async () => {
    let updatedStatus = '';
    const mockDb = {
      select() {
        return {
          from(table: unknown) {
            return {
              innerJoin() {
                return {
                  leftJoin() {
                    return {
                      where() {
                        return { orderBy: () => [] };
                      },
                    };
                  },
                };
              },
              where() {
                const name = (table as { [key: symbol]: string })[Symbol.for('drizzle:Name')];
                const data =
                  name === 'quotation_requests'
                    ? [
                        {
                          ...sampleQuotation,
                          customerPhone: null,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        },
                      ]
                    : [];
                return {
                  limit: () => data,
                  then: (resolve: (v: unknown) => void) => resolve(data),
                };
              },
            };
          },
        };
      },
      update() {
        return {
          set(val: { deliveryStatus?: string }) {
            if (val.deliveryStatus) updatedStatus = val.deliveryStatus;
            return {
              where: () => Promise.resolve({ count: 1 }),
            };
          },
        };
      },
    };

    const res = await dispatchQuotationWhatsAppEstimate(
      mockDb as unknown as DbExecutor,
      sampleQuotation.id,
    );
    expect(res.success).toBe(true);
    expect(res.deliveryStatus).toBe('not_applicable');
    expect(updatedStatus).toBe('not_applicable');
  });

  it('dispatches via WhatsApp and updates deliveryStatus to sent with provider ID', async () => {
    let updatedStatus = '';
    let updatedProviderId = '';

    const mockDb = {
      select() {
        return {
          from(table: unknown) {
            return {
              innerJoin() {
                return {
                  leftJoin() {
                    return {
                      where() {
                        return {
                          orderBy: () => [
                            {
                              item: sampleQuotation.items[0],
                              productName: 'Commercial Rice Mill 5HP',
                              productSlug: 'commercial-rice-mill-5hp',
                              variantModel: 'Model X',
                              sku: 'MILL-5HP',
                            },
                          ],
                        };
                      },
                    };
                  },
                };
              },
              where() {
                const name = (table as { [key: symbol]: string })[Symbol.for('drizzle:Name')];
                let data: unknown[] = [];
                if (name === 'quotation_requests') {
                  data = [{ ...sampleQuotation, createdAt: new Date(), updatedAt: new Date() }];
                } else if (name === 'whatsapp_configurations') {
                  data = [
                    {
                      id: 'default',
                      enabled: true,
                      phoneNumberId: 'phone_123',
                      apiVersion: 'v20.0',
                      accessTokenEncrypted: encryptSecret('EAAB_test_token'),
                    },
                  ];
                }
                return {
                  limit: () => data,
                  then: (resolve: (v: unknown) => void) => resolve(data),
                };
              },
            };
          },
        };
      },
      insert() {
        return {
          values(val: Record<string, unknown>) {
            return {
              returning: () => Promise.resolve([{ ...val, id: 'msg-out-1' }]),
            };
          },
        };
      },
      update() {
        return {
          set(val: { deliveryStatus?: string; deliveryProviderId?: string }) {
            if (val.deliveryStatus) updatedStatus = val.deliveryStatus;
            if (val.deliveryProviderId) updatedProviderId = val.deliveryProviderId;
            return {
              where: () => Promise.resolve({ count: 1 }),
            };
          },
        };
      },
    };

    const fakeFetch: typeof fetch = async () => {
      return {
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.HBgLAutoQuote999' }] }),
      } as unknown as Response;
    };

    const res = await dispatchQuotationWhatsAppEstimate(
      mockDb as unknown as DbExecutor,
      sampleQuotation.id,
      { fetchFn: fakeFetch },
    );

    expect(res.success).toBe(true);
    expect(res.deliveryStatus).toBe('sent');
    expect(res.wamid).toBe('wamid.HBgLAutoQuote999');
    expect(updatedStatus).toBe('sent');
    expect(updatedProviderId).toBe('wamid.HBgLAutoQuote999');
  });
});
