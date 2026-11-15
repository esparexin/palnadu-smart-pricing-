'use client';

import React, { useState } from 'react';
import type { ImageResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface ProductImagesSectionProps {
  productId: string;
  images: ImageResponse[];
  onRefresh: () => void;
}

export function ProductImagesSection({ productId, images, onRefresh }: ProductImagesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError('Image URL is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.catalogue.createImage(productId, {
        url: url.trim(),
        altText: altText.trim(),
        isPrimary,
        sortOrder: images.length,
        rightsStatus: 'manual_upload',
      });
      setUrl('');
      setAltText('');
      setIsPrimary(false);
      setIsAdding(false);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add image');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Product Media &amp; Images</h3>
          <p className="text-xs text-slate-500">
            Manage product visual assets with commercial rights tags.
          </p>
        </div>
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

      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-red-800 text-xs" role="alert">
          {error}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div>
            <label htmlFor="img-url" className="block font-medium text-slate-700 text-xs">
              Image URL *
            </label>
            <input
              id="img-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/assets/cam-4mp.jpg"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="img-alt" className="block font-medium text-slate-700 text-xs">
              Alt Text / Description
            </label>
            <input
              id="img-alt"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Front angle view of dome camera"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="img-primary"
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="img-primary" className="text-xs font-medium text-slate-700">
              Set as primary catalogue cover image
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Image'}
            </button>
          </div>
        </form>
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
    </div>
  );
}
