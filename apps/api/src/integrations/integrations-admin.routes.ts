import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { DatabaseClient } from '@palnadu/persistence';
import {
  CreateErpConnectorRequestSchema,
  TriggerSyncRequestSchema,
  UpdateErpConnectorRequestSchema,
} from '@palnadu/contracts';
import {
  createConnector,
  deleteConnector,
  executeSyncJob,
  getConnector,
  listConnectors,
  listSyncJobs,
  updateConnector,
} from '@palnadu/persistence';
import { requireAdminAuth, requireAdminPermission } from '../auth/auth.plugin.js';

export interface IntegrationsAdminRoutesOptions {
  database: DatabaseClient;
}

export const integrationsAdminRoutes: FastifyPluginAsync<IntegrationsAdminRoutesOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('settings:read', 'catalogue:read', 'admin:manage'),
  ];
  const adminWrite = [
    requireAdminAuth(database),
    requireAdminPermission('settings:write', 'catalogue:write', 'admin:manage'),
  ];

  // List Connectors
  app.get('/integrations/connectors', { preHandler: adminRead }, async (_req, reply) => {
    const list = await listConnectors(database.db);
    return reply.send(list);
  });

  // Create Connector
  app.post(
    '/integrations/connectors',
    {
      preHandler: adminWrite,
      schema: { body: CreateErpConnectorRequestSchema },
    },
    async (request, reply) => {
      const created = await createConnector(database.db, request.body);
      return reply.status(201).send(created);
    },
  );

  // Get Connector
  app.get('/integrations/connectors/:id', { preHandler: adminRead }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const connector = await getConnector(database.db, id);
    if (!connector) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Connector not found' },
      } as unknown as Record<string, unknown>);
    }
    return reply.send(connector);
  });

  // Update Connector
  app.patch(
    '/integrations/connectors/:id',
    {
      preHandler: adminWrite,
      schema: { body: UpdateErpConnectorRequestSchema },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await updateConnector(database.db, id, request.body);
      if (!updated) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Connector not found' },
        } as unknown as Record<string, unknown>);
      }
      return reply.send(updated);
    },
  );

  // Delete Connector
  app.delete('/integrations/connectors/:id', { preHandler: adminWrite }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteConnector(database.db, id);
    if (!deleted) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Connector not found' },
      } as unknown as Record<string, unknown>);
    }
    return reply.status(204).send();
  });

  // List Jobs
  app.get(
    '/integrations/connectors/:id/jobs',
    { preHandler: adminRead },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as { limit?: string };
      const limit = query.limit ? Math.min(50, Math.max(1, parseInt(query.limit, 10))) : 20;

      const jobs = await listSyncJobs(database.db, id, limit);
      return reply.send(jobs);
    },
  );

  // Trigger Sync
  app.post(
    '/integrations/connectors/:id/sync',
    {
      preHandler: adminWrite,
      schema: { body: TriggerSyncRequestSchema },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const job = await executeSyncJob(database.db, id, {
        jobType: request.body.jobType,
        payloadData: request.body.payloadData,
      });
      return reply.status(200).send(job);
    },
  );
};
