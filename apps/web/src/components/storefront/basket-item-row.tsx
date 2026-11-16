'use client';

import React from 'react';
import Link from 'next/link';
import type { BasketItem } from '../../context/basket-context';

export interface BasketItemRowProps {
  item: BasketItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function BasketItemRow({ item, onUpdateQuantity, onRemove }: BasketItemRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-200 bg-white hover:bg-slate-50/50 transition">
      {/* Product Information */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          ) : (
            <svg
              className="h-7 w-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${item.productSlug}`}
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 focus:outline-none focus:underline truncate block"
          >
            {item.productName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
            {item.variantModel ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                Variant: {item.variantModel}
              </span>
            ) : item.model ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                Model: {item.model}
              </span>
            ) : null}
            {item.sku && <span>SKU: {item.sku}</span>}
            <span className="text-slate-400">•</span>
            <span>Unit: {item.unit}</span>
          </div>
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-4">
        {/* Quantity Controls */}
        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            aria-label={`Decrease quantity for ${item.productName}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            -
          </button>
          <span className="w-10 text-center text-sm font-semibold text-slate-900 select-none">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            aria-label={`Increase quantity for ${item.productName}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            +
          </button>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.productName} from quote request`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
