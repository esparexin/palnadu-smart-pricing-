import { and, eq, gt, lte, sql } from 'drizzle-orm';
import type { DatabaseClient } from './client.js';
import { hashSessionToken, hashPassword } from './crypto.js';
import { adminSessions, adminUsers } from './schema.js';

export { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './crypto.js';

export type DbExecutor = DatabaseClient['db'];

export interface CreateAdminSessionInput {
  userId: string;
  sessionToken: string;
  expiresAt: Date;
}

/**
 * Persists a new admin session storing only the SHA-256 hash of the session token.
 */
export async function createAdminSession(db: DbExecutor, input: CreateAdminSessionInput) {
  if (
    !input.sessionToken ||
    typeof input.sessionToken !== 'string' ||
    input.sessionToken.trim().length === 0
  ) {
    throw new Error('Invalid session token');
  }

  const tokenHash = hashSessionToken(input.sessionToken);
  const [created] = await db
    .insert(adminSessions)
    .values({
      userId: input.userId,
      sessionTokenHash: tokenHash,
      expiresAt: input.expiresAt,
    })
    .returning();
  return created;
}

/**
 * Resolves an active session and associated active admin user by raw session token.
 * Returns null if the token does not match, the session is expired, or the user is suspended.
 */
export async function findValidSessionByToken(
  db: DbExecutor,
  sessionToken: string,
  now = new Date(),
) {
  if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.length === 0) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);
  const rows = await db
    .select({
      session: adminSessions,
      user: adminUsers,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.sessionTokenHash, tokenHash),
        gt(adminSessions.expiresAt, now),
        eq(adminUsers.status, 'active'),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Revokes a session by raw session token, returning true if revoked or false if not found.
 */
export async function revokeSessionByToken(db: DbExecutor, sessionToken: string): Promise<boolean> {
  if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.length === 0) {
    return false;
  }

  const tokenHash = hashSessionToken(sessionToken);
  const deleted = await db
    .delete(adminSessions)
    .where(eq(adminSessions.sessionTokenHash, tokenHash))
    .returning({ id: adminSessions.id });
  return deleted.length > 0;
}

/**
 * Revokes all sessions belonging to a specific user (e.g. on logout-all or suspension).
 */
export async function revokeAllUserSessions(db: DbExecutor, userId: string): Promise<number> {
  const deleted = await db
    .delete(adminSessions)
    .where(eq(adminSessions.userId, userId))
    .returning({ id: adminSessions.id });
  return deleted.length;
}

/**
 * Purges expired sessions from the database (expiresAt <= now).
 */
export async function cleanExpiredSessions(db: DbExecutor, now = new Date()): Promise<number> {
  const deleted = await db
    .delete(adminSessions)
    .where(lte(adminSessions.expiresAt, now))
    .returning({ id: adminSessions.id });
  return deleted.length;
}

export interface ProvisionAdminUserInput {
  email: string;
  name: string;
  password: string;
  permissions?: string[];
}

export interface SafeAdminUser {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'suspended';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Finds an administrator account by case- and whitespace-normalized email.
 */
export async function findAdminUserByNormalizedEmail(db: DbExecutor, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(sql`lower(btrim(${adminUsers.email}))`, normalized))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Provisions an administrator account securely.
 * Hashes password using scrypt, validates constraints, and prevents duplicate registration.
 * Never stores or returns the plaintext password or password hash.
 */
export async function provisionAdminUser(
  db: DbExecutor,
  input: ProvisionAdminUserInput,
): Promise<SafeAdminUser> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Name cannot be blank');
  }

  if (typeof input.password !== 'string' || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(sql`lower(btrim(${adminUsers.email}))`, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`Admin user already exists with email: ${normalizedEmail}`);
  }

  const passwordHash = await hashPassword(input.password);
  const permissions = Array.from(new Set(input.permissions || []));

  const [created] = await db
    .insert(adminUsers)
    .values({
      email: normalizedEmail,
      name: trimmedName,
      passwordHash,
      status: 'active',
      permissions,
    })
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      status: adminUsers.status,
      permissions: adminUsers.permissions,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
    });

  return created as SafeAdminUser;
}
