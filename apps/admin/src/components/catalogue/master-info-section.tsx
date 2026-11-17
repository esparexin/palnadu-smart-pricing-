'use client';

import React from 'react';

export interface MasterInfoSectionProps {
  name: string;
  onNameChange: (val: string) => void;
  slug: string;
  onSlugChange: (val: string) => void;
  model: string;
  onModelChange: (val: string) => void;
  unit: string;
  onUnitChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  disabled?: boolean;
}

export function MasterInfoSection({
  name,
  onNameChange,
  slug,
  onSlugChange,
  model,
  onModelChange,
  unit,
  onUnitChange,
  description,
  onDescriptionChange,
  disabled = false,
}: MasterInfoSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="font-semibold text-base text-slate-900 border-b border-slate-100 pb-2">
        1. Master Information
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className="block font-medium text-slate-700 text-xs">
            Product Name *
          </label>
          <input
            id="p-name"
            type="text"
            required
            disabled={disabled}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. 4MP Fixed Dome Camera"
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="p-slug" className="block font-medium text-slate-700 text-xs">
            Slug (URL Identifier) *
          </label>
          <input
            id="p-slug"
            type="text"
            required
            disabled={disabled}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="e.g. 4mp-fixed-dome-camera"
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="p-model" className="block font-medium text-slate-700 text-xs">
            Model Number
          </label>
          <input
            id="p-model"
            type="text"
            disabled={disabled}
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="e.g. DS-2CD2143G2-I"
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="p-unit" className="block font-medium text-slate-700 text-xs">
            Unit of Measure *
          </label>
          <input
            id="p-unit"
            type="text"
            required
            disabled={disabled}
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            placeholder="e.g. piece, meter, roll"
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>
      <div>
        <label htmlFor="p-desc" className="block font-medium text-slate-700 text-xs">
          Product Description
        </label>
        <textarea
          id="p-desc"
          rows={3}
          disabled={disabled}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Detailed technical overview and product features..."
          className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}
