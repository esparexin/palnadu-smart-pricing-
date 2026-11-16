import { eq } from 'drizzle-orm';
import type { DbExecutor } from './client.js';
import { whatsappMessages, whatsappOptOuts } from './whatsapp.schema.js';

const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'OPTOUT', 'CANCEL', 'QUIT'];
const OPT_IN_KEYWORDS = ['START', 'UNSTOP'];

export interface InboundMessageInput {
  wamid: string;
  fromNumber: string;
  toNumber: string;
  messageType: string;
  text?: string;
  rawPayload?: unknown;
}

export async function handleWhatsAppInboundMessage(
  db: DbExecutor,
  msg: InboundMessageInput,
): Promise<{ status: 'duplicate' | 'opt_out' | 'opt_in' | 'received'; wamid: string }> {
  // Idempotency check: duplicate event protection
  const [existing] = await db
    .select({ id: whatsappMessages.id })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.wamid, msg.wamid));

  if (existing) {
    return { status: 'duplicate', wamid: msg.wamid };
  }

  const cleanText = (msg.text || '').trim().toUpperCase();
  let contentSummary = msg.text || `[${msg.messageType} message]`;
  let resultStatus: 'opt_out' | 'opt_in' | 'received' = 'received';

  if (OPT_OUT_KEYWORDS.includes(cleanText)) {
    // Record opt-out consent withdrawal
    await db
      .insert(whatsappOptOuts)
      .values({
        phoneNumber: msg.fromNumber,
        reason: `Opted out via keyword '${cleanText}'`,
      })
      .onConflictDoNothing();

    contentSummary = `Customer opted out (keyword: ${cleanText})`;
    resultStatus = 'opt_out';
  } else if (OPT_IN_KEYWORDS.includes(cleanText)) {
    // Re-enable opt-in
    await db.delete(whatsappOptOuts).where(eq(whatsappOptOuts.phoneNumber, msg.fromNumber));

    contentSummary = `Customer opted in (keyword: ${cleanText})`;
    resultStatus = 'opt_in';
  }

  await db.insert(whatsappMessages).values({
    wamid: msg.wamid,
    direction: 'inbound',
    fromNumber: msg.fromNumber,
    toNumber: msg.toNumber,
    messageType: msg.messageType,
    contentSummary,
    rawPayload: msg.rawPayload as Record<string, unknown>,
    status: 'received',
  });

  return { status: resultStatus, wamid: msg.wamid };
}

export async function handleWhatsAppStatusUpdate(
  db: DbExecutor,
  update: {
    wamid: string;
    status: string;
    errorMessage?: string;
  },
): Promise<boolean> {
  const result = await db
    .update(whatsappMessages)
    .set({
      status: update.status,
      errorMessage: update.errorMessage || null,
    })
    .where(eq(whatsappMessages.wamid, update.wamid));

  return (result as { count?: number })?.count !== 0;
}

export async function recordOutboundMessage(
  db: DbExecutor,
  msg: {
    wamid: string;
    fromNumber: string;
    toNumber: string;
    messageType: string;
    contentSummary: string;
    rawPayload?: unknown;
    status?: string;
    errorMessage?: string;
  },
) {
  const [created] = await db
    .insert(whatsappMessages)
    .values({
      wamid: msg.wamid,
      direction: 'outbound',
      fromNumber: msg.fromNumber,
      toNumber: msg.toNumber,
      messageType: msg.messageType,
      contentSummary: msg.contentSummary,
      rawPayload: msg.rawPayload as Record<string, unknown>,
      status: msg.status || 'sent',
      errorMessage: msg.errorMessage || null,
    })
    .returning();

  return created;
}
