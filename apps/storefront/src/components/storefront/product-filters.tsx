'use client';

import React from 'react';
import type { BrandResponse, CategoryResponse } from '@palnadu/contracts';

export interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedBrand: string;
  onBrandChange: (value: string) => void;
  categories: CategoryResponse[];
  brands: BrandResponse[];
  onReset: () => void;
}

export function ProductFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  categories,
  brands,
  onReset,
}: ProductFiltersProps) {
  const hasActiveFilters = Boolean(search || selectedCategory || selectedBrand);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <label htmlFor="search-input" className="block text-xs font-semibold text-slate-700 mb-1">
            Search Catalogue
          </label>
          <input
            id="search-input"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, model or slug..."
            className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category-select"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Category
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label htmlFor="brand-select" className="block text-xs font-semibold text-slate-700 mb-1">
            Brand
          </label>
          <select
            id="brand-select"
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onReset}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Reset Filters
            </button>
          ) : (
            <div className="hidden lg:block text-xs text-slate-400 py-3">Showing all products</div>
          )}
        </div>
      </div>
    </div>
  );
}
