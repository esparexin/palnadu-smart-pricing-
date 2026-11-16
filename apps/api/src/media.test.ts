import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import { MemoryStorageAdapter, type DatabaseClient } from '@palnadu/persistence';
import { buildServer, SESSION_COOKIE_NAME } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
});

function createMockDatabase(overrides: Partial<DatabaseClient> = {}): DatabaseClient {
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn(),
      execute: vi.fn(),
      insert: vi.fn(),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as DatabaseClient['db'],
    ...overrides,
  };
}

const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function mockAuthSession(mockDb: DatabaseClient, sessionId = randomUUID(), userId = randomUUID()) {
  vi.spyOn(mockDb.db, 'select').mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              session: { id: sessionId, userId, expiresAt: new Date(Date.now() + 100000) },
              user: {
                id: userId,
                email: 'admin@palnadusmart.in',
                name: 'Admin',
                status: 'active',
                permissions: ['catalogue:manage', 'admin:manage'],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          ]),
        }),
      }),
    }),
  } as never);
}

describe('Media Upload API', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('rejects unauthenticated requests to /media/upload with 401', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/media/upload',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated requests to /products/:id/images/upload with 401', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${randomUUID()}/images/upload`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects upload when no file is attached in multipart form', async () => {
    const storage = new MemoryStorageAdapter();
    const mockDb = createMockDatabase();
    mockAuthSession(mockDb);

    const server = await buildServer({ config, database: mockDb, storage });
    servers.push(server);

    const boundary = '----TestBoundary123';
    const formPayload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="field"\r\n\r\nvalue\r\n--${boundary}--\r\n`,
    );

    const signedCookie = server.signCookie('valid-session-token');
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/media/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: formPayload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });

  it('processes and uploads valid image file to storage', async () => {
    const storage = new MemoryStorageAdapter();
    const mockDb = createMockDatabase();
    mockAuthSession(mockDb);

    const server = await buildServer({ config, database: mockDb, storage });
    servers.push(server);

    const boundary = '----TestBoundary456';
    const formPayload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      SAMPLE_PNG_BUFFER,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const signedCookie = server.signCookie('valid-session-token');
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/media/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: formPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.url).toBeDefined();
    expect(body.key).toMatch(/^products\/\d{8}\//);
    expect(body.contentType).toBe('image/webp');
    expect(body.width).toBe(1);
    expect(body.height).toBe(1);
  });

  it('uploads product image and binds to product record', async () => {
    const productId = randomUUID();
    const storage = new MemoryStorageAdapter();

    const mockDb = createMockDatabase();
    mockAuthSession(mockDb);

    vi.spyOn(mockDb.db, 'insert').mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: randomUUID(),
            productId,
            url: `https://storage.local/products/${productId}/test.webp`,
            altText: 'Sample camera photo',
            sortOrder: 0,
            isPrimary: true,
            variantId: null,
            rightsStatus: 'manual_upload',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    } as never);

    const server = await buildServer({ config, database: mockDb, storage });
    servers.push(server);

    const boundary = '----TestBoundaryProd';
    const formPayload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      SAMPLE_PNG_BUFFER,
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="altText"\r\n\r\nSample camera photo`,
      ),
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="isPrimary"\r\n\r\ntrue`,
      ),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const signedCookie = server.signCookie('valid-session-token');
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images/upload`,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: formPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.productId).toBe(productId);
    expect(body.isPrimary).toBe(true);
    expect(body.altText).toBe('Sample camera photo');
  });
});
