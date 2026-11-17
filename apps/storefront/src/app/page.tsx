'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import type { CategoryResponse, PublicProductDto } from '@palnadu/contracts';
import { apiClient } from '../lib/api-client';
import { StorefrontHeader } from '../components/storefront/storefront-header';
import { StorefrontFooter } from '../components/storefront/storefront-footer';
import { ProductCard } from '../components/storefront/product-card';
import { CategoryIcon } from '../components/storefront/category-icon';
import { LoadingState } from '../components/loading-state';
import { ErrorState } from '../components/error-state';
import { EmptyState } from '../components/empty-state';
import { PricingDisclosure } from '../components/storefront/pricing-disclosure';

interface CategorySelectorProps {
  categories: CategoryResponse[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  onClearCategory: () => void;
}

function CategorySelector({
  categories,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
}: CategorySelectorProps) {
  if (categories.length <= 1) return null;

  return (
    <section aria-labelledby="categories-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="categories-heading"
          className="text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          Categories
        </h2>
        {selectedCategory && (
          <button
            type="button"
            onClick={onClearCategory}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 min-h-[44px] flex items-center"
          >
            View All Categories
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-600/30'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CategoryIcon
                name={cat.name}
                slug={cat.slug}
                className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
              />
              <span className="mt-1.5 text-xs font-semibold leading-tight line-clamp-1">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface BrandSelectorProps {
  brands: Array<{ id: string; name: string; slug: string }>;
  selectedBrand: string;
  onSelectBrand: (slug: string) => void;
}

function BrandSelector({ brands, selectedBrand, onSelectBrand }: BrandSelectorProps) {
  if (brands.length === 0) return null;

  return (
    <section aria-labelledby="brands-heading" className="space-y-2">
      <h3 id="brands-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Filter by Brand
      </h3>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => onSelectBrand('')}
          className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            !selectedBrand
              ? 'bg-slate-900 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          All Brands
        </button>
        {brands.map((b) => {
          const isSelected = selectedBrand === b.slug;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBrand(b.slug)}
              className={`min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {b.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface ActiveFiltersProps {
  search: string;
  selectedBrand: string;
  selectedCategory: string;
  singleCategoryMode: boolean;
  categoryName?: string;
  brandName?: string;
  onClearSearch: () => void;
  onClearCategory: () => void;
  onClearBrand: () => void;
  onResetAll: () => void;
}

function ActiveFilters({
  search,
  selectedBrand,
  selectedCategory,
  singleCategoryMode,
  categoryName,
  brandName,
  onClearSearch,
  onClearCategory,
  onClearBrand,
  onResetAll,
}: ActiveFiltersProps) {
  const showCategory = Boolean(selectedCategory && !singleCategoryMode && categoryName);
  const showBrand = Boolean(selectedBrand);
  const showSearch = Boolean(search);

  if (!showSearch && !showBrand && !showCategory) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
      <span className="font-semibold text-slate-500">Active filters:</span>
      {showSearch && (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium border border-blue-200">
          Search: &ldquo;{search}&rdquo;
          <button
            type="button"
            onClick={onClearSearch}
            className="hover:text-blue-900 p-0.5"
            aria-label="Clear search"
          >
            &times;
          </button>
        </span>
      )}
      {showCategory && (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium border border-blue-200">
          Category: {categoryName}
          <button
            type="button"
            onClick={onClearCategory}
            className="hover:text-blue-900 p-0.5"
            aria-label="Clear category"
          >
            &times;
          </button>
        </span>
      )}
      {showBrand && (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium border border-blue-200">
          Brand: {brandName || selectedBrand}
          <button
            type="button"
            onClick={onClearBrand}
            className="hover:text-blue-900 p-0.5"
            aria-label="Clear brand"
          >
            &times;
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={onResetAll}
        className="text-xs font-semibold text-red-600 hover:text-red-700 ml-1 underline min-h-[44px] flex items-center"
      >
        Clear All
      </button>
    </div>
  );
}

interface ProductGridContentProps {
  loading: boolean;
  error: string | null;
  products: PublicProductDto[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onRetry: () => void;
  onResetFilters: () => void;
}

function ProductGridContent({
  loading,
  error,
  products,
  total,
  page,
  totalPages,
  onPageChange,
  onRetry,
  onResetFilters,
}: ProductGridContentProps) {
  if (loading) {
    return <LoadingState label="Loading catalogue products..." />;
  }
  if (error) {
    return (
      <ErrorState
        title="Unable to load catalogue"
        message={error}
        retry={onRetry}
        retryLabel="Try Again"
      />
    );
  }
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="No commercial products match your current search or filter criteria in the database."
        action={{ label: 'Clear Filters', onClick: onResetFilters }}
      />
    );
  }
  return (
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

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

export default function StorefrontHomePage() {
  const [products, setProducts] = useState<PublicProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [, startTransition] = useTransition();

  useEffect(() => {
    apiClient.storefront
      .listCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length === 1 && cats[0]) {
          setSelectedCategory(cats[0].slug);
        }
      })
      .catch(() => {
        // Non-fatal
      });
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    setError(null);
    apiClient.storefront
      .listProducts({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        q: search.trim() || undefined,
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

  const availableBrands = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string }>();
    for (const p of products) {
      if (p.brand) {
        map.set(p.brand.slug, p.brand);
      }
    }
    return Array.from(map.values());
  }, [products]);

  const handleResetFilters = () => {
    setSearch('');
    if (categories.length > 1) {
      setSelectedCategory('');
    }
    setSelectedBrand('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const singleCategoryMode = categories.length === 1 && Boolean(categories[0]);
  const activeCategory = categories.find((c) => c.slug === selectedCategory);
  const activeBrandName = availableBrands.find((b) => b.slug === selectedBrand)?.name;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      {/* Prominent Search Bar Section */}
      <section className="border-b border-slate-200 bg-white py-4 sm:py-6 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchProducts();
            }}
            className="relative mx-auto max-w-2xl"
          >
            <label htmlFor="catalogue-search" className="sr-only">
              Search Catalogue
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-4 text-slate-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                id="catalogue-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products by name, model, SKU, or brand..."
                className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-10 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none rounded-lg"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">
        <CategorySelector
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(slug) => {
            setSelectedCategory((prev) => (prev === slug ? '' : slug));
            setSelectedBrand('');
            setPage(1);
          }}
          onClearCategory={() => {
            setSelectedCategory('');
            setSelectedBrand('');
            setPage(1);
          }}
        />

        {singleCategoryMode && categories[0] && (
          <div className="border-b border-slate-200 pb-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
              <CategoryIcon
                name={categories[0].name}
                slug={categories[0].slug}
                className="h-6 w-6 text-blue-600"
              />
              {categories[0].name}
            </h1>
          </div>
        )}

        <BrandSelector
          brands={availableBrands}
          selectedBrand={selectedBrand}
          onSelectBrand={(slug) => {
            setSelectedBrand((prev) => (prev === slug ? '' : slug));
            setPage(1);
          }}
        />

        <ActiveFilters
          search={search}
          selectedBrand={selectedBrand}
          selectedCategory={selectedCategory}
          singleCategoryMode={Boolean(singleCategoryMode)}
          categoryName={activeCategory?.name}
          brandName={activeBrandName}
          onClearSearch={() => {
            setSearch('');
            setPage(1);
          }}
          onClearCategory={() => {
            setSelectedCategory('');
            setPage(1);
          }}
          onClearBrand={() => {
            setSelectedBrand('');
            setPage(1);
          }}
          onResetAll={handleResetFilters}
        />

        <section aria-label="Product Catalogue Results" className="pt-2">
          <ProductGridContent
            loading={loading}
            error={error}
            products={products}
            total={total}
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => setPage(newPage)}
            onRetry={fetchProducts}
            onResetFilters={handleResetFilters}
          />
        </section>

        <section className="pt-6">
          <PricingDisclosure variant="primary" />
        </section>
      </main>

      <StorefrontFooter />
    </div>
  );
}
