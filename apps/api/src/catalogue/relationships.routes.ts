import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AdminRelationshipCreateSchema,
  AdminRelationshipUpdateSchema,
  ApiErrorResponseSchema,
  RelationshipResponseSchema,
  SuccessResponseSchema,
  type RelationshipResponse,
} from '@palnadu/contracts';
import {
  createProductRelationship,
  deleteProductRelationship,
  findProductById,
  findProductRelationshipById,
  findRelationshipBySourceTargetType,
  listProductRelationships,
  updateProductRelationship,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface CatalogueRouteOptions {
  database: DatabaseClient;
}

const ProductIdParamSchema = z.object({ productId: z.string().uuid() }).strict();
const RelIdParamSchema = z.object({ productId: z.string().uuid(), id: z.string().uuid() }).strict();

function toRelDto(
  r: NonNullable<Awaited<ReturnType<typeof findProductRelationshipById>>>,
): RelationshipResponse {
  return {
    id: r.id,
    sourceProductId: r.sourceProductId,
    targetProductId: r.targetProductId,
    relationshipType: r.relationshipType as RelationshipResponse['relationshipType'],
    confirmedByAdmin: r.confirmedByAdmin,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

export const relationshipsRoutes: FastifyPluginAsync<CatalogueRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/admin/products/:productId/relationships
  app.post(
    '/products/:productId/relationships',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: ProductIdParamSchema,
        body: AdminRelationshipCreateSchema,
        response: {
          201: RelationshipResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      const { targetProductId, relationshipType, confirmedByAdmin, notes } = request.body;

      if (targetProductId === productId) {
        return reply
          .status(400)
          .send(
            errorResponse(
              'SELF_RELATION_NOT_ALLOWED',
              'A product cannot relate to itself',
              request.id,
            ),
          );
      }

      if (!(await findProductById(database.db, productId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Source product not found', request.id));
      }
      if (!(await findProductById(database.db, targetProductId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Target product not found', request.id));
      }

      const dup = await findRelationshipBySourceTargetType(
        database.db,
        productId,
        targetProductId,
        relationshipType,
      );
      if (dup) {
        return reply
          .status(409)
          .send(
            errorResponse('DUPLICATE_RELATIONSHIP', 'This relationship already exists', request.id),
          );
      }

      const created = await createProductRelationship(database.db, productId, {
        targetProductId,
        relationshipType,
        confirmedByAdmin,
        notes,
      });
      return reply.status(201).send(toRelDto(created));
    },
  );

  // GET /api/v1/admin/products/:productId/relationships
  app.get(
    '/products/:productId/relationships',
    {
      preHandler: [
        requireAdminAuth(database),
        requireAdminPermission('catalogue:read', 'catalogue:manage'),
      ],
      schema: {
        params: ProductIdParamSchema,
        response: { 200: z.array(RelationshipResponseSchema), 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId } = request.params;
      if (!(await findProductById(database.db, productId))) {
        return reply
          .status(404)
          .send(errorResponse('PRODUCT_NOT_FOUND', 'Product not found', request.id));
      }

      const items = await listProductRelationships(database.db, productId);
      return items.map(toRelDto);
    },
  );

  // PATCH /api/v1/admin/products/:productId/relationships/:id
  app.patch(
    '/products/:productId/relationships/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: RelIdParamSchema,
        body: AdminRelationshipUpdateSchema,
        response: {
          200: RelationshipResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const data = request.body;

      const existing = await findProductRelationshipById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('RELATIONSHIP_NOT_FOUND', 'Relationship not found', request.id));

      if (data.relationshipType && data.relationshipType !== existing.relationshipType) {
        const dup = await findRelationshipBySourceTargetType(
          database.db,
          productId,
          existing.targetProductId,
          data.relationshipType,
          id,
        );
        if (dup) {
          return reply
            .status(409)
            .send(
              errorResponse(
                'DUPLICATE_RELATIONSHIP',
                'This relationship already exists',
                request.id,
              ),
            );
        }
      }

      const updated = await updateProductRelationship(database.db, productId, id, data);
      return toRelDto(updated!);
    },
  );

  // DELETE /api/v1/admin/products/:productId/relationships/:id
  app.delete(
    '/products/:productId/relationships/:id',
    {
      preHandler: [requireAdminAuth(database), requireAdminPermission('catalogue:manage')],
      schema: {
        params: RelIdParamSchema,
        response: { 200: SuccessResponseSchema, 404: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { productId, id } = request.params;
      const existing = await findProductRelationshipById(database.db, productId, id);
      if (!existing)
        return reply
          .status(404)
          .send(errorResponse('RELATIONSHIP_NOT_FOUND', 'Relationship not found', request.id));

      await deleteProductRelationship(database.db, productId, id);
      return { success: true as const };
    },
  );
};
