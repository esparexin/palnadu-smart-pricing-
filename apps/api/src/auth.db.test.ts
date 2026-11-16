import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseServerConfig } from '@palnadu/server-config';
import {
  createDatabase,
  eq,
  hashPassword,
  migrate,
  provisionAdminUser,
  adminSessions,
  adminUsers,
  type DatabaseClient,
} from '@palnadu/persistence';

import {
  buildServer,
  requireAdminAuth,
  requireAdminPermission,
  SESSION_COOKIE_NAME,
} from './server.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined) {
  throw new Error('TEST_DATABASE_URL is required for PostgreSQL API integration tests.');
}

const config = parseServerConfig({
  DATABASE_URL: testDatabaseUrl,
  DB_POOL_MAX: '5',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  SESSION_SECRET: 'palnadu-integration-test-session-secret-at-least-32-chars-long',
  SESSION_TTL_HOURS: '2',
});

describe('Admin Authentication API (PostgreSQL Integration)', () => {
  let database: DatabaseClient;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    database = createDatabase(config);
    const migrationsFolder = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../packages/persistence/drizzle',
    );

    await migrate(database.db, { migrationsFolder });
    await database.ping();

    server = await buildServer({ config, database });

    // Register a test protected route with permission guard
    server.get(
      '/api/v1/admin/test-guarded-resource',
      {
        preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      },
      async (request) => ({ allowed: true, user: request.admin?.email }),
    );
  });

  afterAll(async () => {
    await server?.close();
    await database?.close();
  });

  it('provisions administrators securely and prevents duplicates', async () => {
    const email = `prov-${randomUUID()}@example.com`;
    const user = await provisionAdminUser(database.db, {
      email,
      name: 'Provisioned Admin',
      password: 'SecurePassword123!',
      permissions: ['catalogue:manage'],
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.status).toBe('active');
    expect(user.permissions).toEqual(['catalogue:manage']);

    // Duplicate email must be rejected
    await expect(
      provisionAdminUser(database.db, {
        email: `  ${email.toUpperCase()}  `,
        name: 'Duplicate Admin',
        password: 'AnotherPassword123!',
      }),
    ).rejects.toThrow('already exists');

    // Invalid email format must be rejected
    await expect(
      provisionAdminUser(database.db, {
        email: 'invalid-email',
        name: 'Invalid Email Admin',
        password: 'ValidPassword123!',
      }),
    ).rejects.toThrow('Invalid email format');

    // Short password must be rejected
    await expect(
      provisionAdminUser(database.db, {
        email: `short-${randomUUID()}@example.com`,
        name: 'Short Pass Admin',
        password: 'short',
      }),
    ).rejects.toThrow('at least 8 characters');
  });

  it('authenticates valid administrator, sets secure cookie, and allows /me resolution', async () => {
    const email = `login-success-${randomUUID()}@example.com`;
    const password = 'CorrectPassword!2026';

    await provisionAdminUser(database.db, {
      email,
      name: 'Login Success Admin',
      password,
      permissions: ['catalogue:manage', 'pricing:manage'],
    });

    // 1. Successful Login
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: {
        host: 'localhost:3001',
      },
      payload: {
        email: `  ${email.toUpperCase()}  `, // Test email normalization
        password,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse.json();

    expect(loginBody.user.email).toBe(email);
    expect(loginBody.user.name).toBe('Login Success Admin');
    expect(loginBody.user.status).toBe('active');
    expect(loginBody.user.permissions).toEqual(['catalogue:manage', 'pricing:manage']);
    expect(loginBody.expiresAt).toBeDefined();

    // Sensitive fields must never be leaked
    expect(loginBody.user.passwordHash).toBeUndefined();
    expect(loginBody.user.password).toBeUndefined();
    expect(loginBody.sessionToken).toBeUndefined();

    // Verify Session Cookie
    const cookies = loginResponse.cookies;
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Lax');
    expect(sessionCookie?.path).toBe('/');
    expect(sessionCookie?.value).toBeDefined();

    const cookieHeader = `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`;

    // 2. Query /api/v1/admin/auth/me using the session cookie
    const meResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    const meBody = meResponse.json();
    expect(meBody.email).toBe(email);
    expect(meBody.permissions).toEqual(['catalogue:manage', 'pricing:manage']);
    expect(meBody.passwordHash).toBeUndefined();

    // 3. Access guarded resource with matching permission
    const guardedResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/test-guarded-resource',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(guardedResponse.statusCode).toBe(200);
    expect(guardedResponse.json()).toEqual({ allowed: true, user: email });

    // 4. Logout revokes the session and clears the cookie
    const logoutResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'localhost:3001',
        origin: 'http://localhost:3001',
        cookie: cookieHeader,
      },
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.json()).toEqual({ success: true });

    // Verify clear cookie header was issued
    const clearedCookie = logoutResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(clearedCookie).toBeDefined();
    expect(
      clearedCookie?.maxAge === 0 ||
        (clearedCookie?.expires && new Date(clearedCookie.expires).getTime() <= Date.now()),
    ).toBe(true);

    // 5. Subsequent access with revoked session cookie must fail with 401
    const postLogoutMe = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(postLogoutMe.statusCode).toBe(401);
    expect(postLogoutMe.json().error.code).toBe('UNAUTHORIZED');

    // 6. Repeated logout is idempotent and returns 200
    const repeatedLogout = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/logout',
      headers: {
        host: 'localhost:3001',
        origin: 'http://localhost:3001',
        cookie: cookieHeader,
      },
    });
    expect(repeatedLogout.statusCode).toBe(200);
    expect(repeatedLogout.json()).toEqual({ success: true });
  });

  it('rejects invalid credentials without user existence leakage', async () => {
    // Non-existent email
    const nonExistent = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: {
        email: `non-existent-${randomUUID()}@example.com`,
        password: 'Password123!',
      },
    });

    expect(nonExistent.statusCode).toBe(401);
    expect(nonExistent.json()).toMatchObject({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });

    // Existing email with wrong password
    const email = `wrong-pass-${randomUUID()}@example.com`;
    await provisionAdminUser(database.db, {
      email,
      name: 'Wrong Pass Admin',
      password: 'CorrectPassword123!',
    });

    const wrongPass = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: {
        email,
        password: 'WrongPassword123!',
      },
    });

    expect(wrongPass.statusCode).toBe(401);
    expect(wrongPass.json()).toMatchObject({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  });

  it('rejects login for suspended administrator accounts', async () => {
    const email = `suspended-${randomUUID()}@example.com`;
    const password = 'SuspendedPassword123!';

    const [user] = await database.db
      .insert(adminUsers)
      .values({
        email,
        name: 'Suspended Admin',
        passwordHash: await hashPassword(password),
        status: 'suspended',
      })
      .returning();

    expect(user.status).toBe('suspended');

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: {
        email,
        password,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended',
      },
    });
  });

  it('rejects access to guarded routes when permission is missing', async () => {
    const email = `no-perm-${randomUUID()}@example.com`;
    const password = 'PermPassword123!';

    await provisionAdminUser(database.db, {
      email,
      name: 'No Perm Admin',
      password,
      permissions: ['pricing:manage'], // Missing 'catalogue:manage'
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: { email, password },
    });

    const sessionCookie = loginRes.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();

    const guardedRes = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/test-guarded-resource',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`,
      },
    });

    expect(guardedRes.statusCode).toBe(403);
    expect(guardedRes.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Missing required permission: catalogue:manage',
      },
    });
  });

  it('enforces rate limiting on the login endpoint', async () => {
    const email = `ratelimit-${randomUUID()}@example.com`;
    const password = 'RateLimitPassword123!';

    // Send 5 rapid login attempts (max is 5 per minute)
    for (let i = 0; i < 5; i++) {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        headers: { host: 'localhost:3001' },
        payload: { email, password },
      });
      // 401 is expected for invalid credentials
      expect(res.statusCode).toBe(401);
    }

    // 6th attempt must be rate-limited with 429
    const rateLimitedRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: { email, password },
    });

    expect(rateLimitedRes.statusCode).toBe(429);
    expect(rateLimitedRes.json()).toMatchObject({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  });

  it('prevents rate-limit evasion using email casing and whitespace variations', async () => {
    const rawEmail = `evade-${randomUUID()}@example.com`;
    const password = 'EvadePassword123!';
    const variations = [
      rawEmail,
      rawEmail.toUpperCase(),
      `   ${rawEmail}   `,
      `   ${rawEmail.toUpperCase()} `,
      rawEmail.toLowerCase(),
    ];

    for (const emailVariant of variations) {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        headers: { host: 'localhost:3001' },
        payload: { email: emailVariant, password },
      });
      expect(res.statusCode).toBe(401);
    }

    // 6th attempt with yet another variation must be rate-limited
    const rateLimitedRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: { email: `  ${rawEmail.toUpperCase()}  `, password },
    });

    expect(rateLimitedRes.statusCode).toBe(429);
    expect(rateLimitedRes.json()).toMatchObject({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  });

  it('rejects /me when the administrator account is suspended after session creation', async () => {
    const email = `suspend-after-${randomUUID()}@example.com`;
    const password = 'PasswordValid123!';

    const user = await provisionAdminUser(database.db, {
      email,
      name: 'Suspend After Admin',
      password,
      permissions: ['catalogue:manage'],
    });

    // 1. Successful login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);

    const sessionCookie = loginRes.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    const cookieHeader = `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`;

    // 2. /me works while active
    const meActive = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(meActive.statusCode).toBe(200);

    // 3. Suspend account in database
    await database.db
      .update(adminUsers)
      .set({ status: 'suspended' })
      .where(eq(adminUsers.id, user.id));

    // 4. /me must now be rejected with 401
    const meSuspended = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(meSuspended.statusCode).toBe(401);
    expect(meSuspended.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired, revoked, or invalid',
      },
    });
  });

  it('rejects /me when session is expired in database', async () => {
    const email = `expired-session-${randomUUID()}@example.com`;
    const password = 'PasswordValid123!';

    const user = await provisionAdminUser(database.db, {
      email,
      name: 'Expired Session Admin',
      password,
      permissions: ['catalogue:manage'],
    });

    // 1. Login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { host: 'localhost:3001' },
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);

    const sessionCookie = loginRes.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    const cookieHeader = `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`;

    // 2. Expire session in database
    await database.db
      .update(adminSessions)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(adminSessions.userId, user.id));

    // 3. /me must be rejected with 401
    const meExpired = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(meExpired.statusCode).toBe(401);
    expect(meExpired.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired, revoked, or invalid',
      },
    });
  });
});
