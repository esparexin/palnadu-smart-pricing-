import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AdminImageCreateSchema,
  AdminImageUpdateSchema,
  ApiErrorResponseSchema,
  ImageResponseSchema,
  SuccessResponseSchema,
  type ImageResponse,
} from '@palnadu/contracts';
import {
  createProductImage,
  deleteProductImage,
  findProductById,
  findProductImageById,
  listProductImages,
  updateProductImage,
  validateVariantBelongsToProduct,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

const ProductIdParamSchema = z.object({ productId: z.string().uuid() }).strict();
const ImageIdParamSchema = z
  .object({ productId: z.string().uuid(), id: z.string().uuid() })
  .strict();

function toImageDto(
  img: NonNullable<Awaited<ReturnType<typeof findProductImageById>>>,
): ImageResponse {
  return {
    id: img.id,
    productId: img.productId,
    variantId: img.variantId,
    url: img.url,
    altText: img.altText,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
    rightsStatus: img.rightsStatus as ImageResponse['rightsStatus'],
    createdAt: img.createdAt.toISOString(),
  };
}

export const imagesRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (rawApp, options) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/admin/products/:productId/images
  app.post(
    '/products/:productId/images',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: ProductIdParamSchema,
        body: AdminImageCreateSchema,
        response: {
          201: ImageResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      const data = request.body;

      if (!(await findProductById(database.db, productId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }

      if (data.variantId) {
        const check = await validateVariantBelongsToProduct(database.db, productId, data.variantId);
        if (check === 'not_found') {
          return reply
            .status(404)
            .send(errorResponse('VARIANT_NOT_FOUND', 'Variant not found', request.id));
        }
        if (check === 'mismatch') {
          return reply
            .status(400)
            .send(
              errorResponse(
                'VARIANT_MISMATCH',
                'Variant does not belong to this product',
                request.id,
              ),
            );
        }
      }

      const created = await database.db.transaction((tx) =>
        createProductImage(tx, productId, data),
      );
      return reply.status(201).send(toImageDto(created));
    },
  );

  // GET /api/v1/admin/products/:productId/images
  app.get(
    '/products/:productId/images',
    {
      preHandler: [
        requireAdminAuth(database),
        requireAdminPermission('catalogue:read', 'catalogue:manage'),
      ],
      schema: {
        params: ProductIdParamSchema,
        response: { 200: z.array(ImageResponseSchema), 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      if (!(await findProductById(database.db, productId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }

      const items = await listProductImages(database.db, productId);
      return items.map(toImageDto);
    },
  );

  // PATCH /api/v1/admin/products/:productId/images/:id
  app.patch(
    '/products/:productId/images/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: ImageIdParamSchema,
        body: AdminImageUpdateSchema,
        response: {
          200: ImageResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const data = request.body;

      const existing = await findProductImageById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('IMAGE_NOT_FOUND', 'Image not found', request.id));

      if (data.variantId) {
        const check = await validateVariantBelongsToProduct(database.db, productId, data.variantId);
        if (check === 'not_found') {
          return reply
            .status(404)
            .send(errorResponse('VARIANT_NOT_FOUND', 'Variant not found', request.id));
        }
        if (check === 'mismatch') {
          return reply
            .status(400)
            .send(
              errorResponse(
                'VARIANT_MISMATCH',
                'Variant does not belong to this product',
                request.id,
              ),
            );
        }
      }

      const updated = await database.db.transaction((tx) =>
        updateProductImage(tx, productId, id, data),
      );
      return toImageDto(updated!);
    },
  );

  // DELETE /api/v1/admin/products/:productId/images/:id
  app.delete(
    '/products/:productId/images/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: ImageIdParamSchema,
        response: { 200: SuccessResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const existing = await findProductImageById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('IMAGE_NOT_FOUND', 'Image not found', request.id));

      await deleteProductImage(database.db, productId, id);
      return { success: true as const };
    },
  );
};
