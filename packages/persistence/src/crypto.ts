import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 32 * 1024 * 1024; // 32MB

const MIN_SCRYPT_N = 1024;
const MAX_SCRYPT_N = 65536;
const MIN_SCRYPT_R = 1;
const MAX_SCRYPT_R = 32;
const MIN_SCRYPT_P = 1;
const MAX_SCRYPT_P = 16;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

interface ValidatedScryptParams {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  expectedKey: Buffer;
}

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

function parseScryptNumbers(paramsPart: string): { N: number; r: number; p: number } | null {
  const result: Record<string, number> = {};
  for (const pair of paramsPart.split(',')) {
    const [key, value] = pair.split('=');
    if (!key || !value) return null;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    result[key] = parsed;
  }
  const { N, r, p } = result;
  if (typeof N !== 'number' || typeof r !== 'number' || typeof p !== 'number') return null;
  return { N, r, p };
}

function isValidHex(hex: string, minLen: number, maxLen: number): boolean {
  return (
    hex.length >= minLen && hex.length <= maxLen && hex.length % 2 === 0 && HEX_PATTERN.test(hex)
  );
}

function areScryptBoundsValid(N: number, r: number, p: number): boolean {
  if (N < MIN_SCRYPT_N || N > MAX_SCRYPT_N || (N & (N - 1)) !== 0) return false;
  if (r < MIN_SCRYPT_R || r > MAX_SCRYPT_R) return false;
  if (p < MIN_SCRYPT_P || p > MAX_SCRYPT_P) return false;
  return 128 * N * r <= SCRYPT_MAXMEM;
}

function parseAndValidateParams(
  paramsPart: string,
  saltHex: string,
  expectedKeyHex: string,
): ValidatedScryptParams | null {
  if (!paramsPart || !saltHex || !expectedKeyHex) return null;

  const numbers = parseScryptNumbers(paramsPart);
  if (!numbers) return null;
  const { N, r, p } = numbers;

  if (!areScryptBoundsValid(N, r, p)) return null;
  if (!isValidHex(saltHex, 32, 128)) return null;
  if (!isValidHex(expectedKeyHex, 64, 256)) return null;

  return {
    N,
    r,
    p,
    salt: Buffer.from(saltHex, 'hex'),
    expectedKey: Buffer.from(expectedKeyHex, 'hex'),
  };
}

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
  if (typeof password !== 'string' || password.length === 0) return false;
  if (typeof serializedHash !== 'string' || serializedHash.length === 0) return false;

  try {
    const parts = serializedHash.split('$');
    if (parts.length !== 5 || parts[1] !== 'scrypt') return false;

    const validated = parseAndValidateParams(parts[2], parts[3], parts[4]);
    if (!validated) return false;

    const derived = await asyncScrypt(password, validated.salt, validated.expectedKey.length, {
      N: validated.N,
      r: validated.r,
      p: validated.p,
      maxmem: SCRYPT_MAXMEM,
    });

    if (derived.length !== validated.expectedKey.length) return false;
    return timingSafeEqual(derived, validated.expectedKey);
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
