'use client';

import React from 'react';
import type { BrandResponse, CategoryResponse, ProductStatus } from '@palnadu/contracts';

export interface ProductClassificationSectionProps {
  brandId: string;
  onBrandChange: (brandId: string) => void;
  brands: BrandResponse[];
  status: ProductStatus;
  onStatusChange: (status: ProductStatus) => void;
  categories: CategoryResponse[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryId: string) => void;
  onSelectAllCategories?: () => void;
  onDeselectAllCategories?: () => void;
}

export function ProductClassificationSection({
  brandId,
  onBrandChange,
  brands,
  status,
  onStatusChange,
  categories,
  selectedCategoryIds,
  onCategoryToggle,
  onSelectAllCategories,
  onDeselectAllCategories,
}: ProductClassificationSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="font-semibold text-base text-slate-900 border-b border-slate-100 pb-2">
        2. Classification &amp; Publication Status
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-brand" className="block font-medium text-slate-700 text-xs">
            Manufacturer Brand
          </label>
          <select
            id="p-brand"
            value={brandId}
            onChange={(e) => onBrandChange(e.target.value)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">No Brand Assigned</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-status" className="block font-medium text-slate-700 text-xs">
            Publication Status
          </label>
          <select
            id="p-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ProductStatus)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="draft">Draft (Private in Admin)</option>
            <option value="published">Published (Storefront Active)</option>
            <option value="archived">Archived (Decommissioned)</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-slate-700 text-xs">
            Categories (Select Applicable Taxonomies)
            {selectedCategoryIds.length > 0 && (
              <span className="ml-1.5 font-normal text-slate-500">
                ({selectedCategoryIds.length} of {categories.length} selected)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {onSelectAllCategories && categories.length > 0 && (
              <button
                type="button"
                onClick={onSelectAllCategories}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 touch-target px-1"
              >
                Select All
              </button>
            )}
            {onDeselectAllCategories && selectedCategoryIds.length > 0 && (
              <button
                type="button"
                onClick={onDeselectAllCategories}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 touch-target px-1"
              >
                Deselect All
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50">
          {categories.map((c) => {
            const isSelected = selectedCategoryIds.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => onCategoryToggle(c.id)}
                aria-pressed={isSelected}
                className={`touch-target px-2.5 py-1 rounded text-xs font-medium transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isSelected ? '✓ ' : ''}
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
