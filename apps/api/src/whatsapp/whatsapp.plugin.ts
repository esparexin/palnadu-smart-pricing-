import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { whatsappWebhookRoutes } from './whatsapp-webhook.routes.js';
import { whatsappAdminRoutes } from './whatsapp-admin.routes.js';

export interface WhatsAppPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const whatsappPlugin: FastifyPluginAsync<WhatsAppPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;

  // Public webhook route: /api/v1/whatsapp/webhook
  await rawApp.register(whatsappWebhookRoutes, {
    database,
    prefix: '/api/v1/whatsapp',
  });

  // Protected admin routes: /api/v1/admin/whatsapp/*
  await rawApp.register(whatsappAdminRoutes, {
    database,
    prefix: '/api/v1/admin',
  });
};
