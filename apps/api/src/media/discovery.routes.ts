import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ApproveCandidateRequestSchema } from '@palnadu/contracts';
import {
  approveCandidateAndCreateImage,
  findBrandById,
  getCandidateById,
  findProductById,
  HybridImageDiscoveryService,
  listImageCandidates,
  MockDistributorProvider,
  MockManufacturerProvider,
  saveImageCandidates,
  updateCandidateStatus,
  type DatabaseClient,
} from '@palnadu/persistence';
import { errorResponse, requireAdminAuth, requireAdminPermission } from '../auth/auth.guards.js';

export interface DiscoveryRouteOptions {
  database: DatabaseClient;
  discoveryService?: HybridImageDiscoveryService;
}

const ProductIdParamSchema = z.object({ id: z.string().uuid() }).strict();
const CandidateParamSchema = z
  .object({
    id: z.string().uuid(),
    candidateId: z.string().uuid(),
  })
  .strict();

function createDefaultDiscoveryService(): HybridImageDiscoveryService {
  return new HybridImageDiscoveryService([
    new MockManufacturerProvider([
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4-MDS',
        imageUrl:
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
        attribution: 'Official CP Plus Product Catalog 2026',
      },
      {
        brand: 'Hikvision',
        model: 'DS-2CD2143G2-I',
        imageUrl:
          'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
        attribution: 'Hikvision Official Media Asset',
      },
      {
        brand: 'Dahua',
        model: 'DH-IPC-HDBW2431R-ZS',
        imageUrl:
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
        attribution: 'Dahua Technology Catalog',
      },
    ]),
    new MockDistributorProvider([
      {
        brand: 'CP Plus',
        model: 'CP-UNC-TA41ZL4',
        imageUrl:
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
        distributor: 'Palnadu Distribution Network',
      },
      {
        brand: 'Hikvision',
        model: 'DS-2CD2143G2',
        imageUrl:
          'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
        distributor: 'Andhra Security Systems',
      },
    ]),
  ]);
}

export const discoveryRoutes: FastifyPluginAsync<DiscoveryRouteOptions> = async (
  rawApp,
  options,
) => {
  const { database, discoveryService = createDefaultDiscoveryService() } = options;

  const adminManage = [
    requireAdminAuth(database),
    requireAdminPermission('catalogue:manage', 'admin:manage'),
  ];

  // POST /products/:id/images/discover
  rawApp.post('/products/:id/images/discover', { preHandler: adminManage }, async (req, reply) => {
    const params = ProductIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid product ID', req.id));
    }
    const productId = params.data.id;

    const product = await findProductById(database.db, productId);
    if (!product) {
      return reply.status(404).send(errorResponse('NOT_FOUND', 'Product not found', req.id));
    }

    let brandName: string | null = null;
    if (product.brandId) {
      const brand = await findBrandById(database.db, product.brandId);
      if (brand) brandName = brand.name;
    }

    const discovered = await discoveryService.discover({
      productId,
      brandName,
      model: product.model,
      productName: product.name,
    });

    const saved = await saveImageCandidates(database.db, discovered);
    return reply.status(200).send(saved);
  });

  // GET /products/:id/image-candidates
  rawApp.get('/products/:id/image-candidates', { preHandler: adminManage }, async (req, reply) => {
    const params = ProductIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid product ID', req.id));
    }
    const candidates = await listImageCandidates(database.db, params.data.id);
    return reply.status(200).send(candidates);
  });

  // POST /products/:id/image-candidates/:candidateId/approve
  rawApp.post(
    '/products/:id/image-candidates/:candidateId/approve',
    { preHandler: adminManage },
    async (req, reply) => {
      const params = CandidateParamSchema.safeParse(req.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid parameters', req.id));
      }
      const body = ApproveCandidateRequestSchema.safeParse(req.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Invalid body', req.id));
      }

      const candidate = await getCandidateById(database.db, params.data.candidateId);
      if (!candidate || candidate.productId !== params.data.id) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'Candidate not found', req.id));
      }

      const result = await approveCandidateAndCreateImage(
        database.db,
        params.data.candidateId,
        body.data,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /products/:id/image-candidates/:candidateId/reject
  rawApp.post(
    '/products/:id/image-candidates/:candidateId/reject',
    { preHandler: adminManage },
    async (req, reply) => {
      const params = CandidateParamSchema.safeParse(req.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse('BAD_REQUEST', 'Invalid parameters', req.id));
      }
      const candidate = await getCandidateById(database.db, params.data.candidateId);
      if (!candidate || candidate.productId !== params.data.id) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'Candidate not found', req.id));
      }

      await updateCandidateStatus(database.db, params.data.candidateId, 'rejected');
      return reply.status(200).send({ success: true });
    },
  );
};
