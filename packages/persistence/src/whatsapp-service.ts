import { desc, eq } from 'drizzle-orm';
import type {
  UpdateWhatsAppConfigRequest,
  WhatsAppConfig,
  WhatsAppMessageListItem,
  WhatsAppOptOutListItem,
} from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import { whatsappConfigurations, whatsappMessages, whatsappOptOuts } from './whatsapp.schema.js';
import { decryptSecret, encryptSecret } from './whatsapp-crypto.js';

const DEFAULT_CONFIG_ID = 'default';

export async function getWhatsAppConfig(db: DbExecutor, baseUrl: string): Promise<WhatsAppConfig> {
  const [row] = await db
    .select()
    .from(whatsappConfigurations)
    .where(eq(whatsappConfigurations.id, DEFAULT_CONFIG_ID));

  if (!row) {
    const defaultToken = 'palnadu_verify_token_default';
    const [created] = await db
      .insert(whatsappConfigurations)
      .values({
        id: DEFAULT_CONFIG_ID,
        enabled: false,
        verifyToken: defaultToken,
      })
      .returning();

    return formatConfig(created, baseUrl);
  }

  return formatConfig(row, baseUrl);
}

export async function updateWhatsAppConfig(
  db: DbExecutor,
  updates: UpdateWhatsAppConfigRequest,
  baseUrl: string,
): Promise<WhatsAppConfig> {
  await getWhatsAppConfig(db, baseUrl);

  const valuesToSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.enabled !== undefined) valuesToSet.enabled = updates.enabled;
  if (updates.phoneNumberId !== undefined) valuesToSet.phoneNumberId = updates.phoneNumberId;
  if (updates.wabaId !== undefined) valuesToSet.wabaId = updates.wabaId;
  if (updates.verifiedNumber !== undefined) valuesToSet.verifiedNumber = updates.verifiedNumber;
  if (updates.apiVersion !== undefined) valuesToSet.apiVersion = updates.apiVersion;
  if (updates.verifyToken !== undefined) valuesToSet.verifyToken = updates.verifyToken;
  if (updates.humanHandoverEnabled !== undefined) {
    valuesToSet.humanHandoverEnabled = updates.humanHandoverEnabled;
  }
  if (updates.accessToken) {
    valuesToSet.accessTokenEncrypted = encryptSecret(updates.accessToken);
  }
  if (updates.appSecret) {
    valuesToSet.appSecretEncrypted = encryptSecret(updates.appSecret);
  }

  const [updated] = await db
    .update(whatsappConfigurations)
    .set(valuesToSet)
    .where(eq(whatsappConfigurations.id, DEFAULT_CONFIG_ID))
    .returning();

  return formatConfig(updated, baseUrl);
}

export async function getDecryptedWhatsAppSecrets(db: DbExecutor) {
  const [row] = await db
    .select()
    .from(whatsappConfigurations)
    .where(eq(whatsappConfigurations.id, DEFAULT_CONFIG_ID));

  if (!row) return null;

  let accessToken: string | null = null;
  let appSecret: string | null = null;

  if (row.accessTokenEncrypted) {
    try {
      accessToken = decryptSecret(row.accessTokenEncrypted);
    } catch {
      accessToken = null;
    }
  }

  if (row.appSecretEncrypted) {
    try {
      appSecret = decryptSecret(row.appSecretEncrypted);
    } catch {
      appSecret = null;
    }
  }

  return {
    enabled: row.enabled,
    phoneNumberId: row.phoneNumberId,
    wabaId: row.wabaId,
    apiVersion: row.apiVersion,
    verifyToken: row.verifyToken,
    humanHandoverEnabled: row.humanHandoverEnabled,
    accessToken,
    appSecret,
  };
}

function formatConfig(
  row: typeof whatsappConfigurations.$inferSelect,
  baseUrl: string,
): WhatsAppConfig {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return {
    id: '00000000-0000-0000-0000-000000000001',
    enabled: row.enabled,
    phoneNumberId: row.phoneNumberId,
    wabaId: row.wabaId,
    verifiedNumber: row.verifiedNumber,
    apiVersion: row.apiVersion,
    webhookUrl: `${cleanBase}/api/v1/whatsapp/webhook`,
    verifyToken: row.verifyToken,
    humanHandoverEnabled: row.humanHandoverEnabled,
    hasAccessToken: Boolean(row.accessTokenEncrypted),
    hasAppSecret: Boolean(row.appSecretEncrypted),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWhatsAppMessages(
  db: DbExecutor,
  limit = 50,
  offset = 0,
): Promise<WhatsAppMessageListItem[]> {
  const rows = await db
    .select()
    .from(whatsappMessages)
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    wamid: r.wamid,
    direction: r.direction as 'inbound' | 'outbound',
    fromNumber: r.fromNumber,
    toNumber: r.toNumber,
    messageType: r.messageType,
    contentSummary: r.contentSummary,
    status: r.status as 'sent' | 'delivered' | 'read' | 'failed' | 'received',
    errorMessage: r.errorMessage,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listWhatsAppOptOuts(db: DbExecutor): Promise<WhatsAppOptOutListItem[]> {
  const rows = await db.select().from(whatsappOptOuts).orderBy(desc(whatsappOptOuts.optedOutAt));

  return rows.map((r) => ({
    phoneNumber: r.phoneNumber,
    reason: r.reason,
    optedOutAt: r.optedOutAt.toISOString(),
  }));
}

export async function isNumberOptedOut(db: DbExecutor, phoneNumber: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(whatsappOptOuts)
    .where(eq(whatsappOptOuts.phoneNumber, phoneNumber));
  return Boolean(row);
}
