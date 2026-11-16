'use client';

import React, { useState } from 'react';
import { apiClient } from '../../lib/api-client';

export interface AddImageFormProps {
  productId: string;
  imagesCount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddImageForm({ productId, imagesCount, onSuccess, onCancel }: AddImageFormProps) {
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (uploadMode === 'file' && !file) {
      setError('Please select an image file to upload.');
      return;
    }
    if (uploadMode === 'url' && !url.trim()) {
      setError('Image URL is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (uploadMode === 'file' && file) {
        await apiClient.media.uploadProductImage(productId, file, {
          altText: altText.trim(),
          isPrimary,
        });
      } else {
        await apiClient.catalogue.createImage(productId, {
          url: url.trim(),
          altText: altText.trim(),
          isPrimary,
          sortOrder: imagesCount,
          rightsStatus: 'manual_upload',
        });
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-red-800 text-xs" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={`touch-target rounded px-3 py-1 font-medium ${
            uploadMode === 'file' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Upload Image File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('url')}
          className={`touch-target rounded px-3 py-1 font-medium ${
            uploadMode === 'url' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Image URL
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div>
          <label htmlFor="img-file" className="block font-medium text-slate-700 text-xs">
            Choose Image File (JPEG, PNG, WebP, AVIF up to 10MB) *
          </label>
          <input
            id="img-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      ) : (
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
      )}

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
          onClick={onCancel}
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
  );
}
