import { describe, expect, it, vi } from 'vitest';
import { isProductionDatabaseUrl, seedCanonicalBrands } from './seed-brands.js';
import type { DbExecutor } from '../packages/persistence/src/index.js';
import { CANONICAL_BRANDS } from '../packages/contracts/src/index.js';

describe('Seed Canonical Brands Script', () => {
  describe('Safety & Environment Checks', () => {
    it('detects production and cloud database URLs', () => {
      expect(isProductionDatabaseUrl('postgres://user:pass@pooled.db.prisma.io:5432/db')).toBe(
        true,
      );
      expect(
        isProductionDatabaseUrl('postgres://user:pass@dpg-abc-a.oregon-postgres.render.com/db'),
      ).toBe(true);
      expect(isProductionDatabaseUrl('postgres://postgres:postgres@127.0.0.1:5432/test_db')).toBe(
        false,
      );
      expect(isProductionDatabaseUrl('postgres://postgres:postgres@localhost:5432/test_db')).toBe(
        false,
      );
    });

    it('refuses non-dry-run execution on production database URLs', async () => {
      const prodEnv = {
        DATABASE_URL: 'postgres://user:pass@pooled.db.prisma.io:5432/db',
      };

      await expect(seedCanonicalBrands({ env: prodEnv, dryRun: false })).rejects.toThrow(
        /CRITICAL SAFETY REFUSAL/,
      );
    });

    it('allows dry-run on production without performing writes', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn(),
      } as unknown as DbExecutor;

      const summary = await seedCanonicalBrands({
        db: mockDb,
        dryRun: true,
      });

      expect(summary.isDryRun).toBe(true);
      expect(summary.totalCanonical).toBe(CANONICAL_BRANDS.length);
      expect(summary.wouldInsertCount).toBe(CANONICAL_BRANDS.length);
      expect(summary.insertedCount).toBe(0);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency and Preservation', () => {
    it('inserts missing brands and preserves existing brands on repeated execution', async () => {
      const storedBrands = new Map<string, { id: string; name: string; slug: string }>();

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((_condition: unknown) => ({
              limit: vi.fn().mockImplementation(async () => {
                for (const b of storedBrands.values()) {
                  return [b];
                }
                return [];
              }),
            })),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((input: { name: string; slug: string }) => ({
            returning: vi.fn().mockImplementation(async () => {
              const brand = { id: `id-${input.slug}`, name: input.name, slug: input.slug };
              storedBrands.set(input.slug, brand);
              return [brand];
            }),
          })),
        }),
      } as unknown as DbExecutor;

      storedBrands.set('hanwha-vision', {
        id: 'uuid-hanwha-existing',
        name: 'Hanwha Vision',
        slug: 'hanwha-vision',
      });

      const summary = await seedCanonicalBrands({
        db: mockDb,
        dryRun: false,
      });

      expect(summary.isDryRun).toBe(false);
      expect(summary.totalCanonical).toBe(19);
      expect(
        summary.items.some((i) => i.canonicalSlug === 'hanwha-vision' && i.status === 'existing'),
      ).toBe(true);
    });
  });
});
