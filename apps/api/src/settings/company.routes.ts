import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ApiErrorResponseSchema,
  CompanyProfileSchema,
  UpdateCompanyProfileSchema,
} from '@palnadu/contracts';
import { getCompanyProfile, updateCompanyProfile, type DatabaseClient } from '@palnadu/persistence';
import { requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface CompanySettingsRouteOptions {
  database: DatabaseClient;
}

export const companySettingsRoutes: FastifyPluginAsync<CompanySettingsRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  const adminRead = [
    requireAdminAuth(database),
    requireAdminPermission('admin:manage', 'settings:read', 'settings:manage', 'quotations:manage'),
  ];
  const adminManage = [
    requireAdminAuth(database),
    requireAdminPermission('admin:manage', 'settings:manage'),
  ];

  // GET /api/v1/admin/settings/company
  app.get(
    '/company',
    {
      preHandler: adminRead,
      schema: {
        response: {
          200: CompanyProfileSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async () => {
      const profile = await getCompanyProfile(database.db);
      return profile;
    },
  );

  // PUT /api/v1/admin/settings/company
  app.put(
    '/company',
    {
      preHandler: adminManage,
      schema: {
        body: UpdateCompanyProfileSchema,
        response: {
          200: CompanyProfileSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const updated = await updateCompanyProfile(database.db, request.body);
      return updated;
    },
  );
};
