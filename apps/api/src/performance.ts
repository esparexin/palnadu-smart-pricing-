import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const PRIVATE_NO_CACHE_HEADER = 'private, no-cache, no-store, must-revalidate';
export const SLOW_REQUEST_THRESHOLD_MS = 1000;

export async function registerPerformanceHooks(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    (request.raw as { startTime?: bigint }).startTime = process.hrtime.bigint();
  });

  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    const raw = request.raw as { startTime?: bigint };
    if (raw.startTime) {
      const elapsedMs = Number(process.hrtime.bigint() - raw.startTime) / 1_000_000;
      reply.header('Server-Timing', `app;dur=${elapsedMs.toFixed(1)}`);

      if (elapsedMs > SLOW_REQUEST_THRESHOLD_MS) {
        request.log.warn(
          {
            url: request.url,
            method: request.method,
            elapsedMs: Number(elapsedMs.toFixed(1)),
          },
          'Slow route detected',
        );
      }
    }

    const existingCacheControl = reply.getHeader('cache-control');
    if (!existingCacheControl) {
      reply.header('Cache-Control', PRIVATE_NO_CACHE_HEADER);
    }

    if (
      request.method === 'GET' &&
      reply.statusCode === 200 &&
      typeof payload === 'string' &&
      payload.length > 0
    ) {
      const hash = createHash('sha1').update(payload).digest('base64url');
      const etag = `W/"${hash}"`;
      reply.header('ETag', etag);

      const ifNoneMatch = request.headers['if-none-match'];
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === hash)) {
        reply.code(304);
        return '';
      }
    }

    return payload;
  });
}
