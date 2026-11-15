'use client';

import React, { useState } from 'react';
import type { CategoryResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface CategoryModalProps {
  category?: CategoryResponse | null;
  categories: CategoryResponse[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CategoryModal({
  category,
  categories,
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const isEditing = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [parentId, setParentId] = useState<string>(category?.parentId ?? '');
  const [isManualSlug, setIsManualSlug] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validParentOptions = categories.filter((c) => !category || c.id !== category.id);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isManualSlug) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError('Both name and slug are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedParent = parentId.trim() ? parentId : null;
      if (isEditing && category) {
        await apiClient.catalogue.updateCategory(category.id, {
          name: name.trim(),
          slug: slug.trim(),
          parentId: selectedParent,
        });
      } else {
        await apiClient.catalogue.createCategory({
          name: name.trim(),
          slug: slug.trim(),
          parentId: selectedParent,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="category-modal-title" className="font-bold text-lg text-slate-900">
          {isEditing ? 'Edit Category' : 'Add Category'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {isEditing ? 'Update taxonomy parameters.' : 'Create a new hierarchical category.'}
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-red-800 text-xs" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="cat-name" className="block font-medium text-slate-700 text-xs">
              Category Name *
            </label>
            <input
              id="cat-name"
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Surveillance Cameras"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cat-slug" className="block font-medium text-slate-700 text-xs">
              Slug (URL Identifier) *
            </label>
            <input
              id="cat-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setIsManualSlug(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. surveillance-cameras"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cat-parent" className="block font-medium text-slate-700 text-xs">
              Parent Category (Optional)
            </label>
            <select
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">None (Top-Level Root Category)</option>
              {validParentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="touch-target rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target rounded-md bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
