import type { FastifyBaseLogger } from 'fastify';

let currentCatalogueRevision = Date.now().toString(36);

export function getCatalogueRevision(): string {
  return currentCatalogueRevision;
}

export function bumpCatalogueRevision(logger?: FastifyBaseLogger): string {
  currentCatalogueRevision = Date.now().toString(36);
  logger?.info({ catalogueRevision: currentCatalogueRevision }, 'Catalogue revision bumped');

  const revalidateUrl = process.env.STOREFRONT_REVALIDATE_URL;
  const revalidateSecret = process.env.REVALIDATE_SECRET;
  if (revalidateUrl && revalidateSecret) {
    fetch(revalidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': revalidateSecret,
      },
      body: JSON.stringify({ revision: currentCatalogueRevision, tag: 'catalogue' }),
    }).catch((err) => {
      logger?.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Storefront revalidation trigger failed',
      );
    });
  }

  return currentCatalogueRevision;
}

export function resetCatalogueRevisionForTesting(revision?: string): void {
  currentCatalogueRevision = revision ?? Date.now().toString(36);
}
