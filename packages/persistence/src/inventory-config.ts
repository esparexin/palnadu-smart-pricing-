import { eq } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { inventoryConfiguration } from './inventory.schema.js';
import type {
  InventoryConfig,
  StockOwnership,
  UpdateInventoryConfigRequest,
} from '@palnadu/contracts';

const DEFAULT_CONFIG: InventoryConfig = {
  enabled: false,
  stockOwnership: 'smart_pricing',
  defaultThreshold: 1,
};

export async function getInventoryConfig(db: DbExecutor): Promise<InventoryConfig> {
  const [row] = await db
    .select()
    .from(inventoryConfiguration)
    .where(eq(inventoryConfiguration.id, 'default'))
    .limit(1);

  if (!row) return DEFAULT_CONFIG;

  return {
    enabled: row.enabled,
    stockOwnership: row.stockOwnership as StockOwnership,
    defaultThreshold: row.defaultThreshold,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export async function updateInventoryConfig(
  db: DbExecutor,
  updates: UpdateInventoryConfigRequest,
): Promise<InventoryConfig> {
  const current = await getInventoryConfig(db);
  const next = {
    enabled: updates.enabled ?? current.enabled,
    stockOwnership: updates.stockOwnership ?? current.stockOwnership,
    defaultThreshold: updates.defaultThreshold ?? current.defaultThreshold,
    updatedAt: new Date(),
  };

  const [saved] = await db
    .insert(inventoryConfiguration)
    .values({
      id: 'default',
      ...next,
    })
    .onConflictDoUpdate({
      target: inventoryConfiguration.id,
      set: next,
    })
    .returning();

  return {
    enabled: saved.enabled,
    stockOwnership: saved.stockOwnership as StockOwnership,
    defaultThreshold: saved.defaultThreshold,
    updatedAt: saved.updatedAt.toISOString(),
  };
}
