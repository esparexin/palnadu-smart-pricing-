import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { inventoryAlerts, inventoryBalances, inventoryMovements } from './inventory.schema.js';
import { products, productVariants } from './catalogue.schema.js';
import { getInventoryConfig } from './inventory-config.js';
import type {
  CreateStockMovementRequest,
  InventoryBalanceResponse,
  StockStatus,
} from '@palnadu/contracts';

export function determineStockStatus(available: number, threshold: number): StockStatus {
  if (available <= 0) return 'out_of_stock';
  if (available <= threshold) return available === 1 ? 'critical' : 'low_stock';
  return 'in_stock';
}

export async function recordStockMovement(
  db: DbExecutor,
  input: CreateStockMovementRequest,
  actorId?: string | null,
) {
  const config = await getInventoryConfig(db);
  if (config.stockOwnership === 'external_erp') {
    throw new Error('Smart Pricing cannot mutate stock when external ERP owns stock.');
  }

  const [movement] = await db
    .insert(inventoryMovements)
    .values({
      variantId: input.variantId,
      quantity: input.quantity,
      movementType: input.movementType,
      location: input.location ?? null,
      reason: input.reason ?? null,
      externalReference: input.externalReference ?? null,
      actorId: actorId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    })
    .returning();

  const [existingBalance] = await db
    .select()
    .from(inventoryBalances)
    .where(eq(inventoryBalances.variantId, input.variantId))
    .limit(1);

  const prevQty = existingBalance?.availableQuantity ?? 0;
  const threshold = existingBalance?.lowStockThreshold ?? config.defaultThreshold;
  const newQty = prevQty + input.quantity;

  let balance;
  if (existingBalance) {
    [balance] = await db
      .update(inventoryBalances)
      .set({
        availableQuantity: newQty,
        version: existingBalance.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBalances.id, existingBalance.id))
      .returning();
  } else {
    [balance] = await db
      .insert(inventoryBalances)
      .values({
        variantId: input.variantId,
        location: input.location ?? null,
        availableQuantity: newQty,
        lowStockThreshold: threshold,
        version: 1,
      })
      .returning();
  }

  const stockStatus = determineStockStatus(newQty, threshold);

  if (stockStatus !== 'in_stock') {
    await db.insert(inventoryAlerts).values({
      variantId: input.variantId,
      alertClass: stockStatus,
      thresholdSnapshot: threshold,
      availableSnapshot: newQty,
      state: 'active',
    });
  } else {
    await db
      .update(inventoryAlerts)
      .set({
        state: 'cleared',
        clearedAt: new Date(),
      })
      .where(
        and(eq(inventoryAlerts.variantId, input.variantId), eq(inventoryAlerts.state, 'active')),
      );
  }

  return { movement, balance, stockStatus };
}

export async function listInventoryBalances(
  db: DbExecutor,
  params: { limit?: number; offset?: number },
): Promise<InventoryBalanceResponse[]> {
  const { limit = 50, offset = 0 } = params;
  const config = await getInventoryConfig(db);

  const rows = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      productName: products.name,
      location: inventoryBalances.location,
      availableQuantity: inventoryBalances.availableQuantity,
      reservedQuantity: inventoryBalances.reservedQuantity,
      lowStockThreshold: inventoryBalances.lowStockThreshold,
      updatedAt: inventoryBalances.updatedAt,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(inventoryBalances, eq(productVariants.id, inventoryBalances.variantId))
    .orderBy(products.name)
    .limit(limit)
    .offset(offset);

  return rows.map((r) => {
    const available = r.availableQuantity ?? 0;
    const threshold = r.lowStockThreshold ?? config.defaultThreshold;
    const stockStatus = !config.enabled ? 'untracked' : determineStockStatus(available, threshold);

    return {
      variantId: r.variantId,
      sku: r.sku,
      productName: r.productName,
      location: r.location ?? null,
      availableQuantity: available,
      reservedQuantity: r.reservedQuantity ?? 0,
      lowStockThreshold: threshold,
      stockStatus,
      updatedAt: (r.updatedAt ?? new Date()).toISOString(),
    };
  });
}
