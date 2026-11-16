import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { DatabaseClient } from '@palnadu/persistence';
import { encryptSecret } from '@palnadu/persistence';
import { parseServerConfig } from '@palnadu/server-config';
import { buildServer } from './server.js';

describe('WhatsApp API Endpoints', () => {
  const config = parseServerConfig({
    DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
  });

  const createMockDb = (overrides?: Record<string, unknown>) => {
    const configRow = {
      id: 'default',
      enabled: true,
      phoneNumberId: '1234567890',
      wabaId: '0987654321',
      verifiedNumber: '+919876543210',
      apiVersion: 'v20.0',
      accessTokenEncrypted: null,
      appSecretEncrypted: encryptSecret('my_meta_app_secret_123'),
      verifyToken: 'my_meta_verify_token_123',
      humanHandoverEnabled: true,
      updatedAt: new Date(),
      ...overrides,
    };

    const messages: unknown[] = [];

    const db = {
      select: () => ({
        from: (table: { [key: symbol]: string }) => ({
          where: (_clause?: unknown) => {
            const tableName = table[Symbol.for('drizzle:Name')];
            if (tableName === 'whatsapp_configurations') return [configRow];
            if (tableName === 'whatsapp_opt_outs') return [];
            return [];
          },
          orderBy: () => ({
            limit: () => ({
              offset: () => messages,
            }),
          }),
        }),
      }),
      insert: () => ({
        values: (val: Record<string, unknown>) => ({
          onConflictDoNothing: () => Promise.resolve(),
          returning: () => Promise.resolve([{ ...val, id: 'msg-123' }]),
        }),
      }),
      update: () => ({
        set: (_vals: Record<string, unknown>) => ({
          where: () => {
            const res = Promise.resolve({ count: 1 }) as unknown as Record<string, unknown>;
            res.returning = () => Promise.resolve([{ quotationId: null }]);
            return res;
          },
        }),
      }),
      delete: () => ({
        where: () => Promise.resolve(),
      }),
    };

    return {
      db: db as unknown,
      ping: async () => {},
      close: async () => {},
    } as unknown as DatabaseClient;
  };

  it('verifies Meta webhook challenge when verify_token matches', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_meta_verify_token_123&hub.challenge=test_challenge_abc_123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('test_challenge_abc_123');
  });

  it('rejects Meta webhook challenge when verify_token does not match or is default', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const mismatch = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123',
    });
    expect(mismatch.statusCode).toBe(403);

    const defaultDb = createMockDb({ verifyToken: 'palnadu_verify_token_default' });
    const defaultApp = await buildServer({ config, database: defaultDb });
    const defaultRes = await defaultApp.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=palnadu_verify_token_default&hub.challenge=123',
    });
    expect(defaultRes.statusCode).toBe(403);
  });

  it('rejects inbound webhook when signature is missing or invalid', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const missingSig = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
    });
    expect(missingSig.statusCode).toBe(401);

    const invalidSig = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256':
          'sha256=invalid0000000000000000000000000000000000000000000000000000000000',
      },
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
    });
    expect(invalidSig.statusCode).toBe(401);
  });

  it('processes inbound webhook message event successfully with valid signature', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '0987654321',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '+911234567890' },
                messages: [
                  {
                    from: '+919876543210',
                    id: 'wamid.HBgLTest123',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Hello, need quotation' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac('sha256', 'my_meta_app_secret_123').update(rawBody).digest('hex')}`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: rawBody,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('processes delivery status receipt updates with valid signature', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '0987654321',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.HBgLTest123',
                    status: 'delivered',
                    timestamp: '1700000010',
                    recipient_id: '+919876543210',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac('sha256', 'my_meta_app_secret_123').update(rawBody).digest('hex')}`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: rawBody,
    });

    expect(response.statusCode).toBe(200);
  });
});
