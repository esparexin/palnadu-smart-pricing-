import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { companySettingsRoutes } from './company.routes.js';

export interface SettingsPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const settingsPlugin: FastifyPluginAsync<SettingsPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const routeOptions = { database };

  await rawApp.register(companySettingsRoutes, {
    ...routeOptions,
    prefix: '/api/v1/admin/settings',
  });
};
