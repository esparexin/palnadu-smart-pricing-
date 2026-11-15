import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AdminVariantCreateSchema,
  AdminVariantUpdateSchema,
  ApiErrorResponseSchema,
  SuccessResponseSchema,
  VariantResponseSchema,
  type PricingDiscountType,
} from '@palnadu/contracts';
import {
  createVariant,
  deleteVariant,
  findProductById,
  findVariantById,
  findVariantByNormalizedSku,
  listVariantsByProductId,
  resolveEffectivePricing,
  updateVariant,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';
import { ProductIdParamSchema, toVariantDto, VariantIdParamSchema } from './catalogue.helpers.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

export const variantsRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (
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

  // POST /api/v1/admin/products/:productId/variants
  app.post(
    '/products/:productId/variants',
    {
      preHandler: adminManage,
      schema: {
        params: ProductIdParamSchema,
        body: AdminVariantCreateSchema,
        response: {
          201: VariantResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      const data = request.body;
      const product = await findProductById(database.db, productId);
      if (!product)
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));

      if (data.sku && (await findVariantByNormalizedSku(database.db, data.sku))) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_SKU', 'SKU already exists', request.id));
      }

      try {
        resolveEffectivePricing(
          {
            mrpPaise: product.mrpPaise,
            offerPricePaise: product.offerPricePaise,
            discountType: product.discountType as PricingDiscountType,
            discountValue: product.discountValue,
          },
          data,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid pricing';
        return reply.status(400).send(errorResponse('INVALID_PRICING', message, request.id));
      }

      const created = await createVariant(database.db, productId, data);
      return reply.status(201).send(toVariantDto(created));
    },
  );

  // GET /api/v1/admin/products/:productId/variants
  app.get(
    '/products/:productId/variants',
    {
      preHandler: adminRead,
      schema: {
        params: ProductIdParamSchema,
        response: { 200: z.array(VariantResponseSchema), 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      if (!(await findProductById(database.db, productId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }
      const items = await listVariantsByProductId(database.db, productId);
      return items.map(toVariantDto);
    },
  );

  // GET /api/v1/admin/products/:productId/variants/:id
  app.get(
    '/products/:productId/variants/:id',
    {
      preHandler: adminRead,
      schema: {
        params: VariantIdParamSchema,
        response: { 200: VariantResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const v = await findVariantById(database.db, productId, id);
      if (!v)
        return reply
          .status(404)
          .send(errorResponse('VARIANT_NOT_FOUND', 'Variant not found', request.id));
      return toVariantDto(v);
    },
  );

  // PATCH /api/v1/admin/products/:productId/variants/:id
  app.patch(
    '/products/:productId/variants/:id',
    {
      preHandler: adminManage,
      schema: {
        params: VariantIdParamSchema,
        body: AdminVariantUpdateSchema,
        response: {
          200: VariantResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const data = request.body;
      const product = await findProductById(database.db, productId);
      if (!product)
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));

      const existing = await findVariantById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('VARIANT_NOT_FOUND', 'Variant not found', request.id));

      if (data.sku && (await findVariantByNormalizedSku(database.db, data.sku, id))) {
        return reply
          .status(409)
          .send(errorResponse('DUPLICATE_SKU', 'SKU already exists', request.id));
      }

      const merged = {
        mrpPaise: data.mrpPaise !== undefined ? data.mrpPaise : existing.mrpPaise,
        offerPricePaise:
          data.offerPricePaise !== undefined ? data.offerPricePaise : existing.offerPricePaise,
        discountType:
          data.discountType !== undefined
            ? data.discountType
            : (existing.discountType as PricingDiscountType | null),
        discountValue:
          data.discountValue !== undefined ? data.discountValue : existing.discountValue,
      };

      try {
        resolveEffectivePricing(
          {
            mrpPaise: product.mrpPaise,
            offerPricePaise: product.offerPricePaise,
            discountType: product.discountType as PricingDiscountType,
            discountValue: product.discountValue,
          },
          merged,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid pricing';
        return reply.status(400).send(errorResponse('INVALID_PRICING', message, request.id));
      }

      const updated = await updateVariant(database.db, productId, id, data);
      return toVariantDto(updated!);
    },
  );

  // DELETE /api/v1/admin/products/:productId/variants/:id
  app.delete(
    '/products/:productId/variants/:id',
    {
      preHandler: adminManage,
      schema: {
        params: VariantIdParamSchema,
        response: { 200: SuccessResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const existing = await findVariantById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('VARIANT_NOT_FOUND', 'Variant not found', request.id));

      await deleteVariant(database.db, productId, id);
      return { success: true as const };
    },
  );
};
