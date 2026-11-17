'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CategoryResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';
import { CategoryIcon } from '../../components/storefront/category-icon';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { EmptyState } from '../../components/empty-state';
import { PricingDisclosure } from '../../components/storefront/pricing-disclosure';

export default function CategoriesBrowsePage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    apiClient.storefront
      .listCategories(search.trim() || undefined)
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, [search]);

  // Group top-level categories and subcategories
  const rootCategories = categories.filter((c) => !c.parentId);
  const subcategoriesMap = new Map<string, CategoryResponse[]>();
  for (const c of categories) {
    if (c.parentId) {
      const list = subcategoriesMap.get(c.parentId) ?? [];
      list.push(c);
      subcategoriesMap.set(c.parentId, list);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      {/* Prominent Search & Category Header */}
      <section className="border-b border-slate-200 bg-white py-4 sm:py-6 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Product Categories
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Select an active category to browse available commercial products
              </p>
            </div>

            <div className="w-full sm:max-w-xs">
              <label htmlFor="category-search" className="sr-only">
                Filter categories
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  id="category-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">
        {loading ? (
          <LoadingState label="Loading product categories..." />
        ) : error ? (
          <ErrorState
            title="Unable to load categories"
            message={error}
            retry={fetchCategories}
            retryLabel="Try Again"
          />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories found"
            description="No active categories match your current search or are currently available."
            action={{ label: 'Clear Search', onClick: () => setSearch('') }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rootCategories.map((cat) => {
              const children = subcategoriesMap.get(cat.id) ?? [];
              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <CategoryIcon name={cat.name} slug={cat.slug} className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        <Link
                          href={`/?categorySlug=${cat.slug}`}
                          className="hover:text-blue-600 focus:outline-none focus:underline"
                        >
                          {cat.name}
                        </Link>
                      </h2>
                    </div>

                    {children.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Subcategories
                        </h3>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {children.map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={`/?categorySlug=${sub.slug}`}
                                className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <Link
                      href={`/?categorySlug=${cat.slug}`}
                      className="flex min-h-[44px] items-center justify-center rounded-lg bg-slate-50 px-4 py-2 text-xs sm:text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Browse {cat.name} Products &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pricing Transparency Disclosure Notice */}
        <section className="pt-4">
          <PricingDisclosure variant="primary" />
        </section>
      </main>

      <StorefrontFooter />
    </div>
  );
}
