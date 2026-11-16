'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BrandResponse, CategoryResponse, ProductStatus } from '@palnadu/contracts';
import { apiClient } from '../../../../lib/api-client';
import { PricingFields, type PricingState } from '../../../../components/catalogue/pricing-fields';
import { ProductClassificationSection } from '../../../../components/catalogue/product-classification-section';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseDiscountValue(type: string, input: string): number {
  const val = parseFloat(input) || 0;
  if (type === 'fixed' || type === 'percentage') {
    return Math.round(val * 100);
  }
  return 0;
}

export default function NewProductPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [model, setModel] = useState('');
  const [unit, setUnit] = useState('piece');
  const [description, setDescription] = useState('');
  const [brandId, setBrandId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ProductStatus>('draft');

  const [pricing, setPricing] = useState<PricingState>({
    mrpRupees: '',
    offerPriceRupees: '',
    discountType: 'none',
    discountValueInput: '0',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.catalogue.listBrands({ limit: 100 }),
      apiClient.catalogue.listCategories({ limit: 100 }),
    ]).then(([bRes, cRes]) => {
      setBrands(bRes.items);
      setCategories(cRes.items);
    });
  }, []);

  const handleCategoryToggle = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError('Product name and slug are required.');
      return;
    }

    const mrpPaise = Math.round((parseFloat(pricing.mrpRupees) || 0) * 100);
    const offerPricePaise = Math.round((parseFloat(pricing.offerPriceRupees) || 0) * 100);
    if (mrpPaise > 0 && offerPricePaise > mrpPaise) {
      setError('Offer price cannot exceed MRP.');
      return;
    }

    const discountValue = parseDiscountValue(pricing.discountType, pricing.discountValueInput);
    setIsSubmitting(true);
    try {
      const created = await apiClient.catalogue.createProduct({
        name: name.trim(),
        slug: slug.trim(),
        model: model.trim() || null,
        unit: unit.trim() || 'piece',
        description: description.trim() || null,
        brandId: brandId.trim() || null,
        categoryIds: selectedCategoryIds,
        status,
        mrpPaise,
        offerPricePaise,
        discountType: pricing.discountType,
        discountValue,
        specifications: {},
        variants: [],
        images: [],
      });
      router.push(`/admin/products/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">Create Product</h1>
          <p className="mt-1 text-xs text-slate-600">
            Define master specifications, taxonomies, and base pricing rules.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50"
        >
          &larr; Back to Products
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-xs text-red-800" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-base text-slate-900 border-b border-slate-100 pb-2">
            1. Master Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-name" className="block font-medium text-slate-700 text-xs">
                Product Name *
              </label>
              <input
                id="p-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. 4MP Fixed Dome Camera"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="p-slug" className="block font-medium text-slate-700 text-xs">
                Slug (URL Identifier) *
              </label>
              <input
                id="p-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="e.g. 4mp-fixed-dome-camera"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="p-model" className="block font-medium text-slate-700 text-xs">
                Model Number
              </label>
              <input
                id="p-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. DS-2CD2143G2-I"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="p-unit" className="block font-medium text-slate-700 text-xs">
                Unit of Measure *
              </label>
              <input
                id="p-unit"
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. piece, meter, roll"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="p-desc" className="block font-medium text-slate-700 text-xs">
              Product Description
            </label>
            <textarea
              id="p-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed technical overview and product features..."
              className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <ProductClassificationSection
          brandId={brandId}
          onBrandChange={setBrandId}
          brands={brands}
          status={status}
          onStatusChange={setStatus}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryToggle={handleCategoryToggle}
        />

        <PricingFields value={pricing} onChange={setPricing} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2">
          <Link
            href="/admin/products"
            className="touch-target rounded-md border border-slate-300 bg-white px-5 py-2.5 font-medium text-sm text-slate-700 hover:bg-slate-50 text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="touch-target rounded-md bg-emerald-600 px-6 py-2.5 font-semibold text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Product...' : 'Save & Configure Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
