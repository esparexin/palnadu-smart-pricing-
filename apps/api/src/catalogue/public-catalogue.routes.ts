import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ApiErrorResponseSchema,
  BrandResponseSchema,
  CategoryResponseSchema,
  PublicProductDtoSchema,
  PublicProductListResponseSchema,
  PublicProductQuerySchema,
  PublicRecommendationListResponseSchema,
  SlugSchema,
} from '@palnadu/contracts';
import {
  findPublicProductBySlug,
  listPublicBrands,
  listPublicCategories,
  listPublicProducts,
  listPublicRecommendations,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse } from '../auth/auth.guards.js';
import { getCatalogueRevision } from './catalogue-revision.js';
import { formatBrand, formatCategory } from './catalogue.helpers.js';

export interface PublicCatalogueRouteOptions {
  database: DatabaseClient;
}

const SlugParamSchema = z.object({ slug: SlugSchema }).strict();
const ProductIdOrSlugParamSchema = z.object({ productId: z.string().trim().min(1) }).strict();
const OptionalSearchQuerySchema = z.object({ q: z.string().trim().optional() }).strict();

export const PUBLIC_CATALOGUE_CACHE_HEADER =
  'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800';

export const publicCatalogueRoutes: FastifyPluginAsync<PublicCatalogueRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // GET /products - List published products
  app.get(
    '/products',
    {
      schema: {
        querystring: PublicProductQuerySchema,
        response: {
          200: PublicProductListResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', PUBLIC_CATALOGUE_CACHE_HEADER);
      reply.header('X-Catalogue-Revision', getCatalogueRevision());
      const result = await listPublicProducts(database.db, request.query);
      return result;
    },
  );

  // GET /products/:slug - Retrieve single published product by slug
  app.get(
    '/products/:slug',
    {
      schema: {
        params: SlugParamSchema,
        response: {
          200: PublicProductDtoSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const product = await findPublicProductBySlug(database.db, request.params.slug);
      if (!product) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }
      reply.header('Cache-Control', PUBLIC_CATALOGUE_CACHE_HEADER);
      reply.header('X-Catalogue-Revision', getCatalogueRevision());
      return product;
    },
  );

  // GET /products/:productId/recommendations - Recommendations for a published product
  app.get(
    '/products/:productId/recommendations',
    {
      schema: {
        params: ProductIdOrSlugParamSchema,
        response: {
          200: PublicRecommendationListResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const recommendations = await listPublicRecommendations(
        database.db,
        request.params.productId,
      );
      if (recommendations === null) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }
      reply.header('Cache-Control', PUBLIC_CATALOGUE_CACHE_HEADER);
      reply.header('X-Catalogue-Revision', getCatalogueRevision());
      return recommendations;
    },
  );

  // GET /categories - List public categories
  app.get(
    '/categories',
    {
      schema: {
        querystring: OptionalSearchQuerySchema,
        response: {
          200: z.array(CategoryResponseSchema),
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', PUBLIC_CATALOGUE_CACHE_HEADER);
      reply.header('X-Catalogue-Revision', getCatalogueRevision());
      const items = await listPublicCategories(database.db, {
        q: request.query.q,
      });
      return items.map(formatCategory);
    },
  );

  // GET /brands - List public brands
  app.get(
    '/brands',
    {
      schema: {
        querystring: OptionalSearchQuerySchema,
        response: {
          200: z.array(BrandResponseSchema),
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', PUBLIC_CATALOGUE_CACHE_HEADER);
      reply.header('X-Catalogue-Revision', getCatalogueRevision());
      const items = await listPublicBrands(database.db, {
        q: request.query.q,
      });
      return items.map(formatBrand);
    },
  );
};
