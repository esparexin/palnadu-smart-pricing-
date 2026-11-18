'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PRODUCT_IMAGE_LIMITS,
  type BrandResponse,
  type CategoryResponse,
  type ProductStatus,
} from '@palnadu/contracts';
import { apiClient } from '../../../../lib/api-client';
import { PricingFields, type PricingState } from '../../../../components/catalogue/pricing-fields';
import { ProductClassificationSection } from '../../../../components/catalogue/product-classification-section';
import { MasterInfoSection } from '../../../../components/catalogue/master-info-section';
import {
  NewProductImagesSection,
  type StagedImage,
} from '../../../../components/catalogue/new-product-images-section';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseDiscountValue(type: string, input: string): number {
  const val = parseFloat(input) || 0;
  return type === 'fixed' || type === 'percentage' ? Math.round(val * 100) : 0;
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
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
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

  const handleAddImages = (files: File[]) => {
    setStagedImages((prev) => {
      const remainingSlots = PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT - prev.length;
      if (remainingSlots <= 0) return prev;
      const toAdd = files.slice(0, remainingSlots).map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        altText: '',
        isPrimary: prev.length === 0 && idx === 0,
        status: 'pending' as const,
      }));
      return [...prev, ...toAdd];
    });
  };

  const handleRemoveImage = (id: string) => {
    setStagedImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((i) => i.id !== id);
      if (target?.isPrimary && next.length > 0 && next[0]) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimary = (id: string) => {
    setStagedImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === id })));
  };

  const handleUpdateAltText = (id: string, altText: string) => {
    setStagedImages((prev) => prev.map((img) => (img.id === id ? { ...img, altText } : img)));
  };

  const uploadStagedImages = async (productId: string): Promise<boolean> => {
    let allSucceeded = true;
    for (let i = 0; i < stagedImages.length; i++) {
      const item = stagedImages[i];
      if (!item || item.status === 'success') continue;
      setUploadProgress(`Uploading image ${i + 1} of ${stagedImages.length}...`);
      setStagedImages((prev) =>
        prev.map((img) => (img.id === item.id ? { ...img, status: 'uploading' } : img)),
      );
      try {
        await apiClient.media.uploadProductImage(productId, item.file, {
          altText: item.altText || undefined,
          isPrimary: item.isPrimary,
        });
        setStagedImages((prev) =>
          prev.map((img) => (img.id === item.id ? { ...img, status: 'success' } : img)),
        );
      } catch (err: unknown) {
        allSucceeded = false;
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setStagedImages((prev) =>
          prev.map((img) =>
            img.id === item.id ? { ...img, status: 'error', errorMessage: msg } : img,
          ),
        );
      }
    }
    return allSucceeded;
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
    if (status === 'published' && stagedImages.length < PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED) {
      setError(
        `Published products require at least ${PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images. Please add more images or select Draft status.`,
      );
      return;
    }

    setIsSubmitting(true);
    let targetId = createdProductId;
    try {
      if (!targetId) {
        const discountValue = parseDiscountValue(pricing.discountType, pricing.discountValueInput);
        const created = await apiClient.catalogue.createProduct({
          name: name.trim(),
          slug: slug.trim(),
          model: model.trim() || null,
          unit: unit.trim() || 'piece',
          description: description.trim() || null,
          brandId: brandId.trim() || null,
          categoryIds: selectedCategoryIds,
          status: 'draft',
          mrpPaise,
          offerPricePaise,
          discountType: pricing.discountType,
          discountValue,
          specifications: {},
          variants: [],
          images: [],
        });
        targetId = created.id;
        setCreatedProductId(created.id);
      }

      const allUploaded = await uploadStagedImages(targetId);
      if (allUploaded) {
        if (
          status === 'published' &&
          stagedImages.length >= PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED
        ) {
          await apiClient.catalogue.updateProduct(targetId, { status: 'published' });
        }
        router.push(`/admin/products/${targetId}`);
      } else {
        setError(
          'Product draft saved, but some images failed to upload. Review errors below and retry.',
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">Create Product</h1>
          <p className="mt-1 text-xs text-slate-600">
            Define specifications, pricing, and attach product images.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50"
        >
          &larr; Back
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-xs text-red-800" role="alert">
          {error}
        </div>
      )}
      {uploadProgress && (
        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 animate-pulse font-medium">
          {uploadProgress}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <MasterInfoSection
          name={name}
          onNameChange={(v) => {
            setName(v);
            if (!slug) setSlug(slugify(v));
          }}
          slug={slug}
          onSlugChange={setSlug}
          model={model}
          onModelChange={setModel}
          unit={unit}
          onUnitChange={setUnit}
          description={description}
          onDescriptionChange={setDescription}
          disabled={isSubmitting || Boolean(createdProductId)}
        />

        <ProductClassificationSection
          brandId={brandId}
          onBrandChange={setBrandId}
          brands={brands}
          status={status}
          onStatusChange={setStatus}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryToggle={(id) =>
            setSelectedCategoryIds((prev) =>
              prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
            )
          }
          onSelectAllCategories={() => setSelectedCategoryIds(categories.map((c) => c.id))}
          onDeselectAllCategories={() => setSelectedCategoryIds([])}
        />

        <PricingFields value={pricing} onChange={setPricing} />

        <NewProductImagesSection
          stagedImages={stagedImages}
          onAddImages={handleAddImages}
          onRemoveImage={handleRemoveImage}
          onSetPrimary={handleSetPrimary}
          onUpdateAltText={handleUpdateAltText}
          disabled={isSubmitting}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2">
          {createdProductId ? (
            <Link
              href={`/admin/products/${createdProductId}`}
              className="touch-target rounded-md border border-slate-300 bg-white px-5 py-2.5 font-medium text-sm text-slate-700 hover:bg-slate-50 text-center"
            >
              Proceed to Product Details &rarr;
            </Link>
          ) : (
            <Link
              href="/admin/products"
              className="touch-target rounded-md border border-slate-300 bg-white px-5 py-2.5 font-medium text-sm text-slate-700 hover:bg-slate-50 text-center"
            >
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="touch-target rounded-md bg-emerald-600 px-6 py-2.5 font-semibold text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting
              ? uploadProgress || 'Saving...'
              : createdProductId
                ? 'Retry Failed Uploads'
                : 'Save & Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
