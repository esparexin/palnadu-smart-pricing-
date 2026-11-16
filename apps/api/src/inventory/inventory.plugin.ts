import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { inventoryRoutes } from './inventory.routes.js';

export interface InventoryPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const inventoryPlugin: FastifyPluginAsync<InventoryPluginOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  await rawApp.register(inventoryRoutes, {
    database,
    prefix: '/api/v1/admin',
  });
};
