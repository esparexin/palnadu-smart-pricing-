'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { CategoryResponse } from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { CategoryModal } from '../../../components/catalogue/category-modal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.catalogue.listCategories({
        q: search.trim() || undefined,
        limit: 100,
        offset: 0,
      });
      setCategories(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDelete = async (category: CategoryResponse) => {
    if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) return;
    try {
      await apiClient.catalogue.deleteCategory(category.id);
      loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">Categories</h1>
          <p className="mt-1 text-xs text-slate-600">
            Hierarchical product taxonomies and display order ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory(null);
            setModalOpen(true);
          }}
          className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700"
        >
          + Add Category
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="cat-search" className="sr-only">
          Search categories
        </label>
        <input
          id="cat-search"
          type="search"
          placeholder="Search categories by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none sm:max-w-xs"
        />
      </div>

      {isLoading && <LoadingState label="Loading taxonomies..." />}

      {error && !isLoading && (
        <ErrorState title="Could not load categories" message={error} retry={loadCategories} />
      )}

      {!isLoading && !error && categories.length === 0 && (
        <EmptyState
          title="No categories found"
          description={
            search
              ? 'No categories matched your search criteria.'
              : 'Create categories to organize your product catalogue.'
          }
          action={{
            label: '+ Create First Category',
            onClick: () => {
              setSelectedCategory(null);
              setModalOpen(true);
            },
          }}
        />
      )}

      {!isLoading && !error && categories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Category Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Slug
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Parent Category
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{c.slug}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {c.parentId && categoryMap.has(c.parentId) ? (
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {categoryMap.get(c.parentId)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Root Level</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c);
                            setModalOpen(true);
                          }}
                          className="touch-target rounded px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
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

      <CategoryModal
        category={selectedCategory}
        categories={categories}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadCategories}
      />
    </div>
  );
}
