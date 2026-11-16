import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient, StoragePort } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { mediaRoutes } from './media.routes.js';

export interface MediaPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
  storage?: StoragePort;
}

export const mediaPlugin: FastifyPluginAsync<MediaPluginOptions> = async (rawApp, options) => {
  const { database, storage } = options;
  await rawApp.register(mediaRoutes, {
    database,
    storage,
    prefix: '/api/v1/admin',
  });
};
