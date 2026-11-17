import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { quotationRequests } from './quotation.schema.js';

export const whatsappConfigurations = pgTable('whatsapp_configurations', {
  id: text('id').primaryKey().default('default'),
  enabled: boolean('enabled').notNull().default(false),
  phoneNumberId: text('phone_number_id').notNull().default(''),
  wabaId: text('waba_id').notNull().default(''),
  verifiedNumber: text('verified_number'),
  apiVersion: text('api_version').notNull().default('v20.0'),
  accessTokenEncrypted: text('access_token_encrypted'),
  appSecretEncrypted: text('app_secret_encrypted'),
  verifyToken: text('verify_token').notNull().default(''),
  humanHandoverEnabled: boolean('human_handover_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const whatsappMessages = pgTable('whatsapp_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  quotationId: uuid('quotation_id').references(() => quotationRequests.id, {
    onDelete: 'set null',
  }),
  wamid: text('wamid').notNull().unique(),
  direction: text('direction').notNull(),
  fromNumber: text('from_number').notNull(),
  toNumber: text('to_number').notNull(),
  messageType: text('message_type').notNull(),
  contentSummary: text('content_summary').notNull(),
  rawPayload: jsonb('raw_payload'),
  status: text('status').notNull().default('received'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const whatsappOptOuts = pgTable('whatsapp_opt_outs', {
  phoneNumber: text('phone_number').primaryKey(),
  reason: text('reason'),
  optedOutAt: timestamp('opted_out_at', { withTimezone: true }).defaultNow().notNull(),
});
