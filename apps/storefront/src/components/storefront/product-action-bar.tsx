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

  const whatsappText = encodeURIComponent(
    `Hello, I would like to request an official quotation for:\n\n*Product:* ${product.name}\n*Model/Variant:* ${
      selectedVariant?.model || product.model || 'Standard'
    }\n*Quantity:* ${quantity} ${product.unit}\n\nPlease share official pricing and delivery availability.`,
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

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
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            WhatsApp Inquiry
          </a>
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
          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Inquiry"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
              </svg>
            </a>
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
                className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Add to Quote Basket
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
