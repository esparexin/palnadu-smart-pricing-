import { desc, eq } from 'drizzle-orm';
import type {
  CreateErpConnectorRequest,
  EntitySourceOfTruth,
  ErpConnectorConfig,
  ErpProviderType,
  ErpSyncJob,
  UpdateErpConnectorRequest,
} from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { erpConnectors, erpSyncJobs } from './integrations.schema.js';
import { encryptSecret } from './whatsapp-crypto.js';

export async function listConnectors(db: DbExecutor): Promise<ErpConnectorConfig[]> {
  const rows = await db.select().from(erpConnectors).orderBy(desc(erpConnectors.createdAt));

  return rows.map(mapConnectorRow);
}

export async function getConnector(db: DbExecutor, id: string): Promise<ErpConnectorConfig | null> {
  const [row] = await db.select().from(erpConnectors).where(eq(erpConnectors.id, id));

  return row ? mapConnectorRow(row) : null;
}

export async function getConnectorWithSecret(
  db: DbExecutor,
  id: string,
): Promise<typeof erpConnectors.$inferSelect | null> {
  const [row] = await db.select().from(erpConnectors).where(eq(erpConnectors.id, id));

  return row ?? null;
}

export async function createConnector(
  db: DbExecutor,
  req: CreateErpConnectorRequest,
): Promise<ErpConnectorConfig> {
  const [created] = await db
    .insert(erpConnectors)
    .values({
      provider: req.provider,
      name: req.name,
      enabled: req.enabled,
      endpointUrl: req.endpointUrl || null,
      authSecretEncrypted: req.authSecret ? encryptSecret(req.authSecret) : null,
      productSsot: req.productSsot,
      inventorySsot: req.inventorySsot,
      priceSsot: req.priceSsot,
      fieldMappings: req.fieldMappings || {},
      lastSyncStatus: 'idle',
    })
    .returning();

  return mapConnectorRow(created);
}

export async function updateConnector(
  db: DbExecutor,
  id: string,
  req: UpdateErpConnectorRequest,
): Promise<ErpConnectorConfig | null> {
  const valuesToSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (req.name !== undefined) valuesToSet.name = req.name;
  if (req.enabled !== undefined) valuesToSet.enabled = req.enabled;
  if (req.endpointUrl !== undefined) valuesToSet.endpointUrl = req.endpointUrl;
  if (req.authSecret !== undefined) {
    valuesToSet.authSecretEncrypted = req.authSecret ? encryptSecret(req.authSecret) : null;
  }
  if (req.productSsot !== undefined) valuesToSet.productSsot = req.productSsot;
  if (req.inventorySsot !== undefined) valuesToSet.inventorySsot = req.inventorySsot;
  if (req.priceSsot !== undefined) valuesToSet.priceSsot = req.priceSsot;
  if (req.fieldMappings !== undefined) valuesToSet.fieldMappings = req.fieldMappings;

  const [updated] = await db
    .update(erpConnectors)
    .set(valuesToSet)
    .where(eq(erpConnectors.id, id))
    .returning();

  return updated ? mapConnectorRow(updated) : null;
}

export async function deleteConnector(db: DbExecutor, id: string): Promise<boolean> {
  const result = await db.delete(erpConnectors).where(eq(erpConnectors.id, id));
  return (result as { count?: number })?.count !== 0;
}

export async function listSyncJobs(
  db: DbExecutor,
  connectorId: string,
  limit = 20,
): Promise<ErpSyncJob[]> {
  const rows = await db
    .select()
    .from(erpSyncJobs)
    .where(eq(erpSyncJobs.connectorId, connectorId))
    .orderBy(desc(erpSyncJobs.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    connectorId: r.connectorId,
    jobType: r.jobType as 'products' | 'inventory' | 'full',
    status: r.status as 'pending' | 'in_progress' | 'completed' | 'failed',
    itemsProcessed: r.itemsProcessed,
    itemsCreated: r.itemsCreated,
    itemsUpdated: r.itemsUpdated,
    itemsFailed: r.itemsFailed,
    errorLog: r.errorLog,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
  }));
}

function mapConnectorRow(row: typeof erpConnectors.$inferSelect): ErpConnectorConfig {
  return {
    id: row.id,
    provider: row.provider as ErpProviderType,
    name: row.name,
    enabled: row.enabled,
    endpointUrl: row.endpointUrl,
    productSsot: row.productSsot as EntitySourceOfTruth,
    inventorySsot: row.inventorySsot as EntitySourceOfTruth,
    priceSsot: row.priceSsot as EntitySourceOfTruth,
    fieldMappings: (row.fieldMappings || {}) as Record<string, string>,
    hasAuthSecret: Boolean(row.authSecretEncrypted),
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastSyncStatus: (row.lastSyncStatus || 'idle') as 'idle' | 'in_progress' | 'success' | 'failed',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
