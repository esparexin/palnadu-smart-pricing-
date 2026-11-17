'use client';

import React, { useState } from 'react';
import { PRODUCT_IMAGE_LIMITS, type ImageResponse, type ProductStatus } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';
import { AddImageForm } from './add-image-form';
import { ImageDiscoveryModal } from './image-discovery-modal';
import { ProductImageCard } from './product-image-card';

export interface ProductImagesSectionProps {
  productId: string;
  images: ImageResponse[];
  onRefresh: () => void;
  productStatus?: ProductStatus;
}

export function ProductImagesSection({
  productId,
  images,
  onRefresh,
  productStatus = 'draft',
}: ProductImagesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [replacingAltText, setReplacingAltText] = useState('');
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const atMax = images.length >= PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT;
  const isDeleteBlocked =
    productStatus === 'published' && images.length <= PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED;

  const handleDelete = async (imageId: string) => {
    setActionError(null);
    if (isDeleteBlocked) {
      setActionError(
        `Cannot delete: Published products require at least ${PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images.`,
      );
      return;
    }
    if (!confirm('Are you sure you want to remove this image?')) return;
    setIsBusy(true);
    try {
      await apiClient.catalogue.deleteImage(productId, imageId);
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    setActionError(null);
    setIsBusy(true);
    try {
      await apiClient.catalogue.updateImage(productId, imageId, { isPrimary: true });
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to set primary image');
    } finally {
      setIsBusy(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    setActionError(null);
    setIsBusy(true);
    try {
      await Promise.all([
        apiClient.catalogue.updateImage(productId, images[index].id, { sortOrder: target }),
        apiClient.catalogue.updateImage(productId, images[target].id, { sortOrder: index }),
      ]);
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder images');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-900">Product Media &amp; Images</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {images.length} of {PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Published products require 2–8 images. Drafts accept up to 8 images.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={atMax || isBusy}
            onClick={() => setIsDiscoveryOpen(true)}
            title={
              atMax ? `Maximum ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images reached` : undefined
            }
            className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Auto-Discover
          </button>
          {!isAdding && !replacingImageId && (
            <button
              type="button"
              disabled={atMax || isBusy}
              onClick={() => setIsAdding(true)}
              title={
                atMax ? `Maximum ${PRODUCT_IMAGE_LIMITS.MAX_PER_PRODUCT} images reached` : undefined
              }
              className="touch-target rounded-md bg-slate-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-slate-800 disabled:opacity-50"
            >
              + Add Image
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          className="rounded-md bg-red-50 p-3 text-xs text-red-800 flex items-center justify-between"
          role="alert"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 font-bold hover:text-red-900 text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {productStatus === 'published' && images.length < PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED && (
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          <strong>Validation Warning:</strong> Published products require at least{' '}
          {PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images (currently has {images.length}).
        </div>
      )}

      {productStatus === 'draft' && images.length < PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED && (
        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
          <strong>Draft Mode:</strong> Add at least {PRODUCT_IMAGE_LIMITS.MIN_FOR_PUBLISHED} images
          before publishing this product (currently has {images.length}).
        </div>
      )}

      {isAdding && (
        <AddImageForm
          productId={productId}
          imagesCount={images.length}
          onSuccess={() => {
            setIsAdding(false);
            onRefresh();
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {replacingImageId && (
        <AddImageForm
          productId={productId}
          imagesCount={images.length}
          replaceImageId={replacingImageId}
          initialAltText={replacingAltText}
          onSuccess={() => {
            setReplacingImageId(null);
            onRefresh();
          }}
          onCancel={() => setReplacingImageId(null)}
        />
      )}

      {images.length === 0 && !isAdding && !replacingImageId ? (
        <p className="text-xs text-slate-400 italic">No images attached to this product.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <ProductImageCard
              key={img.id}
              img={img}
              idx={idx}
              total={images.length}
              isBusy={isBusy}
              isDeleteBlocked={isDeleteBlocked}
              onSetPrimary={handleSetPrimary}
              onMove={handleMove}
              onReplace={(id, alt) => {
                setReplacingImageId(id);
                setReplacingAltText(alt);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ImageDiscoveryModal
        productId={productId}
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onImageApproved={onRefresh}
      />
    </div>
  );
}
