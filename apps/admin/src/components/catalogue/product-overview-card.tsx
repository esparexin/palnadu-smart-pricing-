'use client';

import React, { useState } from 'react';
import {
  PRODUCT_IMAGE_LIMITS,
  type AdminProductDetailResponse,
  type ProductStatus,
} from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';
import { PricingFields, type PricingState } from './pricing-fields';

export interface ProductOverviewCardProps {
  product: AdminProductDetailResponse;
  onRefresh: () => void;
}

export function ProductOverviewCard({ product, onRefresh }: ProductOverviewCardProps) {
  const [name, setName] = useState(product.name);
  const [model, setModel] = useState(product.model ?? '');
  const [unit, setUnit] = useState(product.unit);
  const [description, setDescription] = useState(product.description ?? '');
  const [status, setStatus] = useState<ProductStatus>(product.status);

  const [pricing, setPricing] = useState<PricingState>({
    mrpRupees: (product.mrpPaise / 100).toFixed(2),
    offerPriceRupees: (product.offerPricePaise / 100).toFixed(2),
    discountType: product.discountType,
    discountValueInput:
      product.discountType === 'percentage'
        ? (product.discountValue / 100).toString()
        : (product.discountValue / 100).toFixed(2),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const mrpPaise = Math.round((parseFloat(pricing.mrpRupees) || 0) * 100);
    const offerPricePaise = Math.round((parseFloat(pricing.offerPriceRupees) || 0) * 100);

    if (mrpPaise > 0 && offerPricePaise > mrpPaise) {
      setError('Offer price cannot exceed MRP.');
      return;
    }

    if (status === 'published' && product.images.length < PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED) {
      setError(
        `Cannot publish product: At least ${PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images are required (currently has ${product.images.length}). Add images below before publishing.`,
      );
      return;
    }

    let discountValue = 0;
    if (pricing.discountType === 'fixed') {
      discountValue = Math.round((parseFloat(pricing.discountValueInput) || 0) * 100);
    } else if (pricing.discountType === 'percentage') {
      discountValue = Math.round((parseFloat(pricing.discountValueInput) || 0) * 100);
    }

    setIsSubmitting(true);
    try {
      await apiClient.catalogue.updateProduct(product.id, {
        name: name.trim(),
        model: model.trim() || null,
        unit: unit.trim() || 'piece',
        description: description.trim() || null,
        status,
        mrpPaise,
        offerPricePaise,
        discountType: pricing.discountType,
        discountValue,
      });
      setSuccessMessage('Product updated successfully.');
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-lg text-slate-900">Master Information &amp; Pricing</h2>
          <p className="text-xs text-slate-500">
            Edit master catalogue details, publication status, and pricing.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="touch-target rounded-md bg-emerald-600 px-5 py-2 font-semibold text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Product Changes'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-800 text-xs" role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-emerald-50 p-3 text-emerald-800 text-xs" role="status">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="edit-name" className="block font-medium text-slate-700 text-xs">
            Product Name *
          </label>
          <input
            id="edit-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="edit-status" className="block font-medium text-slate-700 text-xs">
            Publication Status
          </label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="draft">Draft (Private)</option>
            <option value="published">Published (Storefront Active)</option>
            <option value="archived">Archived</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Requires 2–8 images (currently has {product.images.length}).
          </p>
        </div>

        <div>
          <label htmlFor="edit-model" className="block font-medium text-slate-700 text-xs">
            Model Number
          </label>
          <input
            id="edit-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-unit" className="block font-medium text-slate-700 text-xs">
            Unit of Measure *
          </label>
          <input
            id="edit-unit"
            type="text"
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <span className="block font-medium text-slate-700 text-xs">Brand</span>
          <div className="mt-2 text-xs font-semibold text-slate-800">
            {product.brand?.name ?? <span className="text-slate-400 italic">No Brand</span>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="edit-desc" className="block font-medium text-slate-700 text-xs">
          Product Description
        </label>
        <textarea
          id="edit-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <PricingFields value={pricing} onChange={setPricing} />
    </form>
  );
}
