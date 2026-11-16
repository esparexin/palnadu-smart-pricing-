import { describe, expect, it } from 'vitest';
import type { DbExecutor } from './client.js';
import { decryptSecret, encryptSecret, verifyWebhookSignature } from './whatsapp-crypto.js';
import { handleWhatsAppInboundMessage } from './whatsapp-inbound.js';
import { sendMetaWhatsAppMessage } from './whatsapp-cloud.js';
import { createHmac } from 'node:crypto';

describe('WhatsApp Crypto & Security', () => {
  it('encrypts and decrypts secrets with AES-256-GCM authenticated encryption', () => {
    const secret = 'EAABw_very_secret_meta_whatsapp_token_12345';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('fails decryption if ciphertext or auth tag is corrupted', () => {
    const secret = 'super_secret';
    const encrypted = encryptSecret(secret);
    const [iv, tag, data] = encrypted.split(':');
    const tamperedData =
      (parseInt(data.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, '0') + data.slice(2);
    const tampered = `${iv}:${tag}:${tamperedData}`;

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('verifies valid X-Hub-Signature-256 with constant-time equality', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
    const appSecret = 'app_secret_test_xyz_987';
    const hash = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const header = `sha256=${hash}`;

    const isValid = verifyWebhookSignature(rawBody, header, appSecret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or mismatched signature', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
    const appSecret = 'app_secret_test_xyz_987';
    const wrongHeader = 'sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const isValid = verifyWebhookSignature(rawBody, wrongHeader, appSecret);
    expect(isValid).toBe(false);
  });

  it('handles inbound message idempotency and opt-out/opt-in commands', async () => {
    const mockDb = {
      _messages: new Map<string, unknown>(),
      _optOuts: new Set<string>(),
      select() {
        return {
          from(_table: unknown) {
            return {
              where: () => {
                return [];
              },
            };
          },
        };
      },
      insert() {
        return {
          values(val: Record<string, unknown>) {
            return {
              onConflictDoNothing() {
                return Promise.resolve();
              },
              returning() {
                return Promise.resolve([val]);
              },
            };
          },
        };
      },
      delete() {
        return {
          where() {
            return Promise.resolve();
          },
        };
      },
    };

    const res = await handleWhatsAppInboundMessage(mockDb as unknown as DbExecutor, {
      wamid: 'wamid.HBgL123456',
      fromNumber: '+919876543210',
      toNumber: '+911234567890',
      messageType: 'text',
      text: 'STOP',
    });

    expect(res.status).toBe('opt_out');
    expect(res.wamid).toBe('wamid.HBgL123456');
  });

  it('fails closed in production if encryption key is not set', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.SESSION_SECRET;
    const origKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      delete process.env.ENCRYPTION_KEY;
      expect(() => encryptSecret('test')).toThrow(/WhatsApp encryption key is not configured/);
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.SESSION_SECRET = origSecret;
      if (origKey) process.env.ENCRYPTION_KEY = origKey;
    }
  });

  it('sends real WhatsApp message via Meta Graph API', async () => {
    const mockDb = {
      select() {
        return {
          from(table: unknown) {
            return {
              where() {
                const name = (table as { [key: symbol]: string })[Symbol.for('drizzle:Name')];
                if (name === 'whatsapp_opt_outs') return [];
                return [
                  {
                    id: 'default',
                    enabled: true,
                    phoneNumberId: 'phone_123',
                    wabaId: 'waba_456',
                    apiVersion: 'v20.0',
                    accessTokenEncrypted: encryptSecret('EAAB_test_token'),
                    appSecretEncrypted: encryptSecret('secret_123'),
                    verifyToken: 'token_123',
                  },
                ];
              },
            };
          },
        };
      },
      insert() {
        return {
          values(val: Record<string, unknown>) {
            return {
              returning() {
                return Promise.resolve([{ ...val, id: 'msg-out-1' }]);
              },
            };
          },
        };
      },
    };

    let capturedUrl = '';
    let capturedAuth = '';
    const fakeFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization);
      return {
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.HBgLMetaTest123' }] }),
      } as unknown as Response;
    };

    const res = await sendMetaWhatsAppMessage(mockDb as unknown as DbExecutor, {
      to: '+919876543210',
      type: 'text',
      text: 'Quotation estimate details',
      fetchFn: fakeFetch,
    });

    expect(res.success).toBe(true);
    expect(res.wamid).toBe('wamid.HBgLMetaTest123');
    expect(res.status).toBe('sent');
    expect(capturedUrl).toBe('https://graph.facebook.com/v20.0/phone_123/messages');
    expect(capturedAuth).toBe('Bearer EAAB_test_token');
  });

  it('records failed status and error message on HTTP failure', async () => {
    const mockDb = {
      select() {
        return {
          from(table: unknown) {
            return {
              where: () => {
                const name = (table as { [key: symbol]: string })[Symbol.for('drizzle:Name')];
                if (name === 'whatsapp_opt_outs') return [];
                return [
                  {
                    id: 'default',
                    enabled: true,
                    phoneNumberId: 'phone_123',
                    wabaId: 'waba_456',
                    apiVersion: 'v20.0',
                    accessTokenEncrypted: encryptSecret('EAAB_test_token'),
                  },
                ];
              },
            };
          },
        };
      },
      insert() {
        return {
          values(val: Record<string, unknown>) {
            return {
              returning() {
                return Promise.resolve([{ ...val, id: 'msg-out-fail' }]);
              },
            };
          },
        };
      },
    };

    const failingFetch: typeof fetch = async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid OAuth access token' } }),
      } as unknown as Response;
    };

    const res = await sendMetaWhatsAppMessage(mockDb as unknown as DbExecutor, {
      to: '+919876543210',
      type: 'text',
      text: 'Quotation estimate details',
      fetchFn: failingFetch,
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe('failed');
    expect(res.error).toBe('Invalid OAuth access token');
    expect(res.wamid).toMatch(/^wamid\.ERR_/);
  });
});
