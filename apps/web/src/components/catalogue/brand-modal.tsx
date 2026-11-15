'use client';

import React, { useState } from 'react';
import type { BrandResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface BrandModalProps {
  brand?: BrandResponse | null;
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

export function BrandModal({ brand, isOpen, onClose, onSuccess }: BrandModalProps) {
  const isEditing = Boolean(brand);
  const [name, setName] = useState(brand?.name ?? '');
  const [slug, setSlug] = useState(brand?.slug ?? '');
  const [isManualSlug, setIsManualSlug] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      if (isEditing && brand) {
        await apiClient.catalogue.updateBrand(brand.id, { name: name.trim(), slug: slug.trim() });
      } else {
        await apiClient.catalogue.createBrand({ name: name.trim(), slug: slug.trim() });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save brand';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="brand-modal-title" className="font-bold text-lg text-slate-900">
          {isEditing ? 'Edit Brand' : 'Add Brand'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {isEditing ? 'Update brand details.' : 'Register a new manufacturer brand.'}
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-red-800 text-xs" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="brand-name" className="block font-medium text-slate-700 text-xs">
              Brand Name *
            </label>
            <input
              id="brand-name"
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Hikvision"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="brand-slug" className="block font-medium text-slate-700 text-xs">
              Slug (URL Identifier) *
            </label>
            <input
              id="brand-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setIsManualSlug(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. hikvision"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
            />
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
