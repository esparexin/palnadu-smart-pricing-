import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import type { DatabaseClient } from '@palnadu/persistence';
import { buildServer, SESSION_COOKIE_NAME } from './server.js';

const config = parseServerConfig({
  DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
});

function createMockDatabase(): DatabaseClient {
  const retVal = { returning: vi.fn().mockResolvedValue([]) };
  const mockUpdate = { set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(retVal) }) };
  return {
    close: vi.fn(),
    ping: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn(),
      execute: vi.fn(),
      insert: vi.fn(),
      update: vi.fn().mockReturnValue(mockUpdate),
    } as unknown as DatabaseClient['db'],
  };
}

const TEST_ADMIN = {
  id: randomUUID(),
  email: 'admin@palnadusmart.in',
  name: 'Admin',
  status: 'active' as const,
  permissions: ['catalogue:manage', 'admin:manage'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const AUTH_ROW = [
  {
    session: { id: randomUUID(), userId: TEST_ADMIN.id, expiresAt: new Date(Date.now() + 100000) },
    user: TEST_ADMIN,
  },
];

function authChain() {
  return {
    from: () => ({
      innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(AUTH_ROW) }) }),
    }),
  };
}

function reqHeaders(server: { signCookie: (v: string) => string }) {
  return {
    host: 'localhost:3000',
    cookie: `${SESSION_COOKIE_NAME}=${server.signCookie('valid-token')}`,
  };
}

const SAMPLE_CANDIDATE = {
  id: randomUUID(),
  sourceUrl: 'https://images.example.com/cam.jpg',
  matchConfidence: 'exact_model' as const,
  status: 'pending' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Product Image Discovery API', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  async function makeServer(database: DatabaseClient) {
    const s = await buildServer({ config, database });
    servers.push(s);
    return s;
  }

  it('rejects unauthenticated discovery requests with 401', async () => {
    const server = await makeServer(createMockDatabase());
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${randomUUID()}/images/discover`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('runs image discovery for valid product and returns candidates', async () => {
    const productId = randomUUID();
    const mockDb = createMockDatabase();
    const mockSelect = vi.spyOn(mockDb.db, 'select');
    mockSelect.mockImplementationOnce(() => authChain() as never);
    mockSelect.mockImplementationOnce(
      () =>
        ({
          from: () => ({
            where: () => ({
              limit: vi
                .fn()
                .mockResolvedValue([
                  {
                    id: productId,
                    name: 'CP Plus Camera',
                    model: 'CP-UNC-TA41ZL4-MDS',
                    brandId: null,
                  },
                ]),
            }),
          }),
        }) as never,
    );

    vi.spyOn(mockDb.db, 'insert').mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...SAMPLE_CANDIDATE, productId }]),
      }),
    } as never);

    const server = await makeServer(mockDb);
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/images/discover`,
      headers: reqHeaders(server),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].matchConfidence).toBe('exact_model');
  });

  it('lists candidates for a product', async () => {
    const productId = randomUUID();
    const mockDb = createMockDatabase();
    const mockSelect = vi.spyOn(mockDb.db, 'select');
    mockSelect.mockImplementationOnce(() => authChain() as never);
    mockSelect.mockImplementationOnce(
      () =>
        ({
          from: () => ({
            where: () => ({
              orderBy: vi.fn().mockResolvedValue([{ ...SAMPLE_CANDIDATE, productId }]),
            }),
          }),
        }) as never,
    );

    const server = await makeServer(mockDb);
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/products/${productId}/image-candidates`,
      headers: reqHeaders(server),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it('approves candidate and creates product image record', async () => {
    const productId = randomUUID();
    const candidateId = randomUUID();
    const mockDb = createMockDatabase();
    let selectCalls = 0;
    vi.spyOn(mockDb.db, 'select').mockImplementation(() => {
      selectCalls++;
      if (selectCalls === 1) return authChain() as never;
      return {
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ ...SAMPLE_CANDIDATE, id: candidateId, productId }]),
          }),
        }),
      } as never;
    });

    vi.spyOn(mockDb.db, 'update').mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: candidateId, status: 'approved' }]),
        }),
      }),
    } as never);

    vi.spyOn(mockDb.db, 'insert').mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: randomUUID(), productId, url: SAMPLE_CANDIDATE.sourceUrl, isPrimary: false },
          ]),
      }),
    } as never);

    const server = await makeServer(mockDb);
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/image-candidates/${candidateId}/approve`,
      headers: reqHeaders(server),
      payload: { isPrimary: false, altText: 'Front dome view' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().candidate.status).toBe('approved');
  });

  it('rejects candidate with status rejected', async () => {
    const productId = randomUUID();
    const candidateId = randomUUID();
    const mockDb = createMockDatabase();
    const mockSelect = vi.spyOn(mockDb.db, 'select');
    mockSelect.mockImplementationOnce(() => authChain() as never);
    mockSelect.mockImplementationOnce(
      () =>
        ({
          from: () => ({
            where: () => ({
              limit: vi
                .fn()
                .mockResolvedValue([{ ...SAMPLE_CANDIDATE, id: candidateId, productId }]),
            }),
          }),
        }) as never,
    );

    vi.spyOn(mockDb.db, 'update').mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: candidateId, status: 'rejected' }]),
        }),
      }),
    } as never);

    const server = await makeServer(mockDb);
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/products/${productId}/image-candidates/${candidateId}/reject`,
      headers: reqHeaders(server),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });
});
