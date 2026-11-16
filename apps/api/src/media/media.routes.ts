import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import {
  createProductImage,
  createStorageAdapter,
  processAndOptimizeImage,
  type DatabaseClient,
  type StoragePort,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface MediaRouteOptions {
  database: DatabaseClient;
  storage?: StoragePort;
}

const ProductIdParamSchema = z.object({ id: z.string().uuid() }).strict();

export const mediaRoutes: FastifyPluginAsync<MediaRouteOptions> = async (rawApp, options) => {
  const { database, storage = createStorageAdapter() } = options;

  await rawApp.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  const adminManage = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:manage', 'admin:manage'),
  ];

  // POST /api/v1/admin/media/upload (Standalone binary image upload)
  rawApp.post('/media/upload', { preHandler: adminManage }, async (request, reply) => {
    try {
      const part = await request.file();
      if (!part) {
        return reply
          .status(400)
          .send(errorResponse('BAD_REQUEST', 'No image file uploaded', request.id));
      }

      const buffer = await part.toBuffer();
      const optimized = await processAndOptimizeImage(buffer, part.mimetype, 'products');
      const uploadResult = await storage.upload(
        optimized.key,
        optimized.buffer,
        optimized.contentType,
      );

      return reply.status(201).send({
        url: uploadResult.url,
        key: uploadResult.key,
        size: uploadResult.size,
        width: optimized.width,
        height: optimized.height,
        contentType: optimized.contentType,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image processing failed';
      return reply.status(400).send(errorResponse('IMAGE_UPLOAD_ERROR', message, request.id));
    }
  });

  // POST /api/v1/admin/products/:id/images/upload (Upload and bind to product)
  rawApp.post(
    '/products/:id/images/upload',
    { preHandler: adminManage },
    async (request, reply) => {
      const paramsResult = ProductIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send(errorResponse('BAD_REQUEST', 'Invalid product ID', request.id));
      }
      const productId = paramsResult.data.id;

      try {
        const part = await request.file();
        if (!part) {
          return reply
            .status(400)
            .send(errorResponse('BAD_REQUEST', 'No image file uploaded', request.id));
        }

        const buffer = await part.toBuffer();
        const optimized = await processAndOptimizeImage(
          buffer,
          part.mimetype,
          `products/${productId}`,
        );
        const uploadResult = await storage.upload(
          optimized.key,
          optimized.buffer,
          optimized.contentType,
        );

        // Extract optional form fields
        const altText =
          typeof part.fields.altText === 'object' && 'value' in part.fields.altText
            ? String(part.fields.altText.value)
            : '';
        const isPrimary =
          typeof part.fields.isPrimary === 'object' && 'value' in part.fields.isPrimary
            ? part.fields.isPrimary.value === 'true'
            : false;
        const variantId =
          typeof part.fields.variantId === 'object' &&
          'value' in part.fields.variantId &&
          part.fields.variantId.value
            ? String(part.fields.variantId.value)
            : null;

        const created = await createProductImage(database.db, productId, {
          url: uploadResult.url,
          altText,
          isPrimary,
          variantId,
          rightsStatus: 'manual_upload',
        });

        return reply.status(201).send(created);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Image upload failed';
        return reply.status(400).send(errorResponse('IMAGE_UPLOAD_ERROR', message, request.id));
      }
    },
  );
};
