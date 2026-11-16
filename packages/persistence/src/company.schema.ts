import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const companySettings = pgTable('company_settings', {
  id: text('id').primaryKey().default('default'),
  companyName: text('company_name').notNull().default('Palnadu Solar & Electricals'),
  tradingName: text('trading_name'),
  registeredAddress: text('registered_address'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  websiteUrl: text('website_url'),
  gstin: text('gstin'),
  logoUrl: text('logo_url'),
  quotationTerms: text('quotation_terms'),
  bankDetails: text('bank_details'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
