import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  AdminProductCreateSchema,
  AdminProductDetailResponseSchema,
  AdminProductListResponseSchema,
  AdminProductUpdateSchema,
  ApiErrorResponseSchema,
  ProductListQuerySchema,
  SuccessResponseSchema,
  type AdminProductListItem,
} from '@palnadu/contracts';
import {
  createProduct,
  deleteProduct,
  fetchProductDetail,
  findBrandById,
  findCategoryById,
  findProductById,
  findProductByNormalizedSlug,
  listProducts,
  updateProduct,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';
import { bumpCatalogueRevision } from './catalogue-revision.js';
import { IdParamSchema, toProductDetailDto } from './catalogue.helpers.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

export const productsRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (
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

  // POST /api/v1/admin/products
  app.post(
    '/products',
    {
      preHandler: adminManage,
      schema: {
        body: AdminProductCreateSchema,
        response: {
          201: AdminProductDetailResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { brandId, categoryIds, ...data } = request.body;
      if (brandId && !(await findBrandById(database.db, brandId))) {
        return reply
          .status(404)
          .send(errorResponse('BRAND_NOT_FOUND', 'Brand not found', request.id));
      }
      if (categoryIds?.length) {
        for (const catId of categoryIds) {
          if (!(await findCategoryById(database.db, catId))) {
            return reply
              .status(404)
              .send(errorResponse('CATEGORY_NOT_FOUND', `Category ${catId} not found`, request.id));
          }
        }
      }
      if (await findProductByNormalizedSlug(database.db, data.slug)) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_PRODUCT', 'Product slug already exists', request.id));
      }

      try {
        const created = await database.db.transaction((tx) =>
          createProduct(tx, { ...data, brandId, categoryIds }),
        );
        bumpCatalogueRevision(request.log);
        const detail = await fetchProductDetail(database.db, created.id);
        return reply.status(201).send(toProductDetailDto(detail!));
      } catch (err: unknown) {
        const ec = (err as { code?: string; message?: string }).code;
        if (ec === 'INSUFFICIENT_IMAGES' || ec === 'IMAGE_LIMIT_EXCEEDED') {
          return reply.status(400).send(errorResponse(ec, (err as Error).message, request.id));
        }
        throw err;
      }
    },
  );

  // GET /api/v1/admin/products
  app.get(
    '/products',
    {
      preHandler: adminRead,
      schema: {
        querystring: ProductListQuerySchema,
        response: { 200: AdminProductListResponseSchema },
      },
    },
    async (request) => {
      const { items, total } = await listProducts(database.db, request.query);
      return {
        items: items.map((p) => ({
          id: p.id,
          brandId: p.brandId,
          name: p.name,
          slug: p.slug,
          model: p.model,
          unit: p.unit,
          status: p.status as AdminProductListItem['status'],
          mrpPaise: p.mrpPaise,
          offerPricePaise: p.offerPricePaise,
          discountType: p.discountType as AdminProductListItem['discountType'],
          discountValue: p.discountValue,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        total,
      };
    },
  );

  // GET /api/v1/admin/products/:id
  app.get(
    '/products/:id',
    {
      preHandler: adminRead,
      schema: {
        params: IdParamSchema,
        response: { 200: AdminProductDetailResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const detail = await fetchProductDetail(database.db, request.params.id);
      if (!detail)
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      return toProductDetailDto(detail);
    },
  );

  // PATCH /api/v1/admin/products/:id
  app.patch(
    '/products/:id',
    {
      preHandler: adminManage,
      schema: {
        params: IdParamSchema,
        body: AdminProductUpdateSchema,
        response: {
          200: AdminProductDetailResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { brandId, categoryIds, slug, ...data } = request.body;
      const existing = await findProductById(database.db, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));

      if (brandId && !(await findBrandById(database.db, brandId))) {
        return reply
          .status(404)
          .send(errorResponse('BRAND_NOT_FOUND', 'Brand not found', request.id));
      }
      if (categoryIds?.length) {
        for (const catId of categoryIds) {
          if (!(await findCategoryById(database.db, catId))) {
            return reply
              .status(404)
              .send(errorResponse('CATEGORY_NOT_FOUND', `Category ${catId} not found`, request.id));
          }
        }
      }
      if (slug && (await findProductByNormalizedSlug(database.db, slug, id))) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_PRODUCT', 'Product slug already exists', request.id));
      }

      const effMrp = data.mrpPaise !== undefined ? data.mrpPaise : existing.mrpPaise;
      const effOffer =
        data.offerPricePaise !== undefined ? data.offerPricePaise : existing.offerPricePaise;
      if (effMrp > 0 && effOffer > effMrp) {
        return reply
          .status(400)
          .send(errorResponse('INVALID_PRICING', 'Offer price cannot exceed MRP', request.id));
      }

      try {
        await database.db.transaction((tx) =>
          updateProduct(tx, id, { ...data, brandId, categoryIds, slug }),
        );
        bumpCatalogueRevision(request.log);
        const detail = await fetchProductDetail(database.db, id);
        return toProductDetailDto(detail!);
      } catch (err: unknown) {
        const ec = (err as { code?: string; message?: string }).code;
        if (ec === 'INSUFFICIENT_IMAGES' || ec === 'IMAGE_LIMIT_EXCEEDED') {
          return reply.status(400).send(errorResponse(ec, (err as Error).message, request.id));
        }
        throw err;
      }
    },
  );

  // DELETE /api/v1/admin/products/:id
  app.delete(
    '/products/:id',
    {
      preHandler: adminManage,
      schema: {
        params: IdParamSchema,
        response: { 200: SuccessResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const existing = await findProductById(database.db, request.params.id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      await database.db.transaction((tx) => deleteProduct(tx, request.params.id));
      bumpCatalogueRevision(request.log);
      return { success: true as const };
    },
  );
};
