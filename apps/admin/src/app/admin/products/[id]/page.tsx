'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AdminProductDetailResponse } from '@palnadu/contracts';
import { apiClient } from '../../../../lib/api-client';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { ProductOverviewCard } from '../../../../components/catalogue/product-overview-card';
import { ProductVariantsSection } from '../../../../components/catalogue/product-variants-section';
import { ProductImagesSection } from '../../../../components/catalogue/product-images-section';
import { ProductRelationshipsSection } from '../../../../components/catalogue/product-relationships-section';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;

  const [product, setProduct] = useState<AdminProductDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.catalogue.getProduct(productId);
      setProduct(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (isLoading) {
    return <LoadingState label="Loading product details..." />;
  }

  if (error || !product) {
    return (
      <ErrorState
        title="Product Not Found"
        message={error ?? 'The requested product could not be located.'}
        retry={loadProduct}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            <Link href="/admin/products" className="hover:text-slate-800 shrink-0">
              Products
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-700 break-all">{product.slug}</span>
          </div>
          <h1 className="mt-1 font-bold text-2xl text-slate-900 tracking-tight break-words">
            {product.name}
          </h1>
        </div>
        <Link
          href="/admin/products"
          className="touch-target inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50 shrink-0"
        >
          &larr; Back to Products
        </Link>
      </div>

      <ProductOverviewCard product={product} onRefresh={loadProduct} />

      <ProductVariantsSection
        productId={product.id}
        variants={product.variants}
        onRefresh={loadProduct}
      />

      <ProductImagesSection
        productId={product.id}
        images={product.images}
        onRefresh={loadProduct}
        productStatus={product.status}
      />

      <ProductRelationshipsSection
        productId={product.id}
        relationships={product.relationships}
        onRefresh={loadProduct}
      />
    </div>
  );
}
