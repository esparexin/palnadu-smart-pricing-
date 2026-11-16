import { eq } from 'drizzle-orm';
import type { ErpSyncJob } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { erpConnectors, erpSyncJobs } from './integrations.schema.js';
import { productVariants } from './catalogue.schema.js';
import { inventoryBalances } from './inventory.schema.js';
import { parseTallyStockItemsXml, type ParsedTallyStockItem } from './tally-parser.js';

export async function executeSyncJob(
  db: DbExecutor,
  connectorId: string,
  options: { jobType: string; payloadData?: string },
): Promise<ErpSyncJob> {
  const [connector] = await db
    .select()
    .from(erpConnectors)
    .where(eq(erpConnectors.id, connectorId));

  if (!connector) {
    throw new Error('ERP Connector not found');
  }

  // Create running sync job record
  const [job] = await db
    .insert(erpSyncJobs)
    .values({
      connectorId,
      jobType: options.jobType,
      status: 'in_progress',
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
    })
    .returning();

  let itemsProcessed = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  let errorLog: string | null = null;
  let finalStatus: 'completed' | 'failed' = 'completed';

  try {
    const rawItems = extractRawItems(connector.provider, options.payloadData);

    for (const item of rawItems) {
      try {
        const result = await processSyncItem(db, connector, item);
        itemsProcessed++;
        if (result === 'created') itemsCreated++;
        if (result === 'updated') itemsUpdated++;
      } catch (err: unknown) {
        itemsFailed++;
        errorLog = `Failed item ${item.sku}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  } catch (err: unknown) {
    finalStatus = 'failed';
    errorLog = err instanceof Error ? err.message : 'Sync execution failed';
  }

  // Update sync job
  const [completedJob] = await db
    .update(erpSyncJobs)
    .set({
      status: finalStatus,
      itemsProcessed,
      itemsCreated,
      itemsUpdated,
      itemsFailed,
      errorLog,
      completedAt: new Date(),
    })
    .where(eq(erpSyncJobs.id, job.id))
    .returning();

  // Update connector state
  await db
    .update(erpConnectors)
    .set({
      lastSyncAt: new Date(),
      lastSyncStatus: finalStatus === 'completed' ? 'success' : 'failed',
    })
    .where(eq(erpConnectors.id, connectorId));

  return {
    id: completedJob.id,
    connectorId: completedJob.connectorId,
    jobType: completedJob.jobType as 'products' | 'inventory' | 'full',
    status: completedJob.status as 'pending' | 'in_progress' | 'completed' | 'failed',
    itemsProcessed: completedJob.itemsProcessed,
    itemsCreated: completedJob.itemsCreated,
    itemsUpdated: completedJob.itemsUpdated,
    itemsFailed: completedJob.itemsFailed,
    errorLog: completedJob.errorLog,
    startedAt: completedJob.startedAt.toISOString(),
    completedAt: completedJob.completedAt ? completedJob.completedAt.toISOString() : null,
  };
}

function parseJsonString(p: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (p[k]) return String(p[k]);
  }
  return '';
}

function parseJsonNumber(p: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (p[k] !== undefined && p[k] !== null) return Number(p[k]);
  }
  return undefined;
}

function parseGenericJsonItem(p: Record<string, unknown>): ParsedTallyStockItem {
  const name = parseJsonString(p, ['name', 'ItemName', 'title']);
  const sku = parseJsonString(p, ['sku', 'PartNo', 'code', 'name']);
  const quantity = parseJsonNumber(p, ['quantity', 'StockQty', 'qty']) ?? 0;
  const rateRupees = parseJsonNumber(p, ['rateRupees', 'price', 'rate']);
  const hsnCode = parseJsonString(p, ['hsnCode', 'hsn']) || undefined;
  const unit = parseJsonString(p, ['unit']) || undefined;

  return { name, sku, quantity, rateRupees, hsnCode, unit };
}

function extractRawItems(provider: string, payloadData?: string): ParsedTallyStockItem[] {
  if (!payloadData || !payloadData.trim()) {
    return [];
  }

  if (provider === 'tally_prime') {
    return parseTallyStockItemsXml(payloadData);
  }

  try {
    const parsed = JSON.parse(payloadData);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => parseGenericJsonItem(p as Record<string, unknown>));
  } catch {
    return [];
  }
}

async function processSyncItem(
  db: DbExecutor,
  connector: typeof erpConnectors.$inferSelect,
  item: ParsedTallyStockItem,
): Promise<'created' | 'updated' | 'skipped'> {
  if (!item.sku) return 'skipped';

  const [existingVariant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.sku, item.sku));

  if (existingVariant) {
    // Inventory SSOT handling
    if (connector.inventorySsot === 'external_erp') {
      await db
        .insert(inventoryBalances)
        .values({
          variantId: existingVariant.id,
          availableQuantity: item.quantity,
          reservedQuantity: 0,
          lowStockThreshold: 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: inventoryBalances.variantId,
          set: {
            availableQuantity: item.quantity,
            updatedAt: new Date(),
          },
        });
    }

    // Price SSOT handling
    if (connector.priceSsot === 'external_erp' && item.rateRupees !== undefined) {
      const paise = Math.round(item.rateRupees * 100);
      await db
        .update(productVariants)
        .set({
          mrpPaise: paise,
          offerPricePaise: paise,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, existingVariant.id));
    }

    return 'updated';
  }

  if (connector.productSsot === 'external_erp') {
    return 'created';
  }

  return 'skipped';
}
