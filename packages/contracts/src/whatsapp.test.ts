import { describe, expect, it } from 'vitest';
import {
  SendWhatsAppMessageRequestSchema,
  UpdateWhatsAppConfigRequestSchema,
  WhatsAppConfigSchema,
  WhatsAppMessageListItemSchema,
} from './whatsapp.js';

describe('WhatsApp Contracts', () => {
  it('validates a complete WhatsAppConfig', () => {
    const valid = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      enabled: true,
      phoneNumberId: '1092837465',
      wabaId: '9876543210',
      verifiedNumber: '+919876543210',
      apiVersion: 'v20.0',
      webhookUrl: 'https://api.palnadu.dev/api/v1/whatsapp/webhook',
      verifyToken: 'secret_verify_token_123',
      humanHandoverEnabled: true,
      hasAccessToken: true,
      hasAppSecret: true,
      updatedAt: new Date().toISOString(),
    };
    const parsed = WhatsAppConfigSchema.parse(valid);
    expect(parsed.enabled).toBe(true);
    expect(parsed.phoneNumberId).toBe('1092837465');
  });

  it('validates partial update request', () => {
    const update = {
      enabled: false,
      accessToken: 'EAABw...',
      verifyToken: 'new_token',
    };
    const parsed = UpdateWhatsAppConfigRequestSchema.parse(update);
    expect(parsed.enabled).toBe(false);
    expect(parsed.accessToken).toBe('EAABw...');
  });

  it('validates send message request', () => {
    const req = {
      to: '+919988776655',
      type: 'text' as const,
      text: 'Your quotation QT-001 is ready.',
    };
    const parsed = SendWhatsAppMessageRequestSchema.parse(req);
    expect(parsed.to).toBe('+919988776655');
    expect(parsed.templateLanguage).toBe('en');
  });

  it('validates WhatsApp message list item', () => {
    const item = {
      id: 'a11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      wamid: 'wamid.HBgLMzk...',
      direction: 'inbound' as const,
      fromNumber: '+919876543210',
      toNumber: '+911234567890',
      messageType: 'text',
      contentSummary: 'Hi, I need quotation for bulk pipes',
      status: 'received' as const,
      createdAt: new Date().toISOString(),
    };
    const parsed = WhatsAppMessageListItemSchema.parse(item);
    expect(parsed.direction).toBe('inbound');
    expect(parsed.status).toBe('received');
  });
});
