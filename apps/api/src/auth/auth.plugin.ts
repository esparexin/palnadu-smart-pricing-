import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
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
  findValidSessionByToken,
  generateSessionToken,
  revokeSessionByToken,
  verifyPassword,
} from '@palnadu/persistence';
import type { DatabaseClient } from '@palnadu/persistence';
import type { ServerConfig } from '@palnadu/server-config';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminUser;
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
  }
}

export const SESSION_COOKIE_NAME = 'palnadu_session';

const DUMMY_SCRYPT_HASH =
  '$scrypt$N=16384,r=8,p=1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export interface AuthPluginOptions {
  config: ServerConfig;
  database: DatabaseClient;
}

export function errorResponse(code: string, message: string, requestId: string) {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

export function requireAdminAuth(database: DatabaseClient) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const rawCookie = request.cookies[SESSION_COOKIE_NAME];
    if (!rawCookie) {
      return reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Authentication required', request.id));
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      return reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Invalid or tampered session cookie', request.id));
    }

    const resolved = await findValidSessionByToken(database.db, unsigned.value);
    if (!resolved) {
      return reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Session expired, revoked, or invalid', request.id));
    }

    request.admin = {
      id: resolved.user.id,
      email: resolved.user.email,
      name: resolved.user.name,
      status: resolved.user.status as AdminUser['status'],
      permissions: resolved.user.permissions as AdminUser['permissions'],
      createdAt: resolved.user.createdAt.toISOString(),
      updatedAt: resolved.user.updatedAt.toISOString(),
    };

    request.session = {
      id: resolved.session.id,
      userId: resolved.session.userId,
      expiresAt: resolved.session.expiresAt,
    };
  };
}

export function requireAdminPermission(requiredPermission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Authentication required', request.id));
    }

    if (!request.admin.permissions.includes(requiredPermission)) {
      return reply
        .status(403)
        .send(
          errorResponse(
            'FORBIDDEN',
            `Missing required permission: ${requiredPermission}`,
            request.id,
          ),
        );
    }
  };
}

export async function validateCsrfProtection(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const rawHost = request.headers.host;
    if (
      !rawHost ||
      typeof rawHost !== 'string' ||
      rawHost.trim().length === 0 ||
      rawHost.includes(',') ||
      rawHost.includes(' ')
    ) {
      reply.status(400).send(errorResponse('BAD_REQUEST', 'Missing Host header', request.id));
      return;
    }

    const normalizedHost = rawHost.replace(/:(80|443)$/, '').toLowerCase();
    const origin = request.headers.origin;

    if (origin) {
      let originHost: string;
      try {
        const parsedOrigin = new URL(origin);
        if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
          reply
            .status(403)
            .send(errorResponse('CSRF_ERROR', 'Malformed origin header', request.id));
          return;
        }
        originHost = parsedOrigin.host.replace(/:(80|443)$/, '').toLowerCase();
      } catch {
        reply.status(403).send(errorResponse('CSRF_ERROR', 'Malformed origin header', request.id));
        return;
      }

      if (originHost !== normalizedHost) {
        reply
          .status(403)
          .send(errorResponse('CSRF_ERROR', 'Cross-origin request rejected', request.id));
        return;
      }
    } else if (request.headers.referer) {
      let refererHost: string;
      try {
        const parsedReferer = new URL(request.headers.referer);
        if (!['http:', 'https:'].includes(parsedReferer.protocol)) {
          reply
            .status(403)
            .send(errorResponse('CSRF_ERROR', 'Malformed referer header', request.id));
          return;
        }
        refererHost = parsedReferer.host.replace(/:(80|443)$/, '').toLowerCase();
      } catch {
        reply.status(403).send(errorResponse('CSRF_ERROR', 'Malformed referer header', request.id));
        return;
      }

      if (refererHost !== normalizedHost) {
        reply
          .status(403)
          .send(errorResponse('CSRF_ERROR', 'Cross-origin request rejected', request.id));
        return;
      }
    }
  }
}

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  rawApp: FastifyInstance,
  options: AuthPluginOptions,
) => {
  const { config, database } = options;
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // CSRF / Origin protection hook for state-changing endpoints
  app.addHook('onRequest', validateCsrfProtection);

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
      // request.admin is guaranteed to be set by requireAdminAuth
      return request.admin!;
    },
  );
};
