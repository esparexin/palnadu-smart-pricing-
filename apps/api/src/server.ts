import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import swagger from '@fastify/swagger';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import {
  ApiErrorResponseSchema,
  HealthResponseSchema,
  ReadinessResponseSchema,
} from '@palnadu/contracts';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import type { ServerConfig } from '@palnadu/server-config';

import type { DatabaseClient } from '@palnadu/persistence';
import {
  authPlugin,
  requireAdminAuth,
  requireAdminPermission,
  validateCsrfProtection,
  SESSION_COOKIE_NAME,
} from './auth/auth.plugin.js';
import { cataloguePlugin } from './catalogue/catalogue.plugin.js';
import { quotationsPlugin } from './quotations/quotations.plugin.js';

export interface ApiDependencies {
  config: ServerConfig;
  database: DatabaseClient;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return undefined;
  }

  return typeof error.statusCode === 'number' ? error.statusCode : undefined;
}

function isValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    error.validation !== undefined
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function errorResponse(code: string, message: string, requestId: string) {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

function getRequestId(request: { headers: Record<string, string | string[] | undefined> }): string {
  const suppliedId = request.headers['x-request-id'];

  if (typeof suppliedId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedId)) {
    return suppliedId;
  }

  return randomUUID();
}

export const LOGGER_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.secret',
  '*.sessionSecret',
  '*.sessionToken',
  '*.token',
] as const;

export async function buildServer({ config, database }: ApiDependencies) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: {
        paths: [...LOGGER_REDACT_PATHS],
        censor: '[REDACTED]',
      },
    },
    logController: new LogController({
      disableRequestLogging: true,
      requestIdLogLabel: 'requestId',
    }),
    genReqId: getRequestId,
    requestIdHeader: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onClose', () => database.close());

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Palnadu.dev Smart Pricing API',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(cookie, {
    secret: config.sessionSecret,
    hook: 'onRequest',
  });

  await app.register(rateLimit, {
    global: false,
    hook: 'preHandler',
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const validationError = isValidationError(error);
    const errorStatusCode = getStatusCode(error);
    const statusCode = validationError
      ? 400
      : errorStatusCode !== undefined && errorStatusCode >= 400 && errorStatusCode < 500
        ? errorStatusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error(
        { errorCode: getErrorCode(error), errorName: getErrorName(error) },
        'Request failed',
      );
    }

    if (statusCode === 429 || getErrorCode(error) === 'FST_ERR_RATE_LIMIT_EXCEEDED') {
      return reply
        .status(429)
        .send(
          errorResponse(
            'RATE_LIMIT_EXCEEDED',
            'Too many requests. Please try again later.',
            request.id,
          ),
        );
    }

    const code = validationError
      ? 'VALIDATION_ERROR'
      : statusCode === 404
        ? 'NOT_FOUND'
        : statusCode < 500
          ? 'REQUEST_ERROR'
          : 'INTERNAL_SERVER_ERROR';
    const message =
      statusCode === 404
        ? 'Route not found'
        : statusCode < 500
          ? 'Request could not be processed'
          : 'An internal error occurred';

    return reply.status(statusCode).send(errorResponse(code, message, request.id));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(errorResponse('NOT_FOUND', 'Route not found', request.id)),
  );

  app.get(
    '/api/v1/health',
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/api/v1/ready',
    {
      schema: {
        response: {
          200: ReadinessResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await database.ping();
        return { status: 'ready' as const };
      } catch (error) {
        request.log.error(
          { errorCode: getErrorCode(error), errorName: getErrorName(error) },
          'Database readiness check failed',
        );
        return reply
          .status(503)
          .send(errorResponse('SERVICE_UNAVAILABLE', 'Service is not ready', request.id));
      }
    },
  );

  app.get('/api/v1/openapi.json', async () => app.swagger());

  await app.register(authPlugin, { config, database });
  await app.register(cataloguePlugin, { config, database });
  await app.register(quotationsPlugin, { config, database });

  return app;
}

export { requireAdminAuth, requireAdminPermission, validateCsrfProtection, SESSION_COOKIE_NAME };
