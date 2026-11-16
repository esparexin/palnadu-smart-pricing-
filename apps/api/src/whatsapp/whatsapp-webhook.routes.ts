import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import {
  getDecryptedWhatsAppSecrets,
  handleWhatsAppInboundMessage,
  handleWhatsAppStatusUpdate,
  verifyWebhookSignature,
} from '@palnadu/persistence';

export interface WhatsAppWebhookRoutesOptions {
  database: DatabaseClient;
}

export const whatsappWebhookRoutes: FastifyPluginAsync<WhatsAppWebhookRoutesOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;

  rawApp.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as unknown as { rawBody?: Buffer | string }).rawBody = body;
    try {
      const json = JSON.parse(body.toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Meta Webhook Verification challenge
  rawApp.get('/webhook', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const secrets = await getDecryptedWhatsAppSecrets(database.db);
    const expectedToken = secrets?.verifyToken || 'palnadu_verify_token_default';

    if (mode === 'subscribe' && token === expectedToken && challenge) {
      return reply.status(200).type('text/plain').send(challenge);
    }

    return reply.status(403).send('Verification failed');
  });

  // Meta Webhook Inbound Message & Status updates
  rawApp.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const secrets = await getDecryptedWhatsAppSecrets(database.db);

    if (secrets?.appSecret) {
      const rawBody =
        (request as unknown as { rawBody?: Buffer | string }).rawBody ||
        JSON.stringify(request.body);
      const isValid = verifyWebhookSignature(rawBody, signature, secrets.appSecret);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid webhook signature' });
      }
    }

    const payload = request.body as Record<string, unknown>;
    await processWebhookPayload(database, payload);

    return reply.status(200).send({ status: 'ok' });
  });
};

async function processInboundMessages(
  database: DatabaseClient,
  messages: Array<Record<string, unknown>>,
  defaultTo: string,
) {
  for (const msg of messages) {
    const wamid = String(msg.id || '');
    const from = String(msg.from || '');
    const type = String(msg.type || 'text');
    const textObj = msg.text as Record<string, unknown> | undefined;
    const text = typeof textObj?.body === 'string' ? textObj.body : undefined;

    if (wamid && from) {
      await handleWhatsAppInboundMessage(database.db, {
        wamid,
        fromNumber: from,
        toNumber: defaultTo,
        messageType: type,
        text,
        rawPayload: msg,
      });
    }
  }
}

async function processStatusUpdates(
  database: DatabaseClient,
  statuses: Array<Record<string, unknown>>,
) {
  for (const status of statuses) {
    const wamid = String(status.id || '');
    const currentStatus = String(status.status || '');
    if (wamid && currentStatus) {
      await handleWhatsAppStatusUpdate(database.db, {
        wamid,
        status: currentStatus,
      });
    }
  }
}

async function processWebhookPayload(database: DatabaseClient, body: Record<string, unknown>) {
  if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body?.entry)) {
    return;
  }

  for (const entry of body.entry as Array<Record<string, unknown>>) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes as Array<Record<string, unknown>>) {
      const val = change?.value as Record<string, unknown> | undefined;
      if (!val) continue;

      const to = String((val.metadata as Record<string, unknown>)?.display_phone_number || '');

      if (Array.isArray(val.messages)) {
        await processInboundMessages(database, val.messages as Array<Record<string, unknown>>, to);
      }

      if (Array.isArray(val.statuses)) {
        await processStatusUpdates(database, val.statuses as Array<Record<string, unknown>>);
      }
    }
  }
}
