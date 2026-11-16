import { z } from 'zod';

export const WhatsAppMessageDirectionSchema = z.enum(['inbound', 'outbound']);
export type WhatsAppMessageDirection = z.infer<typeof WhatsAppMessageDirectionSchema>;

export const WhatsAppMessageStatusSchema = z.enum([
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
]);
export type WhatsAppMessageStatus = z.infer<typeof WhatsAppMessageStatusSchema>;

export const WhatsAppConfigSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
  phoneNumberId: z.string(),
  wabaId: z.string(),
  verifiedNumber: z.string().nullable().optional(),
  apiVersion: z.string().default('v20.0'),
  webhookUrl: z.string(),
  verifyToken: z.string(),
  humanHandoverEnabled: z.boolean().default(true),
  hasAccessToken: z.boolean(),
  hasAppSecret: z.boolean(),
  updatedAt: z.string(),
});
export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

export const UpdateWhatsAppConfigRequestSchema = z.object({
  enabled: z.boolean().optional(),
  phoneNumberId: z.string().max(100).optional(),
  wabaId: z.string().max(100).optional(),
  verifiedNumber: z.string().max(50).optional(),
  apiVersion: z.string().max(20).optional(),
  accessToken: z.string().min(1).optional(),
  appSecret: z.string().min(1).optional(),
  verifyToken: z.string().min(1).max(255).optional(),
  humanHandoverEnabled: z.boolean().optional(),
});
export type UpdateWhatsAppConfigRequest = z.infer<typeof UpdateWhatsAppConfigRequestSchema>;

export const WhatsAppMessageListItemSchema = z.object({
  id: z.string().uuid(),
  wamid: z.string(),
  direction: WhatsAppMessageDirectionSchema,
  fromNumber: z.string(),
  toNumber: z.string(),
  messageType: z.string(),
  contentSummary: z.string(),
  status: WhatsAppMessageStatusSchema,
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type WhatsAppMessageListItem = z.infer<typeof WhatsAppMessageListItemSchema>;

export const SendWhatsAppMessageRequestSchema = z.object({
  to: z.string().min(8).max(30),
  type: z.enum(['text', 'template']),
  text: z.string().max(4096).optional(),
  templateName: z.string().max(255).optional(),
  templateLanguage: z.string().max(10).default('en').optional(),
});
export type SendWhatsAppMessageRequest = z.infer<typeof SendWhatsAppMessageRequestSchema>;

export const WhatsAppOptOutListItemSchema = z.object({
  phoneNumber: z.string(),
  reason: z.string().nullable().optional(),
  optedOutAt: z.string(),
});
export type WhatsAppOptOutListItem = z.infer<typeof WhatsAppOptOutListItemSchema>;
