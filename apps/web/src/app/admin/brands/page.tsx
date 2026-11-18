'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { BrandResponse } from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { BrandModal } from '../../../components/catalogue/brand-modal';

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandResponse | null>(null);

  const loadBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.catalogue.listBrands({
        q: search.trim() || undefined,
        limit: 50,
        offset: 0,
      });
      setBrands(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const handleDelete = async (brand: BrandResponse) => {
    if (!confirm(`Are you sure you want to delete brand "${brand.name}"?`)) return;
    try {
      await apiClient.catalogue.deleteBrand(brand.id);
      loadBrands();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete brand');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">Brands</h1>
          <p className="mt-1 text-xs text-slate-600">
            Manage manufacturer brands and associated product identifiers ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedBrand(null);
            setModalOpen(true);
          }}
          className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700"
        >
          + Add Brand
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="brand-search" className="sr-only">
          Search brands
        </label>
        <input
          id="brand-search"
          type="search"
          placeholder="Search brands by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none sm:max-w-xs"
        />
      </div>

      {isLoading && <LoadingState label="Loading catalogue brands..." />}

      {error && !isLoading && (
        <ErrorState title="Could not load brands" message={error} retry={loadBrands} />
      )}

      {!isLoading && !error && brands.length === 0 && (
        <EmptyState
          title="No brands found"
          description={
            search
              ? 'No brands matched your search criteria.'
              : 'Create your first brand to organize products.'
          }
          action={{
            label: '+ Create First Brand',
            onClick: () => {
              setSelectedBrand(null);
              setModalOpen(true);
            },
          }}
        />
      )}

      {!isLoading && !error && brands.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Brand Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Slug
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Registered
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => {
                      setSelectedBrand(b);
                      setModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedBrand(b);
                        setModalOpen(true);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Edit brand ${b.name}`}
                    className="hover:bg-slate-50/70 cursor-pointer transition focus-visible:outline-none focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 break-words">{b.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 break-all">
                      {b.slug}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBrand(b);
                            setModalOpen(true);
                          }}
                          className="touch-target rounded px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(b);
                          }}
                          className="touch-target rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BrandModal
        brand={selectedBrand}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadBrands}
      />
    </div>
  );
}
