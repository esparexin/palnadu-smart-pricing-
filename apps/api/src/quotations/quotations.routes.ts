import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AdminQuotationDetailSchema,
  AdminQuotationListQuerySchema,
  AdminQuotationListResponseSchema,
  AdminQuotationStatusUpdateSchema,
  ApiErrorResponseSchema,
  CustomerEnquiryCreateSchema,
  CustomerEnquiryResponseSchema,
  QuotationMetricsResponseSchema,
} from '@palnadu/contracts';
import {
  createQuotationEnquiry,
  dispatchQuotationWhatsAppEstimate,
  findQuotationById,
  getQuotationMetrics,
  listQuotations,
  updateQuotationStatus,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface QuotationsRouteOptions {
  database: DatabaseClient;
}

const IdParamSchema = z.object({ id: z.string().uuid() }).strict();

export const quotationsRoutes: FastifyPluginAsync<QuotationsRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // Public: POST /enquiries (Registered under /api/v1/public and /api/v1/catalogue)
  app.post(
    '/enquiries',
    {
      schema: {
        body: CustomerEnquiryCreateSchema,
        response: {
          201: CustomerEnquiryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const created = await createQuotationEnquiry(database.db, request.body);
        let deliveryStatus = 'not_applicable';
        if (created.customerPhone) {
          try {
            const dispatchResult = await dispatchQuotationWhatsAppEstimate(database.db, created.id);
            deliveryStatus = dispatchResult.deliveryStatus;
          } catch (dispatchErr) {
            request.log.error(dispatchErr, 'Failed to dispatch automated WhatsApp quotation');
            deliveryStatus = 'failed';
          }
        }
        return reply.status(201).send({
          referenceNumber: created.referenceNumber,
          status: 'submitted',
          deliveryStatus: deliveryStatus as
            'not_applicable' | 'pending' | 'sent' | 'delivered' | 'failed',
          createdAt: created.createdAt.toISOString(),
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
          const code = (err as { code?: string }).code;
          const message = err instanceof Error ? err.message : undefined;
          if (code === 'PRODUCT_NOT_FOUND') {
            return reply
              .status(404)
              .send(errorResponse('PRODUCT_NOT_FOUND', message || 'Product not found', request.id));
          }
          if (code === 'VARIANT_NOT_FOUND') {
            return reply
              .status(404)
              .send(errorResponse('VARIANT_NOT_FOUND', message || 'Variant not found', request.id));
          }
        }
        throw err;
      }
    },
  );
};

export const adminQuotationsRoutes: FastifyPluginAsync<QuotationsRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();
  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('quotations:read', 'quotations:manage', 'admin:manage'),
  ];
  const adminManage = [
    requireAdminAuth(database),
    requireAdminPermission('quotations:manage', 'admin:manage'),
  ];

  // GET /api/v1/admin/quotations
  app.get(
    '/quotations',
    {
      preHandler: adminRead,
      schema: {
        querystring: AdminQuotationListQuerySchema,
        response: {
          200: AdminQuotationListResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const result = await listQuotations(database.db, request.query);
      return result;
    },
  );

  // GET /api/v1/admin/quotations/metrics
  app.get(
    '/quotations/metrics',
    {
      preHandler: adminRead,
      schema: {
        response: {
          200: QuotationMetricsResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async () => {
      return getQuotationMetrics(database.db);
    },
  );

  // GET /api/v1/admin/quotations/:id
  app.get(
    '/quotations/:id',
    {
      preHandler: adminRead,
      schema: {
        params: IdParamSchema,
        response: {
          200: AdminQuotationDetailSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const quotation = await findQuotationById(database.db, request.params.id);
      if (!quotation) {
        return reply
          .status(404)
          .send(errorResponse('QUOTATION_NOT_FOUND', 'Quotation request not found', request.id));
      }
      return quotation;
    },
  );

  // PATCH /api/v1/admin/quotations/:id/status
  app.patch(
    '/quotations/:id/status',
    {
      preHandler: adminManage,
      schema: {
        params: IdParamSchema,
        body: AdminQuotationStatusUpdateSchema,
        response: {
          200: AdminQuotationDetailSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await updateQuotationStatus(
        database.db,
        request.params.id,
        request.body.status,
      );
      if (!updated) {
        return reply
          .status(404)
          .send(errorResponse('QUOTATION_NOT_FOUND', 'Quotation request not found', request.id));
      }
      return updated;
    },
  );

  // POST /api/v1/admin/quotations/:id/retry-delivery
  app.post(
    '/quotations/:id/retry-delivery',
    {
      preHandler: adminManage,
      schema: {
        params: IdParamSchema,
        response: {
          200: AdminQuotationDetailSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const quotation = await findQuotationById(database.db, request.params.id);
      if (!quotation) {
        return reply
          .status(404)
          .send(errorResponse('QUOTATION_NOT_FOUND', 'Quotation request not found', request.id));
      }
      await dispatchQuotationWhatsAppEstimate(database.db, request.params.id);
      const updated = await findQuotationById(database.db, request.params.id);
      return reply.send(updated!);
    },
  );
};
