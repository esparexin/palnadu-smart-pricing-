import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashPassword, hashSessionToken, verifyPassword } from './auth.js';

describe('authentication & session cryptography', () => {
  describe('hashPassword & verifyPassword', () => {
    it('generates a serialized scrypt hash with distinct salts for the same password', async () => {
      const password = 'CorrectHorseBatteryStaple!2026';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).toMatch(/^\$scrypt\$N=16384,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
      expect(hash2).toMatch(/^\$scrypt\$N=16384,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);

      expect(hash1).not.toBe(hash2);
    });

    it('verifies correct passwords and rejects incorrect passwords', async () => {
      const password = 'SecurePassword#123';
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('WrongPassword#123', hash)).toBe(false);
      expect(await verifyPassword('', hash)).toBe(false);
    });

    it('strictly preserves whitespace in passwords without trimming', async () => {
      const rawPasswordWithSpaces = '  spaces-matter-here  ';
      const hash = await hashPassword(rawPasswordWithSpaces);

      expect(await verifyPassword(rawPasswordWithSpaces, hash)).toBe(true);
      expect(await verifyPassword(rawPasswordWithSpaces.trim(), hash)).toBe(false);
      expect(await verifyPassword(` ${rawPasswordWithSpaces}`, hash)).toBe(false);
    });

    it('safely rejects malformed, invalid, or non-scrypt algorithm formats without throwing', async () => {
      expect(await verifyPassword('password', '')).toBe(false);
      expect(await verifyPassword('password', 'not-a-hash')).toBe(false);
      expect(await verifyPassword('password', 'bcrypt$10$something')).toBe(false);
      expect(await verifyPassword('password', '$argon2id$v=19$m=65536,t=2,p=1$abc$def')).toBe(
        false,
      );
      expect(await verifyPassword('password', '$scrypt$N=invalid,r=8,p=1$abc$def')).toBe(false);
      expect(await verifyPassword('password', '$scrypt$N=16384,r=8,p=1$$')).toBe(false);
    });

    it('enforces safe parameter bounds and resource limits before computation', async () => {
      const validSalt = '0123456789abcdef0123456789abcdef'; // 32 hex chars (16 bytes)
      const validKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 128 hex chars (64 bytes)

      // N is not a power of 2 (e.g. 1000 or 16385)
      expect(
        await verifyPassword('password', `$scrypt$N=1000,r=8,p=1$${validSalt}$${validKey}`),
      ).toBe(false);
      expect(
        await verifyPassword('password', `$scrypt$N=16385,r=8,p=1$${validSalt}$${validKey}`),
      ).toBe(false);

      // N out of bounds (< 1024 or > 65536)
      expect(
        await verifyPassword('password', `$scrypt$N=512,r=8,p=1$${validSalt}$${validKey}`),
      ).toBe(false);
      expect(
        await verifyPassword('password', `$scrypt$N=131072,r=8,p=1$${validSalt}$${validKey}`),
      ).toBe(false);

      // r out of bounds (< 1 or > 32)
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=0,p=1$${validSalt}$${validKey}`),
      ).toBe(false);
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=64,p=1$${validSalt}$${validKey}`),
      ).toBe(false);

      // p out of bounds (< 1 or > 16)
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=8,p=0$${validSalt}$${validKey}`),
      ).toBe(false);
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=8,p=32$${validSalt}$${validKey}`),
      ).toBe(false);

      // Memory limit exceeded: 128 * N * r > 32MB (e.g. N=65536, r=16 -> 128 * 65536 * 16 = 134MB)
      expect(
        await verifyPassword('password', `$scrypt$N=65536,r=16,p=1$${validSalt}$${validKey}`),
      ).toBe(false);

      // Malformed hex or invalid salt length (< 32 or > 128 or odd length)
      expect(await verifyPassword('password', `$scrypt$N=16384,r=8,p=1$nothex$${validKey}`)).toBe(
        false,
      );
      expect(await verifyPassword('password', `$scrypt$N=16384,r=8,p=1$abcd$${validKey}`)).toBe(
        false,
      );
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=8,p=1$${validSalt}a$${validKey}`),
      ).toBe(false);

      // Malformed hex or invalid key length (< 64 or > 256 or odd length)
      expect(await verifyPassword('password', `$scrypt$N=16384,r=8,p=1$${validSalt}$nothex`)).toBe(
        false,
      );
      expect(
        await verifyPassword('password', `$scrypt$N=16384,r=8,p=1$${validSalt}$${validKey}a`),
      ).toBe(false);
    });
  });

  describe('generateSessionToken & hashSessionToken', () => {
    it('generates high-entropy base64url session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).toHaveLength(43);
      expect(token2).toHaveLength(43);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('produces deterministic 64-character SHA-256 hashes for session tokens', () => {
      const token = 'sample-session-token-value-12345';
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash1).toBe(hash2);

      const diffHash = hashSessionToken('another-token-value-67890');
      expect(diffHash).not.toBe(hash1);
    });
  });
});
