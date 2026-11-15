import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  AdminCategoryCreateSchema,
  AdminCategoryUpdateSchema,
  ApiErrorResponseSchema,
  CategoryListQuerySchema,
  CategoryListResponseSchema,
  CategoryResponseSchema,
  SuccessResponseSchema,
} from '@palnadu/contracts';
import {
  assertNoCategoryCycle,
  countCategoryProducts,
  countSubcategories,
  createCategory,
  deleteCategory,
  findCategoryById,
  findCategoryByNormalizedNameOrSlug,
  listCategories,
  updateCategory,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';
import { formatCategory, IdParamSchema } from './catalogue.helpers.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

export const categoriesRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();
  const adminManage = [requireAdminAuth(database), requireAdminPermission('catalogue:manage')];
  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:read', 'catalogue:manage'),
  ];

  // POST /api/v1/admin/categories
  app.post(
    '/categories',
    {
      preHandler: adminManage,
      schema: {
        body: AdminCategoryCreateSchema,
        response: {
          201: CategoryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, slug, parentId } = request.body;
      if (parentId) {
        const parent = await findCategoryById(database.db, parentId);
        if (!parent) {
          return reply
            .status(404)
            .send(errorResponse('PARENT_NOT_FOUND', 'Parent category does not exist', request.id));
        }
      }
      const existing = await findCategoryByNormalizedNameOrSlug(database.db, name, slug);
      if (existing) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_CATEGORY', 'Category name or slug exists', request.id));
      }
      const created = await createCategory(database.db, { name, slug, parentId });
      return reply.status(201).send(formatCategory(created));
    },
  );

  // GET /api/v1/admin/categories
  app.get(
    '/categories',
    {
      preHandler: adminRead,
      schema: {
        querystring: CategoryListQuerySchema,
        response: { 200: CategoryListResponseSchema },
      },
    },
    async (request) => {
      const { limit, offset, q, parentId } = request.query;
      const { items, total } = await listCategories(database.db, { limit, offset, q, parentId });
      return { items: items.map(formatCategory), total };
    },
  );

  // GET /api/v1/admin/categories/:id
  app.get(
    '/categories/:id',
    {
      preHandler: adminRead,
      schema: {
        params: IdParamSchema,
        response: { 200: CategoryResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const cat = await findCategoryById(database.db, request.params.id);
      if (!cat) {
        return reply
          .status(404)
          .send(errorResponse('CATEGORY_NOT_FOUND', 'Category not found', request.id));
      }
      return formatCategory(cat);
    },
  );

  // PATCH /api/v1/admin/categories/:id
  app.patch(
    '/categories/:id',
    {
      preHandler: adminManage,
      schema: {
        params: IdParamSchema,
        body: AdminCategoryUpdateSchema,
        response: {
          200: CategoryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, slug, parentId } = request.body;

      return database.db.transaction(async (tx) => {
        const existing = await findCategoryById(tx, id);
        if (!existing) {
          return reply
            .status(404)
            .send(errorResponse('CATEGORY_NOT_FOUND', 'Category not found', request.id));
        }

        if (parentId !== undefined && parentId !== null) {
          try {
            await assertNoCategoryCycle(tx, id, parentId);
          } catch (err: unknown) {
            const errWithCode = err as { code?: string; message?: string };
            const status = errWithCode.code === 'PARENT_NOT_FOUND' ? 404 : 400;
            return reply
              .status(status)
              .send(
                errorResponse(
                  errWithCode.code || 'CYCLE_DETECTED',
                  errWithCode.message || 'Cycle detected',
                  request.id,
                ),
              );
          }
        }

        if (name || slug) {
          const dup = await findCategoryByNormalizedNameOrSlug(tx, name, slug, id);
          if (dup) {
            return reply
              .status(409)
              .send(
                errorResponse('DUPLICATE_CATEGORY', 'Category name or slug exists', request.id),
              );
          }
        }

        const updated = await updateCategory(tx, id, { name, slug, parentId });
        return formatCategory(updated!);
      });
    },
  );

  // DELETE /api/v1/admin/categories/:id
  app.delete(
    '/categories/:id',
    {
      preHandler: adminManage,
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
      const existing = await findCategoryById(database.db, id);
      if (!existing) {
        return reply
          .status(404)
          .send(errorResponse('CATEGORY_NOT_FOUND', 'Category not found', request.id));
      }

      if ((await countSubcategories(database.db, id)) > 0) {
        return reply
          .status(409)
          .send(
            errorResponse(
              'CATEGORY_HAS_CHILDREN',
              'Cannot delete category with subcategories',
              request.id,
            ),
          );
      }

      if ((await countCategoryProducts(database.db, id)) > 0) {
        return reply
          .status(409)
          .send(
            errorResponse(
              'CATEGORY_IN_USE',
              'Cannot delete category with associated products',
              request.id,
            ),
          );
      }

      await deleteCategory(database.db, id);
      return { success: true as const };
    },
  );
};
