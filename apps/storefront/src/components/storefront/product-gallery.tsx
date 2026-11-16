'use client';

import React, { useState } from 'react';

export interface ProductGalleryProps {
  images: Array<{ url: string; altText: string; isPrimary: boolean }>;
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const primaryIdx = images.findIndex((img) => img.isPrimary);
  const [selectedIndex, setSelectedIndex] = useState(primaryIdx >= 0 ? primaryIdx : 0);

  const currentImage = images[selectedIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-center">
        {currentImage ? (
          <img
            src={currentImage.url}
            alt={currentImage.altText || productName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative h-16 w-16 min-h-[44px] min-w-[44px] flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedIndex === idx
                  ? 'border-blue-600 shadow-sm'
                  : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
