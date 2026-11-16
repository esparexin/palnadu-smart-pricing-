import { eq } from 'drizzle-orm';
import type { AdminQuotationDetail, QuotationDeliveryStatus } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { quotationRequests } from './quotation.schema.js';
import { findQuotationById } from './quotations.js';
import { sendMetaWhatsAppMessage } from './whatsapp-cloud.js';
import { isNumberOptedOut } from './whatsapp-service.js';

export function formatQuotationEstimateText(quotation: AdminQuotationDetail): string {
  const formatMoney = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
  const lines: string[] = [
    `Quotation Estimate #${quotation.referenceNumber}`,
    `Dear ${quotation.customerName},`,
    '',
    'Thank you for your quotation request with Palnadu Smart Pricing. Here is your itemised estimate:',
    '',
  ];

  for (const item of quotation.items) {
    const variant = item.variantModel ? ` (${item.variantModel})` : '';
    const itemHeader = `• ${item.productName}${variant} x${item.quantity} ${item.unit}`;
    const discInfo = item.discountAmountPaise > 0 ? `, MRP: ${formatMoney(item.mrpPaise)}` : '';
    const priceDetail = `  Total: ${formatMoney(item.lineTotalPaise)} (Unit: ${formatMoney(item.finalUnitPricePaise)}${discInfo})`;
    lines.push(itemHeader, priceDetail);
  }

  lines.push('');
  lines.push(`Subtotal: ${formatMoney(quotation.subtotalPaise)}`);
  if (quotation.discountTotalPaise > 0) {
    lines.push(`Discount: -${formatMoney(quotation.discountTotalPaise)}`);
  }
  lines.push(`Estimated Total: ${formatMoney(quotation.grandTotalPaise)}`);
  lines.push('');
  lines.push('Note: This is an automated quotation estimate, not a confirmed purchase or order.');

  return lines.join('\n');
}

export interface DispatchQuotationOptions {
  fetchFn?: typeof fetch;
}

export interface DispatchQuotationResult {
  success: boolean;
  deliveryStatus: QuotationDeliveryStatus;
  wamid?: string;
  error?: string;
}

export async function dispatchQuotationWhatsAppEstimate(
  db: DbExecutor,
  quotationId: string,
  options?: DispatchQuotationOptions,
): Promise<DispatchQuotationResult> {
  const quotation = await findQuotationById(db, quotationId);
  if (!quotation) {
    return {
      success: false,
      deliveryStatus: 'failed',
      error: 'Quotation request not found',
    };
  }

  const phone = quotation.customerPhone?.trim();
  if (!phone) {
    await db
      .update(quotationRequests)
      .set({ deliveryStatus: 'not_applicable' })
      .where(eq(quotationRequests.id, quotationId));
    return { success: true, deliveryStatus: 'not_applicable' };
  }

  const optedOut = await isNumberOptedOut(db, phone);
  if (optedOut) {
    const errorMsg = 'Recipient has opted out of WhatsApp messages';
    await db
      .update(quotationRequests)
      .set({
        deliveryStatus: 'failed',
        deliveryError: errorMsg,
        deliveryAttempts: quotation.deliveryAttempts + 1,
        lastDeliveryAttemptAt: new Date(),
      })
      .where(eq(quotationRequests.id, quotationId));
    return { success: false, deliveryStatus: 'failed', error: errorMsg };
  }

  const text = formatQuotationEstimateText(quotation);
  const result = await sendMetaWhatsAppMessage(db, {
    to: phone,
    type: 'text',
    text,
    quotationId,
    fetchFn: options?.fetchFn,
  });

  if (result.success) {
    await db
      .update(quotationRequests)
      .set({
        deliveryStatus: 'sent',
        deliveryProviderId: result.wamid,
        deliveryError: null,
        deliveryAttempts: quotation.deliveryAttempts + 1,
        lastDeliveryAttemptAt: new Date(),
      })
      .where(eq(quotationRequests.id, quotationId));
    return { success: true, deliveryStatus: 'sent', wamid: result.wamid };
  }

  await db
    .update(quotationRequests)
    .set({
      deliveryStatus: 'failed',
      deliveryProviderId: result.wamid || null,
      deliveryError: result.error || 'Delivery failed',
      deliveryAttempts: quotation.deliveryAttempts + 1,
      lastDeliveryAttemptAt: new Date(),
    })
    .where(eq(quotationRequests.id, quotationId));

  return {
    success: false,
    deliveryStatus: 'failed',
    wamid: result.wamid,
    error: result.error,
  };
}
