import { describe, expect, it } from 'vitest';
import type { DbExecutor } from './client.js';
import { getQuotationMetrics } from './quotation-metrics.js';

describe('Quotation Metrics & Commercial Summary Aggregations', () => {
  it('aggregates valid requests, generated quotes, non-sales total value and frequently requested products', async () => {
    let selectCalls = 0;
    const mockDb = {
      select() {
        return {
          from() {
            selectCalls++;
            if (selectCalls === 1) {
              // Total requests
              return [{ count: 42 }];
            }
            if (selectCalls === 2) {
              // Total generated & total value
              return {
                where: () => [{ totalGenerated: 35, totalValue: 4500000 }],
              };
            }
            // Frequently requested products
            return {
              innerJoin() {
                return {
                  innerJoin() {
                    return {
                      where() {
                        return {
                          groupBy() {
                            return {
                              orderBy() {
                                return {
                                  limit() {
                                    return [
                                      {
                                        productId: '00000000-0000-0000-0000-000000000001',
                                        productName: 'Heavy Duty Destoner',
                                        distinctRequestCount: 15,
                                        totalRequestedQuantity: 28,
                                      },
                                      {
                                        productId: '00000000-0000-0000-0000-000000000002',
                                        productName: 'Commercial Rice Mill 10HP',
                                        distinctRequestCount: 12,
                                        totalRequestedQuantity: 14,
                                      },
                                    ];
                                  },
                                };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const metrics = await getQuotationMetrics(mockDb as unknown as DbExecutor);

    expect(metrics.totalRequestsReceived).toBe(42);
    expect(metrics.totalQuotationsGenerated).toBe(35);
    expect(metrics.totalQuotationValuePaise).toBe(4500000);
    expect(metrics.frequentlyRequestedProducts).toHaveLength(2);
    expect(metrics.frequentlyRequestedProducts[0].productName).toBe('Heavy Duty Destoner');
    expect(metrics.frequentlyRequestedProducts[0].distinctRequestCount).toBe(15);
    expect(metrics.frequentlyRequestedProducts[0].totalRequestedQuantity).toBe(28);
  });
});
