import { describe, expect, it } from 'vitest';
import type { DatabaseClient } from '@palnadu/persistence';
import { parseServerConfig } from '@palnadu/server-config';
import { buildServer } from './server.js';

describe('WhatsApp API Endpoints', () => {
  const config = parseServerConfig({
    DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
  });

  const createMockDb = () => {
    const configRow = {
      id: 'default',
      enabled: true,
      phoneNumberId: '1234567890',
      wabaId: '0987654321',
      verifiedNumber: '+919876543210',
      apiVersion: 'v20.0',
      accessTokenEncrypted: null,
      appSecretEncrypted: null,
      verifyToken: 'my_meta_verify_token_123',
      humanHandoverEnabled: true,
      updatedAt: new Date(),
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
          where: () => Promise.resolve({ count: 1 }),
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

  it('rejects Meta webhook challenge when verify_token does not match', async () => {
    const database = createMockDb();
    const app = await buildServer({ config, database });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123',
    });

    expect(response.statusCode).toBe(403);
  });

  it('processes inbound webhook message event successfully', async () => {
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

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('processes delivery status receipt updates', async () => {
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

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.statusCode).toBe(200);
  });
});
