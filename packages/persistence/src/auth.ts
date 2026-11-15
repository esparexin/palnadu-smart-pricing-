import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, lte, sql } from 'drizzle-orm';
import type { DatabaseClient } from './client.js';
import { adminSessions, adminUsers } from './schema.js';

function asyncScrypt(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N?: number; r?: number; p?: number; maxmem?: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 32 * 1024 * 1024; // 32MB

// Parameter safety bounds
const MIN_SCRYPT_N = 1024;
const MAX_SCRYPT_N = 65536;
const MIN_SCRYPT_R = 1;
const MAX_SCRYPT_R = 32;
const MIN_SCRYPT_P = 1;
const MAX_SCRYPT_P = 16;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

export type DbExecutor = DatabaseClient['db'];

/**
 * Hashes a plaintext password asynchronously using Node.js scrypt with a cryptographically
 * random salt, returning a serialized string with parameters for timing-safe verification.
 * Preserves the password verbatim without trimming or normalization.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await asyncScrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });

  return `$scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a serialized scrypt hash using timingSafeEqual.
 * Validates the algorithm, parameter bounds, memory limits, and hex representations
 * BEFORE invoking scrypt computation to prevent denial-of-service / resource exhaustion.
 * Preserves the password verbatim without trimming or normalization.
 */
export async function verifyPassword(password: string, serializedHash: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0) {
    return false;
  }

  if (typeof serializedHash !== 'string' || serializedHash.length === 0) {
    return false;
  }

  try {
    const parts = serializedHash.split('$');
    if (parts.length !== 5 || parts[1] !== 'scrypt') {
      return false;
    }

    const paramsPart = parts[2];
    const saltHex = parts[3];
    const expectedKeyHex = parts[4];

    if (!paramsPart || !saltHex || !expectedKeyHex) {
      return false;
    }

    const params: Record<string, number> = {};
    for (const pair of paramsPart.split(',')) {
      const [key, value] = pair.split('=');
      if (!key || !value) return false;
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed <= 0) return false;
      params[key] = parsed;
    }

    const { N, r, p } = params;
    if (!N || !r || !p) {
      return false;
    }

    // Enforce N is a power of 2 and within safe bounds
    if (N < MIN_SCRYPT_N || N > MAX_SCRYPT_N || (N & (N - 1)) !== 0) {
      return false;
    }

    // Enforce r and p are within safe bounds
    if (r < MIN_SCRYPT_R || r > MAX_SCRYPT_R) {
      return false;
    }
    if (p < MIN_SCRYPT_P || p > MAX_SCRYPT_P) {
      return false;
    }

    // Enforce memory resource limit: 128 * N * r must not exceed SCRYPT_MAXMEM
    if (128 * N * r > SCRYPT_MAXMEM) {
      return false;
    }

    // Validate salt format and length (16 to 64 bytes -> 32 to 128 hex chars, even length)
    if (
      saltHex.length < 32 ||
      saltHex.length > 128 ||
      saltHex.length % 2 !== 0 ||
      !HEX_PATTERN.test(saltHex)
    ) {
      return false;
    }

    // Validate derived key format and length (32 to 128 bytes -> 64 to 256 hex chars, even length)
    if (
      expectedKeyHex.length < 64 ||
      expectedKeyHex.length > 256 ||
      expectedKeyHex.length % 2 !== 0 ||
      !HEX_PATTERN.test(expectedKeyHex)
    ) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(expectedKeyHex, 'hex');

    const derived = await asyncScrypt(password, salt, expectedKey.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });

    if (derived.length !== expectedKey.length) {
      return false;
    }

    return timingSafeEqual(derived, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy 256-bit opaque session token encoded as base64url.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Computes the SHA-256 hash of a session token for secure database persistence.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
