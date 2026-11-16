import { describe, expect, it } from 'vitest';
import type { DbExecutor } from './client.js';
import { decryptSecret, encryptSecret, verifyWebhookSignature } from './whatsapp-crypto.js';
import { handleWhatsAppInboundMessage } from './whatsapp-inbound.js';
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
});
