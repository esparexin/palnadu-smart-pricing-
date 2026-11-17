'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PublicProductDto } from '@palnadu/contracts';
import { useBasket } from '../../context/basket-context';

export interface ProductActionBarProps {
  product: PublicProductDto;
}

export function ProductActionBar({ product }: ProductActionBarProps) {
  const { addItem, items } = useBasket();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const isAlreadyInBasket = items.some(
    (i) => i.productId === product.id && (i.variantId ?? '') === (selectedVariant?.id ?? ''),
  );

  const handleAddToBasket = () => {
    const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
    addItem(
      {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        model: product.model,
        unit: product.unit,
        variantId: selectedVariant?.id ?? null,
        variantModel: selectedVariant?.model ?? null,
        sku: selectedVariant?.sku ?? null,
        imageUrl: primaryImage?.url ?? null,
      },
      quantity,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  };

  return (
    <>
      {/* Desktop in-flow action card - hidden on mobile to prevent duplicate CTA */}
      <aside className="hidden md:block rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Price Confidentiality Guaranteed
          </div>
          <div className="text-sm font-medium text-slate-900 mt-0.5">
            Official commercial pricing calculated upon request
          </div>
        </div>

        {product.variants.length > 0 && (
          <div>
            <label
              htmlFor="desktop-variant-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1"
            >
              Select Model / Option
            </label>
            <select
              id="desktop-variant-select"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model || v.sku || 'Variant'} {v.sku ? `(${v.sku})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 mr-2">
              Quantity ({product.unit}):
            </span>
            <div className="flex items-center rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg"
              >
                -
              </button>
              <span className="w-12 text-center text-sm font-semibold text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAddToBasket}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {justAdded
              ? '✓ Added to Basket'
              : isAlreadyInBasket
                ? 'Add More to Basket'
                : 'Add to Quote Basket'}
          </button>
          {isAlreadyInBasket && (
            <Link
              href="/basket"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              View Basket
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile-only sticky bottom action bar - exactly ONE action instance active on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur pb-safe">
        <div className="mx-auto max-w-lg">
          {justAdded || isAlreadyInBasket ? (
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={handleAddToBasket}
                className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                ✓ Added (+1)
              </button>
              <Link
                href="/basket"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                View Basket
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToBasket}
              className="w-full inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Add to Quote Basket
            </button>
          )}
        </div>
      </div>
    </>
  );
}
