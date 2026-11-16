import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  AdminUserSchema,
  ApiErrorResponseSchema,
  LoginRequestSchema,
  LogoutResponseSchema,
  SessionResponseSchema,
  type AdminUser,
} from '@palnadu/contracts';

import {
  createAdminSession,
  findAdminUserByNormalizedEmail,
  generateSessionToken,
  revokeSessionByToken,
  verifyPassword,
} from '@palnadu/persistence';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';

import {
  SESSION_COOKIE_NAME,
  createCsrfProtection,
  errorResponse,
  requireAdminAuth,
  requireAdminPermission,
  validateCsrfProtection,
} from './auth.guards.js';

export {
  SESSION_COOKIE_NAME,
  createCsrfProtection,
  errorResponse,
  requireAdminAuth,
  requireAdminPermission,
  validateCsrfProtection,
};

const DUMMY_SCRYPT_HASH =
  '$scrypt$N=16384,r=8,p=1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export interface AuthPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  rawApp: FastifyInstance,
  options: AuthPluginOptions,
) => {
  const { config, database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // CSRF / Origin protection hook for state-changing endpoints
  app.addHook('onRequest', createCsrfProtection(config.allowedOrigins));

  app.post(
    '/api/v1/admin/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (request) => {
            const body = request.body as { email?: unknown } | undefined;
            if (body && typeof body.email === 'string') {
              const normalized = body.email.trim().toLowerCase();
              if (normalized.length > 0) {
                return `login:account:${normalized}`;
              }
            }
            return `login:ip:${request.ip}`;
          },
        },
      },

      schema: {
        body: LoginRequestSchema,
        response: {
          200: SessionResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          429: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = await findAdminUserByNormalizedEmail(database.db, email);

      if (!user) {
        // Perform timing-safe dummy hash verification to prevent user enumeration
        await verifyPassword(password, DUMMY_SCRYPT_HASH);
        return reply
          .status(401)
          .send(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', request.id));
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return reply
          .status(401)
          .send(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', request.id));
      }

      if (user.status !== 'active') {
        return reply
          .status(403)
          .send(errorResponse('ACCOUNT_SUSPENDED', 'Account is suspended', request.id));
      }

      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000);

      await createAdminSession(database.db, {
        userId: user.id,
        sessionToken,
        expiresAt,
      });

      reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
        path: '/',
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        signed: true,
        maxAge: config.sessionTtlHours * 3600,
        expires: expiresAt,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status as AdminUser['status'],
          permissions: user.permissions as AdminUser['permissions'],
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        expiresAt: expiresAt.toISOString(),
      };
    },
  );

  app.post(
    '/api/v1/admin/auth/logout',
    {
      schema: {
        response: {
          200: LogoutResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const rawCookie = request.cookies[SESSION_COOKIE_NAME];
      if (rawCookie) {
        const unsigned = request.unsignCookie(rawCookie);
        if (unsigned.valid && unsigned.value) {
          try {
            await revokeSessionByToken(database.db, unsigned.value);
          } catch {
            // Ignore failure on revoke to guarantee idempotent logout
          }
        }
      }

      reply.clearCookie(SESSION_COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        signed: true,
      });

      return { success: true as const };
    },
  );

  app.get(
    '/api/v1/admin/auth/me',
    {
      preHandler: [requireAdminAuth(database)],
      schema: {
        response: {
          200: AdminUserSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      return request.admin!;
    },
  );
};
