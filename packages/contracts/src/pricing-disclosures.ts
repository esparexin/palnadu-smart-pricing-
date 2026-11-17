export const PRICING_DISCLOSURES = {
  PRIMARY:
    'All displayed prices are indicative estimates/quotation prices and may vary at the time of purchase depending on prevailing market conditions, supplier pricing and product availability. Additional offers or discounts may sometimes be available during the purchase process. We follow a market-challenging quotation process to help customers explore competitive offers. Final pricing and commercial terms will be confirmed during quotation.',
  COMPACT:
    'Indicative quotation price. Actual purchase price may vary. Additional offers may be available at purchase.',
  BASKET:
    'Your quotation is an estimate based on the available pricing information. Final pricing may change at the time of purchase, and additional offers may be available. Our team will confirm the applicable commercial terms.',
  WHATSAPP_NOTE:
    'All communicated prices are indicative estimate/quotation prices and may vary at the time of purchase depending on prevailing market conditions, supplier pricing and product availability. Additional offers or discounts may sometimes be available during the purchase process. Final pricing and commercial terms will be confirmed during quotation discussion. This is an automated quotation estimate, not a confirmed purchase or order.',
} as const;

export type PricingDisclosureKey = keyof typeof PRICING_DISCLOSURES;
