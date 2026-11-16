import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { importExportRoutes } from './import-export.routes.js';

export interface ImportExportPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const importExportPlugin: FastifyPluginAsync<ImportExportPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  await rawApp.register(importExportRoutes, {
    database,
    prefix: '/api/v1/admin',
  });
};
