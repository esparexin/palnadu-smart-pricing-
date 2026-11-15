import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { parseServerConfig } from '@palnadu/server-config';
import { createDatabase } from './client.js';
import {
  adminSessions,
  adminUsers,
  brands,
  categories,
  productImages,
  productRelationships,
  productVariants,
  products,
} from './schema.js';
import { getProductEffectivePricing } from './pricing.js';
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
          slug: `brand-${brandId}`,
        });
        await transaction.insert(products).values({
          id: productId,
          brandId,
          name: 'Integration product',
          slug: `product-${productId}`,
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

  describe('catalogue schema extensions & pricing resolution (Milestone 4.2)', () => {
    it('enforces slug uniqueness for brands, categories, and products (case- and whitespace-insensitive)', async () => {
      const slugSuffix = randomUUID();
      const brandSlug = `test-brand-${slugSuffix}`;
      const catSlug = `test-cat-${slugSuffix}`;
      const prodSlug = `test-prod-${slugSuffix}`;

      // Insert brand
      const [brand] = await database.db
        .insert(brands)
        .values({
          name: `Brand ${slugSuffix}`,
          slug: brandSlug,
        })
        .returning();

      // Duplicate brand slug with uppercase and whitespace must throw
      await expect(
        database.db.insert(brands).values({
          name: `Brand Duplicate ${slugSuffix}`,
          slug: `  ${brandSlug.toUpperCase()}  `,
        }),
      ).rejects.toThrow();

      // Insert category
      await database.db.insert(categories).values({
        name: `Cat ${slugSuffix}`,
        slug: catSlug,
      });

      // Duplicate category slug with uppercase and whitespace must throw
      await expect(
        database.db.insert(categories).values({
          name: `Cat Duplicate ${slugSuffix}`,
          slug: `  ${catSlug.toUpperCase()}  `,
        }),
      ).rejects.toThrow();

      // Insert product
      await database.db.insert(products).values({
        name: `Prod ${slugSuffix}`,
        slug: prodSlug,
        brandId: brand.id,
      });

      // Duplicate product slug with uppercase and whitespace must throw
      await expect(
        database.db.insert(products).values({
          name: `Prod Duplicate ${slugSuffix}`,
          slug: `  ${prodSlug.toUpperCase()}  `,
          brandId: brand.id,
        }),
      ).rejects.toThrow();
    });

    it('supports category hierarchy and prevents self-parenting', async () => {
      const slugSuffix = randomUUID();

      // Parent category
      const [parent] = await database.db
        .insert(categories)
        .values({
          name: `Parent ${slugSuffix}`,
          slug: `parent-${slugSuffix}`,
        })
        .returning();

      // Child category referencing parent
      const [child] = await database.db
        .insert(categories)
        .values({
          name: `Child ${slugSuffix}`,
          slug: `child-${slugSuffix}`,
          parentId: parent.id,
        })
        .returning();

      expect(child.parentId).toBe(parent.id);

      // Attempt self-parenting on an existing category must throw
      await expect(
        database.db
          .update(categories)
          .set({ parentId: parent.id })
          .where(eq(categories.id, parent.id)),
      ).rejects.toThrow();

      // Attempt to delete parent category while child exists must throw due to onDelete: restrict
      await expect(
        database.db.delete(categories).where(eq(categories.id, parent.id)),
      ).rejects.toThrow();
    });

    it('enforces product-level base pricing check constraints', async () => {
      const slugSuffix = randomUUID();
      const [brand] = await database.db
        .insert(brands)
        .values({
          name: `Pricing Brand ${slugSuffix}`,
          slug: `pricing-brand-${slugSuffix}`,
        })
        .returning();

      // Negative MRP rejected
      await expect(
        database.db.insert(products).values({
          name: 'Negative MRP',
          slug: `neg-mrp-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: -100,
          offerPricePaise: 0,
        }),
      ).rejects.toThrow();

      // Negative offer price rejected
      await expect(
        database.db.insert(products).values({
          name: 'Negative Offer',
          slug: `neg-offer-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: 1000,
          offerPricePaise: -10,
        }),
      ).rejects.toThrow();

      // Offer price > MRP rejected
      await expect(
        database.db.insert(products).values({
          name: 'Offer exceeds MRP',
          slug: `offer-gt-mrp-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: 5000,
          offerPricePaise: 6000,
        }),
      ).rejects.toThrow();

      // Negative discount value rejected
      await expect(
        database.db.insert(products).values({
          name: 'Negative discount',
          slug: `neg-discount-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: 5000,
          offerPricePaise: 4000,
          discountType: 'fixed',
          discountValue: -50,
        }),
      ).rejects.toThrow();

      // Invalid discount type rejected
      await expect(
        database.db.insert(products).values({
          name: 'Invalid discount type',
          slug: `invalid-discount-type-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: 5000,
          offerPricePaise: 4000,
          discountType: 'invalid_type' as unknown as 'none',
          discountValue: 0,
        }),
      ).rejects.toThrow();

      // Valid product succeeds
      const [validProduct] = await database.db
        .insert(products)
        .values({
          name: 'Valid Product',
          slug: `valid-prod-${slugSuffix}`,
          brandId: brand.id,
          unit: 'piece',
          mrpPaise: 10000,
          offerPricePaise: 9000,
          discountType: 'fixed',
          discountValue: 500,
        })
        .returning();

      expect(validProduct.id).toBeDefined();
      expect(validProduct.unit).toBe('piece');
      expect(validProduct.mrpPaise).toBe(10000);
      expect(validProduct.offerPricePaise).toBe(9000);
      expect(validProduct.discountType).toBe('fixed');
      expect(validProduct.discountValue).toBe(500);
    });

    it('enforces variant pricing check constraints and optional overrides', async () => {
      const slugSuffix = randomUUID();
      const [brand] = await database.db
        .insert(brands)
        .values({
          name: `Variant Brand ${slugSuffix}`,
          slug: `variant-brand-${slugSuffix}`,
        })
        .returning();

      const [product] = await database.db
        .insert(products)
        .values({
          name: 'Variant Base Product',
          slug: `variant-base-${slugSuffix}`,
          brandId: brand.id,
          mrpPaise: 50000,
          offerPricePaise: 45000,
          discountType: 'fixed',
          discountValue: 2000,
        })
        .returning();

      // Variant with null pricing succeeds (inherits parent pricing)
      const [nullPricingVariant] = await database.db
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: `sku-null-${slugSuffix}`,
        })
        .returning();

      expect(nullPricingVariant.mrpPaise).toBeNull();
      expect(nullPricingVariant.offerPricePaise).toBeNull();
      expect(nullPricingVariant.discountType).toBeNull();
      expect(nullPricingVariant.discountValue).toBeNull();

      // Variant with offer price > MRP throws
      await expect(
        database.db.insert(productVariants).values({
          productId: product.id,
          sku: `sku-invalid-${slugSuffix}`,
          mrpPaise: 1000,
          offerPricePaise: 2000,
        }),
      ).rejects.toThrow();

      // Variant with valid price override succeeds
      const [overrideVariant] = await database.db
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: `sku-override-${slugSuffix}`,
          mrpPaise: 60000,
          offerPricePaise: 55000,
          discountType: 'percentage',
          discountValue: 1000, // 10%
        })
        .returning();

      expect(overrideVariant.mrpPaise).toBe(60000);
      expect(overrideVariant.offerPricePaise).toBe(55000);
      expect(overrideVariant.discountType).toBe('percentage');
      expect(overrideVariant.discountValue).toBe(1000);
    });

    it('manages product images with cascade deletion and rights constraints', async () => {
      const slugSuffix = randomUUID();
      const [brand] = await database.db
        .insert(brands)
        .values({
          name: `Img Brand ${slugSuffix}`,
          slug: `img-brand-${slugSuffix}`,
        })
        .returning();

      const [product] = await database.db
        .insert(products)
        .values({
          name: 'Image Product',
          slug: `img-prod-${slugSuffix}`,
          brandId: brand.id,
        })
        .returning();

      const [variant] = await database.db
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: `img-var-${slugSuffix}`,
        })
        .returning();

      // Insert image with manual_upload rights
      const [image1] = await database.db
        .insert(productImages)
        .values({
          productId: product.id,
          variantId: variant.id,
          url: 'https://example.com/images/p1.jpg',
          altText: 'Product photo',
          sortOrder: 0,
          isPrimary: true,
          rightsStatus: 'manual_upload',
        })
        .returning();

      expect(image1.rightsStatus).toBe('manual_upload');
      expect(image1.isPrimary).toBe(true);

      // Insert image with verified_commercial rights
      const [image2] = await database.db
        .insert(productImages)
        .values({
          productId: product.id,
          url: 'https://example.com/images/p2.jpg',
          altText: 'Catalog image',
          sortOrder: 1,
          isPrimary: false,
          rightsStatus: 'verified_commercial',
        })
        .returning();

      expect(image2.rightsStatus).toBe('verified_commercial');

      // Invalid rightsStatus throws
      await expect(
        database.db.insert(productImages).values({
          productId: product.id,
          url: 'https://example.com/images/invalid.jpg',
          rightsStatus: 'illegal_source' as unknown as 'manual_upload',
        }),
      ).rejects.toThrow();

      // Negative sortOrder throws
      await expect(
        database.db.insert(productImages).values({
          productId: product.id,
          url: 'https://example.com/images/sort.jpg',
          sortOrder: -1,
        }),
      ).rejects.toThrow();

      // Deleting variant sets image variant_id to null (set null)
      await database.db.delete(productVariants).where(eq(productVariants.id, variant.id));
      const [refreshedImage1] = await database.db
        .select()
        .from(productImages)
        .where(eq(productImages.id, image1.id));
      expect(refreshedImage1.variantId).toBeNull();

      // Deleting product cascades to delete all images
      await database.db.delete(products).where(eq(products.id, product.id));
      const remainingImages = await database.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));
      expect(remainingImages).toHaveLength(0);
    });

    it('manages product relationships with self-relation prevention', async () => {
      const slugSuffix = randomUUID();
      const [brand] = await database.db
        .insert(brands)
        .values({
          name: `Rel Brand ${slugSuffix}`,
          slug: `rel-brand-${slugSuffix}`,
        })
        .returning();

      const [productA] = await database.db
        .insert(products)
        .values({
          name: 'Product A',
          slug: `rel-prod-a-${slugSuffix}`,
          brandId: brand.id,
        })
        .returning();

      const [productB] = await database.db
        .insert(products)
        .values({
          name: 'Product B',
          slug: `rel-prod-b-${slugSuffix}`,
          brandId: brand.id,
        })
        .returning();

      // Insert valid relationship
      const [rel] = await database.db
        .insert(productRelationships)
        .values({
          sourceProductId: productA.id,
          targetProductId: productB.id,
          relationshipType: 'compatible',
          confirmedByAdmin: true,
          notes: 'Compatible accessories',
        })
        .returning();

      expect(rel.relationshipType).toBe('compatible');
      expect(rel.confirmedByAdmin).toBe(true);

      // Duplicate relationship type between same products throws
      await expect(
        database.db.insert(productRelationships).values({
          sourceProductId: productA.id,
          targetProductId: productB.id,
          relationshipType: 'compatible',
        }),
      ).rejects.toThrow();

      // Self-relation throws check constraint
      await expect(
        database.db.insert(productRelationships).values({
          sourceProductId: productA.id,
          targetProductId: productA.id,
          relationshipType: 'related',
        }),
      ).rejects.toThrow();

      // Invalid relationship type throws
      await expect(
        database.db.insert(productRelationships).values({
          sourceProductId: productA.id,
          targetProductId: productB.id,
          relationshipType: 'invalid_rel' as unknown as 'related',
        }),
      ).rejects.toThrow();

      // Deleting source product cascades and deletes relationship
      await database.db.delete(products).where(eq(products.id, productA.id));
      const remainingRels = await database.db
        .select()
        .from(productRelationships)
        .where(eq(productRelationships.id, rel.id));
      expect(remainingRels).toHaveLength(0);
    });

    describe('getProductEffectivePricing query helper', () => {
      it('resolves calculated pricing for base product without variants', async () => {
        const slugSuffix = randomUUID();
        const [brand] = await database.db
          .insert(brands)
          .values({
            name: `Eff Brand 1 ${slugSuffix}`,
            slug: `eff-brand-1-${slugSuffix}`,
          })
          .returning();

        const [product] = await database.db
          .insert(products)
          .values({
            name: 'Base Product Only',
            slug: `eff-prod-1-${slugSuffix}`,
            brandId: brand.id,
            mrpPaise: 100000,
            offerPricePaise: 90000,
            discountType: 'fixed',
            discountValue: 5000,
          })
          .returning();

        const basePricing = await getProductEffectivePricing(database.db, {
          productId: product.id,
          quantity: 2,
        });

        expect(basePricing).not.toBeNull();
        expect(basePricing?.mrpPaise).toBe(100000);
        expect(basePricing?.offerPricePaise).toBe(90000);
        expect(basePricing?.discountType).toBe('fixed');
        expect(basePricing?.discountValue).toBe(5000);
        expect(basePricing?.discountAmountPaise).toBe(5000);
        expect(basePricing?.finalUnitPricePaise).toBe(85000);
        expect(basePricing?.quantity).toBe(2);
        expect(basePricing?.lineTotalPaise).toBe(170000);
        expect(basePricing?.savingsAgainstMrpPaise).toBe(30000);
      });

      it('resolves inherited pricing for variant with null pricing overrides', async () => {
        const slugSuffix = randomUUID();
        const [brand] = await database.db
          .insert(brands)
          .values({
            name: `Eff Brand 2 ${slugSuffix}`,
            slug: `eff-brand-2-${slugSuffix}`,
          })
          .returning();

        const [product] = await database.db
          .insert(products)
          .values({
            name: 'Inherited Product',
            slug: `eff-prod-2-${slugSuffix}`,
            brandId: brand.id,
            mrpPaise: 100000,
            offerPricePaise: 90000,
            discountType: 'fixed',
            discountValue: 5000,
          })
          .returning();

        const [variantInherited] = await database.db
          .insert(productVariants)
          .values({
            productId: product.id,
            sku: `eff-var-inh-${slugSuffix}`,
          })
          .returning();

        const inheritedPricing = await getProductEffectivePricing(database.db, {
          productId: product.id,
          variantId: variantInherited.id,
        });

        expect(inheritedPricing).not.toBeNull();
        expect(inheritedPricing?.mrpPaise).toBe(100000);
        expect(inheritedPricing?.offerPricePaise).toBe(90000);
        expect(inheritedPricing?.discountType).toBe('fixed');
        expect(inheritedPricing?.finalUnitPricePaise).toBe(85000);
      });

      it('resolves overridden pricing for variant with price and discount overrides', async () => {
        const slugSuffix = randomUUID();
        const [brand] = await database.db
          .insert(brands)
          .values({
            name: `Eff Brand 3 ${slugSuffix}`,
            slug: `eff-brand-3-${slugSuffix}`,
          })
          .returning();

        const [product] = await database.db
          .insert(products)
          .values({
            name: 'Overridden Product',
            slug: `eff-prod-3-${slugSuffix}`,
            brandId: brand.id,
            mrpPaise: 100000,
            offerPricePaise: 90000,
            discountType: 'fixed',
            discountValue: 5000,
          })
          .returning();

        const [variantOverride] = await database.db
          .insert(productVariants)
          .values({
            productId: product.id,
            sku: `eff-var-ovr-${slugSuffix}`,
            offerPricePaise: 80000,
            discountType: 'percentage',
            discountValue: 1000, // 10%
          })
          .returning();

        const overridePricing = await getProductEffectivePricing(database.db, {
          productId: product.id,
          variantId: variantOverride.id,
        });

        expect(overridePricing).not.toBeNull();
        expect(overridePricing?.mrpPaise).toBe(100000); // inherited from product
        expect(overridePricing?.offerPricePaise).toBe(80000); // overridden
        expect(overridePricing?.discountType).toBe('percentage');
        expect(overridePricing?.discountValue).toBe(1000);
        expect(overridePricing?.discountAmountPaise).toBe(8000); // 10% of 80000
        expect(overridePricing?.finalUnitPricePaise).toBe(72000);
        expect(overridePricing?.savingsAgainstMrpPaise).toBe(28000);
      });

      it('returns null for non-existent product or mismatching variant', async () => {
        const missingProduct = await getProductEffectivePricing(database.db, {
          productId: randomUUID(),
        });
        expect(missingProduct).toBeNull();

        const [brand] = await database.db
          .insert(brands)
          .values({
            name: `Eff Brand 4 ${randomUUID()}`,
            slug: `eff-brand-4-${randomUUID()}`,
          })
          .returning();

        const [product] = await database.db
          .insert(products)
          .values({
            name: 'Missing Variant Prod',
            slug: `eff-prod-4-${randomUUID()}`,
            brandId: brand.id,
            mrpPaise: 10000,
            offerPricePaise: 9000,
          })
          .returning();

        const missingVariant = await getProductEffectivePricing(database.db, {
          productId: product.id,
          variantId: randomUUID(),
        });
        expect(missingVariant).toBeNull();
      });
    });
  });
});
