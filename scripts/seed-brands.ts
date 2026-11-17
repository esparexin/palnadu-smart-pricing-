import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_BRANDS } from '../packages/contracts/src/index.js';
import {
  createBrand,
  createDatabase,
  findBrandByNormalizedNameOrSlug,
  type DatabaseClient,
  type DbExecutor,
} from '../packages/persistence/src/index.js';
import { parseServerConfig } from '../packages/server-config/src/index.js';

export interface SeedBrandsOptions {
  env?: Record<string, string | undefined>;
  argv?: string[];
  db?: DbExecutor;
  dryRun?: boolean;
}

export interface BrandSeedResultItem {
  canonicalName: string;
  canonicalSlug: string;
  status: 'existing' | 'inserted' | 'would_insert';
  id?: string;
  notes?: string;
}

export interface BrandSeedSummary {
  sanitizedDatabaseTarget: string;
  isDryRun: boolean;
  totalCanonical: number;
  existingCount: number;
  insertedCount: number;
  wouldInsertCount: number;
  items: BrandSeedResultItem[];
}

function loadLocalEnvFile(): void {
  const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

export function isProductionDatabaseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('prisma.io') ||
    lower.includes('render.com') ||
    lower.includes('prod') ||
    lower.includes('rds.amazonaws.com')
  );
}

async function processBrandSeedItem(
  db: DbExecutor,
  brand: (typeof CANONICAL_BRANDS)[number],
  isDryRun: boolean,
): Promise<BrandSeedResultItem> {
  const existing = await findBrandByNormalizedNameOrSlug(db, brand.name, brand.slug);
  if (existing) {
    return {
      canonicalName: brand.name,
      canonicalSlug: brand.slug,
      status: 'existing',
      id: existing.id,
      notes: 'Already present in registry',
    };
  }
  if (isDryRun) {
    return {
      canonicalName: brand.name,
      canonicalSlug: brand.slug,
      status: 'would_insert',
      notes: 'Would be inserted during live run',
    };
  }
  const created = await createBrand(db, { name: brand.name, slug: brand.slug });
  return {
    canonicalName: brand.name,
    canonicalSlug: brand.slug,
    status: 'inserted',
    id: created.id,
    notes: 'Successfully inserted canonical brand',
  };
}

function resolveDatabaseContext(
  options: SeedBrandsOptions,
  isDryRun: boolean,
): {
  sanitizedTarget: string;
  dbClient?: DatabaseClient;
  dbExecutor: DbExecutor;
} {
  const env = options.env ?? process.env;
  const databaseUrl = env.TEST_DATABASE_URL || env.DATABASE_URL;
  if (!databaseUrl && !options.db) {
    throw new Error('Database URL is required (TEST_DATABASE_URL or DATABASE_URL).');
  }

  if (databaseUrl && isProductionDatabaseUrl(databaseUrl) && !isDryRun) {
    throw new Error(
      'CRITICAL SAFETY REFUSAL: Target database appears to be a remote or production environment. Non-dry-run brand seeding requires an explicit disposable test database (e.g. TEST_DATABASE_URL).',
    );
  }

  const sanitizedTarget = databaseUrl
    ? databaseUrl.replace(/:[^:@]+@/, ':***@')
    : 'injected_db_executor';
  if (options.db) {
    return { sanitizedTarget, dbExecutor: options.db };
  }

  const config = parseServerConfig({ ...env, DATABASE_URL: databaseUrl, LOG_LEVEL: 'silent' });
  const dbClient = createDatabase(config);
  return { sanitizedTarget, dbClient, dbExecutor: dbClient.db };
}

export async function seedCanonicalBrands(
  options: SeedBrandsOptions = {},
): Promise<BrandSeedSummary> {
  if (!options.env) {
    loadLocalEnvFile();
  }

  const env = options.env ?? process.env;
  const argv = options.argv ?? process.argv.slice(2);
  const isDryRun = options.dryRun ?? (argv.includes('--dry-run') || env.DRY_RUN === 'true');

  const { sanitizedTarget, dbClient, dbExecutor } = resolveDatabaseContext(options, isDryRun);

  const summary: BrandSeedSummary = {
    sanitizedDatabaseTarget: sanitizedTarget,
    isDryRun,
    totalCanonical: CANONICAL_BRANDS.length,
    existingCount: 0,
    insertedCount: 0,
    wouldInsertCount: 0,
    items: [],
  };

  try {
    for (const brand of CANONICAL_BRANDS) {
      const item = await processBrandSeedItem(dbExecutor, brand, isDryRun);
      if (item.status === 'existing') summary.existingCount++;
      else if (item.status === 'inserted') summary.insertedCount++;
      else summary.wouldInsertCount++;
      summary.items.push(item);
    }
    return summary;
  } finally {
    if (dbClient) {
      await dbClient.close();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  seedCanonicalBrands()
    .then((summary) => {
      console.log('=== CANONICAL BRAND SEED REPORT ===');
      console.log(`Target: ${summary.sanitizedDatabaseTarget}`);
      console.log(
        `Dry Run: ${summary.isDryRun ? 'YES (No database writes performed)' : 'NO (Live execution)'}`,
      );
      console.log(`Total Canonical Brands: ${summary.totalCanonical}`);
      console.log(`Existing: ${summary.existingCount}`);
      console.log(`Inserted: ${summary.insertedCount}`);
      console.log(`Would Insert: ${summary.wouldInsertCount}`);
      console.log('-----------------------------------');
      for (const item of summary.items) {
        console.log(
          `[${item.status.toUpperCase()}] ${item.canonicalName} (${item.canonicalSlug}) ${item.id ? `ID: ${item.id}` : ''}`,
        );
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
