'use client';

import React from 'react';
import type { ImageResponse } from '@palnadu/contracts';

export interface ProductImageCardProps {
  img: ImageResponse;
  idx: number;
  total: number;
  isBusy: boolean;
  isDeleteBlocked: boolean;
  onSetPrimary: (id: string) => void;
  onMove: (idx: number, direction: 'up' | 'down') => void;
  onReplace: (id: string, altText: string) => void;
  onDelete: (id: string) => void;
}

export function ProductImageCard({
  img,
  idx,
  total,
  isBusy,
  isDeleteBlocked,
  onSetPrimary,
  onMove,
  onReplace,
  onDelete,
}: ProductImageCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 space-y-2 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="h-32 w-full bg-slate-100 rounded flex items-center justify-center overflow-hidden relative">
          <img
            src={img.url}
            alt={img.altText || `Product image ${idx + 1}`}
            className="h-full w-full object-contain"
          />
          <span className="absolute top-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] font-mono">
            #{idx + 1}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${img.isPrimary ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
          >
            {img.isPrimary ? 'Primary Cover' : 'Secondary'}
          </span>
          {!img.isPrimary && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onSetPrimary(img.id)}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Set Primary
            </button>
          )}
        </div>
        {img.altText && <p className="text-[11px] text-slate-600 truncate">{img.altText}</p>}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={idx === 0 || isBusy}
            onClick={() => onMove(idx, 'up')}
            className="touch-target p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
            title="Move earlier"
          >
            &larr;
          </button>
          <button
            type="button"
            disabled={idx === total - 1 || isBusy}
            onClick={() => onMove(idx, 'down')}
            className="touch-target p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
            title="Move later"
          >
            &rarr;
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReplace(img.id, img.altText)}
            className="touch-target text-slate-600 hover:text-slate-900 font-medium px-1.5 py-0.5 text-xs"
          >
            Replace
          </button>
          <button
            type="button"
            disabled={isDeleteBlocked || isBusy}
            onClick={() => onDelete(img.id)}
            title={isDeleteBlocked ? 'Published products require at least 2 images' : undefined}
            className="touch-target text-red-600 hover:text-red-800 font-medium px-1.5 py-0.5 text-xs disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
