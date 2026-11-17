'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PublicProductDto } from '@palnadu/contracts';
import { useBasket } from '../../context/basket-context';
import { PricingDisclosure } from './pricing-disclosure';

export interface ProductCardProps {
  product: PublicProductDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items } = useBasket();
  const [added, setAdded] = useState(false);

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const hasVariants = product.variants.length > 0;
  const isInBasket = items.some((i) => i.productId === product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        model: product.model,
        unit: product.unit,
        variantId: null,
        variantModel: null,
        sku: null,
        imageUrl: primaryImage?.url ?? null,
      },
      1,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300">
      <div>
        {/* Product Image */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100 flex items-center justify-center">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText || product.name}
              className="h-full w-full object-contain p-2 transition duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {product.brand && (
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {product.brand.name}
              </span>
            )}
            {product.categories.slice(0, 2).map((c) => (
              <span key={c.id} className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                {c.name}
              </span>
            ))}
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2">
            <Link
              href={`/products/${product.slug}`}
              className="focus:outline-none focus:underline rounded"
            >
              {product.name}
            </Link>
          </h3>

          {product.model && (
            <p className="mt-1 text-xs text-slate-500 font-mono">Model: {product.model}</p>
          )}

          {product.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.description}</p>
          )}

          <PricingDisclosure variant="compact" className="mt-2.5" />
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-slate-100 p-4 pt-3">
        {hasVariants ? (
          <Link
            href={`/products/${product.slug}`}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Select Configuration ({product.variants.length} Options)
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/products/${product.slug}`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              View Specs
            </Link>
            <button
              type="button"
              onClick={handleQuickAdd}
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              {added ? '✓ Added' : isInBasket ? '+ Add More' : 'Add to Quote'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
