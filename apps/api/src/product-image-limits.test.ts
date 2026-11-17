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

function createMockDatabase(): DatabaseClient {
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn(),
      execute: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(async (cb) => {
        const tx = {
          select: vi.fn(),
          execute: vi.fn(),
          insert: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };
        return cb(tx);
      }),
    } as unknown as DatabaseClient['db'],
  };
}

function mockSessionAndQueries(
  mockDb: DatabaseClient,
  options: {
    productId?: string;
    imageId?: string;
    productStatus?: string;
    permissions?: string[];
    isNewProduct?: boolean;
  } = {},
) {
  const sessionId = randomUUID();
  const userId = randomUUID();
  const {
    productId = randomUUID(),
    imageId = randomUUID(),
    productStatus = 'draft',
    permissions = ['catalogue:manage', 'catalogue:read', 'admin:manage'],
    isNewProduct = false,
  } = options;

  let whereCalls = 0;
  vi.spyOn(mockDb.db, 'select').mockImplementation(((_fields?: unknown) => {
    return {
      from: vi.fn((table: unknown) => {
        const tableName = (table as Record<symbol, unknown> | null | undefined)?.[
          Symbol.for('drizzle:Name')
        ];
        return {
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => {
              const emptyJoin: unknown[] = [];
              return Object.assign(Promise.resolve(emptyJoin), {
                limit: vi.fn().mockResolvedValue([
                  {
                    session: { id: sessionId, userId, expiresAt: new Date(Date.now() + 100000) },
                    user: {
                      id: userId,
                      email: 'admin@palnadusmart.in',
                      name: 'Admin',
                      status: 'active',
                      permissions,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  },
                ]),
              });
            }),
          })),
          where: vi.fn(() => {
            if (isNewProduct && whereCalls === 0) {
              whereCalls++;
              // Slug check returns empty (no duplicate)
              const emptyRes: unknown[] = [];
              return Object.assign(Promise.resolve(emptyRes), {
                limit: vi.fn().mockResolvedValue(emptyRes),
                orderBy: vi.fn().mockResolvedValue(emptyRes),
              });
            }
            whereCalls++;

            let rows: unknown[] = [];
            if (tableName === 'products') {
              rows = [
                {
                  id: productId,
                  name: 'Test Product',
                  slug: 'test-product',
                  description: null,
                  model: null,
                  status: productStatus,
                  unit: 'piece',
                  mrpPaise: 100000,
                  offerPricePaise: 90000,
                  discountType: 'none',
                  discountValue: 0,
                  specifications: {},
                  brandId: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ];
            } else if (tableName === 'product_images') {
              rows = [
                {
                  id: imageId,
                  productId,
                  variantId: null,
                  url: 'https://example.com/test.jpg',
                  altText: 'Alt',
                  sortOrder: 0,
                  isPrimary: true,
                  rightsStatus: 'manual_upload',
                  createdAt: new Date(),
                },
              ];
            }

            return Object.assign(Promise.resolve(rows), {
              limit: vi.fn().mockResolvedValue(rows),
              orderBy: vi.fn().mockResolvedValue(rows),
            });
          }),
        };
      }),
    };
  }) as never);
}

const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Product Image Limits (2–8) Lifecycle API', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('rejects unauthorized image operations with 401 or 403', async () => {
    const server = await buildServer({ config, database: createMockDatabase() });
    servers.push(server);

    const productId = randomUUID();
    // 1. Unauthenticated -> 401
    const unauthRes = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images`,
      payload: { url: 'https://example.com/test.jpg' },
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Authenticated but insufficient permission -> 403
    const mockDbReader = createMockDatabase();
    mockSessionAndQueries(mockDbReader, { permissions: ['catalogue:read'] });
    const serverReader = await buildServer({ config, database: mockDbReader });
    servers.push(serverReader);

    const signedCookie = serverReader.signCookie('reader-session');
    const forbiddenRes = await serverReader.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images`,
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: { url: 'https://example.com/test.jpg' },
    });
    expect(forbiddenRes.statusCode).toBe(403);
  });

  it('rejects completed/published product creation with 0 images', async () => {
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb);
    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        name: 'Published Product 0 Images',
        slug: 'pub-0-images',
        unit: 'piece',
        status: 'published',
        mrpPaise: 100000,
        offerPricePaise: 90000,
        images: [],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects completed/published product creation with 1 image', async () => {
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb);
    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        name: 'Published Product 1 Image',
        slug: 'pub-1-image',
        unit: 'piece',
        status: 'published',
        mrpPaise: 100000,
        offerPricePaise: 90000,
        images: [{ url: 'https://example.com/img1.jpg' }],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('accepts completed/published product creation with 2 images', async () => {
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb, { isNewProduct: true });

    const newId = randomUUID();
    (mockDb.db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      id: newId,
      name: 'Published 2 Images',
      slug: 'pub-2-images',
      unit: 'piece',
      status: 'published',
      mrpPaise: 100000,
      offerPricePaise: 90000,
      discountType: 'none',
      discountValue: 0,
      brandId: null,
      description: null,
      model: null,
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    vi.spyOn(mockDb.db, 'execute').mockResolvedValue([] as never);

    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        name: 'Published 2 Images',
        slug: 'pub-2-images',
        unit: 'piece',
        status: 'published',
        mrpPaise: 100000,
        offerPricePaise: 90000,
        images: [{ url: 'https://example.com/img1.jpg' }, { url: 'https://example.com/img2.jpg' }],
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it('rejects creating a product with 9 images (exceeds max 8)', async () => {
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb);
    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const nineImages = Array.from({ length: 9 }, (_, i) => ({
      url: `https://example.com/img${i + 1}.jpg`,
    }));
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/products',
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        name: 'Product 9 Images',
        slug: 'product-9-images',
        unit: 'piece',
        status: 'draft',
        mrpPaise: 100000,
        offerPricePaise: 90000,
        images: nineImages,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects uploading ninth image when product already has 8 images', async () => {
    const productId = randomUUID();
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb, { productId });

    (mockDb.db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
      const tx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 8 }]),
          }),
        }),
      };
      return cb(tx);
    });

    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images`,
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        url: 'https://example.com/ninth-image.jpg',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('IMAGE_LIMIT_EXCEEDED');
  });

  it('rejects deleting image from a 2-image published product', async () => {
    const productId = randomUUID();
    const imageId = randomUUID();
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb, { productId, imageId, productStatus: 'published' });

    (mockDb.db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
      const tx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: imageId, isPrimary: false }]),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ status: 'published' }]),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
          }),
      };
      return cb(tx);
    });

    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/v1/admin/products/${productId}/images/${imageId}`,
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INSUFFICIENT_IMAGES');
  });

  it('allows image replacement without violating the image count invariant', async () => {
    const productId = randomUUID();
    const imageId = randomUUID();
    const storage = new MemoryStorageAdapter();
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb, { productId, imageId });

    const server = await buildServer({ config, database: mockDb, storage });
    servers.push(server);

    const boundary = '----TestBoundaryReplace';
    const formPayload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="replace.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      SAMPLE_PNG_BUFFER,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    vi.spyOn(mockDb.db, 'update').mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: imageId,
              productId,
              url: 'https://storage.example.com/products/replace.webp',
              altText: 'Replaced Camera',
              sortOrder: 0,
              isPrimary: true,
              rightsStatus: 'manual_upload',
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    } as never);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images/${imageId}/replace`,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: formPayload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().url).toContain('https://storage.example.com/products/replace.webp');
  });

  it('allows reordering images and setting primary image via PATCH', async () => {
    const productId = randomUUID();
    const imageId = randomUUID();
    const mockDb = createMockDatabase();
    mockSessionAndQueries(mockDb, { productId, imageId });

    (mockDb.db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
      const tx = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([
                {
                  id: imageId,
                  productId,
                  variantId: null,
                  url: 'https://example.com/img1.jpg',
                  altText: 'Alt',
                  sortOrder: 2,
                  isPrimary: true,
                  rightsStatus: 'manual_upload',
                  createdAt: new Date(),
                },
              ]),
            })),
          })),
        })),
      };
      return cb(tx);
    });

    const server = await buildServer({ config, database: mockDb });
    servers.push(server);

    const signedCookie = server.signCookie('session');
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/admin/products/${productId}/images/${imageId}`,
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE_NAME}=${signedCookie}`,
      },
      payload: {
        sortOrder: 2,
        isPrimary: true,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().sortOrder).toBe(2);
    expect(res.json().isPrimary).toBe(true);
  });
});
