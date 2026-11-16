import type { FastifyPluginAsync } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import type { DatabaseClient } from '@palnadu/persistence';
import { decryptSecret, executeSyncJob, getConnectorWithSecret } from '@palnadu/persistence';

export interface IntegrationsWebhookRoutesOptions {
  database: DatabaseClient;
}

interface WebhookBodyObject {
  jobType?: 'products' | 'inventory' | 'full';
  payloadData?: string;
  items?: unknown[];
}

function verifyToken(incomingToken: string | undefined, expectedSecret: string): boolean {
  if (!incomingToken) return false;
  const inBuf = Buffer.from(incomingToken, 'utf8');
  const expBuf = Buffer.from(expectedSecret, 'utf8');
  if (inBuf.length !== expBuf.length) return false;
  try {
    return timingSafeEqual(inBuf, expBuf);
  } catch {
    return false;
  }
}

export const integrationsWebhookRoutes: FastifyPluginAsync<
  IntegrationsWebhookRoutesOptions
> = async (app, options) => {
  const { database } = options;

  app.addContentTypeParser(
    ['text/xml', 'application/xml', 'text/plain'],
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post('/webhook/:connectorId', async (request, reply) => {
    const { connectorId } = request.params as { connectorId: string };
    const connector = await getConnectorWithSecret(database.db, connectorId);

    if (!connector) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Connector not found' },
      });
    }

    if (!connector.enabled) {
      return reply.status(400).send({
        error: { code: 'CONNECTOR_DISABLED', message: 'Connector is disabled' },
      });
    }

    if (connector.authSecretEncrypted) {
      const incomingToken =
        (request.headers['x-api-key'] as string | undefined) ||
        (request.headers.authorization
          ? request.headers.authorization.replace(/^Bearer\s+/i, '').trim()
          : undefined);

      try {
        const decryptedSecret = decryptSecret(connector.authSecretEncrypted);
        if (!verifyToken(incomingToken, decryptedSecret)) {
          return reply.status(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Invalid integration secret' },
          });
        }
      } catch {
        return reply.status(500).send({
          error: { code: 'CRYPTO_ERROR', message: 'Secret decryption failed' },
        });
      }
    }

    let payloadData = '';
    let jobType: 'products' | 'inventory' | 'full' = 'full';

    if (typeof request.body === 'string') {
      payloadData = request.body;
    } else if (typeof request.body === 'object' && request.body !== null) {
      const bodyObj = request.body as WebhookBodyObject;
      if (bodyObj.jobType) jobType = bodyObj.jobType;
      if (typeof bodyObj.payloadData === 'string') {
        payloadData = bodyObj.payloadData;
      } else if (bodyObj.items) {
        payloadData = JSON.stringify(bodyObj.items);
      } else {
        payloadData = JSON.stringify(bodyObj);
      }
    }

    const job = await executeSyncJob(database.db, connectorId, {
      jobType,
      payloadData,
    });

    return reply.status(200).send({
      success: true,
      job,
    });
  });
};
