'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PublicProductDto } from '@palnadu/contracts';
import { ApiClient } from '../../../lib/api-client';
import { StorefrontHeader } from '../../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../../components/storefront/storefront-footer';
import { ProductGallery } from '../../../components/storefront/product-gallery';
import { ProductSpecificationsTable } from '../../../components/storefront/product-specifications-table';
import { ProductRecommendationsList } from '../../../components/storefront/product-recommendations-list';
import { ProductActionBar } from '../../../components/storefront/product-action-bar';
import { PricingDisclosure } from '../../../components/storefront/pricing-disclosure';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';

const apiClient = new ApiClient();

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<PublicProductDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    apiClient.storefront
      .getProductBySlug(slug)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Product not found or unavailable');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-32 md:pb-8">
        {loading ? (
          <LoadingState label="Loading product specifications..." />
        ) : error || !product ? (
          <div className="py-12">
            <ErrorState
              title="Product Unavailable"
              message={
                error || 'The requested product could not be found or has not been published.'
              }
              retry={fetchProduct}
              retryLabel="Retry"
            />
            <div className="mt-4 text-center">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Back to Catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
              <Link href="/" className="hover:text-blue-600 focus:outline-none focus:underline">
                Catalogue
              </Link>
              <span>/</span>
              {product.categories[0] && (
                <>
                  <span className="text-slate-700">{product.categories[0].name}</span>
                  <span>/</span>
                </>
              )}
              <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                {product.name}
              </span>
            </nav>

            {/* Overview Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <ProductGallery images={product.images} productName={product.name} />

              <div className="flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {product.brand && (
                      <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {product.brand.name}
                      </span>
                    )}
                    {product.categories.map((c) => (
                      <span
                        key={c.id}
                        className="rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">
                    {product.name}
                  </h1>

                  {product.model && (
                    <p className="mt-1 font-mono text-xs text-slate-500 break-all">
                      Model: {product.model}
                    </p>
                  )}

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-700 leading-relaxed break-words">
                      {product.description ||
                        'Commercial equipment configuration. Refer to technical specifications below for mounting, voltage and interface requirements.'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div>
                      Unit of Measure:{' '}
                      <span className="font-semibold text-slate-900">{product.unit}</span>
                    </div>
                    {product.variants.length > 0 && (
                      <div>
                        Available Options:{' '}
                        <span className="font-semibold text-slate-900">
                          {product.variants.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <ProductActionBar product={product} />
              </div>
            </div>

            {/* Pricing Transparency Disclosure */}
            <PricingDisclosure variant="primary" className="my-6" />

            {/* Detailed Specs and Variants */}
            <ProductSpecificationsTable product={product} />

            {/* Compatible & Recommended Products */}
            <ProductRecommendationsList productId={product.id} />
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
}
