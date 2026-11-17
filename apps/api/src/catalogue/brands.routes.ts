import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AdminBrandCreateSchema,
  AdminBrandUpdateSchema,
  ApiErrorResponseSchema,
  BrandListResponseSchema,
  BrandResponseSchema,
  PaginationQuerySchema,
  SuccessResponseSchema,
} from '@palnadu/contracts';
import {
  countProductsByBrandId,
  createBrand,
  deleteBrand,
  findBrandById,
  findBrandByNormalizedNameOrSlug,
  listBrands,
  updateBrand,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';
import { bumpCatalogueRevision } from './catalogue-revision.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

const IdParamSchema = z.object({ id: z.string().uuid() }).strict();

export const brandsRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (rawApp, options) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/admin/brands
  app.post(
    '/brands',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        body: AdminBrandCreateSchema,
        response: {
          201: BrandResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, slug } = request.body;
      const existing = await findBrandByNormalizedNameOrSlug(database.db, name, slug);

      if (existing) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_BRAND', 'Brand name or slug already exists', request.id));
      }

      const created = await createBrand(database.db, { name, slug });
      bumpCatalogueRevision(request.log);
      return reply.status(201).send({
        id: created.id,
        name: created.name,
        slug: created.slug,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    },
  );

  // GET /api/v1/admin/brands
  app.get(
    '/brands',
    {
      preHandler: [
        requireAdminAuth(database),
        requireAdminPermission('catalogue:read', 'catalogue:manage'),
      ],
      schema: {
        querystring: PaginationQuerySchema,
        response: { 200: BrandListResponseSchema },
      },
    },
    async (request) => {
      const { limit, offset, q } = request.query;
      const { items, total } = await listBrands(database.db, { limit, offset, q });

      return {
        items: items.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        })),
        total,
      };
    },
  );

  // GET /api/v1/admin/brands/:id
  app.get(
    '/brands/:id',
    {
      preHandler: [
        requireAdminAuth(database),
        requireAdminPermission('catalogue:read', 'catalogue:manage'),
      ],
      schema: {
        params: IdParamSchema,
        response: { 200: BrandResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const brand = await findBrandById(database.db, request.params.id);
      if (!brand) {
        return reply
          .status(404)
          .send(errorResponse('BRAND_NOT_FOUND', 'Brand not found', request.id));
      }
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        createdAt: brand.createdAt.toISOString(),
        updatedAt: brand.updatedAt.toISOString(),
      };
    },
  );

  // PATCH /api/v1/admin/brands/:id
  app.patch(
    '/brands/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: IdParamSchema,
        body: AdminBrandUpdateSchema,
        response: {
          200: BrandResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, slug } = request.body;

      const existing = await findBrandById(database.db, id);
      if (!existing) {
        return reply
          .status(404)
          .send(errorResponse('BRAND_NOT_FOUND', 'Brand not found', request.id));
      }

      if (name || slug) {
        const dup = await findBrandByNormalizedNameOrSlug(database.db, name, slug, id);
        if (dup) {
          return reply
            .status(409)
            .send(
              errorResponse('DUPLICATE_BRAND', 'Brand name or slug already exists', request.id),
            );
        }
      }

      const updated = await updateBrand(database.db, id, { name, slug });
      bumpCatalogueRevision(request.log);
      return {
        id: updated!.id,
        name: updated!.name,
        slug: updated!.slug,
        createdAt: updated!.createdAt.toISOString(),
        updatedAt: updated!.updatedAt.toISOString(),
      };
    },
  );

  // DELETE /api/v1/admin/brands/:id
  app.delete(
    '/brands/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: IdParamSchema,
        response: {
          200: SuccessResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = await findBrandById(database.db, id);
      if (!existing) {
        return reply
          .status(404)
          .send(errorResponse('BRAND_NOT_FOUND', 'Brand not found', request.id));
      }

      const prodCount = await countProductsByBrandId(database.db, id);
      if (prodCount > 0) {
        return reply
          .status(409)
          .send(
            errorResponse(
              'BRAND_IN_USE',
              'Cannot delete brand with associated products',
              request.id,
            ),
          );
      }

      await deleteBrand(database.db, id);
      bumpCatalogueRevision(request.log);
      return { success: true as const };
    },
  );
};
