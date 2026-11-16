import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  CreateStockMovementRequestSchema,
  UpdateInventoryConfigRequestSchema,
} from '@palnadu/contracts';
import {
  acknowledgeInventoryAlert,
  getInventoryConfig,
  listInventoryAlerts,
  listInventoryBalances,
  listInventoryMovements,
  recordStockMovement,
  updateInventoryConfig,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface InventoryRouteOptions {
  database: DatabaseClient;
}

const AlertIdParamSchema = z.object({ id: z.string().uuid() }).strict();

export const inventoryRoutes: FastifyPluginAsync<InventoryRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;

  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:read', 'settings:read', 'catalogue:manage', 'admin:manage'),
  ];
  const adminWrite = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:write', 'settings:write', 'catalogue:manage', 'admin:manage'),
  ];

  rawApp.get('/inventory/config', { preHandler: adminRead }, async () => {
    return getInventoryConfig(database.db);
  });

  rawApp.patch('/inventory/config', { preHandler: adminWrite }, async (req, reply) => {
    const parseBody = UpdateInventoryConfigRequestSchema.safeParse(req.body);
    if (!parseBody.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid config update', req.id));
    }
    const updated = await updateInventoryConfig(database.db, parseBody.data);
    return reply.status(200).send(updated);
  });

  rawApp.get('/inventory/balances', { preHandler: adminRead }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 50;
    const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;
    const balances = await listInventoryBalances(database.db, { limit, offset });
    return reply.status(200).send(balances);
  });

  rawApp.post('/inventory/movements', { preHandler: adminWrite }, async (req, reply) => {
    const parseBody = CreateStockMovementRequestSchema.safeParse(req.body);
    if (!parseBody.success) {
      return reply
        .status(400)
        .send(errorResponse('BAD_REQUEST', 'Invalid stock movement request', req.id));
    }
    try {
      const result = await recordStockMovement(database.db, parseBody.data, req.admin?.id ?? null);
      return reply.status(201).send(result);
    } catch (err) {
      return reply
        .status(400)
        .send(
          errorResponse(
            'MOVEMENT_ERROR',
            err instanceof Error ? err.message : 'Movement rejected',
            req.id,
          ),
        );
    }
  });

  rawApp.get('/inventory/movements', { preHandler: adminRead }, async (req, reply) => {
    const query = req.query as { variantId?: string; limit?: string; offset?: string };
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 50;
    const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;
    const movements = await listInventoryMovements(database.db, {
      variantId: query.variantId,
      limit,
      offset,
    });
    return reply.status(200).send(movements);
  });

  rawApp.get('/inventory/alerts', { preHandler: adminRead }, async (req, reply) => {
    const query = req.query as {
      state?: 'active' | 'cleared' | 'acknowledged';
      limit?: string;
    };
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 50;
    const alerts = await listInventoryAlerts(database.db, {
      state: query.state ?? 'active',
      limit,
    });
    return reply.status(200).send(alerts);
  });

  rawApp.post(
    '/inventory/alerts/:id/acknowledge',
    { preHandler: adminWrite },
    async (req, reply) => {
      const parseParams = AlertIdParamSchema.safeParse(req.params);
      if (!parseParams.success) {
        return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid alert ID', req.id));
      }
      const updated = await acknowledgeInventoryAlert(database.db, parseParams.data.id);
      if (!updated) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'Alert not found', req.id));
      }
      return reply.status(200).send({ success: true });
    },
  );
};
