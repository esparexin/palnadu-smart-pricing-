'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminProductListItem, BrandResponse, ProductStatus } from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { ProductFiltersBar } from '../../../components/catalogue/product-filters-bar';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodRes, brandRes] = await Promise.all([
        apiClient.catalogue.listProducts({
          q: search.trim() || undefined,
          brandId: selectedBrand || undefined,
          status: selectedStatus ? (selectedStatus as ProductStatus) : undefined,
          limit,
          offset: page * limit,
        }),
        apiClient.catalogue.listBrands({ limit: 100 }),
      ]);
      setProducts(prodRes.items);
      setTotal(prodRes.total);
      setBrands(brandRes.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedBrand, selectedStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (prod: AdminProductListItem) => {
    if (!confirm(`Are you sure you want to delete product "${prod.name}"?`)) return;
    try {
      await apiClient.catalogue.deleteProduct(prod.id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
            Products &amp; Pricing
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Authoritative product master, specifications and base pricing ({total} total).
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700"
        >
          + Create Product
        </Link>
      </div>

      <ProductFiltersBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        selectedBrand={selectedBrand}
        onBrandChange={(val) => {
          setSelectedBrand(val);
          setPage(0);
        }}
        brands={brands}
        selectedStatus={selectedStatus}
        onStatusChange={(val) => {
          setSelectedStatus(val);
          setPage(0);
        }}
      />

      {isLoading && <LoadingState label="Loading catalogue products..." />}

      {error && !isLoading && (
        <ErrorState title="Could not load products" message={error} retry={loadData} />
      )}

      {!isLoading && !error && products.length === 0 && (
        <EmptyState
          title="No products found"
          description="Try adjusting your search criteria or create a new product."
          action={{
            label: '+ Create First Product',
            onClick: () => router.push('/admin/products/new'),
          }}
        />
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Product / Model
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Brand
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Base Pricing (₹)
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="font-mono text-xs text-slate-400">
                        {p.model ? `Model: ${p.model} | ` : ''}slug: {p.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {p.brandId && brandMap.has(p.brandId) ? (
                        <span className="font-medium text-slate-800">
                          {brandMap.get(p.brandId)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ${
                          p.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.status === 'draft'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="font-semibold text-slate-900">
                        ₹{(p.offerPricePaise / 100).toFixed(2)}
                      </div>
                      {p.mrpPaise > 0 && (
                        <div className="text-[11px] text-slate-400 line-through">
                          MRP ₹{(p.mrpPaise / 100).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="touch-target rounded px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
              <span>
                Page {page + 1} of {totalPages} ({total} items)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="touch-target rounded border border-slate-200 px-3 py-1 font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="touch-target rounded border border-slate-200 px-3 py-1 font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
