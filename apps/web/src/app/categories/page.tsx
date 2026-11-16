'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CategoryResponse } from '@palnadu/contracts';
import { ApiClient } from '../../lib/api-client';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { EmptyState } from '../../components/empty-state';

const apiClient = new ApiClient();

export default function CategoriesBrowsePage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    apiClient.storefront
      .listCategories(search || undefined)
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

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Product Categories
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Browse our commercial product classification hierarchy to discover equipment for your
            infrastructure needs.
          </p>

          <div className="mt-6 max-w-md">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter categories by name..."
              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Categories Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
            description="No categories match your search term."
            action={{ label: 'Clear Search', onClick: () => setSearch('') }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rootCategories.map((cat) => {
              const children = subcategoriesMap.get(cat.id) ?? [];
              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      <Link
                        href={`/?categorySlug=${cat.slug}`}
                        className="hover:text-blue-600 focus:outline-none focus:underline"
                      >
                        {cat.name}
                      </Link>
                    </h2>

                    {children.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href={`/?categorySlug=${cat.slug}`}
                      className="flex min-h-[44px] items-center justify-center rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Browse All {cat.name} &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
}
