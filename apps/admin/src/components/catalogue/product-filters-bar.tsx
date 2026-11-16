'use client';

import React from 'react';
import type { BrandResponse } from '@palnadu/contracts';

export interface ProductFiltersBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  brands: BrandResponse[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export function ProductFiltersBar({
  search,
  onSearchChange,
  selectedBrand,
  onBrandChange,
  brands,
  selectedStatus,
  onStatusChange,
}: ProductFiltersBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <input
        type="search"
        placeholder="Search by name, model or slug..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      <select
        value={selectedBrand}
        onChange={(e) => onBrandChange(e.target.value)}
        className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        <option value="">All Brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        <option value="">All Publication Statuses</option>
        <option value="draft">Draft (Private)</option>
        <option value="published">Published (Storefront Active)</option>
        <option value="archived">Archived (Inactive)</option>
      </select>
    </div>
  );
}
