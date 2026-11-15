import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { parseServerConfig } from '@palnadu/server-config';
import { createDatabase } from './client.js';
import { brands, productVariants, products, adminUsers, adminSessions } from './schema.js';
import {
  cleanExpiredSessions,
  createAdminSession,
  findValidSessionByToken,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  revokeAllUserSessions,
  revokeSessionByToken,
  verifyPassword,
} from './auth.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined) {
  throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests.');
}

const database = createDatabase(
  parseServerConfig({
    DATABASE_URL: testDatabaseUrl,
    DB_POOL_MAX: '2',
    NODE_ENV: 'test',
  }),
);

describe('PostgreSQL persistence', () => {
  beforeAll(async () => {
    const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
    await migrate(database.db, { migrationsFolder });
    await migrate(database.db, { migrationsFolder });
    await database.ping();
  });

  afterAll(async () => {
    await database.close();
  });

  it('enforces case- and whitespace-insensitive SKU uniqueness transactionally', async () => {
    const brandId = randomUUID();
    const productId = randomUUID();
    const sku = `phase2-${randomUUID()}`;

    await expect(
      database.db.transaction(async (transaction) => {
        await transaction.insert(brands).values({
          id: brandId,
          name: `Integration ${brandId}`,
        });
        await transaction.insert(products).values({
          id: productId,
          brandId,
          name: 'Integration product',
        });
        await transaction.insert(productVariants).values({ productId, sku });
        await transaction.insert(productVariants).values({
          productId,
          sku: ` ${sku.toUpperCase()} `,
        });
      }),
    ).rejects.toThrow();

    const rolledBackBrand = await database.db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, brandId));

    expect(rolledBackBrand).toHaveLength(0);
  });

  describe('admin identity and session lifecycle', () => {
    it('enforces case- and whitespace-insensitive unique email and check constraints on admin_users', async () => {
      const email = `admin-${randomUUID()}@example.com`;
      const passwordHash = await hashPassword('TemporaryPass123!');

      // Insert initial admin user
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'First Admin',
          passwordHash,
          permissions: ['catalogue:read', 'pricing:manage'],
        })
        .returning();

      expect(user.id).toBeDefined();
      expect(user.status).toBe('active');
      expect(user.permissions).toEqual(['catalogue:read', 'pricing:manage']);

      // Attempt duplicate email with leading/trailing whitespace and mixed case
      const duplicateEmail = `  ${email.toUpperCase()}  `;
      await expect(
        database.db.insert(adminUsers).values({
          email: duplicateEmail,
          name: 'Duplicate Admin',
          passwordHash,
        }),
      ).rejects.toThrow();

      // Check constraint: reject blank email
      await expect(
        database.db.insert(adminUsers).values({
          email: '   ',
          name: 'Blank Email Admin',
          passwordHash,
        }),
      ).rejects.toThrow();

      // Check constraint: reject invalid status
      await expect(
        database.db.insert(adminUsers).values({
          email: `invalid-status-${randomUUID()}@example.com`,
          name: 'Invalid Status Admin',
          passwordHash,
          status: 'unapproved',
        }),
      ).rejects.toThrow();

      // Check constraint: reject blank name
      await expect(
        database.db.insert(adminUsers).values({
          email: `blank-name-${randomUUID()}@example.com`,
          name: '   ',
          passwordHash,
        }),
      ).rejects.toThrow();

      // Check constraint: reject blank password hash
      await expect(
        database.db.insert(adminUsers).values({
          email: `blank-hash-${randomUUID()}@example.com`,
          name: 'Valid Name',
          passwordHash: '   ',
        }),
      ).rejects.toThrow();

      // Check constraint: reject non-array permissions JSONB
      await expect(
        database.db.insert(adminUsers).values({
          email: `invalid-perm-${randomUUID()}@example.com`,
          name: 'Valid Name',
          passwordHash,
          permissions: { object: 'not-an-array' } as unknown as string[],
        }),
      ).rejects.toThrow();
    });

    it('persists hashed passwords and allows secure verification against raw password', async () => {
      const email = `auth-verify-${randomUUID()}@example.com`;
      const rawPassword = 'StrongPassword!2026';
      const passwordHash = await hashPassword(rawPassword);

      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Verify Admin',
          passwordHash,
        })
        .returning();

      const [stored] = await database.db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, user.id));

      expect(stored.passwordHash).toBe(passwordHash);
      expect(await verifyPassword(rawPassword, stored.passwordHash)).toBe(true);
      expect(await verifyPassword('WrongPassword!2026', stored.passwordHash)).toBe(false);
    });

    it('manages session lifecycle with hashed tokens, expiry, and revocation', async () => {
      const email = `session-lifecycle-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Session Admin',
          passwordHash: await hashPassword('SessionPassword123!'),
        })
        .returning();

      const rawSessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours ahead

      // Create session
      const session = await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: rawSessionToken,
        expiresAt,
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(user.id);
      // Raw token must never be stored in the database!
      expect(session.sessionTokenHash).toBe(hashSessionToken(rawSessionToken));
      expect(session.sessionTokenHash).not.toBe(rawSessionToken);

      // Verify active session lookup returns user and session
      const resolved = await findValidSessionByToken(database.db, rawSessionToken);
      expect(resolved).not.toBeNull();
      expect(resolved?.user.id).toBe(user.id);
      expect(resolved?.session.id).toBe(session.id);

      // Resolving with an invalid token returns null
      const invalidResolved = await findValidSessionByToken(database.db, 'invalid-session-token');
      expect(invalidResolved).toBeNull();

      // Expired session check: passing a future reference time makes this session expired
      const futureNow = new Date(Date.now() + 13 * 60 * 60 * 1000);
      const expiredResolved = await findValidSessionByToken(
        database.db,
        rawSessionToken,
        futureNow,
      );
      expect(expiredResolved).toBeNull();

      // Revoke session by token
      const revoked = await revokeSessionByToken(database.db, rawSessionToken);
      expect(revoked).toBe(true);

      // Subsequent lookup returns null
      expect(await findValidSessionByToken(database.db, rawSessionToken)).toBeNull();
    });

    it('rejects authentication for suspended accounts even with a valid unexpired session', async () => {
      const email = `suspended-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Suspended Admin',
          passwordHash: await hashPassword('SuspendedPass123!'),
          status: 'suspended',
        })
        .returning();

      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken,
        expiresAt,
      });

      // Suspended account must NOT authenticate
      const result = await findValidSessionByToken(database.db, sessionToken);
      expect(result).toBeNull();
    });

    it('enforces exact expiration boundary semantics and cleans expired sessions atomically', async () => {
      const email = `expiry-boundary-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Boundary Admin',
          passwordHash: await hashPassword('BoundaryPass123!'),
        })
        .returning();

      const now = new Date();
      const exactNowToken = generateSessionToken();
      const pastToken = generateSessionToken();
      const futureToken = generateSessionToken();

      // Session expiring exactly at 'now'
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: exactNowToken,
        expiresAt: now,
      });

      // Session expired 1 second ago
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: pastToken,
        expiresAt: new Date(now.getTime() - 1000),
      });

      // Session expiring in 10 seconds
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: futureToken,
        expiresAt: new Date(now.getTime() + 10_000),
      });

      // Exact boundary: expiresAt === now is not valid (must be strictly greater than now)
      expect(await findValidSessionByToken(database.db, exactNowToken, now)).toBeNull();
      expect(await findValidSessionByToken(database.db, pastToken, now)).toBeNull();
      expect(await findValidSessionByToken(database.db, futureToken, now)).not.toBeNull();

      // cleanExpiredSessions with 'now' cleans both past and exact-boundary sessions
      const cleaned = await cleanExpiredSessions(database.db, now);
      expect(cleaned).toBeGreaterThanOrEqual(2);

      // Future session remains intact
      expect(await findValidSessionByToken(database.db, futureToken, now)).not.toBeNull();
    });

    it('handles concurrent session lookups and revocation atomically', async () => {
      const email = `concurrent-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Concurrent Admin',
          passwordHash: await hashPassword('ConcurrentPass123!'),
        })
        .returning();

      const sessionToken = generateSessionToken();
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      // Run parallel lookups confirming validity
      const parallelValidations = await Promise.all([
        findValidSessionByToken(database.db, sessionToken),
        findValidSessionByToken(database.db, sessionToken),
        findValidSessionByToken(database.db, sessionToken),
      ]);
      expect(parallelValidations.every((v) => v !== null)).toBe(true);

      // Concurrently revoke and validate
      const [revokeResult] = await Promise.all([
        revokeSessionByToken(database.db, sessionToken),
        findValidSessionByToken(database.db, sessionToken),
        findValidSessionByToken(database.db, sessionToken),
      ]);

      expect(revokeResult).toBe(true);

      // Any query after revocation must see null
      const finalCheck = await findValidSessionByToken(database.db, sessionToken);
      expect(finalCheck).toBeNull();
    });

    it('cascades session deletion when the parent admin user is deleted', async () => {
      const email = `cascade-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Cascade Admin',
          passwordHash: await hashPassword('CascadePass123!'),
        })
        .returning();

      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: token1,
        expiresAt,
      });
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: token2,
        expiresAt,
      });

      const userSessions = await database.db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.userId, user.id));
      expect(userSessions).toHaveLength(2);

      // Delete the admin user
      await database.db.delete(adminUsers).where(eq(adminUsers.id, user.id));

      // Sessions must be cascade deleted automatically by the database constraint
      const remainingSessions = await database.db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.userId, user.id));
      expect(remainingSessions).toHaveLength(0);
    });

    it('cleans expired sessions and bulk revokes user sessions', async () => {
      const email = `bulk-${randomUUID()}@example.com`;
      const [user] = await database.db
        .insert(adminUsers)
        .values({
          email,
          name: 'Bulk Admin',
          passwordHash: await hashPassword('BulkPass123!'),
        })
        .returning();

      const pastExpiry = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const futureExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour ahead

      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: generateSessionToken(),
        expiresAt: pastExpiry,
      });
      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken: generateSessionToken(),
        expiresAt: futureExpiry,
      });

      // Purge expired sessions
      const cleaned = await cleanExpiredSessions(database.db);
      expect(cleaned).toBeGreaterThanOrEqual(1);

      // Bulk revoke all remaining sessions for the user
      const count = await revokeAllUserSessions(database.db, user.id);
      expect(count).toBe(1);

      const remaining = await database.db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.userId, user.id));
      expect(remaining).toHaveLength(0);
    });
  });
});
