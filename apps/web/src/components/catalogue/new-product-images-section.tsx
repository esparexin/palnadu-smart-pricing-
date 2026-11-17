'use client';

import React, { useRef } from 'react';
import { PRODUCT_IMAGE_LIMITS } from '@palnadu/contracts';

export interface StagedImage {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
  isPrimary: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export interface NewProductImagesSectionProps {
  stagedImages: StagedImage[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onUpdateAltText: (id: string, altText: string) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function NewProductImagesSection({
  stagedImages,
  onAddImages,
  onRemoveImage,
  onSetPrimary,
  onUpdateAltText,
  disabled = false,
}: NewProductImagesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atMax = stagedImages.length >= PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const f of selectedFiles) {
      if (!ALLOWED_MIME_TYPES.has(f.type)) continue;
      if (f.size > MAX_IMAGE_SIZE_BYTES) continue;
      validFiles.push(f);
    }

    if (validFiles.length > 0) {
      onAddImages(validFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-base text-slate-900">Product Images &amp; Media</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select 2 to 8 images (JPEG, PNG, WebP &le; 10MB). Staged images upload automatically
            upon saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {stagedImages.length} of {PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={disabled || atMax}
            className="hidden"
            id="staged-image-input"
          />
          <button
            type="button"
            disabled={disabled || atMax}
            onClick={() => fileInputRef.current?.click()}
            className="touch-target rounded-md bg-slate-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-slate-800 disabled:opacity-50"
          >
            + Choose Images
          </button>
        </div>
      </div>

      {stagedImages.length === 0 ? (
        <div
          onClick={() => !disabled && !atMax && fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition"
        >
          <svg
            className="h-8 w-8 text-slate-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-medium text-slate-600">No images selected yet</span>
          <span className="text-[11px] text-slate-400 mt-1">
            Click to select files from your computer
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stagedImages.map((img) => (
            <div
              key={img.id}
              className={`relative flex flex-col rounded-lg border p-2.5 transition ${
                img.isPrimary ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="relative aspect-video w-full overflow-hidden rounded bg-slate-100 flex items-center justify-center">
                <img
                  src={img.previewUrl}
                  alt={img.altText || img.file.name}
                  className="h-full w-full object-contain"
                />
                {img.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveImage(img.id)}
                  aria-label="Remove image"
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition disabled:opacity-50"
                >
                  &times;
                </button>
              </div>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[120px]" title={img.file.name}>
                    {img.file.name}
                  </span>
                  <span>{(img.file.size / 1024).toFixed(0)} KB</span>
                </div>

                <input
                  type="text"
                  placeholder="Alt description..."
                  value={img.altText}
                  disabled={disabled}
                  onChange={(e) => onUpdateAltText(img.id, e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                />

                <div className="flex items-center justify-between pt-1">
                  {!img.isPrimary ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSetPrimary(img.id)}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Make Primary
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700">Main Display</span>
                  )}

                  {img.status === 'uploading' && (
                    <span className="text-[10px] font-medium text-blue-600 animate-pulse">
                      Uploading...
                    </span>
                  )}
                  {img.status === 'success' && (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      &check; Uploaded
                    </span>
                  )}
                  {img.status === 'error' && (
                    <span
                      className="text-[10px] font-semibold text-red-600"
                      title={img.errorMessage}
                    >
                      Failed
                    </span>
                  )}
                  {img.status === 'pending' && (
                    <span className="text-[10px] text-slate-400">Staged</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
