import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { integrationsWebhookRoutes } from './integrations-webhook.routes.js';
import { integrationsAdminRoutes } from './integrations-admin.routes.js';

export interface IntegrationsPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const integrationsPlugin: FastifyPluginAsync<IntegrationsPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;

  // Webhook push endpoint: /api/v1/integrations/webhook/:connectorId
  await rawApp.register(integrationsWebhookRoutes, {
    database,
    prefix: '/api/v1/integrations',
  });

  // Protected admin routes: /api/v1/admin/integrations/*
  await rawApp.register(integrationsAdminRoutes, {
    database,
    prefix: '/api/v1/admin',
  });
};
