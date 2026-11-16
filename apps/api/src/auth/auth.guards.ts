import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminUser } from '@palnadu/contracts';
import { findValidSessionByToken, type DatabaseClient } from '@palnadu/persistence';

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

export function requireAdminPermission(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply
        .status(401)
        .send(errorResponse('UNAUTHORIZED', 'Authentication required', request.id));
    }

    const hasAny = requiredPermissions.some((perm) => request.admin!.permissions.includes(perm));
    if (!hasAny) {
      return reply
        .status(403)
        .send(
          errorResponse(
            'FORBIDDEN',
            `Missing required permission: ${requiredPermissions.join(' or ')}`,
            request.id,
          ),
        );
    }
  };
}

function parseFullOrigin(urlString: string): { host: string; fullOrigin: string } | null {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    const host = parsed.host.replace(/:(80|443)$/, '').toLowerCase();
    const fullOrigin = parsed.origin.replace(/:(80|443)$/, '').toLowerCase();
    return { host, fullOrigin };
  } catch {
    return null;
  }
}

function isOriginAllowed(
  rawUrl: string,
  normalizedHost: string,
  allowedSet: Set<string>,
): boolean | null {
  const parsed = parseFullOrigin(rawUrl);
  if (!parsed) {
    return null;
  }
  return parsed.host === normalizedHost || allowedSet.has(parsed.fullOrigin);
}

function hasValidSessionCookie(request: FastifyRequest): boolean {
  const rawCookie = request.cookies[SESSION_COOKIE_NAME];
  if (!rawCookie) {
    return false;
  }
  const unsigned = request.unsignCookie(rawCookie);
  return Boolean(unsigned.valid && unsigned.value);
}

export function createCsrfProtection(allowedOrigins: string[] = []) {
  const allowedSet = new Set(allowedOrigins.map((o) => o.replace(/:(80|443)$/, '').toLowerCase()));

  return async function validateCsrfProtection(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return;
    }

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
      const allowed = isOriginAllowed(origin, normalizedHost, allowedSet);
      if (allowed === null) {
        reply.status(403).send(errorResponse('CSRF_ERROR', 'Malformed origin header', request.id));
        return;
      }
      if (!allowed) {
        reply
          .status(403)
          .send(errorResponse('CSRF_ERROR', 'Cross-origin request rejected', request.id));
        return;
      }
    } else if (request.headers.referer) {
      const allowed = isOriginAllowed(request.headers.referer, normalizedHost, allowedSet);
      if (allowed === null) {
        reply.status(403).send(errorResponse('CSRF_ERROR', 'Malformed referer header', request.id));
        return;
      }
      if (!allowed) {
        reply
          .status(403)
          .send(errorResponse('CSRF_ERROR', 'Cross-origin request rejected', request.id));
        return;
      }
    } else if (hasValidSessionCookie(request)) {
      reply
        .status(403)
        .send(
          errorResponse(
            'CSRF_ERROR',
            'State-changing request with session cookie requires Origin or Referer header',
            request.id,
          ),
        );
      return;
    }
  };
}

export const validateCsrfProtection = createCsrfProtection([]);
