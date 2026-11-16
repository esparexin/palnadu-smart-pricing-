import { desc, eq } from 'drizzle-orm';
import type { AlertClass, AlertState } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { inventoryAlerts, inventoryMovements } from './inventory.schema.js';
import { adminUsers } from './auth.schema.js';
import { products, productVariants } from './catalogue.schema.js';

export async function listInventoryMovements(
  db: DbExecutor,
  params: { variantId?: string; limit?: number; offset?: number },
) {
  const { variantId, limit = 50, offset = 0 } = params;
  const whereClause = variantId ? eq(inventoryMovements.variantId, variantId) : undefined;

  const rows = await db
    .select({
      id: inventoryMovements.id,
      variantId: inventoryMovements.variantId,
      sku: productVariants.sku,
      productName: products.name,
      quantity: inventoryMovements.quantity,
      movementType: inventoryMovements.movementType,
      location: inventoryMovements.location,
      reason: inventoryMovements.reason,
      externalReference: inventoryMovements.externalReference,
      actorName: adminUsers.name,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .innerJoin(productVariants, eq(inventoryMovements.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(adminUsers, eq(inventoryMovements.actorId, adminUsers.id))
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listInventoryAlerts(
  db: DbExecutor,
  params: { state?: 'active' | 'cleared' | 'acknowledged'; limit?: number },
) {
  const { state = 'active', limit = 50 } = params;

  const rows = await db
    .select({
      id: inventoryAlerts.id,
      variantId: inventoryAlerts.variantId,
      sku: productVariants.sku,
      productName: products.name,
      alertClass: inventoryAlerts.alertClass,
      thresholdSnapshot: inventoryAlerts.thresholdSnapshot,
      availableSnapshot: inventoryAlerts.availableSnapshot,
      state: inventoryAlerts.state,
      clearedAt: inventoryAlerts.clearedAt,
      createdAt: inventoryAlerts.createdAt,
    })
    .from(inventoryAlerts)
    .innerJoin(productVariants, eq(inventoryAlerts.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(inventoryAlerts.state, state))
    .orderBy(desc(inventoryAlerts.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    variantId: r.variantId,
    sku: r.sku,
    productName: r.productName,
    alertClass: r.alertClass as AlertClass,
    thresholdSnapshot: r.thresholdSnapshot,
    availableSnapshot: r.availableSnapshot,
    state: r.state as AlertState,
    clearedAt: r.clearedAt ? r.clearedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function acknowledgeInventoryAlert(db: DbExecutor, alertId: string) {
  const [updated] = await db
    .update(inventoryAlerts)
    .set({ state: 'acknowledged' })
    .where(eq(inventoryAlerts.id, alertId))
    .returning();
  return updated ?? null;
}
