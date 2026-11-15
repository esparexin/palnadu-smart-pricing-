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
import type { ServerConfig } from '@palnadu/server-config';
import type { DatabaseClient } from '@palnadu/persistence';

interface ApiDependencies {
  config: ServerConfig;
  database: Pick<DatabaseClient, 'close' | 'ping'>;
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

export async function buildServer({ config, database }: ApiDependencies) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          '*.password',
          '*.secret',
          '*.token',
        ],
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

  return app;
}
