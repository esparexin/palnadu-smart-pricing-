import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ExportProductsQuerySchema, ImportPreviewRequestSchema } from '@palnadu/contracts';
import {
  commitImportBatch,
  exportBatchErrorsCsv,
  exportProductsToCsv,
  getImportBatchById,
  getImportRowsByBatchId,
  getImportTemplateCsv,
  listImportBatches,
  validateAndPreviewImport,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface ImportExportRouteOptions {
  database: DatabaseClient;
}

const BatchIdParamSchema = z.object({ batchId: z.string().uuid() }).strict();

export const importExportRoutes: FastifyPluginAsync<ImportExportRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;

  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:read', 'admin:manage'),
  ];
  const adminWrite = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:write', 'admin:manage'),
  ];

  rawApp.get('/imports/template', { preHandler: adminRead }, async (_req, reply) => {
    const csv = getImportTemplateCsv();
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="product-import-template-v1.csv"')
      .send(csv);
  });

  rawApp.post('/imports/preview', { preHandler: adminWrite }, async (req, reply) => {
    const parseBody = ImportPreviewRequestSchema.safeParse(req.body);
    if (!parseBody.success) {
      return reply
        .status(400)
        .send(errorResponse('BAD_REQUEST', 'Invalid preview request', req.id));
    }
    const { csvContent, mode, fileName } = parseBody.data;
    const creatorId = req.admin?.id ?? null;
    try {
      const result = await validateAndPreviewImport(database.db, {
        csvContent,
        mode,
        fileName,
        creatorId,
      });
      return reply.status(200).send(result);
    } catch (err) {
      return reply
        .status(400)
        .send(
          errorResponse(
            'IMPORT_ERROR',
            err instanceof Error ? err.message : 'Import failed',
            req.id,
          ),
        );
    }
  });

  rawApp.post('/imports/:batchId/confirm', { preHandler: adminWrite }, async (req, reply) => {
    const parseParams = BatchIdParamSchema.safeParse(req.params);
    if (!parseParams.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid batch ID', req.id));
    }
    try {
      const result = await commitImportBatch(database.db, parseParams.data.batchId);
      return reply.status(200).send(result);
    } catch (err) {
      return reply
        .status(400)
        .send(
          errorResponse(
            'COMMIT_ERROR',
            err instanceof Error ? err.message : 'Commit failed',
            req.id,
          ),
        );
    }
  });

  rawApp.get('/imports/batches', { preHandler: adminRead }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 50;
    const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;
    const batches = await listImportBatches(database.db, limit, offset);
    return reply.status(200).send(
      batches.map((b) => ({
        id: b.id,
        templateVersion: b.templateVersion,
        mode: b.mode,
        status: b.status,
        fileName: b.fileName,
        totalRows: b.totalRows,
        validRows: b.validRows,
        invalidRows: b.invalidRows,
        appliedRows: b.appliedRows,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    );
  });

  rawApp.get('/imports/batches/:batchId', { preHandler: adminRead }, async (req, reply) => {
    const parseParams = BatchIdParamSchema.safeParse(req.params);
    if (!parseParams.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid batch ID', req.id));
    }
    const batch = await getImportBatchById(database.db, parseParams.data.batchId);
    if (!batch) {
      return reply.status(404).send(errorResponse('NOT_FOUND', 'Import batch not found', req.id));
    }
    const rows = await getImportRowsByBatchId(database.db, batch.id);
    const errors: unknown[] = [];
    for (const r of rows) {
      if (Array.isArray(r.errors)) errors.push(...r.errors);
    }
    return reply.status(200).send({
      id: batch.id,
      templateVersion: batch.templateVersion,
      mode: batch.mode,
      status: batch.status,
      fileName: batch.fileName,
      totalRows: batch.totalRows,
      validRows: batch.validRows,
      invalidRows: batch.invalidRows,
      appliedRows: batch.appliedRows,
      errors,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    });
  });

  rawApp.get(
    '/imports/batches/:batchId/errors/export',
    { preHandler: adminRead },
    async (req, reply) => {
      const parseParams = BatchIdParamSchema.safeParse(req.params);
      if (!parseParams.success) {
        return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid batch ID', req.id));
      }
      const csv = await exportBatchErrorsCsv(database.db, parseParams.data.batchId);
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header(
          'content-disposition',
          `attachment; filename="import-errors-${parseParams.data.batchId}.csv"`,
        )
        .send(csv);
    },
  );

  rawApp.post('/exports/products', { preHandler: adminRead }, async (req, reply) => {
    const parseBody = ExportProductsQuerySchema.safeParse(req.body ?? {});
    if (!parseBody.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid export options', req.id));
    }
    const csv = await exportProductsToCsv(database.db, parseBody.data);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="products-export.csv"')
      .send(csv);
  });
};
