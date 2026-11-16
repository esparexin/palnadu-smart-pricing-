import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import type {
  AdminQuotationDetail,
  AdminQuotationListQuery,
  CustomerEnquiryCreate,
  QuotationLineItemDto,
  QuotationStatus,
} from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { calculateQuotationLines, generateReferenceNumber } from './quotation-calculation.js';
import { products, productVariants, quotationItems, quotationRequests } from './schema.js';

export { generateReferenceNumber };

export async function createQuotationEnquiry(
  db: DbExecutor,
  input: CustomerEnquiryCreate,
): Promise<typeof quotationRequests.$inferSelect> {
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(quotationRequests)
      .where(eq(quotationRequests.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      return existing;
    }
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const productRows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, 'published')));

  const productMap = new Map(productRows.map((p) => [p.id, p]));

  const variantIds = input.items.map((i) => i.variantId).filter(Boolean) as string[];
  const variantRows =
    variantIds.length > 0
      ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
      : [];
  const variantMap = new Map(variantRows.map((v) => [v.id, v]));

  const calculatedLines = calculateQuotationLines(input.items, productMap, variantMap);

  const subtotalPaise = calculatedLines.reduce((acc, line) => acc + line.lineTotalPaise, 0);
  const discountTotalPaise = calculatedLines.reduce(
    (acc, line) => acc + line.discountAmountPaise * line.quantity,
    0,
  );
  // Authoritative financial rule: discountTotalPaise is informational only, NEVER deducted again
  const grandTotalPaise = subtotalPaise;

  const [created] = await db
    .insert(quotationRequests)
    .values({
      referenceNumber: generateReferenceNumber(),
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      customerNotes: input.customerNotes?.trim() || null,
      status: 'submitted',
      idempotencyKey: input.idempotencyKey?.trim() || null,
      subtotalPaise,
      discountTotalPaise,
      grandTotalPaise,
    })
    .returning();

  await db.insert(quotationItems).values(
    calculatedLines.map((line) => ({
      ...line,
      quotationId: created.id,
    })),
  );

  return created;
}

export async function findQuotationById(
  db: DbExecutor,
  id: string,
): Promise<AdminQuotationDetail | null> {
  const [quotation] = await db
    .select()
    .from(quotationRequests)
    .where(eq(quotationRequests.id, id))
    .limit(1);

  if (!quotation) return null;

  const itemRows = await db
    .select({
      item: quotationItems,
      productName: products.name,
      productSlug: products.slug,
      variantModel: productVariants.model,
      sku: productVariants.sku,
    })
    .from(quotationItems)
    .innerJoin(products, eq(quotationItems.productId, products.id))
    .leftJoin(productVariants, eq(quotationItems.variantId, productVariants.id))
    .where(eq(quotationItems.quotationId, id))
    .orderBy(quotationItems.createdAt);

  const items: QuotationLineItemDto[] = itemRows.map(
    ({ item, productName, productSlug, variantModel, sku }) => ({
      id: item.id,
      productId: item.productId,
      productName,
      productSlug,
      variantId: item.variantId,
      variantModel: variantModel ?? null,
      sku: sku ?? null,
      unit: item.unit,
      quantity: item.quantity,
      mrpPaise: item.mrpPaise,
      offerPricePaise: item.offerPricePaise,
      discountType: item.discountType as QuotationLineItemDto['discountType'],
      discountValue: item.discountValue,
      discountAmountPaise: item.discountAmountPaise,
      finalUnitPricePaise: item.finalUnitPricePaise,
      lineTotalPaise: item.lineTotalPaise,
    }),
  );

  return {
    id: quotation.id,
    referenceNumber: quotation.referenceNumber,
    customerName: quotation.customerName,
    customerEmail: quotation.customerEmail,
    customerPhone: quotation.customerPhone,
    customerNotes: quotation.customerNotes,
    status: quotation.status as QuotationStatus,
    subtotalPaise: quotation.subtotalPaise,
    discountTotalPaise: quotation.discountTotalPaise,
    grandTotalPaise: quotation.grandTotalPaise,
    items,
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
  };
}

export async function listQuotations(
  db: DbExecutor,
  query: AdminQuotationListQuery,
): Promise<{ items: AdminQuotationDetail[]; total: number }> {
  const { limit, offset, q, status } = query;
  const conditions = [];

  if (status) conditions.push(eq(quotationRequests.status, status));
  if (q) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(quotationRequests.referenceNumber, term),
        ilike(quotationRequests.customerName, term),
        ilike(quotationRequests.customerPhone, term),
        ilike(quotationRequests.customerEmail, term),
      ),
    );
  }

  const filter = conditions.length > 0 ? and(...conditions) : undefined;
  const [requestRows, totalResult] = await Promise.all([
    db
      .select()
      .from(quotationRequests)
      .where(filter)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(quotationRequests.createdAt)),
    db.select({ count: count() }).from(quotationRequests).where(filter),
  ]);

  const total = totalResult[0]?.count ?? 0;
  if (requestRows.length === 0) {
    return { items: [], total };
  }

  const items = await Promise.all(requestRows.map((r) => findQuotationById(db, r.id)));
  return {
    items: items.filter(Boolean) as AdminQuotationDetail[],
    total,
  };
}

export async function updateQuotationStatus(
  db: DbExecutor,
  id: string,
  status: QuotationStatus,
): Promise<AdminQuotationDetail | null> {
  const [updated] = await db
    .update(quotationRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(quotationRequests.id, id))
    .returning();

  if (!updated) return null;
  return findQuotationById(db, id);
}
