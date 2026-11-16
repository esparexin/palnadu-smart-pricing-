import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { adminQuotationsRoutes, quotationsRoutes } from './quotations.routes.js';

export interface QuotationsPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const quotationsPlugin: FastifyPluginAsync<QuotationsPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const routeOptions = { database };

  await rawApp.register(quotationsRoutes, { ...routeOptions, prefix: '/api/v1/public' });
  await rawApp.register(quotationsRoutes, { ...routeOptions, prefix: '/api/v1/catalogue' });
  await rawApp.register(adminQuotationsRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
};
