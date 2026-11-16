import { count, countDistinct, desc, eq, inArray, sum } from 'drizzle-orm';
import type { FrequentlyRequestedProduct, QuotationMetricsResponse } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { products, quotationItems, quotationRequests } from './schema.js';

export async function getQuotationMetrics(db: DbExecutor): Promise<QuotationMetricsResponse> {
  const [requestsCountRes] = await db
    .select({ count: count(quotationRequests.id) })
    .from(quotationRequests);
  const totalRequestsReceived = Number(requestsCountRes?.count ?? 0);

  const [valueRes] = await db
    .select({
      totalGenerated: count(quotationRequests.id),
      totalValue: sum(quotationRequests.grandTotalPaise),
    })
    .from(quotationRequests)
    .where(inArray(quotationRequests.status, ['submitted', 'draft', 'issued', 'delivered']));

  const totalQuotationsGenerated = Number(valueRes?.totalGenerated ?? 0);
  const totalQuotationValuePaise = Number(valueRes?.totalValue ?? 0);

  const freqRows = await db
    .select({
      productId: quotationItems.productId,
      productName: products.name,
      distinctRequestCount: countDistinct(quotationItems.quotationId),
      totalRequestedQuantity: sum(quotationItems.quantity),
    })
    .from(quotationItems)
    .innerJoin(products, eq(quotationItems.productId, products.id))
    .innerJoin(quotationRequests, eq(quotationItems.quotationId, quotationRequests.id))
    .where(inArray(quotationRequests.status, ['submitted', 'draft', 'issued', 'delivered']))
    .groupBy(quotationItems.productId, products.name)
    .orderBy(desc(countDistinct(quotationItems.quotationId)), desc(sum(quotationItems.quantity)))
    .limit(10);

  const frequentlyRequestedProducts: FrequentlyRequestedProduct[] = freqRows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    distinctRequestCount: Number(r.distinctRequestCount ?? 0),
    totalRequestedQuantity: Number(r.totalRequestedQuantity ?? 0),
  }));

  return {
    totalRequestsReceived,
    totalQuotationsGenerated,
    totalQuotationValuePaise,
    frequentlyRequestedProducts,
  };
}
