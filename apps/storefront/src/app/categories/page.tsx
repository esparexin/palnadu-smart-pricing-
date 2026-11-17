'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CategoryResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';
import { CategoryIcon } from '../../components/storefront/category-icon';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { EmptyState } from '../../components/empty-state';

export default function CategoriesBrowsePage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    apiClient.storefront
      .listCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
        // If only one category exists, avoid redundant category selection and display its products directly
        if (data.length === 1 && data[0]) {
          router.replace(`/?category=${data[0].slug}`);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
            description="No active categories with published products are currently available."
            action={{ label: 'Return to Catalogue', onClick: () => router.push('/') }}
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
      </main>

      <StorefrontFooter />
    </div>
  );
}
