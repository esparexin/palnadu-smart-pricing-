'use client';

import React, { useEffect, useState, useTransition } from 'react';
import type { BrandResponse, CategoryResponse, PublicProductDto } from '@palnadu/contracts';
import { ApiClient } from '../lib/api-client';
import { StorefrontHeader } from '../components/storefront/storefront-header';
import { StorefrontFooter } from '../components/storefront/storefront-footer';
import { ProductCard } from '../components/storefront/product-card';
import { ProductFilters } from '../components/storefront/product-filters';
import { LoadingState } from '../components/loading-state';
import { ErrorState } from '../components/error-state';
import { EmptyState } from '../components/empty-state';

const apiClient = new ApiClient();

export default function StorefrontHomePage() {
  const [products, setProducts] = useState<PublicProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [, startTransition] = useTransition();

  // Load categories and brands once
  useEffect(() => {
    Promise.all([apiClient.storefront.listCategories(), apiClient.storefront.listBrands()])
      .then(([cats, bnds]) => {
        setCategories(cats);
        setBrands(bnds);
      })
      .catch(() => {
        // Non-blocking for filters
      });
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    setError(null);
    apiClient.storefront
      .listProducts({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        q: search || undefined,
        categorySlug: selectedCategory || undefined,
        brandSlug: selectedBrand || undefined,
      })
      .then((res) => {
        startTransition(() => {
          setProducts(res.items);
          setTotal(res.total);
          setLoading(false);
        });
      })
      .catch((err) => {
        startTransition(() => {
          setError(err instanceof Error ? err.message : 'Failed to load products');
          setLoading(false);
        });
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedBrand, page]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      {/* Hero Banner */}
      <section className="border-b border-slate-200 bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Commercial Equipment Catalogue
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Explore enterprise hardware, surveillance equipment, and networking systems. Select
              products and build your quotation request with authoritative technical specifications.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ProductFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={(v) => {
            setSelectedCategory(v);
            setPage(1);
          }}
          selectedBrand={selectedBrand}
          onBrandChange={(v) => {
            setSelectedBrand(v);
            setPage(1);
          }}
          categories={categories}
          brands={brands}
          onReset={handleResetFilters}
        />

        {/* Product Grid / States */}
        <section className="mt-6">
          {loading ? (
            <LoadingState label="Loading product catalogue..." />
          ) : error ? (
            <ErrorState
              title="Unable to load catalogue"
              message={error}
              retry={fetchProducts}
              retryLabel="Try Again"
            />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="No commercial products match your current search or filter criteria."
              action={{ label: 'Clear Filters', onClick: handleResetFilters }}
            />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  Showing {products.length} of {total} products
                </span>
                {totalPages > 1 && (
                  <span>
                    Page {page} of {totalPages}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <StorefrontFooter />
    </div>
  );
}
