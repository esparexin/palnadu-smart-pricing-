import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';
import { brandsRoutes } from './brands.routes.js';
import { categoriesRoutes } from './categories.routes.js';
import { imagesRoutes } from './images.routes.js';
import { productsRoutes } from './products.routes.js';
import { relationshipsRoutes } from './relationships.routes.js';
import { variantsRoutes } from './variants.routes.js';

export interface CataloguePluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const cataloguePlugin: FastifyPluginAsync<CataloguePluginOptions> = async (
  rawApp: FastifyInstance,
  options: CataloguePluginOptions,
) => {
  const { database } = options;
  const routeOptions = { database };

  await rawApp.register(brandsRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
  await rawApp.register(categoriesRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
  await rawApp.register(productsRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
  await rawApp.register(variantsRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
  await rawApp.register(imagesRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
  await rawApp.register(relationshipsRoutes, { ...routeOptions, prefix: '/api/v1/admin' });
};
