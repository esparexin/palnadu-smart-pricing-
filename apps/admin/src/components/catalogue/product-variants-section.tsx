'use client';

import React, { useState } from 'react';
import type { VariantResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface ProductVariantsSectionProps {
  productId: string;
  variants: VariantResponse[];
  onRefresh: () => void;
}

export function ProductVariantsSection({
  productId,
  variants,
  onRefresh,
}: ProductVariantsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [sku, setSku] = useState('');
  const [model, setModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.catalogue.createVariant(productId, {
        sku: sku.trim() || undefined,
        model: model.trim() || undefined,
        options: {},
      });
      setSku('');
      setModel('');
      setIsAdding(false);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create variant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await apiClient.catalogue.deleteVariant(productId, variantId);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete variant');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Product Variants</h3>
          <p className="text-xs text-slate-500">
            Define SKU models and optional pricing overrides.
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="touch-target rounded-md bg-slate-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-slate-800"
          >
            + Add Variant
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-red-800 text-xs" role="alert">
          {error}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="variant-sku" className="block font-medium text-slate-700 text-xs">
                SKU (Stock Keeping Unit)
              </label>
              <input
                id="variant-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CAM-4MP-28MM"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="variant-model" className="block font-medium text-slate-700 text-xs">
                Model Number
              </label>
              <input
                id="variant-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. DS-2CD2143G2-I"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Variant'}
            </button>
          </div>
        </form>
      )}

      {variants.length === 0 && !isAdding ? (
        <p className="text-xs text-slate-400 italic">No variants created for this product yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {variants.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2.5 text-xs">
              <div>
                <span className="font-semibold text-slate-800">{v.sku || 'No SKU'}</span>
                {v.model && <span className="ml-2 text-slate-500 font-mono">({v.model})</span>}
                {v.offerPricePaise && (
                  <span className="ml-2 font-mono text-emerald-700 font-semibold">
                    ₹{(v.offerPricePaise / 100).toFixed(2)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                className="touch-target text-red-600 hover:text-red-800 font-medium px-2 py-1"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
