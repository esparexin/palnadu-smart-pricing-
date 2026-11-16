'use client';

import React, { useState } from 'react';
import type { ImageResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';
import { AddImageForm } from './add-image-form';
import { ImageDiscoveryModal } from './image-discovery-modal';

export interface ProductImagesSectionProps {
  productId: string;
  images: ImageResponse[];
  onRefresh: () => void;
}

export function ProductImagesSection({ productId, images, onRefresh }: ProductImagesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return;
    try {
      await apiClient.catalogue.deleteImage(productId, imageId);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Product Media &amp; Images</h3>
          <p className="text-xs text-slate-500">
            Manage product visual assets, WebP compression, and commercial image rights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDiscoveryOpen(true)}
            className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50"
          >
            Auto-Discover Images
          </button>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="touch-target rounded-md bg-slate-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-slate-800"
            >
              + Add Image
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <AddImageForm
          productId={productId}
          imagesCount={images.length}
          onSuccess={() => {
            setIsAdding(false);
            onRefresh();
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {images.length === 0 && !isAdding ? (
        <p className="text-xs text-slate-400 italic">No images attached to this product.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
              <div className="h-28 w-full bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                <img src={img.url} alt={img.altText} className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    img.isPrimary
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {img.isPrimary ? 'Primary Cover' : 'Secondary'}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="touch-target text-red-600 hover:text-red-800 font-medium px-1.5 py-0.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageDiscoveryModal
        productId={productId}
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onImageApproved={onRefresh}
      />
    </div>
  );
}
