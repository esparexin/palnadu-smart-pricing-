'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { CustomerEnquiryResponse } from '@palnadu/contracts';
import { useBasket } from '../../context/basket-context';
import { apiClient } from '../../lib/api-client';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';
import { BasketItemRow } from '../../components/storefront/basket-item-row';
import { BasketSubmissionForm } from '../../components/storefront/basket-submission-form';
import { BasketSuccessView } from '../../components/storefront/basket-success-view';

export default function BasketPage() {
  const { items, itemCount, isMounted, updateQuantity, removeItem, clearBasket } = useBasket();
  const [submittedResult, setSubmittedResult] = useState<CustomerEnquiryResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<string | null>(null);

  const handleSubmitEnquiry = async (formData: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerNotes?: string;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const activeIdempotencyKey =
      submissionIdempotencyKey ||
      `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    if (!submissionIdempotencyKey) {
      setSubmissionIdempotencyKey(activeIdempotencyKey);
    }

    try {
      const result = await apiClient.storefront.submitEnquiry({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || null,
        customerPhone: formData.customerPhone || null,
        customerNotes: formData.customerNotes || null,
        idempotencyKey: activeIdempotencyKey,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
        })),
      });

      setSubmittedResult(result);
      setSubmissionIdempotencyKey(null);
      clearBasket();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit quotation enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 focus:outline-none focus:underline">
            Catalogue
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Quote Request Basket</span>
        </nav>

        {submittedResult ? (
          <BasketSuccessView
            referenceNumber={submittedResult.referenceNumber}
            createdAt={submittedResult.createdAt}
            onNewEnquiry={() => {
              setSubmittedResult(null);
              setSubmissionIdempotencyKey(null);
            }}
          />
        ) : !isMounted ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading basket...</div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Your Quote Basket is Empty</h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse our commercial catalogue and select products to request an authoritative price
              quotation.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse Catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Items Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Quotation Request ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </h1>
                <button
                  type="button"
                  onClick={clearBasket}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 min-h-[44px] px-2 flex items-center focus:outline-none focus:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                {items.map((item) => (
                  <BasketItemRow
                    key={`${item.productId}-${item.variantId ?? 'base'}`}
                    item={item}
                    onUpdateQuantity={(qty) => updateQuantity(item.productId, item.variantId, qty)}
                    onRemove={() => removeItem(item.productId, item.variantId)}
                  />
                ))}
              </div>

              {/* Price Confidentiality Card */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-700">
                <div className="font-bold uppercase tracking-wider text-blue-900 mb-1">
                  Price Confidentiality Policy
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Palnadu Smart Pricing strictly maintains wholesale price confidentiality. Official
                  volume discounts, customer-tier pricing, and binding quotations are computed
                  directly by authorized sales managers upon enquiry submission.
                </p>
              </div>
            </div>

            {/* Submission Form Column */}
            <div className="lg:col-span-5">
              <div className="sticky top-20">
                <BasketSubmissionForm
                  items={items}
                  onSubmit={handleSubmitEnquiry}
                  isSubmitting={isSubmitting}
                  error={submitError}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile-only sticky bottom action bar - exactly ONE action instance active on mobile */}
      {isMounted && items.length > 0 && !submittedResult && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur pb-safe">
          <div className="mx-auto max-w-lg">
            <button
              type="submit"
              form="quote-submission-form"
              disabled={isSubmitting || items.length === 0}
              className="w-full inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:bg-slate-400"
            >
              {isSubmitting ? 'Submitting...' : `Submit Quote Request (${itemCount})`}
            </button>
          </div>
        </div>
      )}

      <StorefrontFooter />
    </div>
  );
}
