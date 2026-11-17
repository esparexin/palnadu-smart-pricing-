import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { DatabaseClient } from '@palnadu/persistence';
import {
  SendWhatsAppMessageRequestSchema,
  UpdateWhatsAppConfigRequestSchema,
} from '@palnadu/contracts';
import {
  getWhatsAppConfig,
  listWhatsAppMessages,
  listWhatsAppOptOuts,
  sendMetaWhatsAppMessage,
  updateWhatsAppConfig,
} from '@palnadu/persistence';
import { requireAdminAuth, requireAdminPermission } from '../auth/auth.plugin.js';

export interface WhatsAppAdminRoutesOptions {
  database: DatabaseClient;
}

export const whatsappAdminRoutes: FastifyPluginAsync<WhatsAppAdminRoutesOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('settings:read', 'admin:manage'),
  ];
  const adminWrite = [
    requireAdminAuth(database),
    requireAdminPermission('settings:write', 'settings:manage', 'admin:manage'),
  ];

  const getBaseUrl = (req: { headers: Record<string, string | string[] | undefined> }) => {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    return `${proto}://${host}`;
  };

  // Get Config
  app.get('/whatsapp/config', { preHandler: adminRead }, async (request, reply) => {
    const baseUrl = getBaseUrl(request);
    const data = await getWhatsAppConfig(database.db, baseUrl);
    return reply.send(data);
  });

  // Update Config
  app.patch(
    '/whatsapp/config',
    {
      preHandler: adminWrite,
      schema: { body: UpdateWhatsAppConfigRequestSchema },
    },
    async (request, reply) => {
      const baseUrl = getBaseUrl(request);
      const updated = await updateWhatsAppConfig(database.db, request.body, baseUrl);
      return reply.send(updated);
    },
  );

  // List Messages
  app.get('/whatsapp/messages', { preHandler: adminRead }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 50;
    const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

    const items = await listWhatsAppMessages(database.db, limit, offset);
    return reply.send(items);
  });

  // List Opt-Outs
  app.get('/whatsapp/opt-outs', { preHandler: adminRead }, async (_request, reply) => {
    const items = await listWhatsAppOptOuts(database.db);
    return reply.send(items);
  });

  // Send Outbound Message
  app.post(
    '/whatsapp/messages',
    {
      preHandler: adminWrite,
      schema: { body: SendWhatsAppMessageRequestSchema },
    },
    async (request, reply) => {
      const { to, type, text, templateName, templateLanguage } = request.body;

      const result = await sendMetaWhatsAppMessage(database.db, {
        to,
        type,
        text,
        templateName,
        templateLanguage,
      });

      if (!result.success) {
        if (result.error?.includes('opted out')) {
          return reply.status(400).send({
            error: {
              code: 'RECIPIENT_OPTED_OUT',
              message: 'Recipient has opted out of WhatsApp messages.',
            },
          } as unknown as { success: boolean; wamid: string; status: string });
        }

        return reply.status(400).send({
          error: {
            code: 'WHATSAPP_SEND_FAILED',
            message: result.error || 'Failed to send WhatsApp message.',
          },
          wamid: result.wamid,
          status: result.status,
        } as unknown as { success: boolean; wamid: string; status: string });
      }

      return reply.status(201).send({
        success: true,
        wamid: result.wamid,
        status: result.status,
      });
    },
  );
};
